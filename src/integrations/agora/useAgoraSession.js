import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import {
  AgentState,
  AgoraVoiceAI,
  AgoraVoiceAIEvents,
  MessageType,
  TranscriptHelperMode,
} from "agora-agent-client-toolkit";
import AgoraRTC from "agora-rtc-sdk-ng";
import AgoraRTM from "agora-rtm";
import {
  getConfig,
  startAgent,
  stopAgent,
  stopAgentKeepalive,
  stopAllKnownAgents,
} from "./api";

const ACTIVE_AGORA_AGENT_STORAGE_KEY = "simple-ai-active-agora-agent-v1";
const STEP_TIMEOUT_MS = 15000;
const LOCAL_AUDIO_THRESHOLD = 0.015;

try {
  AgoraRTC.setParameter("ENABLE_AUDIO_PTS_METADATA", true);
} catch {}

try {
  AgoraRTC.setArea({ areaCode: "GLOBAL" });
} catch (error) {
  console.warn("[Agora] setArea failed", error);
}

function readStoredActiveAgent() {
  try {
    const raw = window.localStorage.getItem(ACTIVE_AGORA_AGENT_STORAGE_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw);
    if (!record?.agentId) return null;
    return {
      agentId: String(record.agentId),
      channelName: record.channelName ? String(record.channelName) : "",
      createdAt: Number(record.createdAt) || 0,
    };
  } catch {
    return null;
  }
}

function storeActiveAgent(record) {
  try {
    window.localStorage.setItem(
      ACTIVE_AGORA_AGENT_STORAGE_KEY,
      JSON.stringify({
        agentId: record.agentId,
        channelName: record.channelName,
        createdAt: Date.now(),
      }),
    );
  } catch {}
}

function clearStoredActiveAgent(agentId) {
  try {
    const current = readStoredActiveAgent();
    if (!agentId || !current || current.agentId === agentId) {
      window.localStorage.removeItem(ACTIVE_AGORA_AGENT_STORAGE_KEY);
    }
  } catch {}
}

function createLog(message, level = "info", step = "") {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    level,
    message,
    step,
    timestamp: Date.now(),
  };
}

function getErrorMessage(error, fallback) {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "string") return error;
  return fallback;
}

function withTimeout(promise, timeoutMs, message) {
  let timer = 0;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timer);
  });
}

function ensureCurrentRun(runRef, runId) {
  if (runRef.current !== runId) {
    throw new Error("Sessao de voz cancelada.");
  }
}

function getTranscriptType(item, config) {
  const uid = String(item.uid ?? "");
  const object = item.metadata?.object;

  if (uid === String(config?.uid)) return "user";
  if (uid === String(config?.agentUid)) return "agent";
  if (object === MessageType.USER_TRANSCRIPTION) return "user";
  if (object === MessageType.AGENT_TRANSCRIPTION) return "agent";

  return "user";
}

function createStableTranscriptKey(item) {
  return String(item.text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function mapTranscript(chatHistory, config) {
  return [...chatHistory]
    .sort((first, second) => {
      if (first.turn_id !== second.turn_id) return first.turn_id - second.turn_id;
      return String(first.uid).localeCompare(String(second.uid));
    })
    .map((item) => ({
      id: `${item.turn_id}-${item.uid}-${item.status}-${createStableTranscriptKey(item)}`,
      type: getTranscriptType(item, config),
      text: item.text || "",
      status: item.status,
      timestamp: Number(item._time) || Number(item.turn_id) || Date.now(),
      turnId: Number(item.turn_id) || 0,
    }));
}

function getConnectionState(client) {
  return client?.connectionState === "CONNECTED";
}

export function useAgoraSession({
  briefingContext,
  priorityQuestion,
  onTranscriptChange,
  language = "pt-BR",
}) {
  const [config, setConfig] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [agentState, setAgentState] = useState(AgentState.IDLE);
  const [transcripts, setTranscripts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [channelName, setChannelName] = useState("");
  const [agentId, setAgentId] = useState(null);
  const [isRtcConnected, setIsRtcConnected] = useState(false);
  const [isRtmReady, setIsRtmReady] = useState(false);
  const [isToolkitReady, setIsToolkitReady] = useState(false);
  const [isMicrophoneReady, setIsMicrophoneReady] = useState(false);
  const [isMicrophonePublished, setIsMicrophonePublished] = useState(false);
  const [isMicrophoneLoading, setIsMicrophoneLoading] = useState(false);
  const [microphoneErrorMessage, setMicrophoneErrorMessage] = useState("");
  const [microphoneLevel, setMicrophoneLevel] = useState(0);
  const [currentStep, setCurrentStep] = useState("idle");

  const clientRef = useRef(null);
  const microphoneTrackRef = useRef(null);
  const rtmClientRef = useRef(null);
  const voiceAiRef = useRef(null);
  const currentAgentIdRef = useRef(null);
  const currentConfigRef = useRef(null);
  const isDisconnectingRef = useRef(false);
  const briefingContextRef = useRef(briefingContext);
  const priorityQuestionRef = useRef(priorityQuestion);
  const languageRef = useRef(language);
  const sessionRunRef = useRef(0);
  const volumeIntervalRef = useRef(0);
  const lastInterruptAtRef = useRef(0);
  const didReceiveUserTranscriptRef = useRef(false);
  const didReceiveAgentTranscriptRef = useRef(false);

  const addLog = useEffectEvent((message, level = "info", step = "") => {
    setLogs((current) => [...current, createLog(message, level, step)]);
  });

  const emitTranscriptChange = useEffectEvent((items) => {
    onTranscriptChange?.(items);
  });

  useEffect(() => {
    briefingContextRef.current = briefingContext;
    priorityQuestionRef.current = priorityQuestion;
    languageRef.current = language;
  }, [briefingContext, language, priorityQuestion]);

  useEffect(() => {
    emitTranscriptChange(transcripts);
  }, [transcripts, emitTranscriptChange]);

  const markStep = useEffectEvent((step, message, level = "info") => {
    setCurrentStep(step);
    addLog(message, level, step);
  });

  const stopVolumeMeter = useCallback(() => {
    if (volumeIntervalRef.current) {
      window.clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = 0;
    }
  }, []);

  const startVolumeMeter = useCallback(() => {
    stopVolumeMeter();
    volumeIntervalRef.current = window.setInterval(() => {
      const level = Number(microphoneTrackRef.current?.getVolumeLevel?.() ?? 0);
      setMicrophoneLevel(Number.isFinite(level) ? level : 0);
    }, 200);
  }, [stopVolumeMeter]);

  const cleanupLocalResources = useCallback(async ({ stopKnownAgent = false } = {}) => {
    stopVolumeMeter();

    const activeAgentId = currentAgentIdRef.current || readStoredActiveAgent()?.agentId;
    if (activeAgentId && stopKnownAgent) {
      try {
        await stopAgent(activeAgentId);
        addLog("Agente encerrado.", "success", "agent_stopped");
      } catch (error) {
        addLog(
          `Nao consegui confirmar o encerramento do agente: ${getErrorMessage(error, "falha desconhecida")}`,
          "warning",
          "agent_stop_failed",
        );
      } finally {
        clearStoredActiveAgent(activeAgentId);
      }
    }

    currentAgentIdRef.current = null;

    if (voiceAiRef.current) {
      try {
        voiceAiRef.current.unsubscribe?.();
        voiceAiRef.current.destroy?.();
      } catch {}
      voiceAiRef.current = null;
    }

    if (rtmClientRef.current) {
      try {
        await rtmClientRef.current.logout();
      } catch {}
      rtmClientRef.current = null;
    }

    if (clientRef.current && microphoneTrackRef.current) {
      try {
        await clientRef.current.unpublish([microphoneTrackRef.current]);
      } catch {}
    }

    if (clientRef.current) {
      try {
        await clientRef.current.leave();
      } catch {}
      clientRef.current.removeAllListeners?.();
      clientRef.current = null;
    }

    if (microphoneTrackRef.current) {
      try {
        microphoneTrackRef.current.stop();
        microphoneTrackRef.current.close();
      } catch {}
      microphoneTrackRef.current = null;
    }

    currentConfigRef.current = null;
    setConfig(null);
    setChannelName("");
    setAgentId(null);
    setAgentState(AgentState.IDLE);
    setIsRtcConnected(false);
    setIsRtmReady(false);
    setIsToolkitReady(false);
    setIsMicrophoneReady(false);
    setIsMicrophonePublished(false);
    setIsMicrophoneLoading(false);
    setIsMicMuted(false);
    setMicrophoneLevel(0);
  }, [addLog, stopVolumeMeter]);

  const resetVisibleSession = useCallback(() => {
    setLogs([]);
    setTranscripts([]);
    setMicrophoneErrorMessage("");
    setCurrentStep("idle");
    setAgentId(null);
    setChannelName("");
    setAgentState(AgentState.IDLE);
    setIsRtcConnected(false);
    setIsRtmReady(false);
    setIsToolkitReady(false);
    setIsMicrophoneReady(false);
    setIsMicrophonePublished(false);
    setIsMicrophoneLoading(false);
    setIsMicMuted(false);
    setMicrophoneLevel(0);
    setConfig(null);
  }, []);

  const requestBrowserPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Este navegador nao oferece captura de microfone via getUserMedia.");
    }

    const stream = await withTimeout(
      navigator.mediaDevices.getUserMedia({ audio: true }),
      STEP_TIMEOUT_MS,
      "O navegador nao devolveu permissao/stream de microfone em 15s.",
    );

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("Permissao concedida, mas o navegador nao entregou uma faixa de audio.");
    }

    stream.getTracks().forEach((track) => track.stop());
  }, []);

  const createMicrophoneTrack = useCallback(async () => {
    const track = await withTimeout(
      AgoraRTC.createMicrophoneAudioTrack({
        AEC: true,
        ANS: false,
        AGC: true,
      }),
      STEP_TIMEOUT_MS,
      "A Agora nao criou a track de microfone em 15s.",
    );

    microphoneTrackRef.current = track;
    setIsMicrophoneReady(true);
    startVolumeMeter();
    return track;
  }, [startVolumeMeter]);

  const waitForLocalAudioProbe = useCallback(async () => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < 2500) {
      const level = Number(microphoneTrackRef.current?.getVolumeLevel?.() ?? 0);
      if (Number.isFinite(level)) {
        setMicrophoneLevel(level);
      }
      if (level > LOCAL_AUDIO_THRESHOLD) return true;
      await new Promise((resolve) => window.setTimeout(resolve, 160));
    }

    return false;
  }, []);

  const buildConfig = useCallback((configData) => ({
    appId: configData.app_id,
    channel: configData.channel_name,
    token: configData.token,
    uid: String(configData.uid),
    agentUid: String(configData.agent_uid),
  }), []);

  const createRtcClient = useCallback((nextConfig) => {
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    client.on("connection-state-change", (state, previous, reason) => {
      console.log("[Agora] RTC state change", { state, previous, reason });
      setIsRtcConnected(state === "CONNECTED");
      if (state === "CONNECTED") addLog("RTC conectado.", "success", "rtc_joined");
      if (state === "DISCONNECTED") {
        addLog(`RTC desconectado: ${reason || "sem detalhe"}.`, "warning", "rtc_disconnected");
      }
      if (state === "FAILED") {
        addLog(`RTC falhou: ${reason || "sem detalhe"}.`, "error", "rtc_failed");
      }
    });

    client.on("user-published", async (user, mediaType) => {
      if (mediaType !== "audio") return;

      try {
        await client.subscribe(user, mediaType);
        user.audioTrack?.play();
      } catch (error) {
        addLog(
          `Falha ao tocar audio remoto: ${getErrorMessage(error, "erro desconhecido")}`,
          "warning",
          "remote_audio_failed",
        );
      }
    });

    clientRef.current = client;
    currentConfigRef.current = nextConfig;
    return client;
  }, [addLog]);

  const initializeToolkit = useCallback(async (client, rtmClient, nextConfig) => {
    const voiceAi = await withTimeout(
      AgoraVoiceAI.init({
        rtcEngine: client,
        rtmConfig: { rtmEngine: rtmClient },
        renderMode: TranscriptHelperMode.TEXT,
        enableLog: true,
      }),
      STEP_TIMEOUT_MS,
      "Toolkit de transcricao nao iniciou em 15s.",
    );

    voiceAi.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (chatHistory) => {
      console.log("[Agora] transcript updated", {
        localUid: nextConfig.uid,
        agentUid: nextConfig.agentUid,
        turns: chatHistory.map((item) => ({
          uid: item.uid,
          object: item.metadata?.object,
          status: item.status,
          text: item.text,
        })),
      });
      const mapped = mapTranscript(chatHistory, nextConfig);
      setTranscripts(mapped);
      if (!didReceiveUserTranscriptRef.current && mapped.some((item) => item.type === "user")) {
        didReceiveUserTranscriptRef.current = true;
        addLog("Primeira transcricao do usuario recebida.", "success", "first_user_transcript");
      }
      if (!didReceiveAgentTranscriptRef.current && mapped.some((item) => item.type === "agent")) {
        didReceiveAgentTranscriptRef.current = true;
        addLog("Primeira transcricao do agente recebida.", "success", "first_agent_transcript");
      }
    });

    voiceAi.on(AgoraVoiceAIEvents.AGENT_STATE_CHANGED, (_agentUserId, event) => {
      setAgentState(event.state);
      addLog(`Estado do agente: ${String(event.state).toLowerCase()}.`, "info", "agent_state");
    });

    if (AgoraVoiceAIEvents.AGENT_INTERRUPTED) {
      voiceAi.on(AgoraVoiceAIEvents.AGENT_INTERRUPTED, () => {
        addLog("Interrupcao/barge-in recebida pela Agora.", "warning", "agent_interrupted");
      });
    }

    voiceAi.on(AgoraVoiceAIEvents.AGENT_ERROR, (_agentUserId, error) => {
      addLog(
        `Erro do agente [${error.type}] ${error.message} (${error.code}).`,
        "error",
        "agent_error",
      );
    });

    voiceAi.on(AgoraVoiceAIEvents.MESSAGE_ERROR, (_agentUserId, error) => {
      addLog(
        `Erro de mensagem [${error.type}] ${error.message} (${error.code}).`,
        "error",
        "message_error",
      );
    });

    voiceAi.subscribeMessage(nextConfig.channel);
    voiceAiRef.current = voiceAi;
    return voiceAi;
  }, [addLog]);

  const connect = useCallback(async () => {
    if (isDisconnectingRef.current) return;

    const runId = sessionRunRef.current + 1;
    sessionRunRef.current = runId;
    resetVisibleSession();
    setIsConnecting(true);
    setCurrentStep("starting");
    lastInterruptAtRef.current = 0;
    didReceiveUserTranscriptRef.current = false;
    didReceiveAgentTranscriptRef.current = false;

    try {
      await cleanupLocalResources({ stopKnownAgent: true });
      ensureCurrentRun(sessionRunRef, runId);

      markStep("cleanup_known_agents", "Limpando agentes conhecidos antes de iniciar.", "info");
      try {
        const result = await withTimeout(
          stopAllKnownAgents(),
          STEP_TIMEOUT_MS,
          "Backend nao confirmou limpeza de agentes conhecidos em 15s.",
        );
        const stopped = result?.stopped?.length ?? 0;
        const failed = result?.failed?.length ?? 0;
        addLog(
          `Limpeza backend concluida: ${stopped} encerrado(s), ${failed} falha(s).`,
          failed ? "warning" : "success",
          "cleanup_known_agents",
        );
      } catch (error) {
        addLog(
          `Nao consegui limpar todos os agentes conhecidos: ${getErrorMessage(error, "falha desconhecida")}`,
          "warning",
          "cleanup_known_agents",
        );
      }
      ensureCurrentRun(sessionRunRef, runId);

      setIsMicrophoneLoading(true);
      markStep("permission_requested", "Solicitando permissao do microfone ao navegador.", "info");
      await requestBrowserPermission();
      ensureCurrentRun(sessionRunRef, runId);
      markStep("permission_ok", "Permissao de microfone validada pelo navegador.", "success");

      markStep("track_created", "Criando track real de microfone pela Agora.", "info");
      const microphoneTrack = await createMicrophoneTrack();
      ensureCurrentRun(sessionRunRef, runId);
      setIsMicrophoneLoading(false);
      markStep("track_created", "Track de microfone criada.", "success");

      const hasLocalAudio = await waitForLocalAudioProbe();
      ensureCurrentRun(sessionRunRef, runId);
      if (hasLocalAudio) {
        markStep("local_volume_detected", "Sinal local do microfone detectado.", "success");
      } else {
        markStep(
          "local_volume_waiting",
          "Microfone liberado, mas ainda sem sinal local detectado. Vou continuar e manter o medidor ativo.",
          "warning",
        );
      }

      markStep("config_requested", "Solicitando configuracao da Agora.", "info");
      const configData = await withTimeout(
        getConfig(),
        STEP_TIMEOUT_MS,
        "Backend nao devolveu configuracao Agora em 15s.",
      );
      ensureCurrentRun(sessionRunRef, runId);
      const nextConfig = buildConfig(configData);
      currentConfigRef.current = nextConfig;
      setConfig(nextConfig);
      setChannelName(nextConfig.channel);
      markStep("config_received", "Configuracao Agora recebida.", "success");
      console.log("[Agora] config received", {
        channel: nextConfig.channel,
        uid: nextConfig.uid,
        agentUid: nextConfig.agentUid,
      });

      markStep("rtc_joining", "Entrando manualmente no canal RTC.", "info");
      const client = createRtcClient(nextConfig);
      await withTimeout(
        client.join(nextConfig.appId, nextConfig.channel, nextConfig.token, nextConfig.uid),
        STEP_TIMEOUT_MS,
        "RTC join nao concluiu em 15s.",
      );
      ensureCurrentRun(sessionRunRef, runId);
      setIsRtcConnected(getConnectionState(client));
      markStep("rtc_joined", "RTC entrou no canal.", "success");

      markStep("mic_publishing", "Publicando microfone no RTC.", "info");
      await withTimeout(
        client.publish([microphoneTrack]),
        STEP_TIMEOUT_MS,
        "Publicacao do microfone nao concluiu em 15s.",
      );
      ensureCurrentRun(sessionRunRef, runId);
      setIsMicrophonePublished(true);
      markStep("mic_published", "Microfone publicado no canal RTC.", "success");

      markStep("rtm_starting", "Inicializando RTM para mensagens de transcricao.", "info");
      const rtmClient = new AgoraRTM.RTM(nextConfig.appId, String(nextConfig.uid), {
        useStringUserId: true,
      });
      rtmClientRef.current = rtmClient;
      await withTimeout(
        rtmClient.login({ token: nextConfig.token }),
        STEP_TIMEOUT_MS,
        "RTM login nao concluiu em 15s.",
      );
      await withTimeout(
        rtmClient.subscribe(nextConfig.channel),
        STEP_TIMEOUT_MS,
        "RTM subscribe nao concluiu em 15s.",
      );
      ensureCurrentRun(sessionRunRef, runId);
      setIsRtmReady(true);
      markStep("rtm_ready", "RTM pronto no canal.", "success");

      markStep("toolkit_starting", "Inicializando toolkit Agora Voice AI.", "info");
      await initializeToolkit(client, rtmClient, nextConfig);
      ensureCurrentRun(sessionRunRef, runId);
      setIsToolkitReady(true);
      markStep("toolkit_ready", "Toolkit Agora Voice AI pronto.", "success");

      markStep("agent_starting", "Solicitando inicio do agente Convo AI.", "info");
      const nextAgentId = await withTimeout(
        startAgent({
          channelName: nextConfig.channel,
          rtcUid: String(nextConfig.agentUid),
          userUid: String(nextConfig.uid),
          briefingContext: briefingContextRef.current,
          priorityQuestion: priorityQuestionRef.current,
          language: languageRef.current,
        }),
        STEP_TIMEOUT_MS,
        "Agente Convo AI nao respondeu em 15s.",
      );
      ensureCurrentRun(sessionRunRef, runId);

      currentAgentIdRef.current = nextAgentId;
      storeActiveAgent({
        agentId: nextAgentId,
        channelName: nextConfig.channel,
      });
      setAgentId(nextAgentId);
      setIsConnecting(false);
      markStep("agent_started", `Agente iniciado (${nextAgentId}).`, "success");
    } catch (error) {
      const cancelled = sessionRunRef.current !== runId;
      const message = getErrorMessage(error, "Falha desconhecida ao iniciar voz.");

      if (!cancelled) {
        console.error("[Agora] connect failed", error);
        setMicrophoneErrorMessage(message);
        addLog(message, "error", "connect_failed");
      }

      await cleanupLocalResources({ stopKnownAgent: true });
      if (!cancelled) {
        setIsConnecting(false);
        setCurrentStep("failed");
      }
    } finally {
      setIsMicrophoneLoading(false);
    }
  }, [
    addLog,
    buildConfig,
    cleanupLocalResources,
    createMicrophoneTrack,
    createRtcClient,
    initializeToolkit,
    markStep,
    requestBrowserPermission,
    resetVisibleSession,
    waitForLocalAudioProbe,
  ]);

  const disconnect = useCallback(async () => {
    if (isDisconnectingRef.current) return;
    isDisconnectingRef.current = true;
    sessionRunRef.current += 1;

    try {
      markStep("disconnecting", "Encerrando sessao de voz.", "info");
      await cleanupLocalResources({ stopKnownAgent: true });
      setIsConnecting(false);
      setCurrentStep("idle");
      setMicrophoneErrorMessage("");
      setTranscripts([]);
      addLog("Sessao encerrada.", "info", "disconnected");
    } finally {
      isDisconnectingRef.current = false;
    }
  }, [addLog, cleanupLocalResources, markStep]);

  const toggleMicrophone = useCallback(async () => {
    const track = microphoneTrackRef.current;
    if (!track) return;

    const nextMuted = !isMicMuted;
    await track.setMuted(nextMuted);
    setIsMicMuted(nextMuted);
    addLog(nextMuted ? "Microfone mutado." : "Microfone reativado.", "info", "mic_mute");
  }, [addLog, isMicMuted]);

  useEffect(() => {
    function releaseActiveAgent() {
      const activeAgentId = currentAgentIdRef.current || readStoredActiveAgent()?.agentId;
      if (!activeAgentId) return;

      stopAgentKeepalive(activeAgentId);
      clearStoredActiveAgent(activeAgentId);
      currentAgentIdRef.current = null;
    }

    window.addEventListener("pagehide", releaseActiveAgent);
    window.addEventListener("beforeunload", releaseActiveAgent);

    return () => {
      window.removeEventListener("pagehide", releaseActiveAgent);
      window.removeEventListener("beforeunload", releaseActiveAgent);
      sessionRunRef.current += 1;
      cleanupLocalResources({ stopKnownAgent: false }).catch(() => {});
    };
  }, []);

  useEffect(() => {
    const isSpeaking =
      agentState === AgentState.SPEAKING || String(agentState).toLowerCase() === "speaking";
    const voiceAi = voiceAiRef.current;
    const agentUid = currentConfigRef.current?.agentUid;

    if (!isSpeaking || !voiceAi || !agentUid) return;
    if (microphoneLevel < 0.025) return;

    const now = Date.now();
    if (now - lastInterruptAtRef.current < 1600) return;
    lastInterruptAtRef.current = now;

    voiceAi
      .interrupt?.(String(agentUid))
      ?.then(() => addLog("Interrompi o agente para ouvir voce.", "warning", "agent_interrupted"))
      ?.catch((error) => {
        addLog(
          `Falha ao interromper agente: ${getErrorMessage(error, "erro desconhecido")}`,
          "warning",
          "agent_interrupt_failed",
        );
      });
  }, [addLog, agentState, microphoneLevel]);

  const lastTranscript = transcripts[transcripts.length - 1] ?? null;
  const userTranscriptCount = transcripts.filter((turn) => turn.type === "user").length;
  const agentTranscriptCount = transcripts.filter((turn) => turn.type === "agent").length;
  const diagnostics = {
    agentId,
    agentState,
    agentUid: config?.agentUid ?? "",
    channelName,
    currentStep,
    hasConfig: Boolean(config),
    isAgentStarted: Boolean(agentId),
    isMicrophoneLoading,
    isMicrophoneReady,
    isMicrophonePublished,
    microphoneErrorMessage,
    isRtcConnected,
    isRtmReady,
    isToolkitReady,
    lastTranscriptText: lastTranscript?.text ?? "",
    localUid: config?.uid ?? "",
    microphoneLevel,
    userTranscriptCount,
    agentTranscriptCount,
    agoraUserTranscriptCount: userTranscriptCount,
    transcriptCount: transcripts.length,
  };

  return {
    agentId,
    agentState,
    channelName,
    connect,
    diagnostics,
    disconnect,
    isConnected: Boolean(agentId),
    isConnecting,
    isMicMuted,
    isMicrophoneLoading,
    isMicrophoneReady,
    microphoneLevel,
    logs,
    microphoneError: microphoneErrorMessage ? new Error(microphoneErrorMessage) : null,
    microphoneErrorMessage,
    toggleMicrophone,
    transcripts,
  };
}
