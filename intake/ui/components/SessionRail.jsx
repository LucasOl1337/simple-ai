import { getSessionAgeLabel, getPublicSiteUrl } from "../utils";

export default function SessionRail({
  activeSessionId,
  onCreateSession,
  onDeleteSession,
  onSelectSession,
  sessions,
}) {
  return (
    <nav className="session-rail" aria-label="Sessoes do projeto">
      <div className="session-rail-head">
        <span>Projeto</span>
        <button
          aria-label="Criar nova sessão"
          className="session-new-button"
          onClick={onCreateSession}
          type="button"
        >
          +
        </button>
      </div>

      <div className="session-project">
        <span className="session-folder" aria-hidden="true" />
        <strong>simple-ai</strong>
      </div>

      <div className="session-list">
        {sessions.map((item) => (
          <div
            className={`session-row ${item.id === activeSessionId ? "is-active" : ""}`}
            key={item.id}
          >
            <button
              className="session-item"
              onClick={() => onSelectSession(item.id)}
              type="button"
            >
              <span className="session-item-main">
                <span className="session-item-title">{item.title || "Nova sessão"}</span>
                {getPublicSiteUrl(item.buildState) ? <span className="session-site-pill">site</span> : null}
              </span>
              <span className="session-item-time">{getSessionAgeLabel(item.updatedAt)}</span>
            </button>
            <button
              aria-label={`Excluir sessão ${item.title || "Nova sessão"}`}
              className="session-delete-button"
              onClick={() => onDeleteSession(item.id)}
              type="button"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </nav>
  );
}
