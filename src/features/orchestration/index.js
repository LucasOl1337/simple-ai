// ─────────────────────────────────────────────────────────────
// Orchestration — API publica
//
// Pontos de entrada para o resto do app (App.jsx etc).
// Detalhes de implementacao e contratos:
//   - .simpleai/core/routing.md
//   - .simpleai/core/notepad.md
//   - .simpleai/core/thresholds.md
// ─────────────────────────────────────────────────────────────

export {
  createOrchestratedSession,
  bootstrapWithMessage,
  getCurrentQuestion,
  submitAnswer,
  getActiveAgent,
} from "./session.js";

export { route, checkHandOff } from "./router.js";
export { classifyIntent } from "./intent-classifier.js";
export {
  AGENTS,
  getAgent,
  getDefaultAgent,
  listStableAgents,
  listAllAgents,
} from "./registry.js";
