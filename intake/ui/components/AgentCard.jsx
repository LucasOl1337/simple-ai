import AgentIcon from "../agents/icons";

export default function AgentCard({ agent, isSelected, onSelect }) {
  function handleClick() {
    onSelect(agent.id);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(agent.id);
    }
  }

  return (
    <article
      aria-label={`Escolher agente ${agent.title}`}
      aria-pressed={isSelected}
      className={`agent-card ${isSelected ? "is-selected" : ""}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <AgentIcon className="agent-card-icon" id={agent.id} />
      <h3 className="agent-card-title">{agent.title}</h3>
      <p className="agent-card-desc">{agent.short}</p>
      <ul className="agent-card-examples">
        {agent.examples.slice(0, 3).map((example) => (
          <li key={example}>{example}</li>
        ))}
      </ul>
      <span className="agent-cta">
        {isSelected ? "Selecionado" : "Escolher"}
        <span aria-hidden="true" className="agent-cta-arrow">
          →
        </span>
      </span>
    </article>
  );
}
