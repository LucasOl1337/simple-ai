// ─────────────────────────────────────────────────────────────
// SIMPLE-AI Agent Flow Engine
// Fluxo conversacional em fases para coletar contexto de
// usuários sem conhecimento técnico e derivar decisões técnicas.
//
// SPEC CORE: Este código implementa a especificação em docs/spec/
// Veja: docs/spec/agent-flow.md, docs/spec/first-interaction.md,
//       docs/spec/flow-order.md
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
      question: "Qual é o nome do seu negócio?",
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
      question: "Que tipo de cliente você mais quer atrair? Pode ser algo como famílias do bairro, empresas da região ou pessoas que te acham no Instagram.",
      placeholder: "Ex.: famílias do bairro / mulheres que me acham no Instagram / empresas da região",
      extracts: ["target_audience", "discovery_channel"],
      required: false,
    },
    {
      id: "scope",
      question: "Você atende mais perto do seu bairro ou da sua cidade, ou atende pessoas de qualquer lugar?",
      placeholder: "Ex.: só aqui na região / atendo a cidade toda / atendo online",
      extracts: ["scope", "region"],
      required: true,
    },
  ],

  goals: [
    {
      id: "primary_action",
      question: "Quando alguém entrar no seu site, o que você mais quer que essa pessoa faça?",
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
      question: "No começo, você quer mostrar só os principais ou quer mostrar bastante coisa?",
      placeholder: "Ex.: só os 5 principais / quero mostrar bastante produto / quero algo simples",
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
      question: "O que seus clientes sempre perguntam antes de fechar com você?",
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
      question: "Seus clientes precisam marcar horário com você? Como vocês combinam isso hoje?",
      placeholder: "Ex.: sim, marcam pelo WhatsApp / não, e ordem de chegada / uso agenda do Google",
      extracts: ["needs_booking", "booking_mode"],
      condition: (ctx) => hasSignal(ctx, ["agendar", "horário", "marcar", "reserva", "agenda", "atendimento"]),
      required: true,
    },
    {
      id: "feature_selling",
      question: "Você quer que a pessoa consiga comprar direto pelo site, ou basta ela te chamar para fechar?",
      placeholder: "Ex.: sim, quero vender online / não, só quero mostrar e a pessoa me chama",
      extracts: ["needs_ecommerce", "payment_mode"],
      condition: (ctx) => hasSignal(ctx, ["vender", "comprar", "produto", "loja", "preço", "carrinho"]),
      required: true,
    },
    {
      id: "feature_area_cliente",
      question: "Seus clientes vão precisar entrar numa área deles para acompanhar alguma coisa, ou isso não precisa agora?",
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
      question: "Se você lembrar de um site ou Instagram bonito, pode me mandar. Não precisa ser do mesmo tipo de negócio.",
      placeholder: "Ex.: gosto do estilo do site da Apple / gosto do Instagram @exemplo / não tenho referência",
      extracts: ["visual_reference"],
      required: false,
    },
    {
      id: "brand_tone",
      question: "Que cara você quer que o site passe: mais profissional, mais moderno, mais acolhedor, ou outro estilo?",
      placeholder: "Ex.: profissional mas acessível / jovem e moderno / familiar e acolhedor",
      extracts: ["brand_tone"],
      required: true,
    },
    {
      id: "brand_assets",
      question: "Você já tem logo, cores ou alguma imagem que represente bem seu negócio?",
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
  { id: "cleaning", label: "Serviço de limpeza", keywords: ["limpeza", "faxina", "diarista", "higienização", "limpar"] },
  { id: "restaurant", label: "Restaurante ou alimentação", keywords: ["restaurante", "hamburgueria", "pizzaria", "lanchonete", "delivery", "menu", "cardápio"] },
  { id: "beauty", label: "Salao ou barbearia", keywords: ["salao", "barbearia", "cabelo", "manicure", "nail", "beleza", "corte"] },
  { id: "fitness", label: "Academia ou personal", keywords: ["academia", "personal", "treino", "crossfit", "pilates", "yoga"] },
  { id: "education", label: "Escola ou curso", keywords: ["escola", "curso", "aula", "professor", "ensino", "mentoria", "coaching"] },
  { id: "legal", label: "Advocacia ou contabilidade", keywords: ["advogado", "advocacia", "contador", "contabilidade", "jurídico"] },
  { id: "retail", label: "Loja ou comércio", keywords: ["loja", "comércio", "vender", "produto", "estoque", "catálogo"] },
  { id: "construction", label: "Construção ou reforma", keywords: ["construção", "reforma", "pedreiro", "arquiteto", "engenheiro", "obra"] },
  { id: "tech", label: "Serviço de tecnologia", keywords: ["informática", "computador", "celular", "assistência", "software", "app"] },
];

const FEATURE_SIGNALS = {
  booking: ["agendar", "agendamento", "reserva", "appointment", "agenda", "calendario", "horário", "marcar"],
  ecommerce: ["vender online", "comprar online", "carrinho", "checkout", "loja online", "e-commerce"],
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
  { id: "services", label: "Serviços ou produtos", condition: (ctx) => !!ctx.answers.content_volume },
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
      "Que tipo de cliente você mais quer atrair primeiro? Pode responder de um jeito bem simples.",
    scope:
      "Você atende mais perto de você, em várias cidades ou também online?",
    primary_action:
      "Quando a pessoa entrar no site, o que você quer que ela faça primeiro?",
    current_channels:
      "Hoje o cliente fala com você por onde? WhatsApp, Instagram, telefone ou na loja?",
    existing_presence:
      "Você já tem Instagram, Google ou algum site antigo que eu possa usar como referência?",
    content_volume:
      "No começo, você quer mostrar só o principal ou quer mostrar bastante coisa?",
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
      "Seus clientes precisam entrar numa área deles, ou isso pode ficar para depois?",
    feature_simplify:
      "Dá para começar simples. Quer uma versão só para apresentar e receber contato?",
    visual_reference:
      "Tem algum site, Instagram ou estilo visual que você gosta?",
    brand_tone:
      "Que impressão você quer que o site passe: mais profissional, mais moderno, mais acolhedor ou outro estilo?",
    brand_assets:
      "Você já tem logo ou cores definidas, ou quer que eu proponha uma direção visual?",
  };

  return prompts[questionId] ?? "Me conta mais um pouco, do jeito que ficar mais f\u00e1cil para voc\u00ea.";
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
  const notepadFields = fields.filter((field) => field in session.notepad);
  if (notepadFields.length > 0) {
    return notepadFields.every((field) => session.notepad[field].confidence >= 0.65);
  }

  return Boolean(session.answers?.[question.id]);
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
  if (n.match(/\b(30|40|50|muit|dezena|catálogo)\b/)) return "many";
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
  const business = isFilled(summary.business_type, ["N\u00e3o identificado"])
    ? summary.business_type
    : "neg\u00f3cio";
  const brand = isFilled(summary.brand_name, ["N\u00e3o definido"])
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
    brand_name: `Como você quer que o nome do negócio apareça no site? Pode ser o nome oficial ou o nome mais conhecido pelos clientes.`,
    what_you_do: `${brandPrefix}me explica em uma frase simples o que você vende ou faz, do jeito que um cliente novo entenderia.`,
    target_audience: `${brandPrefix}quem você mais quer atrair primeiro? Pode falar como "famílias do bairro", "empresas pequenas", "alunos iniciantes"...`,
    scope: `${brandPrefix}você atende mais perto de você, em várias cidades ou online?`,
    primary_action: `Quando alguém entrar nesse site de ${business}, qual é a ação mais importante: chamar, comprar, agendar, pedir orçamento ou outra coisa?`,
    current_channels: cta
      ? `Hoje por onde esse cliente faz "${cta}" com você? WhatsApp, Instagram, telefone, loja física ou outro canal?`
      : `Hoje por onde os clientes falam com você? WhatsApp, Instagram, telefone, loja física ou outro canal?`,
    existing_presence: `${brandPrefix}já existe algum lugar online que eu possa considerar como referência de conteúdo? Instagram, Google, cardápio, catálogo ou site antigo.`,
    content_volume: `Para começar, você quer mostrar só o principal ou quer mostrar bastante coisa nesse site de ${business}?`,
    has_media: `Você já tem fotos, prints ou materiais que representam bem ${brand || "esse negócio"}? Se estiver no Instagram, também serve.`,
    faq_content: `Quais dúvidas os clientes sempre perguntam antes de fechar?`,
    pricing_strategy: `Sobre preços: você quer mostrar valores no site, mostrar só alguns exemplos ou deixar tudo para conversa?`,
    feature_booking: `Pelo contexto, pode existir agendamento. Seus clientes precisam marcar horário ou reservar alguma coisa? Como isso funciona hoje?`,
    feature_selling: `Como apareceram produtos/preços, você quer vender direto no site agora ou prefere começar com vitrine e chamada para contato?`,
    feature_area_cliente: `Seus clientes vão precisar entrar numa área deles para acompanhar alguma coisa, ou isso não precisa agora?`,
    feature_simplify: `Pelo que você contou, dá para começar simples. Quer uma primeira versão mais enxuta para ver logo como fica?`,
    visual_reference: `Tem alguma referência visual que combina com ${brand || business}? Pode ser site, Instagram, marca ou até um estilo que você gosta.`,
    brand_tone: `Que cara você quer que o site passe: mais profissional, mais moderno, mais acolhedor, mais forte ou outro estilo?`,
    brand_assets: `Você já tem logo, cores ou imagens do seu negócio, ou prefere que eu sugira uma direção inicial?`,
  };

  const asciiAdaptiveText = {
    brand_name: `Como você quer que o nome do negócio apareça no site? Pode ser o nome oficial ou o nome mais conhecido pelos clientes.`,
    what_you_do: `${brandPrefix}me explica em uma frase simples o que você vende ou faz, do jeito que um cliente novo entenderia.`,
    target_audience: `${brandPrefix}quem você mais quer atrair primeiro? Pode falar como "famílias do bairro", "empresas pequenas", "alunos iniciantes"...`,
    scope: `${brandPrefix}esse atendimento é local, por região ou online? Quero acertar o texto de localização e os botões do site.`,
    primary_action: `Quando alguém entrar nesse site de ${business}, qual é a ação mais importante: chamar, comprar, agendar, pedir orçamento ou outra coisa?`,
    current_channels: cta
      ? `Hoje por onde esse cliente faz "${cta}" com você? WhatsApp, Instagram, telefone, loja física ou outro canal?`
      : `Hoje por onde os clientes falam com você? WhatsApp, Instagram, telefone, loja física ou outro canal?`,
    existing_presence: `${brandPrefix}já existe algum lugar online que eu possa considerar como referência de conteúdo? Instagram, Google, cardápio, catálogo ou site antigo.`,
    content_volume: `Para esse site de ${business}, quantos itens você quer mostrar primeiro? Pode ser poucos destaques, uma lista média ou um catálogo maior.`,
    has_media: `Você já tem fotos, prints ou materiais que representam bem ${brand || "esse negócio"}? Se estiver no Instagram, também serve.`,
    faq_content: `Quais dúvidas os clientes sempre perguntam antes de fechar? Isso ajuda o site a responder objeções sozinho.`,
    pricing_strategy: `Sobre preços: você quer mostrar valores no site, mostrar só alguns exemplos ou deixar tudo para conversa?`,
    feature_booking: `Pelo contexto, pode existir agendamento. Seus clientes precisam marcar horário ou reservar alguma coisa? Como isso funciona hoje?`,
    feature_selling: `Como apareceram produtos/preços, você quer vender direto no site agora ou prefere começar com vitrine e chamada para contato?`,
    feature_area_cliente: `Existe alguma parte que precisaria de login, área do cliente ou acompanhamento de pedido, ou isso pode ficar fora da primeira versão?`,
    feature_simplify: `Pelo que você contou, dá para começar enxuto. Quer uma primeira versão focada em apresentação e contato, ou tem algo indispensável desde o dia um?`,
    visual_reference: `Tem alguma referência visual que combina com ${brand || business}? Pode ser site, Instagram, marca ou até um estilo que você gosta.`,
    brand_tone: `Qual sensação o site deve passar: mais profissional, moderno, familiar, premium, divertido ou acolhedor?`,
    brand_assets: `Você já tem logo, cores ou fotos de marca, ou quer que a primeira versão proponha uma direção visual?`,
  };

  return {
    ...question,
    question:
      fallback ??
      adaptiveText[question.id] ??
      asciiAdaptiveText[question.id] ??
      question.question,
  };
}

function checkReadyToBuild(notepad, usefulMessagesCount) {
  const críticalMissing = getMissingCritical(notepad);
  const confidence = getNotepadConfidence(notepad);
  const hasFastPreviewMinimum =
    críticalMissing.length === 0
    && usefulMessagesCount >= 2
    && confidence >= 45
    && getMissingImportant(notepad).length <= 2;

  return {
    ready:
      (críticalMissing.length === 0 && confidence >= 55 && usefulMessagesCount >= 3)
      || hasFastPreviewMinimum,
    críticalMissing,
    confidence,
    messagesCount: usefulMessagesCount,
    fastPreviewMode: hasFastPreviewMinimum,
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

export function createDefaultTestSession(userMessage = "") {
  let session = createSession();
  const raw = userMessage.trim() || "Quero um site de exemplo para teste, usando informacoes padrao.";
  session = submitAnswer(session, raw);
  const notepad = {
    ...session.notepad,
    business_type: { ...session.notepad.business_type, value: "Negócio de serviço geral", confidence: 0.8, source: "default-test" },
    brand_name: { ...session.notepad.brand_name, value: "Empresa Exemplo", confidence: 0.8, source: "default-test" },
    primary_cta: { ...session.notepad.primary_cta, value: "Entrar em contato", confidence: 0.8, source: "default-test" },
    offerings: { ...session.notepad.offerings, value: ["Serviço principal", "Atendimento personalizado", "Orçamento rápido"], confidence: 0.7, source: "default-test" },
    current_channels: { ...session.notepad.current_channels, value: ["WhatsApp"], confidence: 0.7, source: "default-test" },
    target_audience: { ...session.notepad.target_audience, value: "clientes da região", confidence: 0.65, source: "default-test" },
    brand_tone: { ...session.notepad.brand_tone, value: "profissional e acessível", confidence: 0.7, source: "default-test" },
  };
  return runFinalAnalysis({
    ...session,
    notepad,
    usefulMessagesCount: Math.max(session.usefulMessagesCount, 3),
    readyToBuild: true,
    buildProposed: true,
    defaultTestMode: true,
  });
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
        : "Pedir orçamento";
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
  } else if (/\b\d+\b/.test(n) || n.includes("cardápio") || n.includes("catálogo") || n.includes("produtos")) {
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
  return "Oi! Eu vou te ajudar a criar um site pro seu negócio. Não precisa entender nada disso para começar. Me conta com calma o que você faz e o que você gostaria que esse site ajudasse a resolver.";
}

export function getPhaseTransitionMessage(session) {
  const phase = PHASES.find((p) => p.id === session.phase);
  if (!phase) return "";

  // If ready to build and not yet proposed, offer to start building
  if (session.readyToBuild && !session.buildProposed) {
    const confidence = getNotepadConfidence(session.notepad);
    return `Já entendi bem o caminho (${confidence}% anotado). Se você quiser, eu já posso montar uma primeira versão para você ver e depois a gente ajusta com calma.`;
  }

  const messages = {
    business: "Beleza. Agora vou só entender melhor o seu negócio.",
    goals: "Certo. Agora quero entender o que você mais quer que o site te ajude a conseguir.",
    content: "Agora vou entender o que vale mais a pena mostrar nessa primeira versão.",
    features: "Quase lá. Só vou confirmar um ou dois pontos para não errar.",
    visual: "Se você quiser, agora a gente define a cara do site.",
    summary: "Pronto. Já tenho uma boa visão do que você precisa:",
  };

  return messages[session.phase] ?? "";
}

export function getProgressPercent(session) {
  return getNotepadConfidence(session.notepad);
}

function resolveVisualTone(brandTone, businessType) {
  const tone = normalize(brandTone || "");
  const segment = normalize(businessType || "");

  if (tone.includes("premium") || tone.includes("sofistic")) return "premium";
  if (tone.includes("acolhedor") || tone.includes("familiar")) return "warm";
  if (tone.includes("moderno") || tone.includes("jovem")) return "modern";
  if (segment.includes("clinica") || segment.includes("consultorio")) return "clean";
  if (segment.includes("oficina") || segment.includes("automot")) return "industrial";
  if (segment.includes("padaria") || segment.includes("confeitaria") || segment.includes("restaurante")) return "warm";
  return "modern";
}

function resolvePaletteHint(brandColors, tone) {
  const colors = String(brandColors || "").trim();
  if (colors && !/não|nao|sem|indefin|nenhum/i.test(colors)) {
    return colors;
  }
  const fallbackByTone = {
    premium: "preto, dourado e off-white",
    warm: "terracota, creme e marrom suave",
    clean: "branco, azul suave e cinza claro",
    industrial: "grafite, chumbo e laranja",
    modern: "verde profundo, grafite e neutros claros",
  };
  return fallbackByTone[tone] || fallbackByTone.modern;
}

function normalizeContentVolume(value) {
  const volume = normalize(value || "");
  if (/(alto|many|muitos|catalogo grande|catalogo maior)/.test(volume)) return "high";
  if (/(medio|m[eé]dio|lista media|lista média|6|7|8|9|10|11|12|13|14|15)/.test(volume)) return "medium";
  return "low";
}

function collectModuleLabels(summary) {
  return Array.isArray(summary.modules)
    ? summary.modules
        .map((item) => (typeof item === "string" ? item : item?.label || item?.id || ""))
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    : [];
}

function resolveLayoutFamily(summary, contentVolume, cta, moduleLabels) {
  const business = normalize(summary.business_type || "");
  const tone = normalize(summary.brand_tone || "");
  const channels = normalize(String(summary.raw_answers?.current_channels || summary.current_channels || ""));
  const localScope = normalize(summary.scope || "local");
  const serviceBusiness = /(clinica|consultorio|oficina|assistencia|sal[aã]o|est[eé]tica|pet|dentista|personal|limpeza|advocacia|contabil)/.test(business);
  const sensoryBusiness = /(padaria|caf[eé]|confeitaria|restaurante|salao|est[eé]tica|spa|beleza)/.test(business);
  const whatsappLead = /(whatsapp|zap)/.test(cta) || /(whatsapp|zap)/.test(channels);
  const manyItems = contentVolume === "high" || moduleLabels.length >= 6;

  if (manyItems) return "catalog-grid";
  if (serviceBusiness && whatsappLead && /(local|bairro|cidade|regi[aã]o)/.test(localScope)) return "local-trust";
  if (sensoryBusiness && !/(serio|profissional)/.test(tone)) return "image-led";
  if (/(premium|sofistic|editorial)/.test(tone)) return "editorial-onepage";
  return "conversion-landing";
}

function resolveVisualStyle(summary, tone, layoutFamily) {
  const business = normalize(summary.business_type || "");

  if (layoutFamily === "catalog-grid") return /(pet|loja)/.test(business) ? "friendly-accessible" : "clean-professional";
  if (layoutFamily === "local-trust") return /(oficina|automot)/.test(business) ? "bold-conversion" : "clean-professional";
  if (layoutFamily === "image-led") return /(padaria|caf[eé]|restaurante)/.test(business) ? "warm-artisanal" : "editorial-premium";
  if (layoutFamily === "editorial-onepage") return "editorial-premium";

  if (tone === "clean") return "clean-professional";
  if (tone === "warm") return "warm-artisanal";
  if (tone === "premium") return "editorial-premium";
  return "friendly-accessible";
}

function resolveAgentProfile(layoutFamily, visualStyle) {
  if (layoutFamily === "catalog-grid") return "catalogo-moderno";
  if (layoutFamily === "local-trust") return "servico-local-confianca";
  if (layoutFamily === "conversion-landing") return "landing-direta";
  if (visualStyle === "editorial-premium") return "site-builder-core";
  return "site-builder-core";
}

function resolveSectionOrder(layoutFamily, summary) {
  const hasFaq = Boolean(summary.raw_answers?.faq_content) || Boolean(summary.faq_content?.length);
  if (layoutFamily === "catalog-grid") {
    return ["hero", "categories", "services", "proof", "contact", "footer"];
  }
  if (layoutFamily === "local-trust") {
    return ["hero", "services", "proof", "process", hasFaq ? "faq" : "about", "contact", "footer"];
  }
  if (layoutFamily === "image-led") {
    return ["hero", "about", "services", "gallery", "proof", "contact", "footer"];
  }
  if (layoutFamily === "editorial-onepage") {
    return ["hero", "about", "services", "proof", "contact", "footer"];
  }
  return ["hero", "benefits", "services", hasFaq ? "faq" : "about", "contact", "footer"];
}

function buildDesignNotes(summary, layoutFamily, visualStyle, sectionOrder, contentVolume, primaryCta) {
  const business = summary.business_type || "negócio local";
  const trustEarly = ["local-trust", "editorial-onepage"].includes(layoutFamily);
  const referenceIds = {
    "conversion-landing": ["landingfolio-home", "one-page-love-gallery"],
    "local-trust": ["framer-small-business-examples", "elementor-small-business-examples"],
    "catalog-grid": ["landingfolio-home", "awesome-inspiration-repo"],
    "image-led": ["justinmind-hero-examples", "land-book-landing"],
    "editorial-onepage": ["one-page-love-gallery", "land-book-landing"],
  };

  return {
    segment_signal: business,
    primary_cta_signal: primaryCta,
    layout_reason: `${layoutFamily} foi escolhido com base no CTA, no volume de conteúdo e no contexto de ${business}.`,
    style_reason: `${visualStyle} foi escolhido para evitar aparência genérica e manter leitura simples para o segmento.`,
    must_have_sections: sectionOrder,
    trust_priority: trustEarly ? "show-early" : "supporting",
    content_density: contentVolume,
    avoid: [
      "cara de startup SaaS",
      "gradientes genéricos de IA",
      "cards repetitivos sem hierarquia",
      "imagem artificial ou render 3D",
    ],
    reference_ids: referenceIds[layoutFamily] || ["landingfolio-home"],
  };
}

function buildImagePrompts({ summary, business, audience, servicesFocus, layoutFamily, visualStyle, tone }) {
  const styleHintByVisualStyle = {
    "clean-professional": "foto editorial limpa, realista, luz natural, composição organizada",
    "bold-conversion": "foto comercial realista, contraste forte, energia e clareza visual",
    "warm-artisanal": "foto calorosa, próxima, textura humana, luz natural suave",
    "editorial-premium": "foto editorial refinada, sofisticada, realista, composição respirada",
    "friendly-accessible": "foto realista, clara, simpática, acolhedora e objetiva",
  };
  const sceneHintByLayout = {
    "catalog-grid": "foco em variedade, organização e clareza dos itens",
    "local-trust": "foco em atendimento, confiança e presença real do negócio",
    "image-led": "foco em atmosfera, apelo sensorial e proximidade humana",
    "editorial-onepage": "foco em autoridade calma e composição elegante",
    "conversion-landing": "foco em proposta clara e ação principal evidente",
  };
  const styleHint = styleHintByVisualStyle[visualStyle] || styleHintByVisualStyle["clean-professional"];
  const sceneHint = sceneHintByLayout[layoutFamily] || sceneHintByLayout["conversion-landing"];
  const negativeHints = [
    "sem texto embutido",
    "sem mockup de tela",
    "sem render 3D",
    "sem estética genérica de IA",
    "sem excesso de filtros",
  ];
  const heroGoal = tone === "industrial"
    ? "transmitir ação rápida e competência real"
    : "transmitir confiança imediata e contexto real";

  return [
    {
      slot: "hero",
      aspect_ratio: "16:9",
      goal: heroGoal,
      alt: `${business} em operação real`,
      caption: "Visão principal do negócio",
      negative_prompt_hints: negativeHints,
      prompt: `${styleHint}. ${sceneHint}. Foto editorial realista de ${business}, ambiente profissional, pessoas reais quando fizer sentido, iluminação natural, foco em qualidade e confiança.`,
    },
    {
      slot: "services",
      aspect_ratio: "4:3",
      goal: "mostrar a oferta principal com clareza",
      alt: `${servicesFocus}`,
      caption: "Serviços ou ofertas em destaque",
      negative_prompt_hints: negativeHints,
      prompt: `${styleHint}. Cena realista mostrando ${servicesFocus} para ${business}, composição escaneável, detalhe verdadeiro do serviço, sem elementos fantasiosos.`,
    },
    {
      slot: "audience",
      aspect_ratio: "4:3",
      goal: "humanizar o atendimento e o público",
      alt: `Clientes de ${business}`,
      caption: "Experiência do cliente",
      negative_prompt_hints: negativeHints,
      prompt: `${styleHint}. Clientes reais de ${business} (${audience}), atendimento autêntico, clima humano, imagem limpa e confiável.`,
    },
  ];
}

function buildVisualPlan(summary) {
  const tone = resolveVisualTone(summary.brand_tone, summary.business_type);
  const paletteHint = resolvePaletteHint(summary.brand_colors, tone);
  const moduleLabels = collectModuleLabels(summary);
  const meaningfulModules = moduleLabels.filter((label) => !/hero|contato|contact/i.test(label));
  const servicesFocus = meaningfulModules.slice(0, 3).join(", ") || "serviços principais";
  const business = summary.business_type || "negócio local";
  const audience = summary.target_audience || "clientes da região";
  const primaryCta = summary.primary_cta || "Entrar em contato";
  const normalizedCta = normalize(primaryCta);
  const contentVolume = normalizeContentVolume(summary.content_volume);
  const layoutFamily = resolveLayoutFamily(summary, contentVolume, normalizedCta, moduleLabels);
  const visualStyle = resolveVisualStyle(summary, tone, layoutFamily);
  const sectionOrder = resolveSectionOrder(layoutFamily, summary);
  const cardDensity = contentVolume === "high" ? "compact" : contentVolume === "medium" ? "balanced" : "comfortable";
  const ctaType = /(whatsapp|zap)/.test(normalizedCta)
    ? "whatsapp"
    : /(agend)/.test(normalizedCta)
      ? "schedule"
      : /(compr|pedido)/.test(normalizedCta)
        ? "buy"
        : /(liga|telefon)/.test(normalizedCta)
          ? "call"
          : "contact";
  const agentProfile = resolveAgentProfile(layoutFamily, visualStyle);

  return {
    version: "design-plan-v1",
    tone,
    palette_hint: paletteHint,
    layout_family: layoutFamily,
    visual_style: visualStyle,
    agent_profile: agentProfile,
    content_density: cardDensity,
    trust_strategy:
      layoutFamily === "local-trust"
        ? ["social-proof-early", "process-block", "repeat-contact-cta"]
        : layoutFamily === "catalog-grid"
          ? ["clarity-first", "category-grouping", "repeat-contact-cta"]
          : ["cta-clarity", "clean-hierarchy"],
    ui_direction: {
      hero_style: layoutFamily === "image-led" ? "image-dominant" : tone === "industrial" ? "strong-contrast" : "editorial-clean",
      spacing: visualStyle === "editorial-premium" ? "generous" : "airy",
      card_density: cardDensity,
      section_order: sectionOrder,
    },
    cta_strategy: {
      type: ctaType,
      label: primaryCta,
      placement: ["hero", layoutFamily === "catalog-grid" ? "services" : "proof", "footer"],
    },
    image_strategy: {
      provider: "9router-preferred",
      mode: "generated-first",
      slots: ["hero", "services", "audience"],
      generation: {
        model: "cx/gpt-5.4-image",
        size: "auto",
        quality: "auto",
        background: "auto",
        image_detail: "high",
        output_format: "png",
      },
    },
    design_notes: buildDesignNotes(summary, layoutFamily, visualStyle, sectionOrder, cardDensity, primaryCta),
    image_prompts: buildImagePrompts({ summary, business, audience, servicesFocus, layoutFamily, visualStyle, tone }),
  };
}

export function buildSummary(session) {
  const d = session.detected;
  const a = session.answers;
  const np = session.notepad;
  const ctx = buildContext(session);
  const layout = d.layout ?? resolveLayout({ ...ctx, detected: d });
  const modules = d.modules?.length ? d.modules : resolveModules({ ...ctx, detected: d });

  const summary = {
    brand_name: np.brand_name.value ?? a.brand_name ?? "N\u00e3o definido",
    business_type: d.business_type?.label ?? "N\u00e3o identificado",
    primary_cta: np.primary_cta.value ?? a.primary_action ?? "Entrar em contato",
    target_audience: np.target_audience.value ?? a.target_audience ?? "N\u00e3o definido",
    scope: np.scope.value ?? "Local",
    content_volume: d.content_volume,
    pricing_strategy: d.pricing_strategy,
    brand_tone: np.brand_tone.value ?? a.brand_tone ?? "N\u00e3o definido",
    brand_colors: np.brand_colors.value ?? a.brand_assets ?? "N\u00e3o definido",

    complexity: d.complexity,
    stack: STACK_MATRIX[d.complexity] ?? d.stack,
    layout,
    modules,
    features: d.features,

    raw_answers: a,
  };

  const designPlan = buildVisualPlan(summary);
  return {
    ...summary,
    design_plan: designPlan,
    visual_plan: designPlan,
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
  "tenho uma loja de roupas e quero vender online",
  "sou personal trainer e quero um site pra atrair alunos",
  "tenho uma padaria e queria um site pra mostrar produtos e receber encomendas",
];
