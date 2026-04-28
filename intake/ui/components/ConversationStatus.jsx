import { getCurrentQuestion, getNotepadState } from "../../engine";

export default function ConversationStatus({ buildState, session }) {
  if (buildState?.status === "done") {
    return (
      <div className="conversation-status conversation-status-done">
        <span>Site pronto</span>
        <strong>Abrir pela lousa</strong>
      </div>
    );
  }

  if (buildState?.status === "building" || buildState?.status === "starting") {
    return (
      <div className="conversation-status">
        <span>Primeira versão</span>
        <strong>Montando seu site</strong>
        <div className="conversation-progress" aria-hidden="true">
          <i style={{ width: "78%" }} />
        </div>
      </div>
    );
  }

  if (buildState?.status === "error") {
    return (
      <div className="conversation-status conversation-status-error">
        <span>Construção pausada</span>
        <strong>Toque em tentar de novo na lousa</strong>
      </div>
    );
  }

  const notepadState = session ? getNotepadState(session) : null;
  const currentQuestion = session ? getCurrentQuestion(session) : null;
  const progress = notepadState?.totalConfidence ?? 0;
  const title = notepadState?.readyToBuild
    ? "Já consigo montar uma primeira versão"
    : currentQuestion?.question || "Comece me contando sobre o seu negócio";

  return (
    <div className="conversation-status">
      <span>{session ? `${progress}% entendido` : "Conversa inicial"}</span>
      <strong>{title}</strong>
      <div className="conversation-progress" aria-hidden="true">
        <i style={{ width: `${Math.max(8, Math.min(progress, 100))}%` }} />
      </div>
    </div>
  );
}
