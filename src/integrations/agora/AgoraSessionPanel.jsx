import AgoraRTC from "agora-rtc-sdk-ng";
import { useAgoraSession } from "./useAgoraSession";

try {
  AgoraRTC.setParameter("ENABLE_AUDIO_PTS_METADATA", true);
} catch {}

try {
  AgoraRTC.setArea({ areaCode: "GLOBAL" });
} catch (error) {
  console.warn("[Agora] setArea failed", error);
}

function AgoraVoiceButton({ briefingContext, priorityQuestion, onTranscriptChange }) {
  const { connect, disconnect, isConnected, isConnecting } = useAgoraSession({
    briefingContext,
    priorityQuestion,
    onTranscriptChange,
    language: "pt-BR",
  });

  function handleToggle() {
    if (isConnected || isConnecting) {
      disconnect();
    } else {
      connect();
    }
  }

  const status = isConnected ? "live" : isConnecting ? "connecting" : "idle";
  const label = isConnected
    ? "Encerrar voz"
    : isConnecting
      ? "Conectando..."
      : "Falar com a Simple";

  return (
    <button
      aria-label={label}
      className={`agora-voice-button is-${status}`}
      onClick={handleToggle}
      type="button"
    >
      <span className="agora-voice-pulse" />
      <span className="agora-voice-label">{label}</span>
    </button>
  );
}

export default function AgoraSessionPanel(props) {
  return <AgoraVoiceButton {...props} />;
}
