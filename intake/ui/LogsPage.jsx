import { useEffect, useMemo, useState } from "react";

const LEVELS = ["all", "error", "warn", "info"];

function formatTime(ts) {
  if (!ts) return "--:--:--";
  return new Date(ts * 1000).toLocaleTimeString("pt-BR", { hour12: false });
}

function summarizeDetails(details = {}) {
  const keys = ["builder_model", "provider", "business_name", "segment", "generated", "planned", "site_url", "error"];
  return keys
    .filter((key) => details[key] !== undefined && details[key] !== null && details[key] !== "")
    .map((key) => `${key}: ${typeof details[key] === "object" ? JSON.stringify(details[key]) : details[key]}`);
}

export default function LogsPage() {
  const [events, setEvents] = useState([]);
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState("carregando");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const suffix = level === "all" ? "" : `&level=${encodeURIComponent(level)}`;
        const response = await fetch(`/api/v1/logs?limit=160${suffix}`);
        const result = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok || result.code !== 0) {
          throw new Error(result.detail || result.msg || `HTTP ${response.status}`);
        }
        setEvents(result.data?.events || []);
        setStatus("ao vivo");
      } catch (error) {
        if (!cancelled) setStatus(error?.message || "erro ao carregar");
      }
    }
    load();
    const timer = window.setInterval(load, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [level]);

  const stats = useMemo(() => {
    return events.reduce(
      (acc, event) => {
        acc.total += 1;
        acc[event.level] = (acc[event.level] || 0) + 1;
        return acc;
      },
      { total: 0, error: 0, warn: 0, info: 0 },
    );
  }, [events]);

  return (
    <div className="logs-shell">
      <header className="logs-hero">
        <div>
          <p className="logs-kicker">Simple AI runtime</p>
          <h1>Logs filtrados</h1>
          <p>Eventos-chave do build, assets, modelo textual, QA e falhas. Sem ruído de servidor.</p>
        </div>
        <a href="/" className="logs-back">voltar ao builder</a>
      </header>

      <section className="logs-toolbar">
        <div className="logs-status">
          <span className="chat-status-dot is-online" aria-hidden="true" />
          {status}
        </div>
        <div className="logs-stats">
          <strong>{stats.total}</strong> eventos
          <span>{stats.error} erros</span>
          <span>{stats.warn} avisos</span>
        </div>
        <div className="logs-filters" aria-label="Filtro de severidade">
          {LEVELS.map((item) => (
            <button
              className={level === item ? "is-active" : ""}
              key={item}
              onClick={() => setLevel(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <main className="logs-list">
        {events.length === 0 ? (
          <article className="log-event is-empty">
            <strong>Nenhum evento ainda.</strong>
            <p>Rode o teste rápido ou gere um site para popular esta tela.</p>
          </article>
        ) : events.slice().reverse().map((event) => {
          const details = summarizeDetails(event.details);
          return (
            <article className={`log-event level-${event.level}`} key={event.id}>
              <div className="log-event-head">
                <span>{formatTime(event.ts)}</span>
                <strong>{event.message}</strong>
                <em>{event.source}{event.stage ? ` / ${event.stage}` : ""}</em>
              </div>
              <div className="log-event-meta">
                <span className="log-level">{event.level}</span>
                {event.job_id ? <span>{event.job_id}</span> : null}
              </div>
              {details.length ? (
                <ul className="log-details">
                  {details.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : null}
              {event.details && Object.keys(event.details).length ? (
                <details className="log-raw">
                  <summary>detalhes completos</summary>
                  <pre>{JSON.stringify(event.details, null, 2)}</pre>
                </details>
              ) : null}
            </article>
          );
        })}
      </main>
    </div>
  );
}
