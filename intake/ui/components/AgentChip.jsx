import { AGENTS_CATALOG } from "../agents/catalog";
import AgentIcon from "../agents/icons";

export default function AgentChip({ agentId, onClear }) {
  const agent = AGENTS_CATALOG.find((item) => item.id === agentId);
  if (!agent) return null;

  return (
    <span className="agent-chip" role="status">
      <AgentIcon className="agent-chip-icon" id={agent.id} />
      <span className="agent-chip-label">
        Agente: <strong>{agent.title}</strong>
      </span>
      <button
        aria-label={`Remover agente ${agent.title}`}
        className="agent-chip-clear"
        onClick={onClear}
        type="button"
      >
        ×
      </button>
    </span>
  );
}
