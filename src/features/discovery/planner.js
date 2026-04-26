// ─────────────────────────────────────────────────────────────
// SIMPLE-AI Agent Flow Engine
// Fluxo conversacional em fases para coletar contexto de
// usuários sem conhecimento técnico e derivar decisões técnicas.
//
// SPEC CORE: Este código implementa a eespecíficação em .simpleai/
// Veja: .simpleai/agent-flow.md, .simpleai/first-interaction.md,
//       .simpleai/flow-order.md
// ─────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// FASES DO AGENTE
// ═══════════════════════════════════════════════════════════════

export const PHASES = [
  {
    id: "opening",
    label: "Abertura",
    description: "Primeiro contato — o usuário descreve livremente o que precisa",
  },
  {
    id: "business",
    label: "Entendimento do Negócio",
    description: "Coletar nome, tipo, público e região",
  },
  {
    id: "goals",
    label: "Objetivo e Ação",
    description: "Definir o que o visitante deve fazer no site e canais atuais",
  },
  {
    id: "content",
    label: "Conteúdo e Volume",
    description: "Quantidade de serviços, fotos, preços, perguntas frequentes",
  },
  {
    id: "features",
    label: "Funcionalidades",
    description: "Detectar e confirmar necessidades implícitas",
  },
  {
    id: "visual",
    label: "Preferência Visual",
    description: "Tom, cores, referências visuais",
  },
  {
    id: "summary",
    label: "Consolidação",
    description: "Resumo completo e confirmação do usuário",
  },
];

// ═══════════════════════════════════════════════════════════════
// PERGUNTAS POR FASE (linguagem 100% leiga)
// ═══════════════════════════════════════════════════════════════

const PHASE_QUESTIONS = {
  opening: [
    {
      id: "initial_description",
      question: "Me conta o que você faz e o que você precisa. Fala do jeito que você explicaria pra um amigo.",
      placeholder: "Ex.: tenho uma oficina mecânica e quero um site pra mostrar meus serviços e receber orçamentos pelo WhatsApp",
      extracts: ["business_type", "offerings", "primary_cta"],
      required: true,
    },
  ],

  business: [
    {
      id: "brand_name",
      question: "Qual o nome do seu negócio?",
      placeholder: "Ex.: Auto Center Silva, Clinica Aura, Padaria Bom Dia",
      extracts: ["brand_name"],
      required: true,
    },
    {
      id: "what_you_do",
      question: "Me explica o que você vende ou faz, como se eu fosse um cliente novo.",
      placeholder: "Ex.: a gente faz limpeza residencial, pós-obra e também passadoria",
      extracts: ["business_type", "offerings", "value_proposition"],
      required: true,
      skip_if: "initial_description_detailed",
    },
    {
      id: "target_audience",
      question: "Quem é o seu cliente típico? Idade, perfil, como ele te encontra?",
      placeholder: "Ex.: mulheres de 30-50 anos, classe média, me acham pelo Instagram",
      extracts: ["target_audience", "discovery_channel"],
      required: false,
    },
    {
      id: "scope",
      question: "Você atende numa região específica ou atende online/todo Brasil?",
      placeholder: "Ex.: só na zona sul de São Paulo / atendo todo o estado / online",
      extracts: ["scope", "region"],
      required: true,
    },
  ],

  goals: [
    {
      id: "primary_action",
      question: "Quando alguém entra no seu site, o que você mais quer que essa pessoa faca?",
      placeholder: "Ex.: chamar no WhatsApp / agendar horário / pedir orçamento / comprar",
      extracts: ["primary_cta"],
      required: true,
    },
    {
      id: "current_channels",
      question: "Hoje como as pessoas entram em contato com você?",
      placeholder: "Ex.: WhatsApp, telefone, vem direto na loja, Instagram",
      extracts: ["current_channels"],
      required: true,
    },
    {
      id: "existing_presence",
      question: "Você já tem algo online? Instagram, Google Meu Negócio, outro site?",
      placeholder: "Ex.: tenho Instagram com 2000 seguidores / não tenho nada ainda",
      extracts: ["existing_presence", "has_content"],
      required: false,
    },
  ],

  content: [
    {
      id: "content_volume",
      question: "Quantos serviços ou produtos você quer mostrar de cara?",
      placeholder: "Ex.: uns 5 serviços principais / tenho mais de 30 produtos / so 3 coisas",
      extracts: ["content_volume"],
      required: true,
    },
    {
      id: "has_media",
      question: "Você tem fotos boas do seu trabalho ou produto?",
      placeholder: "Ex.: tenho no Instagram / tenho poucas / não tenho nenhuma",
      extracts: ["has_media"],
      required: true,
    },
    {
      id: "faq_content",
      question: "Tem alguma informação que seus clientes sempre perguntam?",
      placeholder: "Ex.: preço, tempo de entrega, se atende no feriado, formas de pagamento",
      extracts: ["faq_content", "pain_points"],
      required: false,
    },
    {
      id: "pricing_strategy",
      question: "Você quer mostrar preços no site ou prefere que a pessoa peça orçamento?",
      placeholder: "Ex.: quero mostrar os preços / prefiro que peça orçamento / depende do serviço",
      extracts: ["pricing_strategy"],
      required: true,
    },
  ],

  features: [
    {
      id: "feature_booking",
      question: "Seus clientes precisam marcar horário com você? Como funciona isso hoje?",
      placeholder: "Ex.: sim, marcam pelo WhatsApp / não, e ordem de chegada / uso agenda do Google",
      extracts: ["needs_booking", "booking_mode"],
      condition: (ctx) => hasSignal(ctx, ["agendar", "horário", "marcar", "reserva", "agenda", "atendimento"]),
      required: true,
    },
    {
      id: "feature_selling",
      question: "Você precisa vender e receber pagamento direto pelo site?",
      placeholder: "Ex.: sim, quero vender online / não, só quero mostrar e a pessoa me chama",
      extracts: ["needs_ecommerce", "payment_mode"],
      condition: (ctx) => hasSignal(ctx, ["vender", "comprar", "produto", "loja", "preço", "carrinho"]),
      required: true,
    },
    {
      id: "feature_area_cliente",
      question: "Seus clientes precisam de um login ou área propria no site?",
      placeholder: "Ex.: não precisa / seria bom pra acompanhar pedidos / quero área de aluno",
      extracts: ["needs_auth"],
      condition: (ctx) => hasSignal(ctx, ["login", "cadastro", "área do cliente", "painel", "acompanhar"]),
      required: true,
    },
    {
      id: "feature_simplify",
      question: "Pelo que você me contou, dá pra começar simples. No começo pode ser só apresentar o negócio e ter um botão de contato, ou você precisa de algo a mais desde o primeiro dia?",
      placeholder: "Ex.: pode começar simples / preciso de formulário desde o início / quero já com agendamento",
      extracts: ["mvp_scope"],
      condition: (ctx) => !hasAnyComplexFeature(ctx),
      required: false,
    },
  ],

  visual: [
    {
      id: "visual_reference",
      question: "Me manda um site ou Instagram que você acha bonito. Não precisa ser do mesmo ramo.",
      placeholder: "Ex.: gosto do estilo do site da Apple / gosto do Instagram @exemplo / não tenho referência",
      extracts: ["visual_reference"],
      required: false,
    },
    {
      id: "brand_tone",
      question: "Seu negócio é mais sério e profissional, descontraído e jovem, ou acolhedor e familiar?",
      placeholder: "Ex.: profissional mas acessível / jovem e moderno / familiar e acolhedor",
      extracts: ["brand_tone"],
      required: true,
    },
    {
      id: "brand_assets",
      question: "Você já tem cores definidas? Tem logo?",
      placeholder: "Ex.: tenho logo azul e branco / não tenho nada / tenho mas quero mudar",
      extracts: ["brand_colors", "has_logo"],
      required: false,
    },
  ],

  summary: [],
};

// ═══════════════════════════════════════════════════════════════
// DETECÇÃO DE SINAIS E PATTERNS
// ═══════════════════════════════════════════════════════════════

const BUSINESS_PATTERNS = [
  { id: "clinic", label: "Clínica ou consultório", keywords: ["clinica", "consultorio", "medico", "dentista", "psicologo", "fisioterapia", "estetica", "saude"] },
  { id: "bakery", label: "Padaria ou confeitaria", keywords: ["padaria", "confeitaria", "bolo", "doces", "salgados", "cafeteria"] },
  { id: "mechanic", label: "Oficina ou serviço automotivo", keywords: ["oficina", "mecânica", "mecanico", "carro", "veiculo", "auto center", "funilaria"] },
  { id: "cleaning", label: "Servico de limpeza", keywords: ["limpeza", "faxina", "diarista", "higienização", "limpar"] },
  { id: "restaurant", label: "Restaurante ou alimentação", keywords: ["restaurante", "hamburgueria", "pizzaria", "lanchonete", "delivery", "menu", "cardapio"] },
  { id: "beauty", label: "Salao ou barbearia", keywords: ["salao", "barbearia", "cabelo", "manicure", "nail", "beleza", "corte"] },
  { id: "fitness", label: "Academia ou personal", keywords: ["academia", "personal", "treino", "crossfit", "pilates", "yoga"] },
  { id: "education", label: "Escolá ou curso", keywords: ["escolá", "curso", "aula", "professor", "ensino", "mentoria", "coaching"] },
  { id: "legal", label: "Advocacia ou contabilidade", keywords: ["advogado", "advocacia", "contador", "contabilidade", "juridico"] },
  { id: "retail", label: "Lojá ou comercio", keywords: ["loja", "comercio", "vender", "produto", "estoque", "catalogo"] },
  { id: "construction", label: "Construcao ou reforma", keywords: ["construcao", "reforma", "pedreiro", "arquiteto", "engenheiro", "obra"] },
  { id: "tech", label: "Servico de tecnologia", keywords: ["informatica", "computador", "celular", "assistencia", "software", "app"] },
];

const FEATURE_SIGNALS = {
  booking: ["agendar", "agendamento", "reserva", "appointment", "agenda", "calendario", "horário", "marcar"],
  ecommerce: ["vender online", "comprar online", "carrinho", "checkout", "lojá online", "e-commerce"],
  auth: ["login", "cadastro", "usuário", "painel", "área do cliente", "acompanhar"],
  forms: ["formulário", "orçamento", "contato", "mensagem", "solicitar"],
  gallery: ["fotos", "portfolio", "galeria", "antes e depois", "trabalhos"],
  map: ["mapa", "localização", "endereco", "como chegar"],
  whatsapp: ["whatsapp", "zap", "whats"],
};

// ═══════════════════════════════════════════════════════════════
// MATRIZES DE DECISÃO TÉCNICA
// ═══════════════════════════════════════════════════════════════

const STACK_MATRIX = {
  LOW: {
    profile: "Site institucional simples",
    frontend: "HTML/CSS estatico ou React SPA",
    styling: "Tailwind CSS",
    backend: "Nenhum — conteúdo estatico",
    data: "JSON local",
    deploy: "Netlify ou Vercel",
    reason: "Entrega rapida, zero complexidade de manutencao.",
  },
  MEDIUM: {
    profile: "Site com formulários e listagem dinamica",
    frontend: "React + Tailwind + shadcn/ui",
    styling: "Tailwind CSS com design tokens",
    backend: "API Routes / Serverless functions",
    data: "Oracle Database (basico)",
    deploy: "Vercel + Oracle Cloud",
    reason: "Equilibrio entre funcionalidades e simplicidade de deploy.",
  },
  HIGH: {
    profile: "Plataforma com auth, pagamento ou booking",
    frontend: "React + Tailwind + shadcn/ui (completo)",
    styling: "Tailwind CSS com sistema de design completo",
    backend: "Node.js API completa",
    data: "Oracle Database (completo)",
    deploy: "Oracle Cloud + Vercel",
    reason: "Suporta funcionalidades avancadas mantendo performance.",
  },
};

const LAYOUT_MATRIX = [
  { content_volume: "few", pricing: "any", layout: "single_page", pages: 1, label: "Landing page unica com scroll" },
  { content_volume: "medium", pricing: "visible", layout: "multi_simple", pages: 4, label: "Site multi-pagina com listagem" },
  { content_volume: "medium", pricing: "hidden", layout: "multi_simple", pages: 3, label: "Site multi-pagina institucional" },
  { content_volume: "many", pricing: "visible", layout: "catalog", pages: 6, label: "Catálogo com filtros e listagem" },
  { content_volume: "many", pricing: "hidden", layout: "catalog_cta", pages: 5, label: "Catálogo com CTA de orçamento" },
];

const MODULE_RULES = [
  { id: "hero", label: "Hero section", condition: () => true },
  { id: "services", label: "Servicos ou produtos", condition: (ctx) => !!ctx.answers.content_volume },
  { id: "about", label: "Sobre o negócio", condition: (ctx) => ctx.detected.scope === "local" },
  { id: "gallery", label: "Galeria de fotos", condition: (ctx) => ctx.answers.has_media === "yes" },
  { id: "pricing", label: "Tabela de preços", condition: (ctx) => ctx.answers.pricing_strategy === "visible" },
  { id: "faq", label: "Perguntas frequentes", condition: (ctx) => !!ctx.answers.faq_content },
  { id: "contact", label: "Contato", condition: () => true },
  { id: "testimonials", label: "Depoimentos", condition: (ctx) => !!ctx.detected.existing_reviews },
  { id: "map", label: "Mapa de localização", condition: (ctx) => ctx.detected.scope === "local" },
  { id: "whatsapp_float", label: "Botao flutuante WhatsApp", condition: (ctx) => hasSignal(ctx, ["whatsapp", "zap", "whats"]) },
  { id: "booking_cta", label: "CTA de agendamento", condition: (ctx) => ctx.detected.needs_booking },
  { id: "instagram_feed", label: "Feed do Instagram", condition: (ctx) => hasSignal(ctx, ["instagram"]) },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function hasSignal(ctx, keywords) {
  const corpus = normalize(Object.values(ctx.answers).filter(Boolean).join(" "));
  return keywords.some((kw) => corpus.includes(normalize(kw)));
}

function hasAnyComplexFeature(ctx) {
  return ctx.detected.needs_booking || ctx.detected.needs_ecommerce || ctx.detected.needs_auth;
}

function classifyAnswer(answer) {
  const raw = String(answer || "").trim();
  const normalized = normalize(raw);
  const words = normalized ? normalized.split(/\s+/).filter(Boolean) : [];
  const isEmpty = words.length === 0;
  const isVeryShort = normalized.length <= 2 || words.length <= 2;
  const affirmative = /^(sim|s|isso|certo|ok|okay|beleza|claro|pode ser|pode|isso mesmo)$/.test(normalized);
  const negative = /^(nao|n|nah|nenhum|nada|tanto faz|decide voce|decide vc|voce decide|vc decide)$/.test(normalized);
  const frustrated = /(nao sei|não sei|tanto faz|decide voce|decide vc|voce decide|vc decide|qualquer coisa|me guia|sem preferencia)/.test(
    normalized,
  );
  const binary = affirmative || negative;
  const lowSignal = isEmpty || isVeryShort;

  return {
    raw,
    normalized,
    words,
    isEmpty,
    isVeryShort,
    affirmative,
    negative,
    binary,
    frustrated,
    lowSignal,
    needsRecovery: lowSignal || frustrated,
  };
}

function isUsefulTurnForQuestion(questionId, answerProfile) {
  if (!answerProfile || answerProfile.isEmpty) return false;
  if (answerProfile.frustrated) return false;
  if (questionId.startsWith("feature_")) {
    return answerProfile.binary || !answerProfile.needsRecovery;
  }
  if (answerProfile.binary) return false;
  return !answerProfile.needsRecovery;
}

function getQuestionFallback(questionId) {
  const prompts = {
    initial_description:
      "Me conta só o básico: qual é seu negócio e o que você quer que o site ajude a fazer?",
    business_type:
      "Me fala só qual é o seu negócio. Ex.: padaria, oficina, clínica, salão, loja.",
    brand_name:
      "Qual nome eu coloco no site? Pode ser o nome da fachada ou o nome mais conhecido pelos clientes.",
    what_you_do:
      "Me explica em uma frase curta o que você faz ou vende, sem complicar.",
    target_audience:
      "Quem você quer atrair primeiro? Pode responder de um jeito simples.",
    scope:
      "Você atende só na sua região, em várias cidades ou online?",
    primary_action:
      "Quando a pessoa entrar no site, o que você quer que ela faça primeiro?",
    current_channels:
      "Hoje o cliente fala com você por onde? WhatsApp, Instagram, telefone ou na loja?",
    existing_presence:
      "Você já tem Instagram, Google ou algum site antigo que eu possa usar como referência?",
    content_volume:
      "Você quer mostrar poucas coisas, uma quantidade média ou muitas?",
    has_media:
      "Você já tem fotos ou imagens boas do trabalho? Se tiver no Instagram, também serve.",
    faq_content:
      "Tem alguma dúvida que os clientes sempre perguntam antes de fechar?",
    pricing_strategy:
      "Você quer mostrar os preços no site ou prefere pedir orçamento?",
    feature_booking:
      "Precisa de agendamento ou pode ser só contato mesmo?",
    feature_selling:
      "Você quer vender direto no site agora ou começar só com vitrine e contato?",
    feature_area_cliente:
      "Precisa de login ou área do cliente, ou isso pode ficar para depois?",
    feature_simplify:
      "Dá para começar simples. Quer uma versão só para apresentar e receber contato?",
    visual_reference:
      "Tem algum site, Instagram ou estilo visual que você gosta?",
    brand_tone:
      "O site deve passar uma sensação mais profissional, moderna, acolhedora ou divertida?",
    brand_assets:
      "Você já tem logo ou cores definidas, ou quer que eu proponha uma direção visual?",
  };

  return prompts[questionId] ?? "Me conta mais um pouco, do jeito que ficar mais fácil para você.";
}

function getQuestionFocusScore(question, session) {
  const notepad = session.notepad;
  const criticalMissing = new Set(getMissingCritical(notepad));
  const importantMissing = new Set(getMissingImportant(notepad));
  const answerProfile = session.lastAnswerProfile ?? {};
  const fields = Array.isArray(question.extracts) ? question.extracts : [];

  let score = 0;

  for (const field of fields) {
    if (criticalMissing.has(field)) {
      score += 220;
      continue;
    }
    if (importantMissing.has(field)) {
      score += 120;
      continue;
    }
    if (field in notepad && notepad[field].confidence < 0.65) {
      score += 40;
    }
  }

  if (question.required) {
    score += 25;
  }

  if (answerProfile.needsRecovery) {
    if (fields.some((field) => criticalMissing.has(field))) {
      score += 100;
    } else if (question.id === session.lastAskedQuestionId) {
      score += 80;
    }
  }

  if (question.id === "feature_simplify" && hasAnyComplexFeature(session)) {
    score += 50;
  }

  return score;
}

function isQuestionSolved(session, question) {
  if (question.id === "feature_booking") {
    return session.featureDecisions?.booking !== null;
  }
  if (question.id === "feature_selling") {
    return session.featureDecisions?.ecommerce !== null;
  }
  if (question.id === "feature_area_cliente") {
    return session.featureDecisions?.auth !== null;
  }
  if (question.id === "feature_simplify") {
    return Boolean(session.answers.feature_simplify);
  }

  const fields = Array.isArray(question.extracts) ? question.extracts : [];
  if (fields.length === 0) return false;

  return fields.every((field) => field in session.notepad && session.notepad[field].confidence >= 0.65);
}

function detectBusinessType(text) {
  const input = normalize(text);
  let best = null;
  let bestScore = 0;

  for (const pattern of BUSINESS_PATTERNS) {
    const score = pattern.keywords.reduce(
      (s, kw) => (input.includes(normalize(kw)) ? s + 1 : s),
      0,
    );
    if (score > bestScore) {
      best = pattern;
      bestScore = score;
    }
  }

  return best && bestScore > 0 ? best : { id: "general", label: "Negócio de serviço geral", keywords: [] };
}

function detectFeatures(ctx) {
  const features = {};
  const corpus = normalize(Object.values(ctx.answers).filter(Boolean).join(" "));

  for (const [feature, keywords] of Object.entries(FEATURE_SIGNALS)) {
    features[feature] = keywords.some((kw) => corpus.includes(normalize(kw)));
  }

  return features;
}

function resolveComplexity(ctx) {
  const f = ctx.detected.features;
  if (f.ecommerce || f.auth) return "HIGH";
  if (f.booking || f.forms || ctx.detected.content_volume === "many") return "MEDIUM";
  return "LOW";
}

function resolveContentVolume(answer) {
  if (!answer) return "few";
  const n = normalize(answer);
  if (n.match(/\b(1|2|3|4|5|pouc|so|simples)\b/)) return "few";
  if (n.match(/\b(30|40|50|muit|dezena|catalogo)\b/)) return "many";
  return "medium";
}

function resolvePricingStrategy(answer) {
  if (!answer) return "hidden";
  const n = normalize(answer);
  if (n.includes("preco")) return "visible";
  if (n.includes("orcamento")) return "hidden";
  if (n.includes("mostrar") || n.includes("preço") || n.includes("tabela")) return "visible";
  if (n.includes("orçamento") || n.includes("depende")) return "hidden";
  return "hidden";
}

function resolveHasMedia(answer) {
  if (!answer) return "unknown";
  const n = normalize(answer);
  if (n.includes("nao tenho")) return "no";
  if (n.includes("tenho") && !n.includes("não tenho")) return "yes";
  if (n.includes("instagram")) return "yes";
  if (n.includes("nao") || n.includes("nenhum")) return "no";
  return "few";
}

function resolveScope(answer) {
  if (!answer) return "local";
  const n = normalize(answer);
  if (n.includes("online") || n.includes("todo brasil") || n.includes("nacional")) return "national";
  if (n.includes("regiao")) return "regional";
  if (n.includes("estado") || n.includes("região")) return "regional";
  return "local";
}

function resolveLayout(ctx) {
  const vol = ctx.detected.content_volume;
  const pricing = ctx.detected.pricing_strategy;

  const match = LAYOUT_MATRIX.find(
    (rule) =>
      rule.content_volume === vol &&
      (rule.pricing === "any" || rule.pricing === pricing),
  );

  return match ?? LAYOUT_MATRIX[0];
}

function resolveModules(ctx) {
  return MODULE_RULES.filter((rule) => rule.condition(ctx)).map((rule) => ({
    id: rule.id,
    label: rule.label,
  }));
}

// ═══════════════════════════════════════════════════════════════
// NOTEPAD — Caderno de Anotacoes do Agente
// ═══════════════════════════════════════════════════════════════

const NOTEPAD_FIELDS = {
  business_type:    { priority: "crítical",  default_value: null,      default_confidence: 0 },
  brand_name:       { priority: "crítical",  default_value: null,      default_confidence: 0 },
  primary_cta:      { priority: "crítical",  default_value: null,      default_confidence: 0 },
  offerings:        { priority: "important", default_value: [],        default_confidence: 0 },
  scope:            { priority: "important", default_value: "local",   default_confidence: 0.3 },
  current_channels: { priority: "important", default_value: [],        default_confidence: 0 },
  target_audience:  { priority: "desired",   default_value: null,      default_confidence: 0 },
  content_volume:   { priority: "desired",   default_value: "few",     default_confidence: 0.3 },
  has_media:        { priority: "desired",   default_value: "unknown", default_confidence: 0 },
  pricing_strategy: { priority: "desired",   default_value: "hidden",  default_confidence: 0.3 },
  brand_tone:       { priority: "desired",   default_value: null,      default_confidence: 0 },
  brand_colors:     { priority: "desired",   default_value: null,      default_confidence: 0 },
  faq_content:      { priority: "desired",   default_value: [],        default_confidence: 0 },
  existing_presence:{ priority: "desired",   default_value: [],        default_confidence: 0 },
};

function createNotepad() {
  const notepad = {};
  for (const [key, cfg] of Object.entries(NOTEPAD_FIELDS)) {
    notepad[key] = {
      value: cfg.default_value,
      confidence: cfg.default_confidence,
      source: cfg.default_confidence > 0 ? "default" : null,
      priority: cfg.priority,
    };
  }
  return notepad;
}

function updateNotepadField(notepad, field, value, confidence, source) {
  if (!notepad[field]) return notepad;
  const current = notepad[field];
  if (confidence > current.confidence) {
    return {
      ...notepad,
      [field]: { ...current, value, confidence, source },
    };
  }
  return notepad;
}

function getNotepadConfidence(notepad) {
  const entries = Object.values(notepad);
  const total = entries.reduce((sum, e) => sum + e.confidence, 0);
  return Math.round((total / entries.length) * 100);
}

function getMissingCritical(notepad) {
  return Object.entries(notepad)
    .filter(([, entry]) => entry.priority === "crítical" && entry.confidence < 0.5)
    .map(([key]) => key);
}

function getMissingImportant(notepad) {
  return Object.entries(notepad)
    .filter(([, entry]) => entry.priority === "important" && entry.confidence < 0.4)
    .map(([key]) => key);
}

function getFieldConfidence(session, field) {
  return session.notepad?.[field]?.confidence ?? 0;
}

function hasReliableField(session, field, min = 0.65) {
  return getFieldConfidence(session, field) >= min;
}

function hasNonDefaultField(session, field, min = 0.65) {
  const entry = session.notepad?.[field];
  return Boolean(entry && entry.confidence >= min && entry.source !== "default");
}

function isFilled(value, invalid = []) {
  if (!value) return false;
  if (typeof value !== "string") return true;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;

  return !invalid.map((item) => item.toLowerCase()).includes(normalized);
}

function shouldSkipQuestion(session, question) {
  const skipByQuestion = {
    brand_name: () => hasReliableField(session, "brand_name", 0.65),
    what_you_do: () =>
      shouldSkip(session, "initial_description_detailed") ||
      (hasReliableField(session, "business_type", 0.65) &&
        hasReliableField(session, "offerings", 0.6)),
    target_audience: () => hasReliableField(session, "target_audience", 0.65),
    scope: () => hasReliableField(session, "scope", 0.7),
    primary_action: () => hasReliableField(session, "primary_cta", 0.7),
    current_channels: () => hasReliableField(session, "current_channels", 0.65),
    content_volume: () => hasReliableField(session, "content_volume", 0.75),
    has_media: () => hasReliableField(session, "has_media", 0.75),
    pricing_strategy: () => hasReliableField(session, "pricing_strategy", 0.75),
    brand_tone: () => hasReliableField(session, "brand_tone", 0.7),
    brand_assets: () => hasReliableField(session, "brand_colors", 0.7),
  };

  return skipByQuestion[question.id]?.() ?? false;
}

function summarizeContext(session) {
  const summary = buildSummary(session);
  const business = isFilled(summary.business_type, ["NÃ£o identificado"])
    ? summary.business_type
    : "negÃ³cio";
  const brand = isFilled(summary.brand_name, ["NÃ£o definido"])
    ? summary.brand_name
    : "";
  const cta = isFilled(summary.primary_cta, ["Entrar em contato"])
    ? summary.primary_cta
    : "";

  return { business, brand, cta, summary };
}

function adaptQuestion(session, question) {
  const { business, brand, cta } = summarizeContext(session);
  const brandPrefix = brand ? `Sobre a ${brand}: ` : "";
  const answerProfile = session.lastAnswerProfile ?? {};
  const fallback = answerProfile.needsRecovery ? getQuestionFallback(question.id) : null;

  const adaptiveText = {
    brand_name: `Como vocÃª quer que o nome do negÃ³cio apareÃ§a no site? Pode ser o nome oficial ou o nome mais conhecido pelos clientes.`,
    what_you_do: `${brandPrefix}me explica em uma frase simples o que vocÃª vende ou faz, do jeito que um cliente novo entenderia.`,
    target_audience: `${brandPrefix}quem vocÃª mais quer atrair primeiro? Pode falar como "famÃ­lias do bairro", "empresas pequenas", "alunos iniciantes"...`,
    scope: `${brandPrefix}esse atendimento Ã© local, por regiÃ£o ou online? Quero acertar o texto de localizaÃ§Ã£o e os botÃµes do site.`,
    primary_action: `Quando alguÃ©m entrar nesse site de ${business}, qual Ã© a aÃ§Ã£o mais importante: chamar, comprar, agendar, pedir orÃ§amento ou outra coisa?`,
    current_channels: cta
      ? `Hoje por onde esse cliente faz "${cta}" com vocÃª? WhatsApp, Instagram, telefone, loja fÃ­sica ou outro canal?`
      : `Hoje por onde os clientes falam com vocÃª? WhatsApp, Instagram, telefone, loja fÃ­sica ou outro canal?`,
    existing_presence: `${brandPrefix}jÃ¡ existe algum lugar online que eu possa considerar como referÃªncia de conteÃºdo? Instagram, Google, cardÃ¡pio, catÃ¡logo ou site antigo.`,
    content_volume: `Para esse site de ${business}, quantos itens vocÃª quer mostrar primeiro? Pode ser poucos destaques, uma lista mÃ©dia ou um catÃ¡logo maior.`,
    has_media: `VocÃª jÃ¡ tem fotos, prints ou materiais que representam bem ${brand || "esse negÃ³cio"}? Se estiver no Instagram, tambÃ©m serve.`,
    faq_content: `Quais dÃºvidas os clientes sempre perguntam antes de fechar? Isso ajuda o site a responder objeÃ§Ãµes sozinho.`,
    pricing_strategy: `Sobre preÃ§os: vocÃª quer mostrar valores no site, mostrar sÃ³ alguns exemplos ou deixar tudo para conversa?`,
    feature_booking: `Pelo contexto, pode existir agendamento. Seus clientes precisam marcar horÃ¡rio ou reservar alguma coisa? Como isso funciona hoje?`,
    feature_selling: `Como apareceram produtos/preÃ§os, vocÃª quer vender direto no site agora ou prefere comeÃ§ar com vitrine e chamada para contato?`,
    feature_area_cliente: `Existe alguma parte que precisaria de login, Ã¡rea do cliente ou acompanhamento de pedido, ou isso pode ficar fora da primeira versÃ£o?`,
    feature_simplify: `Pelo que vocÃª contou, dÃ¡ para comeÃ§ar enxuto. Quer uma primeira versÃ£o focada em apresentaÃ§Ã£o e contato, ou tem algo indispensÃ¡vel desde o dia um?`,
    visual_reference: `Tem alguma referÃªncia visual que combina com ${brand || business}? Pode ser site, Instagram, marca ou atÃ© um estilo que vocÃª gosta.`,
    brand_tone: `Qual sensaÃ§Ã£o o site deve passar: mais profissional, moderno, familiar, premium, divertido ou acolhedor?`,
    brand_assets: `VocÃª jÃ¡ tem logo, cores ou fotos de marca, ou quer que a primeira versÃ£o proponha uma direÃ§Ã£o visual?`,
  };

  const asciiAdaptiveText = {
    brand_name: `Como voce quer que o nome do negocio apareca no site? Pode ser o nome oficial ou o nome mais conhecido pelos clientes.`,
    what_you_do: `${brandPrefix}me explica em uma frase simples o que voce vende ou faz, do jeito que um cliente novo entenderia.`,
    target_audience: `${brandPrefix}quem voce mais quer atrair primeiro? Pode falar como "familias do bairro", "empresas pequenas", "alunos iniciantes"...`,
    scope: `${brandPrefix}esse atendimento e local, por regiao ou online? Quero acertar o texto de localizacao e os botoes do site.`,
    primary_action: `Quando alguem entrar nesse site de ${business}, qual e a acao mais importante: chamar, comprar, agendar, pedir orcamento ou outra coisa?`,
    current_channels: cta
      ? `Hoje por onde esse cliente faz "${cta}" com voce? WhatsApp, Instagram, telefone, loja fisica ou outro canal?`
      : `Hoje por onde os clientes falam com voce? WhatsApp, Instagram, telefone, loja fisica ou outro canal?`,
    existing_presence: `${brandPrefix}ja existe algum lugar online que eu possa considerar como referencia de conteudo? Instagram, Google, cardapio, catalogo ou site antigo.`,
    content_volume: `Para esse site de ${business}, quantos itens voce quer mostrar primeiro? Pode ser poucos destaques, uma lista media ou um catalogo maior.`,
    has_media: `Voce ja tem fotos, prints ou materiais que representam bem ${brand || "esse negocio"}? Se estiver no Instagram, tambem serve.`,
    faq_content: `Quais duvidas os clientes sempre perguntam antes de fechar? Isso ajuda o site a responder objecoes sozinho.`,
    pricing_strategy: `Sobre precos: voce quer mostrar valores no site, mostrar so alguns exemplos ou deixar tudo para conversa?`,
    feature_booking: `Pelo contexto, pode existir agendamento. Seus clientes precisam marcar horario ou reservar alguma coisa? Como isso funciona hoje?`,
    feature_selling: `Como apareceram produtos/precos, voce quer vender direto no site agora ou prefere comecar com vitrine e chamada para contato?`,
    feature_area_cliente: `Existe alguma parte que precisaria de login, area do cliente ou acompanhamento de pedido, ou isso pode ficar fora da primeira versao?`,
    feature_simplify: `Pelo que voce contou, da para comecar enxuto. Quer uma primeira versao focada em apresentacao e contato, ou tem algo indispensavel desde o dia um?`,
    visual_reference: `Tem alguma referencia visual que combina com ${brand || business}? Pode ser site, Instagram, marca ou ate um estilo que voce gosta.`,
    brand_tone: `Qual sensacao o site deve passar: mais profissional, moderno, familiar, premium, divertido ou acolhedor?`,
    brand_assets: `Voce ja tem logo, cores ou fotos de marca, ou quer que a primeira versao proponha uma direcao visual?`,
  };

  return {
    ...question,
    question:
      fallback ??
      asciiAdaptiveText[question.id] ??
      adaptiveText[question.id] ??
      question.question,
  };
}

function checkReadyToBuild(notepad, usefulMessagesCount) {
  const críticalMissing = getMissingCritical(notepad);
  const confidence = getNotepadConfidence(notepad);
  return {
    ready: críticalMissing.length === 0 && confidence >= 55 && usefulMessagesCount >= 3,
    críticalMissing,
    confidence,
    messagesCount: usefulMessagesCount,
  };
}

// ═══════════════════════════════════════════════════════════════
// SESSION STATE
// ═══════════════════════════════════════════════════════════════

export function createSession() {
  return {
    phase: "opening",
    phaseIndex: 0,
    questionIndex: 0,
    answers: {},
    notepad: createNotepad(),
    detected: {
      business_type: null,
      features: {},
      complexity: "LOW",
      content_volume: "few",
      pricing_strategy: "hidden",
      has_media: "unknown",
      scope: "local",
      needs_booking: false,
      needs_ecommerce: false,
      needs_auth: false,
      existing_reviews: false,
      layout: null,
      modules: [],
      stack: STACK_MATRIX.LOW,
    },
    transcript: [],
    messagesCount: 0,
    usefulMessagesCount: 0,
    lastAskedQuestionId: null,
    lastAnswerProfile: null,
    featureDecisions: {
      booking: null,
      ecommerce: null,
      auth: null,
    },
    isComplete: false,
    readyToBuild: false,
    buildProposed: false,
  };
}

export function getCurrentQuestion(session) {
  const phaseId = session.phase;
  const questions = PHASE_QUESTIONS[phaseId] ?? [];
  const candidates = [];

  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    if (q.condition && !q.condition(buildContext(session))) continue;
    if (q.skip_if && shouldSkip(session, q.skip_if)) continue;
    if (shouldSkipQuestion(session, q)) continue;
    if (isQuestionSolved(session, q)) continue;

    candidates.push({
      question: q,
      _index: idx,
      score: getQuestionFocusScore(q, session) + Math.max(0, 20 - idx * 3),
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.score - a.score || a._index - b._index);
  const selected = candidates[0];
  return { ...adaptQuestion(session, selected.question), _index: selected._index };
}

function shouldSkip(session, rule) {
  if (rule === "initial_description_detailed") {
    const initial = session.answers.initial_description ?? "";
    return initial.split(/\s+/).length > 20;
  }
  return false;
}

function buildContext(session) {
  return {
    answers: session.answers,
    detected: session.detected,
  };
}

export function submitAnswer(session, answer) {
  const currentQ = getCurrentQuestion(session);
  if (!currentQ && session.phase !== "summary") {
    return advancePhase(session);
  }
  if (!currentQ) {
    return { ...session, isComplete: true };
  }

  const trimmed = answer.trim();
  const answerProfile = classifyAnswer(trimmed);
  const newAnswers = { ...session.answers, [currentQ.id]: trimmed };

  const newTranscript = [
    ...session.transcript,
    { role: "assistant", content: currentQ.question },
    { role: "user", content: trimmed },
  ];

  let newSession = {
    ...session,
    answers: newAnswers,
    transcript: newTranscript,
    questionIndex: currentQ._index + 1,
    messagesCount: session.messagesCount + 1,
    usefulMessagesCount: session.usefulMessagesCount + (isUsefulTurnForQuestion(currentQ.id, answerProfile) ? 1 : 0),
    lastAskedQuestionId: currentQ.id,
    lastAnswerProfile: answerProfile,
  };

  newSession = runDetection(newSession);
  newSession = runNotepadExtraction(newSession, currentQ.id, trimmed);
  newSession = {
    ...newSession,
    detected: {
      ...newSession.detected,
      complexity: resolveComplexity({ ...buildContext(newSession), detected: newSession.detected }),
    },
  };

  const rtb = checkReadyToBuild(newSession.notepad, newSession.usefulMessagesCount);
  newSession.readyToBuild = rtb.ready;

  const nextQ = getCurrentQuestion(newSession);
  if (!nextQ) {
    newSession = advancePhase(newSession);
  }

  return newSession;
}

function advancePhase(session) {
  const currentIdx = PHASES.findIndex((p) => p.id === session.phase);
  const nextIdx = currentIdx + 1;

  if (nextIdx >= PHASES.length) {
    const finalSession = runFinalAnalysis(session);
    return { ...finalSession, isComplete: true, phase: "summary", phaseIndex: nextIdx };
  }

  let newSession = {
    ...session,
    phase: PHASES[nextIdx].id,
    phaseIndex: nextIdx,
    questionIndex: 0,
  };

  const nextQ = getCurrentQuestion(newSession);
  if (!nextQ && PHASES[nextIdx].id !== "summary") {
    return advancePhase(newSession);
  }

  if (PHASES[nextIdx].id === "summary") {
    newSession = runFinalAnalysis(newSession);
    newSession.isComplete = true;
  }

  return newSession;
}

function runDetection(session) {
  const ctx = buildContext(session);
  const allAnswers = Object.values(session.answers).filter(Boolean).join(" ");

  const businessType = detectBusinessType(
    allAnswers,
  );

  const features = detectFeatures(ctx);

  const detected = {
    ...session.detected,
    business_type: businessType,
    features,
    content_volume: resolveContentVolume(session.answers.content_volume || allAnswers),
    pricing_strategy: resolvePricingStrategy(session.answers.pricing_strategy || allAnswers),
    has_media: resolveHasMedia(session.answers.has_media || allAnswers),
    scope: resolveScope(session.answers.scope || allAnswers),
    needs_booking: session.featureDecisions?.booking ?? features.booking,
    needs_ecommerce: session.featureDecisions?.ecommerce ?? features.ecommerce,
    needs_auth: session.featureDecisions?.auth ?? features.auth,
  };

  detected.complexity = resolveComplexity({ ...ctx, detected });

  return { ...session, detected };
}

// ── Notepad Extraction ──────────────────────────────────────────
// After each answer, extract signals into the notepad with confidence

function runNotepadExtraction(session, questionId, answer) {
  let np = { ...session.notepad };
  const n = normalize(answer);
  const corpus = normalize(Object.values(session.answers).filter(Boolean).join(" "));
  const answerProfile = classifyAnswer(answer);
  let nextDetected = { ...session.detected };
  let nextFeatureDecisions = { ...(session.featureDecisions || {}) };

  // Business type — from detection engine
  if (session.detected.business_type && session.detected.business_type.id !== "general") {
    np = updateNotepadField(np, "business_type", session.detected.business_type.label, 0.85, "detected:" + questionId);
  } else if (session.detected.business_type) {
    np = updateNotepadField(np, "business_type", session.detected.business_type.label, 0.3, "inferred:" + questionId);
  }

  // Brand name — direct from answer
  const inferredBrand = extractBrandName(answer);
  if (inferredBrand && !np.brand_name.value) {
    np = updateNotepadField(np, "brand_name", inferredBrand, 0.74, "inferred:" + questionId);
  }

  if (questionId === "brand_name" && answer.trim()) {
    np = updateNotepadField(np, "brand_name", answer.trim(), 0.95, "direct:" + questionId);
  }

  // Primary CTA — from primary_action or initial signals
  if (questionId === "primary_action" && answer.trim()) {
    np = updateNotepadField(np, "primary_cta", answer.trim(), 0.9, "direct:" + questionId);
  } else if (corpus.includes("whatsapp") || corpus.includes("orcamento") || corpus.includes("pedido")) {
    const cta = corpus.includes("whatsapp")
      ? "Contato via WhatsApp"
      : corpus.includes("pedido")
        ? "Receber pedidos"
        : "Pedir orcamento";
    np = updateNotepadField(np, "primary_cta", cta, 0.72, "inferred:" + questionId);
  } else if (corpus.includes("whatsapp") || corpus.includes("orçamento")) {
    const cta = corpus.includes("whatsapp") ? "Contato via WhatsApp" : "Pedir orçamento";
    np = updateNotepadField(np, "primary_cta", cta, 0.5, "inferred:" + questionId);
  } else if (corpus.includes("agendar") || corpus.includes("marcar")) {
    np = updateNotepadField(np, "primary_cta", "Agendar horário", 0.55, "inferred:" + questionId);
  } else if (corpus.includes("vender") || corpus.includes("comprar")) {
    np = updateNotepadField(np, "primary_cta", "Comprar online", 0.55, "inferred:" + questionId);
  }

  if (questionId === "feature_booking") {
    if (answerProfile.affirmative || n.includes("agendar") || n.includes("marcar")) {
      nextFeatureDecisions.booking = true;
      nextDetected = {
        ...nextDetected,
        needs_booking: true,
        features: { ...nextDetected.features, booking: true },
      };
    } else if (answerProfile.negative) {
      nextFeatureDecisions.booking = false;
      nextDetected = {
        ...nextDetected,
        needs_booking: false,
        features: { ...nextDetected.features, booking: false },
      };
    }
  }

  if (questionId === "feature_selling") {
    if (answerProfile.affirmative || n.includes("vender") || n.includes("comprar")) {
      nextFeatureDecisions.ecommerce = true;
      nextDetected = {
        ...nextDetected,
        needs_ecommerce: true,
        features: { ...nextDetected.features, ecommerce: true },
      };
    } else if (answerProfile.negative) {
      nextFeatureDecisions.ecommerce = false;
      nextDetected = {
        ...nextDetected,
        needs_ecommerce: false,
        features: { ...nextDetected.features, ecommerce: false },
      };
    }
  }

  if (questionId === "feature_area_cliente") {
    if (answerProfile.affirmative || n.includes("login") || n.includes("area") || n.includes("cadastro")) {
      nextFeatureDecisions.auth = true;
      nextDetected = {
        ...nextDetected,
        needs_auth: true,
        features: { ...nextDetected.features, auth: true },
      };
    } else if (answerProfile.negative) {
      nextFeatureDecisions.auth = false;
      nextDetected = {
        ...nextDetected,
        needs_auth: false,
        features: { ...nextDetected.features, auth: false },
      };
    }
  }

  // Offerings — from what_you_do or initial_description
  if (questionId === "what_you_do" || questionId === "initial_description") {
    const offerings = extractOfferings(answer);
    if (offerings.length > 0) {
      np = updateNotepadField(np, "offerings", offerings, 0.7, "extracted:" + questionId);
    }
  }

  if (questionId !== "scope" && n.includes("regiao")) {
    np = updateNotepadField(np, "scope", resolveScope(answer), 0.72, "resolved:" + questionId);
  }

  if (
    questionId !== "scope" &&
    !hasReliableField({ notepad: np }, "scope", 0.7) &&
    (n.includes("bairro") || /\b(?:em|no|na)\s+[a-z]{3,}/.test(n))
  ) {
    np = updateNotepadField(np, "scope", resolveScope(answer), 0.72, "resolved:" + questionId);
  }

  // Scope
  if (questionId === "scope" || n.includes("região") || n.includes("local") || n.includes("online")) {
    const scope = questionId === "scope" ? answer.trim() : resolveScope(answer);
    np = updateNotepadField(np, "scope", scope, questionId === "scope" ? 0.9 : 0.72, "resolved:" + questionId);
  }

  // Channels
  if (questionId === "current_channels" && answer.trim()) {
    np = updateNotepadField(np, "current_channels", answer.trim(), 0.85, "direct:" + questionId);
  } else if (corpus.includes("whatsapp") || corpus.includes("instagram") || corpus.includes("telefone")) {
    const channels = [];
    if (corpus.includes("whatsapp")) channels.push("WhatsApp");
    if (corpus.includes("instagram")) channels.push("Instagram");
    if (corpus.includes("telefone")) channels.push("Telefone");
    np = updateNotepadField(np, "current_channels", channels, 0.68, "inferred:" + questionId);
  }

  // Target audience
  if (questionId === "target_audience" && answer.trim()) {
    np = updateNotepadField(np, "target_audience", answer.trim(), 0.85, "direct:" + questionId);
  } else {
    const inferredAudience = inferTargetAudience(answer);
    if (inferredAudience) {
      np = updateNotepadField(np, "target_audience", inferredAudience, 0.68, "inferred:" + questionId);
    }
  }

  // Content volume
  if (questionId === "content_volume") {
    np = updateNotepadField(np, "content_volume", resolveContentVolume(answer), 0.85, "direct:" + questionId);
  } else if (/\b\d+\b/.test(n) || n.includes("cardapio") || n.includes("catalogo") || n.includes("produtos")) {
    np = updateNotepadField(np, "content_volume", resolveContentVolume(answer), 0.72, "inferred:" + questionId);
  }

  // Media
  if (questionId === "has_media") {
    np = updateNotepadField(np, "has_media", resolveHasMedia(answer), 0.85, "direct:" + questionId);
  } else if (n.includes("foto") || n.includes("imagem") || n.includes("instagram") || n.includes("print")) {
    np = updateNotepadField(np, "has_media", resolveHasMedia(answer), 0.72, "inferred:" + questionId);
  }

  // Pricing
  if (questionId === "pricing_strategy") {
    np = updateNotepadField(np, "pricing_strategy", resolvePricingStrategy(answer), 0.85, "direct:" + questionId);
  } else if (n.includes("preco") || n.includes("valor") || n.includes("orcamento") || n.includes("tabela")) {
    np = updateNotepadField(np, "pricing_strategy", resolvePricingStrategy(answer), 0.72, "inferred:" + questionId);
  }

  // Brand tone
  if (questionId === "brand_tone" && answer.trim()) {
    np = updateNotepadField(np, "brand_tone", answer.trim(), 0.85, "direct:" + questionId);
  }

  // Brand colors
  if (questionId === "brand_assets" && answer.trim()) {
    np = updateNotepadField(np, "brand_colors", answer.trim(), 0.8, "direct:" + questionId);
  }

  // FAQ
  if (questionId === "faq_content" && answer.trim()) {
    np = updateNotepadField(np, "faq_content", answer.trim(), 0.8, "direct:" + questionId);
  }

  // Existing presence
  if (questionId === "existing_presence" && answer.trim()) {
    np = updateNotepadField(np, "existing_presence", answer.trim(), 0.8, "direct:" + questionId);
  }

  return { ...session, notepad: np, detected: nextDetected, featureDecisions: nextFeatureDecisions };
}

function extractOfferings(text) {
  const n = normalize(text);
  // Split on commas, "e", "/" and filter short fragments
  const parts = n.split(/[,\/]|\be\b/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 60);
  return parts.length > 0 ? parts : [];
}

function extractBrandName(text) {
  const patterns = [
    /(?:chamad[ao]|nome (?:e|é)|neg[oó]cio (?:e|é)|empresa (?:e|é))\s+([^.,;]+)/i,
    /(?:tenho|sou dono de|sou dona de)\s+(?:uma|um|a|o)?\s*[^.,;]{0,32}?\s+(?:chamad[ao])\s+([^.,;]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const candidate = match[1]
      .split(/\s+(?:em|no|na|para|pra|que|e quero|e preciso)\s+/i)[0]
      .trim();
    if (candidate.length >= 2 && candidate.length <= 48) return candidate;
  }

  return null;
}

function inferTargetAudience(text) {
  const n = normalize(text);
  const focusedAudience = text.match(/(?:foco em|para|pra|atendo|clientes? sao|publico sao)\s+([^.,;]+)/i);
  if (focusedAudience?.[1]) {
    return focusedAudience[1].trim();
  }

  const audienceSignals = [
    "familia",
    "familias",
    "empresas",
    "clientes",
    "alunos",
    "pacientes",
    "moradores",
    "bairro",
    "jovens",
    "mulheres",
    "homens",
    "criancas",
  ];

  return audienceSignals.some((signal) => n.includes(signal)) ? text.trim() : null;
}

function runFinalAnalysis(session) {
  const ctx = buildContext(session);
  const newDetected = {
    ...session.detected,
    layout: resolveLayout({ ...ctx, detected: session.detected }),
    modules: resolveModules({ ...ctx, detected: session.detected }),
    stack: STACK_MATRIX[session.detected.complexity],
  };

  return { ...session, detected: newDetected };
}

// ═══════════════════════════════════════════════════════════════
// MENSAGENS DO AGENTE
// ═══════════════════════════════════════════════════════════════

export function getAgentGreeting() {
  return "Oi! Eu sou o SIMPLE-AI. Vou te ajudar a criar um site pro seu negócio. Não precisa saber nada de tecnologia — e so me contar o que você faz e o que você precisa. Fala do jeito que vier na cabeca, sem frescura.";
}

export function getPhaseTransitionMessage(session) {
  const phase = PHASES.find((p) => p.id === session.phase);
  if (!phase) return "";

  // If ready to build and not yet proposed, offer to start building
  if (session.readyToBuild && !session.buildProposed) {
    const confidence = getNotepadConfidence(session.notepad);
    return `Ja tenho uma boa ideia do que você precisa (${confidence}% de confianca). Posso montar uma primeira versao agora e você me diz o que quer mudar. Ou prefere me contar mais alguma coisa antes?`;
  }

  const messages = {
    business: "Beleza! Agora preciso entender melhor o seu negócio.",
    goals: "Legal. Agora vamos falar sobre o que o site precisa fazer.",
    content: "Agora vou entender o que vai ter dentro do site.",
    features: "Quase la. Vou confirmar algumas coisas sobre o que você precisa.",
    visual: "Ultima parte — vamos definir a cara do site.",
    summary: "Pronto! Ja tenho tudo que preciso. Olha o que éu entendi:",
  };

  return messages[session.phase] ?? "";
}

export function getProgressPercent(session) {
  return getNotepadConfidence(session.notepad);
}

export function buildSummary(session) {
  const d = session.detected;
  const a = session.answers;
  const np = session.notepad;
  const ctx = buildContext(session);
  const layout = d.layout ?? resolveLayout({ ...ctx, detected: d });
  const modules = d.modules?.length ? d.modules : resolveModules({ ...ctx, detected: d });

  return {
    brand_name: np.brand_name.value ?? a.brand_name ?? "Não definido",
    business_type: d.business_type?.label ?? "Não identificado",
    primary_cta: np.primary_cta.value ?? a.primary_action ?? "Entrar em contato",
    target_audience: np.target_audience.value ?? a.target_audience ?? "Não definido",
    scope: np.scope.value ?? "Local",
    content_volume: d.content_volume,
    pricing_strategy: d.pricing_strategy,
    brand_tone: np.brand_tone.value ?? a.brand_tone ?? "Não definido",
    brand_colors: np.brand_colors.value ?? a.brand_assets ?? "Não definido",

    complexity: d.complexity,
    stack: STACK_MATRIX[d.complexity] ?? d.stack,
    layout,
    modules,
    features: d.features,

    raw_answers: a,
  };
}

export function getNotepadState(session) {
  const np = session.notepad;
  const entries = Object.entries(np).map(([key, entry]) => ({
    field: key,
    value: entry.value,
    confidence: entry.confidence,
    source: entry.source,
    priority: entry.priority,
  }));

  const rtb = checkReadyToBuild(np, session.messagesCount);

  return {
    entries,
    totalConfidence: getNotepadConfidence(np),
    missingCritical: getMissingCritical(np),
    missingImportant: getMissingImportant(np),
    readyToBuild: rtb.ready,
    messagesCount: session.messagesCount,
  };
}

// ═══════════════════════════════════════════════════════════════
// SAMPLE PROMPTS
// ═══════════════════════════════════════════════════════════════

export const SAMPLE_PROMPTS = [
  "tenho uma oficina mecânica e quero um site pra mostrar serviços e receber orçamentos pelo WhatsApp",
  "sou dentista e preciso de um site profissional onde pacientes possam agendar consulta",
  "tenho uma lojá de roupas e quero vender online",
  "sou personal trainer e quero um site pra atrair alunos",
  "tenho uma padaria e queria um site pra mostrar produtos e receber encomendas",
];
