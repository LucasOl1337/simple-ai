import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import {
  AgentState,
  AgoraVoiceAI,
  AgoraVoiceAIEvents,
  MessageType,
} from "agora-agent-client-toolkit";
import AgoraRTM from "agora-rtm";
import {
  useClientEvent,
  useIsConnected,
  useJoin,
  useLocalMicrophoneTrack,
  usePublish,
  useRTCClient,
} from "agora-rtc-react";
import { getConfig, startAgent, stopAgent } from "./api";

function createLog(message, level = "info") {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    level,
    message,
    timestamp: Date.now(),
  };
}

function getTranscriptType(item, config) {
  const uid = String(item.uid ?? "");
  const object = item.metadata?.object;

  if (uid === String(config?.uid)) return "user";
  if (uid === String(config?.agentUid)) return "agent";
  if (object === MessageType.USER_TRANSCRIPTION) return "user";
  if (object === MessageType.AGENT_TRANSCRIPTION) return "agent";

  return "agent";
}

function mapTranscript(chatHistory, config) {
  return [...chatHistory]
    .sort((first, second) => {
      if (first.turn_id !== second.turn_id) return first.turn_id - second.turn_id;
      return Number(first.uid) - Number(second.uid);
    })
    .map((item) => ({
      id: `${item.turn_id}-${item.uid}-${item._time}`,
      type: getTranscriptType(item, config),
      text: item.text || "",
      status: item.status,
      timestamp: item._time || Date.now(),
    }));
}

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

export function useAgoraSession({
  briefingContext,
  priorityQuestion,
  onTranscriptChange,
  language = "pt-BR",
}) {
  const client = useRTCClient();
  const isRtcConnected = useIsConnected();
  const [config, setConfig] = useState(null);
  const [shouldJoin, setShouldJoin] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [agentState, setAgentState] = useState(AgentState.IDLE);
  const [transcripts, setTranscripts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [channelName, setChannelName] = useState("");
  const [agentId, setAgentId] = useState(null);
  const [isRtmReady, setIsRtmReady] = useState(false);
  const [isToolkitReady, setIsToolkitReady] = useState(false);
  const [microphoneLevel, setMicrophoneLevel] = useState(0);

  const rtmClientRef = useRef(null);
  const voiceAiRef = useRef(null);
  const currentAgentIdRef = useRef(null);
  const isStartingRealtimeRef = useRef(false);
  const lastMicrophoneErrorRef = useRef("");
  const didLogMicrophoneReadyRef = useRef(false);
  const didLogMicrophonePublishedRef = useRef(false);
  const attemptedChannelRef = useRef("");
  const briefingContextRef = useRef(briefingContext);
  const priorityQuestionRef = useRef(priorityQuestion);
  const languageRef = useRef(language);
  const sessionRunRef = useRef(0);
  const lastInterruptAtRef = useRef(0);

  const addLog = useEffectEvent((message, level = "info") => {
    setLogs((current) => [...current, createLog(message, level)]);
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

  const {
    localMicrophoneTrack,
    error: microphoneError,
    isLoading: isMicrophoneLoading,
  } = useLocalMicrophoneTrack(shouldJoin, {
    AEC: true,
    ANS: false,
    AGC: true,
  });
  const microphoneErrorMessage = microphoneError
    ? microphoneError.message ||
      microphoneError.cause?.message ||
      "Microfone bloqueado pelo navegador."
    : "";

  useEffect(() => {
    if (!microphoneErrorMessage) {
      lastMicrophoneErrorRef.current = "";
      return;
    }
    if (lastMicrophoneErrorRef.current === microphoneErrorMessage) return;

    lastMicrophoneErrorRef.current = microphoneErrorMessage;
    setIsConnecting(false);
    addLog(
      "Microfone bloqueado pelo navegador. Libere a permissao para conversar por voz.",
      "error",
    );
  }, [addLog, microphoneErrorMessage]);

  useEffect(() => {
    if (!localMicrophoneTrack) {
      setMicrophoneLevel(0);
      didLogMicrophoneReadyRef.current = false;
      didLogMicrophonePublishedRef.current = false;
      return undefined;
    }

    if (!didLogMicrophoneReadyRef.current) {
      didLogMicrophoneReadyRef.current = true;
      addLog("Microfone capturado pelo navegador.", "success");
    }

    const interval = window.setInterval(() => {
      const level = Number(localMicrophoneTrack.getVolumeLevel?.() ?? 0);
      setMicrophoneLevel(Number.isFinite(level) ? level : 0);
    }, 250);

    return () => window.clearInterval(interval);
  }, [addLog, localMicrophoneTrack]);

  useJoin(
    config
      ? {
          appid: config.appId,
          channel: config.channel,
          token: config.token,
          uid: config.uid,
        }
      : { appid: "", channel: "", token: null, uid: 0 },
    shouldJoin && !!config,
  );

  usePublish(localMicrophoneTrack ? [localMicrophoneTrack] : []);

  useEffect(() => {
    if (!isRtcConnected || !localMicrophoneTrack || didLogMicrophonePublishedRef.current) return;
    didLogMicrophonePublishedRef.current = true;
    addLog("Microfone publicado no canal RTC.", "success");
  }, [addLog, isRtcConnected, localMicrophoneTrack]);

  useClientEvent(client, "user-published", async (user, mediaType) => {
    if (mediaType !== "audio") return;

    await client.subscribe(user, mediaType);
    user.audioTrack?.play();
  });

  useClientEvent(client, "connection-state-change", (state, previous, reason) => {
    console.log("[Agora] RTC state change", { state, previous, reason });
    if (state === "CONNECTED") addLog("Sessão conectada.", "success");
    if (state === "DISCONNECTED") addLog(`Sessão desconectada: ${reason || "sem detalhe"}.`, "warning");
    if (state === "FAILED") addLog(`Sessão falhou: ${reason || "sem detalhe"}.`, "error");
  });

  const cleanup = useEffectEvent(async () => {
    if (voiceAiRef.current) {
      try {
        voiceAiRef.current.unsubscribe();
        voiceAiRef.current.destroy();
      } catch {}
      voiceAiRef.current = null;
    }

    if (rtmClientRef.current) {
      try {
        await rtmClientRef.current.logout();
      } catch {}
      rtmClientRef.current = null;
    }
  });

  useEffect(() => {
    console.log("[Agora] startRealtimeStack gate check", {
      isRtcConnected,
      hasConfig: !!config,
      hasClient: !!client,
      alreadyHasAgent: !!currentAgentIdRef.current,
      isStartingRealtime: isStartingRealtimeRef.current,
      attemptedChannel: attemptedChannelRef.current,
      hasMicrophoneTrack: !!localMicrophoneTrack,
    });
    if (
      !isRtcConnected ||
      !config ||
      !client ||
      !localMicrophoneTrack ||
      currentAgentIdRef.current ||
      isStartingRealtimeRef.current ||
      attemptedChannelRef.current === config.channel
    ) {
      return;
    }

    const runId = sessionRunRef.current;

    async function startRealtimeStack() {
      console.log("[Agora] starting realtime stack");
      isStartingRealtimeRef.current = true;
      attemptedChannelRef.current = config.channel;
      try {
        addLog("Inicializando RTM.", "info");
        const rtmClient = new AgoraRTM.RTM(config.appId, String(config.uid), {
          useStringUserId: true,
        });
        rtmClientRef.current = rtmClient;
        await rtmClient.login({ token: config.token });
        await rtmClient.subscribe(config.channel);
        setIsRtmReady(true);
        addLog("RTM ativo no canal.", "success");

        addLog("Inicializando toolkit de conversa.", "info");
        let voiceAi = null;
        try {
          voiceAi = await withTimeout(
            AgoraVoiceAI.init({
              rtcEngine: client,
              rtmConfig: { rtmEngine: rtmClient },
              enableLog: true,
            }),
            9000,
            "Toolkit de transcricao nao respondeu em 9s. O agente esta ativo, mas as legendas podem nao aparecer.",
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Toolkit de transcricao falhou.";
          addLog(message, "error");
        }

        if (runId !== sessionRunRef.current) {
          await cleanup();
          return;
        }

        if (voiceAi) {
          voiceAiRef.current = voiceAi;
          voiceAi.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (chatHistory) => {
            console.log("[Agora] transcript updated", {
              localUid: config.uid,
              agentUid: config.agentUid,
              turns: chatHistory.map((item) => ({
                uid: item.uid,
                object: item.metadata?.object,
                status: item.status,
                text: item.text,
              })),
            });
            setTranscripts(mapTranscript(chatHistory, config));
          });
          voiceAi.on(AgoraVoiceAIEvents.AGENT_STATE_CHANGED, (_agentUserId, event) => {
            setAgentState(event.state);
          });
          voiceAi.on(AgoraVoiceAIEvents.AGENT_ERROR, (_agentUserId, error) => {
            addLog(
              `Erro do agente [${error.type}] ${error.message} (${error.code}).`,
              "error",
            );
          });
          voiceAi.on(AgoraVoiceAIEvents.MESSAGE_ERROR, (_agentUserId, error) => {
            addLog(
              `Erro de mensagem [${error.type}] ${error.message} (${error.code}).`,
              "error",
            );
          });
          voiceAi.subscribeMessage(config.channel);
          setIsToolkitReady(true);
          addLog("Toolkit da Agora pronto.", "success");
        }

        addLog("Solicitando inicio do agente Convo AI.", "info");
        const nextAgentId = await withTimeout(
          startAgent({
            channelName: config.channel,
            rtcUid: String(config.agentUid),
            userUid: String(config.uid),
            briefingContext: briefingContextRef.current,
            priorityQuestion: priorityQuestionRef.current,
            language: languageRef.current,
          }),
          15000,
          "Agente Convo AI nao respondeu em 15s.",
        );

        if (runId !== sessionRunRef.current) {
          await cleanup();
          return;
        }

        currentAgentIdRef.current = nextAgentId;
        setAgentId(nextAgentId);
        setIsConnecting(false);
        addLog(`Agente iniciado (${nextAgentId}).`, "success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Falha desconhecida ao iniciar a sessão.";
        addLog(message, "error");
        setIsConnecting(false);
        setShouldJoin(false);
        setConfig(null);
        setIsRtmReady(false);
        setIsToolkitReady(false);
        try {
          await client.leave();
        } catch {}
        await cleanup();
      } finally {
        isStartingRealtimeRef.current = false;
      }
    }

    startRealtimeStack();

    return undefined;
  }, [
    addLog,
    cleanup,
    client,
    config,
    isRtcConnected,
    localMicrophoneTrack,
  ]);

  useEffect(() => {
    if (agentState !== AgentState.SPEAKING && String(agentState).toLowerCase() !== "speaking") return;
    if (!voiceAiRef.current || !config?.agentUid) return;
    if (microphoneLevel < 0.025) return;

    const now = Date.now();
    if (now - lastInterruptAtRef.current < 1600) return;
    lastInterruptAtRef.current = now;

    voiceAiRef.current
      .interrupt(String(config.agentUid))
      .then(() => addLog("Interrompi o agente para ouvir voce.", "warning"))
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Falha ao interromper o agente.";
        addLog(message, "error");
      });
  }, [addLog, agentState, config?.agentUid, microphoneLevel]);

  const connect = useCallback(async () => {
    sessionRunRef.current += 1;
    setIsConnecting(true);
    setLogs([]);
    setTranscripts([]);
    setAgentId(null);
    setChannelName("");
    setAgentState(AgentState.IDLE);
    currentAgentIdRef.current = null;
    attemptedChannelRef.current = "";
    lastInterruptAtRef.current = 0;
    lastMicrophoneErrorRef.current = "";
    didLogMicrophoneReadyRef.current = false;
    didLogMicrophonePublishedRef.current = false;
    setIsRtmReady(false);
    setIsToolkitReady(false);
    setMicrophoneLevel(0);

    try {
      addLog("Solicitando configuração da Agora.", "info");
      const configData = await getConfig();
      const nextConfig = {
        appId: configData.app_id,
        channel: configData.channel_name,
        token: configData.token,
        uid: String(configData.uid),
        agentUid: String(configData.agent_uid),
      };
      console.log("[Agora] config received", { channel: nextConfig.channel, uid: nextConfig.uid, agentUid: nextConfig.agentUid });

      setConfig(nextConfig);
      setChannelName(nextConfig.channel);
      setShouldJoin(true);
      addLog("Configuração pronta. Entrando no canal.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha desconhecida ao obter configuração.";
      addLog(message, "error");
      setIsConnecting(false);
    }
  }, [addLog]);

  const disconnect = useCallback(async () => {
    sessionRunRef.current += 1;

    if (currentAgentIdRef.current) {
      try {
        await stopAgent(currentAgentIdRef.current);
        addLog("Agente encerrado.", "success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Falha ao encerrar o agente.";
        addLog(message, "error");
      }
      currentAgentIdRef.current = null;
    }

    await cleanup();
    isStartingRealtimeRef.current = false;

    if (localMicrophoneTrack) {
      localMicrophoneTrack.stop();
      localMicrophoneTrack.close();
    }

    try {
      await client.leave();
    } catch {}

    setShouldJoin(false);
    setConfig(null);
    setIsConnecting(false);
    setIsMicMuted(false);
    setAgentState(AgentState.IDLE);
    setChannelName("");
    setAgentId(null);
    setTranscripts([]);
    setIsRtmReady(false);
    setIsToolkitReady(false);
    setMicrophoneLevel(0);
    lastMicrophoneErrorRef.current = "";
    attemptedChannelRef.current = "";
    lastInterruptAtRef.current = 0;
    didLogMicrophoneReadyRef.current = false;
    didLogMicrophonePublishedRef.current = false;
    addLog("Sessao encerrada.", "info");
  }, [addLog, cleanup, client, localMicrophoneTrack]);

  const toggleMicrophone = useCallback(async () => {
    if (!localMicrophoneTrack) return;

    const nextMuted = !isMicMuted;
    await localMicrophoneTrack.setMuted(nextMuted);
    setIsMicMuted(nextMuted);
    addLog(nextMuted ? "Microfone mutado." : "Microfone reativado.", "info");
  }, [addLog, isMicMuted, localMicrophoneTrack]);

  const lastTranscript = transcripts[transcripts.length - 1] ?? null;
  const userTranscriptCount = transcripts.filter((turn) => turn.type === "user").length;
  const agentTranscriptCount = transcripts.filter((turn) => turn.type === "agent").length;
  const diagnostics = {
    agentId,
    agentState,
    agentUid: config?.agentUid ?? "",
    channelName,
    hasConfig: Boolean(config),
    isAgentStarted: Boolean(agentId),
    isMicrophoneLoading,
    isMicrophoneReady: Boolean(localMicrophoneTrack && !microphoneError),
    microphoneErrorMessage,
    isRtcConnected,
    isRtmReady,
    isToolkitReady,
    lastTranscriptText: lastTranscript?.text ?? "",
    localUid: config?.uid ?? "",
    microphoneLevel,
    userTranscriptCount,
    agentTranscriptCount,
    transcriptCount: transcripts.length,
  };

  return {
    agentId,
    agentState,
    channelName,
    connect,
    diagnostics,
    disconnect,
    isConnected: isRtcConnected,
    isConnecting,
    isMicMuted,
    isMicrophoneLoading,
    isMicrophoneReady: Boolean(localMicrophoneTrack && !microphoneError),
    microphoneLevel,
    logs,
    microphoneError,
    microphoneErrorMessage,
    toggleMicrophone,
    transcripts,
  };
}
