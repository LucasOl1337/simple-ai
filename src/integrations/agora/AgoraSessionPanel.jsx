import { useDeferredValue, useState } from "react";
import { AgentState, TurnStatus } from "agora-agent-client-toolkit";
import AgoraRTC from "agora-rtc-sdk-ng";
import { AgoraRTCProvider } from "agora-rtc-react";
import { useAgoraSession } from "./useAgoraSession";

try {
  AgoraRTC.setParameter("ENABLE_AUDIO_PTS", true);
} catch {}

const agentStateLabels = {
  [AgentState.IDLE]: "idle",
  [AgentState.LISTENING]: "ouvindo",
  [AgentState.THINKING]: "processando",
  [AgentState.SPEAKING]: "respondendo",
  [AgentState.SILENT]: "silencioso",
};

function formatClock(timestamp) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function AgoraSessionSurface({
  briefingContext,
  priorityQuestion,
  onTranscriptChange,
}) {
  const {
    agentId,
    agentState,
    channelName,
    connect,
    disconnect,
    isConnected,
    isConnecting,
    isMicMuted,
    logs,
    toggleMicrophone,
    transcripts,
  } = useAgoraSession({
    briefingContext,
    priorityQuestion,
    onTranscriptChange,
    language: "pt-BR",
  });

  const deferredTranscripts = useDeferredValue(transcripts);
  const deferredLogs = useDeferredValue(logs);
  const latestTurns = deferredTranscripts.slice(-4).reverse();
  const latestLogs = deferredLogs.slice(-4).reverse();

  return (
    <section className="agora-live-card">
      <div className="agora-live-head">
        <div>
          <p className="card-eyebrow">Agora ConvoAI Core</p>
          <h3>Voz em tempo real</h3>
        </div>
        <span className={`agora-badge ${isConnected ? "is-live" : isConnecting ? "is-warm" : ""}`}>
          {isConnected ? "ao vivo" : isConnecting ? "conectando" : "parado"}
        </span>
      </div>

      <div className="agora-live-meta">
        <div>
          <span>Estado</span>
          <strong>{agentStateLabels[agentState] || "idle"}</strong>
        </div>
        <div>
          <span>Canal</span>
          <strong>{channelName || "aguardando"}</strong>
        </div>
        <div>
          <span>Agent ID</span>
          <strong>{agentId || "aguardando"}</strong>
        </div>
      </div>

      <div className="agora-live-actions">
        <button
          className="board-button"
          disabled={isConnecting || isConnected}
          onClick={connect}
          type="button"
        >
          {isConnecting ? "Iniciando..." : isConnected ? "Sessao ativa" : "Iniciar Agora"}
        </button>
        <button
          className="ghost-button"
          disabled={!isConnected}
          onClick={toggleMicrophone}
          type="button"
        >
          {isMicMuted ? "Ativar mic" : "Mutar mic"}
        </button>
        <button
          className="ghost-button"
          disabled={!isConnected && !isConnecting}
          onClick={disconnect}
          type="button"
        >
          Encerrar
        </button>
      </div>

      <div className="agora-live-columns">
        <div className="agora-mini-panel">
          <div className="agora-mini-head">
            <strong>Ultimas falas</strong>
            <span>{deferredTranscripts.length}</span>
          </div>
          <div className="agora-mini-feed">
            {latestTurns.length === 0 ? (
              <p className="agora-empty-copy">
                O transcript da sessao aparece aqui.
              </p>
            ) : (
              latestTurns.map((item) => (
                <article className="agora-turn" key={item.id}>
                  <div className="agora-turn-meta">
                    <span>{item.type === "agent" ? "Agente" : "Usuario"}</span>
                    <span>{formatClock(item.timestamp)}</span>
                  </div>
                  <p>{item.text || "..."}</p>
                  {item.status === TurnStatus.IN_PROGRESS ? <small>em andamento</small> : null}
                </article>
              ))
            )}
          </div>
        </div>

        <div className="agora-mini-panel">
          <div className="agora-mini-head">
            <strong>Runtime</strong>
            <span>{deferredLogs.length}</span>
          </div>
          <div className="agora-mini-feed">
            {latestLogs.length === 0 ? (
              <p className="agora-empty-copy">
                Os eventos tecnicos da sessao aparecem aqui.
              </p>
            ) : (
              latestLogs.map((item) => (
                <div className={`agora-log ${item.level}`} key={item.id}>
                  <span>{formatClock(item.timestamp)}</span>
                  <p>{item.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="agora-priority">
        <span>Pergunta critica atual</span>
        <strong>{priorityQuestion || "Briefing concluido"}</strong>
        <p>{briefingContext}</p>
      </div>
    </section>
  );
}

export default function AgoraSessionPanel(props) {
  const [client] = useState(() => AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }));

  return (
    <AgoraRTCProvider client={client}>
      <AgoraSessionSurface {...props} />
    </AgoraRTCProvider>
  );
}
