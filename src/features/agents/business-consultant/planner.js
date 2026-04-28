// ─────────────────────────────────────────────────────────────
// Business Consultant — planner (skeleton)
//
// SPEC: .simpleai/agents/business-consultant/README.md
// Status: skeleton. So define o shape minimo para o orchestrator
// nao quebrar ao roteiar uma mensagem pra esse agente.
// ─────────────────────────────────────────────────────────────

export const AGENT_ID = "business-consultant";

export const PHASES = [
  { id: "listen", label: "Escuta", description: "Entender a duvida ou dor" },
  { id: "context", label: "Contextualizar", description: "Coletar dados sobre o negocio" },
  { id: "reframe", label: "Reframe", description: "Devolver outra angulacao" },
  { id: "recommend", label: "Recomendar", description: "Sugerir 1-3 proximos passos" },
];

export const CRITICAL_FIELDS = ["business_type", "pain_points"];

export function createSession() {
  return {
    agentId: AGENT_ID,
    phase: "listen",
    notepad: {},
    history: [],
  };
}

export function getCurrentQuestion(_session) {
  return {
    id: "listen_intro",
    question: "Conta a sua duvida do jeito que voce explicaria pra um amigo. Pode ser desorganizado, tudo bem.",
    placeholder: "Ex.: nao sei se devo subir o preco, meu concorrente baixou e to perdendo cliente",
    extracts: ["pain_points"],
    required: true,
  };
}

export function submitAnswer(session, message) {
  session.history.push({ role: "user", content: message });
  return {
    handled: false,
    reason: "skeleton-not-implemented",
    note: "Spec em .simpleai/agents/business-consultant/. Implementar fases + reframe + recomendacao.",
  };
}

export function getNotepadState(session) {
  return session?.notepad ?? {};
}

export function buildSummary(_session) {
  return null;
}

export function isReadyToAdvise(session) {
  if (!session?.notepad) return false;
  return CRITICAL_FIELDS.every((f) => (session.notepad[f]?.confidence ?? 0) >= 0.5);
}
