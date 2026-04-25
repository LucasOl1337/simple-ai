import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { AgentState, AgoraVoiceAI, AgoraVoiceAIEvents } from "agora-agent-client-toolkit";
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

function mapTranscript(chatHistory) {
  return [...chatHistory]
    .sort((first, second) => {
      if (first.turn_id !== second.turn_id) return first.turn_id - second.turn_id;
      return Number(first.uid) - Number(second.uid);
    })
    .map((item) => ({
      id: `${item.turn_id}-${item.uid}-${item._time}`,
      type: Number(item.uid) !== 0 ? "agent" : "user",
      text: item.text || "",
      status: item.status,
      timestamp: item._time || Date.now(),
    }));
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

  const rtmClientRef = useRef(null);
  const voiceAiRef = useRef(null);
  const currentAgentIdRef = useRef(null);

  const addLog = useEffectEvent((message, level = "info") => {
    setLogs((current) => [...current, createLog(message, level)]);
  });

  const emitTranscriptChange = useEffectEvent((items) => {
    onTranscriptChange?.(items);
  });

  useEffect(() => {
    emitTranscriptChange(transcripts);
  }, [transcripts, emitTranscriptChange]);

  const { localMicrophoneTrack } = useLocalMicrophoneTrack(shouldJoin, {
    AEC: true,
    ANS: false,
    AGC: true,
  });

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

  useClientEvent(client, "user-published", async (user, mediaType) => {
    if (mediaType !== "audio") return;

    await client.subscribe(user, mediaType);
    user.audioTrack?.play();
  });

  useClientEvent(client, "connection-state-change", (state, _previous, reason) => {
    if (state === "CONNECTED") addLog("RTC conectado.", "success");
    if (state === "DISCONNECTED") addLog(`RTC desconectado: ${reason || "sem detalhe"}.`, "warning");
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
    if (!isRtcConnected || !config || !client || currentAgentIdRef.current) return;

    let active = true;

    async function startRealtimeStack() {
      try {
        addLog("Inicializando RTM.", "info");
        const rtmClient = new AgoraRTM.RTM(config.appId, String(config.uid));
        rtmClientRef.current = rtmClient;
        await rtmClient.login({ token: config.token });
        await rtmClient.subscribe(config.channel);
        addLog("RTM ativo no canal.", "success");

        addLog("Inicializando toolkit de conversa.", "info");
        const voiceAi = await AgoraVoiceAI.init({
          rtcEngine: client,
          rtmConfig: { rtmEngine: rtmClient },
          enableLog: true,
        });

        if (!active) return;

        voiceAiRef.current = voiceAi;
        voiceAi.subscribeMessage(config.channel);
        voiceAi.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (chatHistory) => {
          setTranscripts(mapTranscript(chatHistory));
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
        addLog("Toolkit da Agora pronto.", "success");

        const nextAgentId = await startAgent({
          channelName: config.channel,
          rtcUid: String(config.agentUid),
          userUid: String(config.uid),
          briefingContext,
          priorityQuestion,
          language,
        });

        if (!active) return;

        currentAgentIdRef.current = nextAgentId;
        setAgentId(nextAgentId);
        setIsConnecting(false);
        addLog(`Agente iniciado (${nextAgentId}).`, "success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Falha desconhecida ao iniciar a sessao.";
        addLog(message, "error");
        setIsConnecting(false);
        setShouldJoin(false);
        await cleanup();
      }
    }

    startRealtimeStack();

    return () => {
      active = false;
    };
  }, [
    addLog,
    briefingContext,
    cleanup,
    client,
    config,
    isRtcConnected,
    language,
    priorityQuestion,
  ]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setLogs([]);
    setTranscripts([]);
    setAgentId(null);
    setChannelName("");
    setAgentState(AgentState.IDLE);
    currentAgentIdRef.current = null;

    try {
      addLog("Solicitando configuracao da Agora.", "info");
      const configData = await getConfig();
      const nextConfig = {
        appId: configData.app_id,
        channel: configData.channel_name,
        token: configData.token,
        uid: Number(configData.uid),
        agentUid: Number(configData.agent_uid),
      };

      setConfig(nextConfig);
      setChannelName(nextConfig.channel);
      setShouldJoin(true);
      addLog("Configuracao pronta. Entrando no canal.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha desconhecida ao obter configuracao.";
      addLog(message, "error");
      setIsConnecting(false);
    }
  }, [addLog]);

  const disconnect = useCallback(async () => {
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
    addLog("Sessao encerrada.", "info");
  }, [addLog, cleanup, client, localMicrophoneTrack]);

  const toggleMicrophone = useCallback(async () => {
    if (!localMicrophoneTrack) return;

    const nextMuted = !isMicMuted;
    await localMicrophoneTrack.setMuted(nextMuted);
    setIsMicMuted(nextMuted);
    addLog(nextMuted ? "Microfone mutado." : "Microfone reativado.", "info");
  }, [addLog, isMicMuted, localMicrophoneTrack]);

  return {
    agentId,
    agentState,
    channelName,
    connect,
    disconnect,
    isConnected: isRtcConnected,
    isConnecting,
    isMicMuted,
    logs,
    toggleMicrophone,
    transcripts,
  };
}
