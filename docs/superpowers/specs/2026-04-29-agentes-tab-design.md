# Aba "Agentes" — Especialistas por vertical

**Status**: Aprovado em conversa, V1 (mock/teste — sem alterar fluxo do builder ainda)
**Data**: 2026-04-29
**Branch**: L-SOUZA

## Contexto

A plataforma Simple.AI hoje tem 3 agentes de sistema (Intake, Builder, OCI Stub) invisíveis pro usuário. O conceito de "agentes" como **especialistas por vertical de negócio** é novo: cada agente é treinado pra um tipo de negócio (Padaria, Clínica, Salão...) e o usuário escolhe qual usar antes de começar a conversa. Inspiração visual: **Moveworks** — catálogo de skills em grid, polido e claro.

## Decisões aprovadas

| Tópico | Escolha |
|---|---|
| O que é a aba | Catálogo de NOVOS agentes especialistas por vertical/tarefa |
| Quem cria | Catálogo curado pela equipe (fechado) |
| Como o usuário usa | Escolhe ANTES de começar (opt-in explícito) |
| Navegação | Botão `AGENTES` no topbar, ao lado de `TESTE AGORA` |
| Comportamento V1 | Salva escolha em localStorage + chip no topbar; não muda fluxo do builder ainda ("tudo é teste") |
| Transição de view | Cross-fade simples (~200ms) |
| Catálogo inicial | 6 agentes: Padaria, Clínica, Salão, Oficina, E-commerce, Automático |

## Arquitetura

### Componentes novos

| Arquivo | Responsabilidade |
|---|---|
| `intake/ui/agents/catalog.js` | Array de objetos com os 6 agentes (id, icon, title, category, short, examples) |
| `intake/ui/components/AgentsPage.jsx` | Página inteira — header, filtro de categorias, grid de cards |
| `intake/ui/components/AgentCard.jsx` | Card individual reusável |
| `intake/ui/components/AgentChip.jsx` | Chip discreto no topbar mostrando agente ativo (com × pra desfazer) |

### Mudanças em arquivos existentes

- `intake/ui/App.jsx`:
  - `useState` pra `view` (`"whiteboard" | "agentes"`)
  - `useState` pra `selectedAgentId` (lê de localStorage no init)
  - Render condicional do conteúdo principal
  - Passa `selectedAgentId` + `onClearAgent` pro topbar
- `intake/ui/constants.js`: nova chave `SELECTED_AGENT_STORAGE_KEY = "simple-ai-agent-v1"`
- `intake/ui/styles.css`: blocos novos
  - `.agents-page`, `.agents-header`
  - `.agent-filter-pills`, `.agent-filter-pill[is-active]`
  - `.agent-grid` (grid responsivo, auto-fill, minmax(240px, 1fr))
  - `.agent-card` (com hover lift + accent border)
  - `.agent-card-icon`, `.agent-card-title`, `.agent-card-desc`, `.agent-cta`
  - `.agent-chip` (no topbar)
  - `.view-fade-enter` / `.view-fade-exit` (transição cross-fade)

### Schema dos agentes

```js
// intake/ui/agents/catalog.js
export const AGENTS_CATALOG = [
  {
    id: "padaria",
    icon: "🍞",
    title: "Padaria",
    category: "comercio",
    short: "Cardápio, horários, encomendas.",
    examples: ["Cardápio com fotos", "Horários e dias", "WhatsApp pra encomenda"],
  },
  // ... 5 outros
];

export const AGENT_CATEGORIES = [
  { id: "todos", label: "Todos" },
  { id: "comercio", label: "Comércio" },
  { id: "saude", label: "Saúde" },
  { id: "servicos", label: "Serviços" },
  { id: "beleza", label: "Beleza" },
];
```

## Comportamento ("tudo é teste")

1. Usuário clica `AGENTES` no topbar → view muda pra `agentes` (cross-fade)
2. Vê grid de 6 cards, pode filtrar por categoria
3. Clica `Escolher` em um card → salva `id` em localStorage e volta pra view `whiteboard`
4. Topbar agora mostra chip discreto: `Agente: Padaria ×` ao lado dos botões
5. Clicar `×` no chip remove a escolha (volta pro estado sem agente)
6. **A escolha NÃO modifica nada no fluxo conversacional ainda** — é só registro/feedback visual. Integração com prompt do Builder fica pra V2.

## Acessibilidade

- Texto sempre pt-BR direto, zero jargão técnico
- Cards: `<button>` ou `<article role="button">` com tabIndex e ENTER funciona como clique
- Filtros como `<button>` com `aria-pressed`
- Chip do agente: `<button>` com `aria-label="Remover agente Padaria"`
- Foco visual claro (outline accent)

## Verificação

1. Hard reload, abrir http://localhost:5173/
2. Clicar `AGENTES` no topbar → ver grid renderizado com 6 cards e filtros
3. Filtrar por categoria → grid atualiza
4. Clicar `Escolher` em um card → volta pra whiteboard, vê chip no topbar
5. Recarregar a página → chip persiste (localStorage)
6. Clicar `×` no chip → chip some
7. Toggle dark mode → tudo legível em ambos os temas
8. Resize pra mobile → grid colapsa pra 1 coluna, layout não quebra

## Fora de escopo (V2+)

- Integração real do agente escolhido com prompt do Builder (Agente 02)
- Editor de agentes pelo usuário (a decisão foi catálogo curado)
- Sugestão automática do agente pelo intake
- Hover/expansão de card mostrando exemplos visuais (mantém simples na V1)
