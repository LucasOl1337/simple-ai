// ─────────────────────────────────────────────────────────────
// Customer Support — planner (skeleton)
//
// SPEC: .simpleai/agents/customer-support/README.md
// Status: skeleton. So define o shape minimo para o orchestrator
// nao quebrar ao roteiar uma mensagem pra esse agente.
// ─────────────────────────────────────────────────────────────

export const AGENT_ID = "customer-support";

export const PHASES = [
  { id: "context", label: "Entender contexto", description: "Quem e o cliente e o que ele perguntou" },
  { id: "tone", label: "Calibrar tom", description: "Como o usuario quer soar" },
  { id: "draft", label: "Esbocar resposta", description: "Propor uma resposta inicial" },
  { id: "refine", label: "Refinar", description: "Ajustar com feedback do usuario" },
];

export const CRITICAL_FIELDS = ["business_type", "common_questions", "response_tone"];

export function createSession() {
  return {
    agentId: AGENT_ID,
    phase: "context",
    notepad: {},
    history: [],
  };
}

export function getCurrentQuestion(_session) {
  return {
    id: "context_intro",
    question: "Manda a mensagem do cliente que voce quer responder. Pode colar aqui mesmo.",
    placeholder: "Cole a mensagem do cliente",
    extracts: [],
    required: true,
  };
}

export function submitAnswer(session, message) {
  session.history.push({ role: "user", content: message });
  return {
    handled: false,
    reason: "skeleton-not-implemented",
    note: "Spec em .simpleai/agents/customer-support/. Implementar fases + extracao de campos.",
  };
}

export function getNotepadState(session) {
  return session?.notepad ?? {};
}

export function buildSummary(_session) {
  return null;
}

export function isReadyToRespond(session) {
  if (!session?.notepad) return false;
  return CRITICAL_FIELDS.every((f) => (session.notepad[f]?.confidence ?? 0) >= 0.5);
}
