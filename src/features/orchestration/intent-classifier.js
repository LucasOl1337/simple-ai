// ─────────────────────────────────────────────────────────────
// Intent Classifier (v1 — heuristica baseada em sinais)
// Classifica a primeira mensagem do usuario para escolher o agente
// que vai conduzir a conversa.
//
// SPEC: .simpleai/core/routing.md
//
// v2 (futura) substitui esta heuristica por uma chamada LLM dedicada.
// O contrato de saida (shape do retorno) deve ser preservado.
// ─────────────────────────────────────────────────────────────

import { AGENTS, getDefaultAgent } from "./registry.js";

const HIGH_CONFIDENCE = 0.85;
const MEDIUM_CONFIDENCE = 0.7;
const LOW_CONFIDENCE = 0.4;

function normalize(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countMatches(haystack, needles) {
  if (!haystack || !needles?.length) return { count: 0, matched: [] };
  const matched = [];
  for (const needle of needles) {
    const normalized = normalize(needle);
    if (haystack.includes(normalized)) matched.push(needle);
  }
  return { count: matched.length, matched };
}

/**
 * Classifica a intencao da primeira mensagem.
 * @param {string} message
 * @returns {{
 *   agentId: string,
 *   confidence: number,
 *   signals: string[],
 *   ambiguous: boolean,
 *   alternatives: { agentId: string, score: number }[]
 * }}
 */
export function classifyIntent(message) {
  const normalized = normalize(message);

  if (!normalized) {
    const fallback = getDefaultAgent();
    return {
      agentId: fallback.id,
      confidence: 0,
      signals: [],
      ambiguous: true,
      alternatives: [],
    };
  }

  const scored = AGENTS.map((agent) => {
    const positive = countMatches(normalized, agent.intentSignalsPositive);
    const negative = countMatches(normalized, agent.intentSignalsNegative);
    const score = positive.count - negative.count * 0.5;
    return {
      agentId: agent.id,
      score,
      matched: positive.matched,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1] ?? { score: 0 };

  if (top.score <= 0) {
    const fallback = getDefaultAgent();
    return {
      agentId: fallback.id,
      confidence: LOW_CONFIDENCE,
      signals: [],
      ambiguous: true,
      alternatives: scored.slice(1).map((s) => ({ agentId: s.agentId, score: s.score })),
    };
  }

  const margin = top.score - second.score;
  let confidence;
  if (top.score >= 2 && margin >= 1) {
    confidence = HIGH_CONFIDENCE;
  } else if (top.score >= 1 && margin >= 0.5) {
    confidence = MEDIUM_CONFIDENCE;
  } else {
    confidence = LOW_CONFIDENCE;
  }

  return {
    agentId: top.agentId,
    confidence,
    signals: top.matched,
    ambiguous: confidence < MEDIUM_CONFIDENCE,
    alternatives: scored.slice(1).map((s) => ({ agentId: s.agentId, score: s.score })),
  };
}
