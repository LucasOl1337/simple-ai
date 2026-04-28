// ─────────────────────────────────────────────────────────────
// Content Creator — planner (skeleton)
//
// SPEC: .simpleai/agents/content-creator/README.md
// Status: skeleton. So define o shape minimo para o orchestrator
// nao quebrar ao roteiar uma mensagem pra esse agente.
// ─────────────────────────────────────────────────────────────

export const AGENT_ID = "content-creator";

export const PHASES = [
  { id: "audience", label: "Entender publico", description: "Quem voce quer alcancar" },
  { id: "goal", label: "Entender objetivo", description: "Vender, fidelizar, educar, anunciar" },
  { id: "tone", label: "Definir tom", description: "Voz da marca" },
  { id: "deliver", label: "Entregar conteudo", description: "Texto pronto pra publicar" },
];

export const CRITICAL_FIELDS = ["business_type", "target_audience", "platforms"];

export function createSession() {
  return {
    agentId: AGENT_ID,
    phase: "audience",
    notepad: {},
    history: [],
  };
}

export function getCurrentQuestion(_session) {
  return {
    id: "audience_intro",
    question: "Conta pra mim — quem voce quer alcancar com esses posts?",
    placeholder: "Ex.: maes de bairro, jovens da regiao, clientes antigos",
    extracts: ["target_audience"],
    required: true,
  };
}

export function submitAnswer(session, message) {
  session.history.push({ role: "user", content: message });
  return {
    handled: false,
    reason: "skeleton-not-implemented",
    note: "Spec em .simpleai/agents/content-creator/. Implementar fases + geracao de conteudo.",
  };
}

export function getNotepadState(session) {
  return session?.notepad ?? {};
}

export function buildSummary(_session) {
  return null;
}

export function isReadyToCreate(session) {
  if (!session?.notepad) return false;
  return CRITICAL_FIELDS.every((f) => (session.notepad[f]?.confidence ?? 0) >= 0.5);
}
