// ─────────────────────────────────────────────────────────────
// SIMPLE-AI Agent Flow Engine
// Fluxo conversacional em fases para coletar contexto de
// usuários sem conhecimento técnico e derivar decisões técnicas.
// ─────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// FASES DO AGENTE
// ═══════════════════════════════════════════════════════════════

export const PHASES = [
  {
    id: "opening",
    label: "Abertura",
    description: "Primeiro contato — o usuario descreve livremente o que precisa",
  },
  {
    id: "business",
    label: "Entendimento do Negocio",
    description: "Coletar nome, tipo, publico e regiao",
  },
  {
    id: "goals",
    label: "Objetivo e Acao",
    description: "Definir o que o visitante deve fazer no site e canais atuais",
  },
  {
    id: "content",
    label: "Conteudo e Volume",
    description: "Quantidade de servicos, fotos, precos, perguntas frequentes",
  },
  {
    id: "features",
    label: "Funcionalidades",
    description: "Detectar e confirmar necessidades implicitas",
  },
  {
    id: "visual",
    label: "Preferencia Visual",
    description: "Tom, cores, referencias visuais",
  },
  {
    id: "summary",
    label: "Consolidacao",
    description: "Resumo completo e confirmacao do usuario",
  },
];

// ═══════════════════════════════════════════════════════════════
// PERGUNTAS POR FASE (linguagem 100% leiga)
// ═══════════════════════════════════════════════════════════════

const PHASE_QUESTIONS = {
  opening: [
    {
      id: "initial_description",
      question: "Me conta o que voce faz e o que voce precisa. Fala do jeito que voce explicaria pra um amigo.",
      placeholder: "Ex.: tenho uma oficina mecanica e quero um site pra mostrar meus servicos e receber orcamentos pelo WhatsApp",
      extracts: ["business_type", "offerings", "primary_cta"],
      required: true,
    },
  ],

  business: [
    {
      id: "brand_name",
      question: "Qual o nome do seu negocio?",
      placeholder: "Ex.: Auto Center Silva, Clinica Aura, Padaria Bom Dia",
      extracts: ["brand_name"],
      required: true,
    },
    {
      id: "what_you_do",
      question: "Me explica o que voce vende ou faz, como se eu fosse um cliente novo.",
      placeholder: "Ex.: a gente faz limpeza residencial, pos-obra e tambem passadoria",
      extracts: ["business_type", "offerings", "value_proposition"],
      required: true,
      skip_if: "initial_description_detailed",
    },
    {
      id: "target_audience",
      question: "Quem e o seu cliente tipico? Idade, perfil, como ele te encontra?",
      placeholder: "Ex.: mulheres de 30-50 anos, classe media, me acham pelo Instagram",
      extracts: ["target_audience", "discovery_channel"],
      required: false,
    },
    {
      id: "scope",
      question: "Voce atende numa regiao especifica ou atende online/todo Brasil?",
      placeholder: "Ex.: so na zona sul de Sao Paulo / atendo todo o estado / online",
      extracts: ["scope", "region"],
      required: true,
    },
  ],

  goals: [
    {
      id: "primary_action",
      question: "Quando alguem entra no seu site, o que voce mais quer que essa pessoa faca?",
      placeholder: "Ex.: chamar no WhatsApp / agendar horario / pedir orcamento / comprar",
      extracts: ["primary_cta"],
      required: true,
    },
    {
      id: "current_channels",
      question: "Hoje como as pessoas entram em contato com voce?",
      placeholder: "Ex.: WhatsApp, telefone, vem direto na loja, Instagram",
      extracts: ["current_channels"],
      required: true,
    },
    {
      id: "existing_presence",
      question: "Voce ja tem algo online? Instagram, Google Meu Negocio, outro site?",
      placeholder: "Ex.: tenho Instagram com 2000 seguidores / nao tenho nada ainda",
      extracts: ["existing_presence", "has_content"],
      required: false,
    },
  ],

  content: [
    {
      id: "content_volume",
      question: "Quantos servicos ou produtos voce quer mostrar de cara?",
      placeholder: "Ex.: uns 5 servicos principais / tenho mais de 30 produtos / so 3 coisas",
      extracts: ["content_volume"],
      required: true,
    },
    {
      id: "has_media",
      question: "Voce tem fotos boas do seu trabalho ou produto?",
      placeholder: "Ex.: tenho no Instagram / tenho poucas / nao tenho nenhuma",
      extracts: ["has_media"],
      required: true,
    },
    {
      id: "faq_content",
      question: "Tem alguma informacao que seus clientes sempre perguntam?",
      placeholder: "Ex.: preco, tempo de entrega, se atende no feriado, formas de pagamento",
      extracts: ["faq_content", "pain_points"],
      required: false,
    },
    {
      id: "pricing_strategy",
      question: "Voce quer mostrar precos no site ou prefere que a pessoa peca orcamento?",
      placeholder: "Ex.: quero mostrar os precos / prefiro que peça orcamento / depende do servico",
      extracts: ["pricing_strategy"],
      required: true,
    },
  ],

  features: [
    {
      id: "feature_booking",
      question: "Seus clientes precisam marcar horario com voce? Como funciona isso hoje?",
      placeholder: "Ex.: sim, marcam pelo WhatsApp / nao, e ordem de chegada / uso agenda do Google",
      extracts: ["needs_booking", "booking_mode"],
      condition: (ctx) => hasSignal(ctx, ["agendar", "horario", "marcar", "reserva", "agenda", "atendimento"]),
      required: true,
    },
    {
      id: "feature_selling",
      question: "Voce precisa vender e receber pagamento direto pelo site?",
      placeholder: "Ex.: sim, quero vender online / nao, so quero mostrar e a pessoa me chama",
      extracts: ["needs_ecommerce", "payment_mode"],
      condition: (ctx) => hasSignal(ctx, ["vender", "comprar", "produto", "loja", "preco", "carrinho"]),
      required: true,
    },
    {
      id: "feature_area_cliente",
      question: "Seus clientes precisam de um login ou area propria no site?",
      placeholder: "Ex.: nao precisa / seria bom pra acompanhar pedidos / quero area de aluno",
      extracts: ["needs_auth"],
      condition: (ctx) => hasSignal(ctx, ["login", "cadastro", "area do cliente", "painel", "acompanhar"]),
      required: true,
    },
    {
      id: "feature_simplify",
      question: "Pelo que voce me contou, da pra comecar simples. No comeco pode ser so apresentar o negocio e ter um botao de contato, ou voce precisa de algo a mais desde o primeiro dia?",
      placeholder: "Ex.: pode comecar simples / preciso de formulario desde o inicio / quero ja com agendamento",
      extracts: ["mvp_scope"],
      condition: (ctx) => !hasAnyComplexFeature(ctx),
      required: false,
    },
  ],

  visual: [
    {
      id: "visual_reference",
      question: "Me manda um site ou Instagram que voce acha bonito. Nao precisa ser do mesmo ramo.",
      placeholder: "Ex.: gosto do estilo do site da Apple / gosto do Instagram @exemplo / nao tenho referencia",
      extracts: ["visual_reference"],
      required: false,
    },
    {
      id: "brand_tone",
      question: "Seu negocio e mais serio e profissional, descontraido e jovem, ou acolhedor e familiar?",
      placeholder: "Ex.: profissional mas acessivel / jovem e moderno / familiar e acolhedor",
      extracts: ["brand_tone"],
      required: true,
    },
    {
      id: "brand_assets",
      question: "Voce ja tem cores definidas? Tem logo?",
      placeholder: "Ex.: tenho logo azul e branco / nao tenho nada / tenho mas quero mudar",
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
  { id: "clinic", label: "Clinica ou consultorio", keywords: ["clinica", "consultorio", "medico", "dentista", "psicologo", "fisioterapia", "estetica", "saude"] },
  { id: "bakery", label: "Padaria ou confeitaria", keywords: ["padaria", "confeitaria", "bolo", "doces", "salgados", "cafeteria"] },
  { id: "mechanic", label: "Oficina ou servico automotivo", keywords: ["oficina", "mecanica", "mecanico", "carro", "veiculo", "auto center", "funilaria"] },
  { id: "cleaning", label: "Servico de limpeza", keywords: ["limpeza", "faxina", "diarista", "higienizacao", "limpar"] },
  { id: "restaurant", label: "Restaurante ou alimentacao", keywords: ["restaurante", "hamburgueria", "pizzaria", "lanchonete", "delivery", "menu", "cardapio"] },
  { id: "beauty", label: "Salao ou barbearia", keywords: ["salao", "barbearia", "cabelo", "manicure", "nail", "beleza", "corte"] },
  { id: "fitness", label: "Academia ou personal", keywords: ["academia", "personal", "treino", "crossfit", "pilates", "yoga"] },
  { id: "education", label: "Escola ou curso", keywords: ["escola", "curso", "aula", "professor", "ensino", "mentoria", "coaching"] },
  { id: "legal", label: "Advocacia ou contabilidade", keywords: ["advogado", "advocacia", "contador", "contabilidade", "juridico"] },
  { id: "retail", label: "Loja ou comercio", keywords: ["loja", "comercio", "vender", "produto", "estoque", "catalogo"] },
  { id: "construction", label: "Construcao ou reforma", keywords: ["construcao", "reforma", "pedreiro", "arquiteto", "engenheiro", "obra"] },
  { id: "tech", label: "Servico de tecnologia", keywords: ["informatica", "computador", "celular", "assistencia", "software", "app"] },
];

const FEATURE_SIGNALS = {
  booking: ["agendar", "agendamento", "reserva", "appointment", "agenda", "calendario", "horario", "marcar"],
  ecommerce: ["vender", "comprar", "carrinho", "pagamento", "checkout", "loja online", "e-commerce"],
  auth: ["login", "cadastro", "usuario", "painel", "area do cliente", "acompanhar"],
  forms: ["formulario", "orcamento", "contato", "mensagem", "solicitar"],
  gallery: ["fotos", "portfolio", "galeria", "antes e depois", "trabalhos"],
  map: ["mapa", "localizacao", "endereco", "como chegar"],
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
    backend: "Nenhum — conteudo estatico",
    data: "JSON local",
    deploy: "Netlify ou Vercel",
    reason: "Entrega rapida, zero complexidade de manutencao.",
  },
  MEDIUM: {
    profile: "Site com formularios e listagem dinamica",
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
  { content_volume: "many", pricing: "visible", layout: "catalog", pages: 6, label: "Catalogo com filtros e listagem" },
  { content_volume: "many", pricing: "hidden", layout: "catalog_cta", pages: 5, label: "Catalogo com CTA de orcamento" },
];

const MODULE_RULES = [
  { id: "hero", label: "Hero section", condition: () => true },
  { id: "services", label: "Servicos ou produtos", condition: (ctx) => !!ctx.answers.content_volume },
  { id: "about", label: "Sobre o negocio", condition: (ctx) => ctx.detected.scope === "local" },
  { id: "gallery", label: "Galeria de fotos", condition: (ctx) => ctx.answers.has_media === "yes" },
  { id: "pricing", label: "Tabela de precos", condition: (ctx) => ctx.answers.pricing_strategy === "visible" },
  { id: "faq", label: "Perguntas frequentes", condition: (ctx) => !!ctx.answers.faq_content },
  { id: "contact", label: "Contato", condition: () => true },
  { id: "testimonials", label: "Depoimentos", condition: (ctx) => !!ctx.detected.existing_reviews },
  { id: "map", label: "Mapa de localizacao", condition: (ctx) => ctx.detected.scope === "local" },
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
  return keywords.some((kw) => corpus.includes(kw));
}

function hasAnyComplexFeature(ctx) {
  return ctx.detected.needs_booking || ctx.detected.needs_ecommerce || ctx.detected.needs_auth;
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

  return best && bestScore > 0 ? best : { id: "general", label: "Negocio de servico geral", keywords: [] };
}

function detectFeatures(ctx) {
  const features = {};
  const corpus = normalize(Object.values(ctx.answers).filter(Boolean).join(" "));

  for (const [feature, keywords] of Object.entries(FEATURE_SIGNALS)) {
    features[feature] = keywords.some((kw) => corpus.includes(kw));
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
  if (n.includes("mostrar") || n.includes("preco") || n.includes("tabela")) return "visible";
  if (n.includes("orcamento") || n.includes("depende")) return "hidden";
  return "hidden";
}

function resolveHasMedia(answer) {
  if (!answer) return "unknown";
  const n = normalize(answer);
  if (n.includes("tenho") && !n.includes("nao tenho")) return "yes";
  if (n.includes("instagram")) return "yes";
  if (n.includes("nao") || n.includes("nenhum")) return "no";
  return "few";
}

function resolveScope(answer) {
  if (!answer) return "local";
  const n = normalize(answer);
  if (n.includes("online") || n.includes("todo brasil") || n.includes("nacional")) return "national";
  if (n.includes("estado") || n.includes("regiao")) return "regional";
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
  business_type:    { priority: "critical",  default_value: null,      default_confidence: 0 },
  brand_name:       { priority: "critical",  default_value: null,      default_confidence: 0 },
  primary_cta:      { priority: "critical",  default_value: null,      default_confidence: 0 },
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
    .filter(([, entry]) => entry.priority === "critical" && entry.confidence < 0.5)
    .map(([key]) => key);
}

function getMissingImportant(notepad) {
  return Object.entries(notepad)
    .filter(([, entry]) => entry.priority === "important" && entry.confidence < 0.4)
    .map(([key]) => key);
}

function checkReadyToBuild(notepad, messagesCount) {
  const criticalMissing = getMissingCritical(notepad);
  const confidence = getNotepadConfidence(notepad);
  return {
    ready: criticalMissing.length === 0 && confidence >= 55 && messagesCount >= 3,
    criticalMissing,
    confidence,
    messagesCount,
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
    isComplete: false,
    readyToBuild: false,
    buildProposed: false,
  };
}

export function getCurrentQuestion(session) {
  const phaseId = session.phase;
  const questions = PHASE_QUESTIONS[phaseId] ?? [];

  let idx = session.questionIndex;
  while (idx < questions.length) {
    const q = questions[idx];
    if (q.condition && !q.condition(buildContext(session))) {
      idx++;
      continue;
    }
    if (q.skip_if && shouldSkip(session, q.skip_if)) {
      idx++;
      continue;
    }
    return { ...q, _index: idx };
  }

  return null;
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
  };

  newSession = runDetection(newSession);
  newSession = runNotepadExtraction(newSession, currentQ.id, trimmed);

  const rtb = checkReadyToBuild(newSession.notepad, newSession.messagesCount);
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

  const businessType = detectBusinessType(
    Object.values(session.answers).filter(Boolean).join(" "),
  );

  const features = detectFeatures(ctx);

  const detected = {
    ...session.detected,
    business_type: businessType,
    features,
    content_volume: resolveContentVolume(session.answers.content_volume),
    pricing_strategy: resolvePricingStrategy(session.answers.pricing_strategy),
    has_media: resolveHasMedia(session.answers.has_media),
    scope: resolveScope(session.answers.scope),
    needs_booking: features.booking,
    needs_ecommerce: features.ecommerce,
    needs_auth: features.auth,
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

  // Business type — from detection engine
  if (session.detected.business_type && session.detected.business_type.id !== "general") {
    np = updateNotepadField(np, "business_type", session.detected.business_type.label, 0.85, "detected:" + questionId);
  } else if (session.detected.business_type) {
    np = updateNotepadField(np, "business_type", session.detected.business_type.label, 0.3, "inferred:" + questionId);
  }

  // Brand name — direct from answer
  if (questionId === "brand_name" && answer.trim()) {
    np = updateNotepadField(np, "brand_name", answer.trim(), 0.95, "direct:" + questionId);
  }

  // Primary CTA — from primary_action or initial signals
  if (questionId === "primary_action" && answer.trim()) {
    np = updateNotepadField(np, "primary_cta", answer.trim(), 0.9, "direct:" + questionId);
  } else if (corpus.includes("whatsapp") || corpus.includes("orcamento")) {
    const cta = corpus.includes("whatsapp") ? "Contato via WhatsApp" : "Pedir orcamento";
    np = updateNotepadField(np, "primary_cta", cta, 0.5, "inferred:" + questionId);
  } else if (corpus.includes("agendar") || corpus.includes("marcar")) {
    np = updateNotepadField(np, "primary_cta", "Agendar horario", 0.55, "inferred:" + questionId);
  } else if (corpus.includes("vender") || corpus.includes("comprar")) {
    np = updateNotepadField(np, "primary_cta", "Comprar online", 0.55, "inferred:" + questionId);
  }

  // Offerings — from what_you_do or initial_description
  if (questionId === "what_you_do" || questionId === "initial_description") {
    const offerings = extractOfferings(answer);
    if (offerings.length > 0) {
      np = updateNotepadField(np, "offerings", offerings, 0.7, "extracted:" + questionId);
    }
  }

  // Scope
  if (questionId === "scope" || n.includes("regiao") || n.includes("local") || n.includes("online")) {
    const scope = resolveScope(answer);
    np = updateNotepadField(np, "scope", scope, questionId === "scope" ? 0.9 : 0.5, "resolved:" + questionId);
  }

  // Channels
  if (questionId === "current_channels" && answer.trim()) {
    np = updateNotepadField(np, "current_channels", answer.trim(), 0.85, "direct:" + questionId);
  } else if (corpus.includes("whatsapp") || corpus.includes("instagram") || corpus.includes("telefone")) {
    const channels = [];
    if (corpus.includes("whatsapp")) channels.push("WhatsApp");
    if (corpus.includes("instagram")) channels.push("Instagram");
    if (corpus.includes("telefone")) channels.push("Telefone");
    np = updateNotepadField(np, "current_channels", channels, 0.45, "inferred:" + questionId);
  }

  // Target audience
  if (questionId === "target_audience" && answer.trim()) {
    np = updateNotepadField(np, "target_audience", answer.trim(), 0.85, "direct:" + questionId);
  }

  // Content volume
  if (questionId === "content_volume") {
    np = updateNotepadField(np, "content_volume", resolveContentVolume(answer), 0.85, "direct:" + questionId);
  }

  // Media
  if (questionId === "has_media") {
    np = updateNotepadField(np, "has_media", resolveHasMedia(answer), 0.85, "direct:" + questionId);
  }

  // Pricing
  if (questionId === "pricing_strategy") {
    np = updateNotepadField(np, "pricing_strategy", resolvePricingStrategy(answer), 0.85, "direct:" + questionId);
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

  return { ...session, notepad: np };
}

function extractOfferings(text) {
  const n = normalize(text);
  // Split on commas, "e", "/" and filter short fragments
  const parts = n.split(/[,\/]|\be\b/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 60);
  return parts.length > 0 ? parts : [];
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
  return "Oi! Eu sou o SIMPLE-AI. Vou te ajudar a criar um site pro seu negocio. Nao precisa saber nada de tecnologia — e so me contar o que voce faz e o que voce precisa. Fala do jeito que vier na cabeca, sem frescura.";
}

export function getPhaseTransitionMessage(session) {
  const phase = PHASES.find((p) => p.id === session.phase);
  if (!phase) return "";

  // If ready to build and not yet proposed, offer to start building
  if (session.readyToBuild && !session.buildProposed) {
    const confidence = getNotepadConfidence(session.notepad);
    return `Ja tenho uma boa ideia do que voce precisa (${confidence}% de confianca). Posso montar uma primeira versao agora e voce me diz o que quer mudar. Ou prefere me contar mais alguma coisa antes?`;
  }

  const messages = {
    business: "Beleza! Agora preciso entender melhor o seu negocio.",
    goals: "Legal. Agora vamos falar sobre o que o site precisa fazer.",
    content: "Agora vou entender o que vai ter dentro do site.",
    features: "Quase la. Vou confirmar algumas coisas sobre o que voce precisa.",
    visual: "Ultima parte — vamos definir a cara do site.",
    summary: "Pronto! Ja tenho tudo que preciso. Olha o que eu entendi:",
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

  return {
    brand_name: np.brand_name.value ?? a.brand_name ?? "Nao definido",
    business_type: d.business_type?.label ?? "Nao identificado",
    primary_cta: np.primary_cta.value ?? a.primary_action ?? "Entrar em contato",
    target_audience: np.target_audience.value ?? a.target_audience ?? "Nao definido",
    scope: np.scope.value ?? "Local",
    content_volume: d.content_volume,
    pricing_strategy: d.pricing_strategy,
    brand_tone: np.brand_tone.value ?? a.brand_tone ?? "Nao definido",
    brand_colors: np.brand_colors.value ?? a.brand_assets ?? "Nao definido",

    complexity: d.complexity,
    stack: d.stack,
    layout: d.layout,
    modules: d.modules,
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
  "tenho uma oficina mecanica e quero um site pra mostrar servicos e receber orcamentos pelo WhatsApp",
  "sou dentista e preciso de um site profissional onde pacientes possam agendar consulta",
  "tenho uma loja de roupas e quero vender online",
  "sou personal trainer e quero um site pra atrair alunos",
  "tenho uma padaria e queria um site pra mostrar produtos e receber encomendas",
];
