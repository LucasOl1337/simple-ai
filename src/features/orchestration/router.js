// ─────────────────────────────────────────────────────────────
// Agent Router
// Recebe a primeira mensagem do usuario e decide qual agente conduz.
// Em ambiguidade, dispara um clarifier (1 pergunta neutra) antes
// de cair no fallback (website-builder).
//
// SPEC: .simpleai/core/routing.md
// ─────────────────────────────────────────────────────────────

import { classifyIntent } from "./intent-classifier.js";
import { getAgent, getDefaultAgent } from "./registry.js";

const MIN_CONFIDENCE = 0.7;

/**
 * Decide o agente que deve atender a primeira mensagem.
 * @param {string} message — primeira mensagem do usuario
 * @returns {{
 *   agent: object,
 *   confidence: number,
 *   shouldClarify: boolean,
 *   clarifierQuestion?: string,
 *   signals: string[]
 * }}
 */
export function route(message) {
  const intent = classifyIntent(message);
  const agent = getAgent(intent.agentId) ?? getDefaultAgent();

  if (intent.confidence >= MIN_CONFIDENCE) {
    return {
      agent,
      confidence: intent.confidence,
      shouldClarify: false,
      signals: intent.signals,
    };
  }

  return {
    agent,
    confidence: intent.confidence,
    shouldClarify: true,
    clarifierQuestion: buildClarifier(),
    signals: intent.signals,
  };
}

/**
 * Decide se uma sessao deve trocar de agente baseada em sinal forte
 * que aparece no meio da conversa.
 * @param {string} message
 * @param {string} currentAgentId
 * @returns {{ shouldHandOff: boolean, targetAgentId?: string, confidence: number }}
 */
export function checkHandOff(message, currentAgentId) {
  const intent = classifyIntent(message);

  if (intent.agentId === currentAgentId) {
    return { shouldHandOff: false, confidence: intent.confidence };
  }

  if (intent.confidence >= 0.85) {
    return {
      shouldHandOff: true,
      targetAgentId: intent.agentId,
      confidence: intent.confidence,
    };
  }

  return { shouldHandOff: false, confidence: intent.confidence };
}

function buildClarifier() {
  // Pergunta neutra que NAO expoe a lista de agentes.
  // Detalhes em .simpleai/core/routing.md (secao Clarifier).
  return "Entendi. Pra eu te ajudar do jeito certo, me conta mais um pouco — voce ta querendo criar algo novo, ou resolver alguma situacao do dia a dia?";
}
