// ─────────────────────────────────────────────────────────────
// Orchestrated Session
// Wrapper que mantem o estado de qual agente esta conduzindo
// e delega create/submit/getCurrentQuestion ao planner do agente certo.
//
// Compat: na v1, o unico agente com planner real e o website-builder.
// Os outros agentes ainda sao skeletons — submitAnswer cai num caminho
// "ainda em construcao" para o agente que nao tem planner pronto.
//
// SPEC: .simpleai/core/routing.md, .simpleai/core/notepad.md
// ─────────────────────────────────────────────────────────────

import { route } from "./router.js";
import { getAgent, getDefaultAgent } from "./registry.js";
import * as websiteBuilder from "../agents/website-builder/planner.js";
import * as customerSupport from "../agents/customer-support/planner.js";
import * as contentCreator from "../agents/content-creator/planner.js";
import * as businessConsultant from "../agents/business-consultant/planner.js";

const PLANNER_BY_AGENT = {
  "website-builder": websiteBuilder,
  "customer-support": customerSupport,
  "content-creator": contentCreator,
  "business-consultant": businessConsultant,
};

function plannerOf(agentId) {
  return PLANNER_BY_AGENT[agentId] ?? PLANNER_BY_AGENT["website-builder"];
}

/**
 * Cria uma sessao orquestrada vazia. O agente so e definido apos
 * a primeira mensagem do usuario passar pelo router.
 */
export function createOrchestratedSession() {
  return {
    activeAgentId: null,
    sharedNotepad: {},
    history: [],
    legacySessions: {},
  };
}

/**
 * Roteia a primeira mensagem para o agente certo e cria a sessao
 * interna do agente. Mensagens subsequentes podem disparar hand-off.
 */
export function bootstrapWithMessage(orchestrated, message) {
  const decision = route(message);
  orchestrated.activeAgentId = decision.agent.id;

  const planner = plannerOf(decision.agent.id);
  if (typeof planner.createSession === "function") {
    orchestrated.legacySessions[decision.agent.id] = planner.createSession();
  }

  return decision;
}

/**
 * Pega a "pergunta atual" do agente ativo. Se o agente nao tem planner
 * pronto, devolve uma mensagem-stub explicita.
 */
export function getCurrentQuestion(orchestrated) {
  const agentId = orchestrated.activeAgentId;
  if (!agentId) return null;

  const planner = plannerOf(agentId);
  const session = orchestrated.legacySessions[agentId];

  if (typeof planner.getCurrentQuestion === "function" && session) {
    return planner.getCurrentQuestion(session);
  }

  const agent = getAgent(agentId);
  return {
    id: "skeleton-stub",
    question: `Esse fluxo (${agent?.name}) ainda esta sendo montado. Por enquanto, posso te ajudar com a parte de site.`,
    placeholder: "",
    extracts: [],
    required: false,
  };
}

/**
 * Submete uma resposta do usuario. Verifica antes se a mensagem dispara
 * um hand-off para outro agente.
 */
export function submitAnswer(orchestrated, message) {
  const agentId = orchestrated.activeAgentId;
  if (!agentId) {
    return bootstrapWithMessage(orchestrated, message);
  }

  const planner = plannerOf(agentId);
  const session = orchestrated.legacySessions[agentId];

  if (typeof planner.submitAnswer === "function" && session) {
    return planner.submitAnswer(session, message);
  }

  return {
    handled: false,
    reason: "agent-skeleton",
  };
}

export function getActiveAgent(orchestrated) {
  return orchestrated.activeAgentId ? getAgent(orchestrated.activeAgentId) : getDefaultAgent();
}
