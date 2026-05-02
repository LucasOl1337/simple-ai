import { useMemo, useState } from "react";
import { AGENTS_CATALOG, AGENT_CATEGORIES } from "../agents/catalog";
import AgentCard from "./AgentCard";

export default function AgentsPage({ selectedAgentId, onSelectAgent }) {
  const [activeCategory, setActiveCategory] = useState("todos");

  const visibleAgents = useMemo(() => {
    if (activeCategory === "todos") return AGENTS_CATALOG;
    return AGENTS_CATALOG.filter(
      (agent) => agent.category === activeCategory || agent.id === "auto",
    );
  }, [activeCategory]);

  return (
    <section className="agents-page" aria-label="Agentes especialistas">
      <header className="agents-header">
        <h2>Escolha o especialista certo pro seu negócio</h2>
        <p>
          Cada agente foi treinado pra um tipo de negócio. Escolha o seu ou
          deixa no automático que a gente decide pelo caminho.
        </p>
      </header>

      <div className="agent-filter-pills" role="tablist" aria-label="Filtrar por categoria">
        {AGENT_CATEGORIES.map((category) => (
          <button
            aria-pressed={activeCategory === category.id}
            className={`agent-filter-pill ${activeCategory === category.id ? "is-active" : ""}`}
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            role="tab"
            type="button"
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="agent-grid">
        {visibleAgents.map((agent) => (
          <AgentCard
            agent={agent}
            isSelected={selectedAgentId === agent.id}
            key={agent.id}
            onSelect={onSelectAgent}
          />
        ))}
      </div>
    </section>
  );
}
