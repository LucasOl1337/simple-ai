// ─────────────────────────────────────────────────────────────
// Agent Registry
// Carrega o registro de agentes que vive em .simpleai/agents/_registry.yaml.
// Em runtime, o YAML e espelhado nesta lista hardcoded para evitar
// dependencia de parser de YAML no bundle do front.
//
// SPEC: .simpleai/agents/_registry.yaml — fonte de verdade.
// Quando atualizar o YAML, atualizar este arquivo tambem (mantemos paridade).
// ─────────────────────────────────────────────────────────────

export const AGENTS = [
  {
    id: "website-builder",
    name: "Construtor de Site",
    tagline: "Cria site ou landing page a partir de uma conversa simples.",
    status: "stable",
    thresholdField: "ready_to_build",
    intentSignalsPositive: [
      "site",
      "pagina",
      "página",
      "landing",
      "online",
      "internet",
      "presenca digital",
      "presença digital",
      "quero um site",
      "preciso de um site",
    ],
    intentSignalsNegative: [],
    defaultFallback: true,
  },
  {
    id: "customer-support",
    name: "Atendimento ao Cliente",
    tagline: "Ajuda a responder duvidas e reclamacoes de clientes.",
    status: "skeleton",
    thresholdField: "ready_to_respond",
    intentSignalsPositive: [
      "responder cliente",
      "atendimento",
      "reclamacao",
      "reclamação",
      "duvida do cliente",
      "dúvida do cliente",
      "whatsapp",
      "ticket",
      "faq",
      "perguntas frequentes",
      "meu cliente perguntou",
    ],
    intentSignalsNegative: ["criar", "fazer um"],
    defaultFallback: false,
  },
  {
    id: "content-creator",
    name: "Criador de Conteudo",
    tagline: "Gera ideias e textos para redes sociais e anuncios.",
    status: "skeleton",
    thresholdField: "ready_to_create",
    intentSignalsPositive: [
      "post",
      "instagram",
      "redes sociais",
      "legenda",
      "conteudo",
      "conteúdo",
      "ideia pra postar",
      "anuncio",
      "anúncio",
      "publicar",
      "story",
      "reels",
    ],
    intentSignalsNegative: ["construir", "site"],
    defaultFallback: false,
  },
  {
    id: "business-consultant",
    name: "Consultor de Negocio",
    tagline: "Ajuda a pensar publico, posicionamento, preco e proximos passos.",
    status: "skeleton",
    thresholdField: "ready_to_advise",
    intentSignalsPositive: [
      "publico",
      "público",
      "preco",
      "preço",
      "estrategia",
      "estratégia",
      "concorrente",
      "posicionamento",
      "nao sei o que fazer",
      "não sei o que fazer",
      "duvida sobre meu negocio",
      "dúvida sobre meu negócio",
      "cobrar",
      "vender mais",
    ],
    intentSignalsNegative: ["fazer", "criar"],
    defaultFallback: false,
  },
];

export function getAgent(id) {
  return AGENTS.find((a) => a.id === id) ?? null;
}

export function getDefaultAgent() {
  return AGENTS.find((a) => a.defaultFallback) ?? AGENTS[0];
}

export function listStableAgents() {
  return AGENTS.filter((a) => a.status === "stable");
}

export function listAllAgents() {
  return AGENTS;
}
