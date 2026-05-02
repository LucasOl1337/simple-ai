export const STORAGE_KEY = "simple-ai-whiteboard-v5";
export const BUILD_STORAGE_KEY = "simple-ai-build-v1";
export const NOTE_LAYOUT_STORAGE_KEY = "simple-ai-note-layout-v2";
export const CHAT_SESSIONS_STORAGE_KEY = "simple-ai-chat-sessions-v1";
export const ACTIVE_CHAT_SESSION_STORAGE_KEY = "simple-ai-active-chat-session-v1";
export const THEME_STORAGE_KEY = "simple-ai-theme-v1";
export const SELECTED_AGENT_STORAGE_KEY = "simple-ai-agent-v1";
export const BUILDER_MODEL_STORAGE_KEY = "simple-ai-builder-model-v1";

export const BUILDER_MODEL_OPTIONS = [
  { id: "cx/gpt-5.5", provider: "default", label: "GPT 5.5", note: "default atual" },
  { id: "cx/gpt-5.4", provider: "default", label: "GPT 5.4", note: "equilibrado" },
  { id: "cx/gpt-5.4-mini", provider: "default", label: "GPT 5.4 Mini", note: "mais rapido" },
  { id: "cx/gpt-5.5-high", provider: "default", label: "GPT 5.5 (High)", note: "alta capacidade" },
  { id: "cx/gpt-5.5-xhigh", provider: "default", label: "GPT 5.5 (XHigh)", note: "capacidade extrema" },
  { id: "cx/gpt-5.4-high", provider: "default", label: "GPT 5.4 (High)", note: "alta capacidade" },
  { id: "glm/glm-5.1", provider: "default", label: "GLM 5.1", note: "Z AI CODING" },
  { id: "glm/glm-5", provider: "default", label: "GLM 5.0 Turbo", note: "Z AI CODING" },
  { id: "glm/glm-4.7", provider: "default", label: "GLM 4.7", note: "Z AI CODING" },
];

export const DEFAULT_BUILDER_MODEL = BUILDER_MODEL_OPTIONS[0].id;

export const OPENING_MESSAGE = "Oi. Me conta com calma o que você faz e o que você gostaria que o site ajudasse a resolver.";

export const AUTO_TEST_SCENARIOS = [
  {
    id: "napassarela",
    label: "Napassarela",
    businessName: "Napassarela",
    referenceLink: "https://www.instagram.com/napassarela_penapolis/",
    opening:
      "Tenho uma loja chamada Napassarela e quero um site usando o Instagram como base: https://www.instagram.com/napassarela_penapolis/",
    whatYouDo:
      "A Napassarela é uma loja de roupas e moda feminina em Penápolis. Quero mostrar peças, novidades, estilo da loja e facilitar contato para compra.",
    audience: "Mulheres de Penápolis e região que acompanham novidades de moda pelo Instagram.",
    scope: "Atende Penápolis e região, com presença forte pelo Instagram.",
    action: "Quero que a pessoa veja as peças e peça informações para comprar.",
    channels: "O Instagram oficial é https://www.instagram.com/napassarela_penapolis/ e deve ser usado como referência principal.",
    presence: "Instagram oficial: https://www.instagram.com/napassarela_penapolis/",
    volume: "Quero mostrar categorias, novidades e destaques da loja sem inventar preços.",
    media: "Use o Instagram como base visual e de conteúdo da loja.",
    faq: "Tamanho, disponibilidade, formas de compra, retirada ou entrega.",
    pricing: "Prefiro não inventar preços; mostrar sob consulta.",
    booking: "não",
    selling: "sim",
    auth: "não",
    visual: "Visual de loja feminina, elegante, comercial e inspirado no Instagram da Napassarela.",
    brandAssets: "Usar o Instagram da Napassarela como referência principal de estética, conteúdo e imagens.",
  },
  {
    id: "oficina",
    label: "Oficina mecânica",
    businessName: "Auto Center Silva",
    opening:
      "Tenho uma oficina mecânica e quero um site para mostrar serviços, passar confiança e pedir orçamento no WhatsApp.",
    whatYouDo:
      "A gente faz revisão, freio, troca de óleo e manutenção em geral.",
    audience: "Motoristas da região, principalmente quem precisa resolver rápido.",
    scope: "Atendo na cidade inteira e também recebo alguns clientes de bairros vizinhos.",
    action: "Quero que a pessoa peça orçamento pelo WhatsApp.",
    channels: "Hoje fechamos pelo WhatsApp, telefone e indicação.",
    presence: "Tenho Instagram com fotos de serviços e comentários de clientes.",
    volume: "Quero mostrar 5 serviços principais.",
    media: "Tenho fotos reais da oficina e dos carros atendidos.",
    faq: "Tempo de serviço, garantia e formas de pagamento.",
    pricing: "Prefiro pedir orçamento.",
    booking: "não",
    selling: "não",
    auth: "não",
    visual: "Quero algo profissional e forte, sem cara de site genérico.",
    brandAssets: "Tenho logo azul e prata.",
  },
  {
    id: "clinica",
    label: "Clínica de estética",
    businessName: "Clínica Aura",
    opening:
      "Tenho uma clínica de estética e preciso de um site bonito para mostrar tratamentos e agendar pelo WhatsApp.",
    whatYouDo:
      "Fazemos limpeza de pele, botox, harmonização e protocolos faciais.",
    audience: "Mulheres que procuram cuidado com a pele e atendimento personalizado.",
    scope: "Atendo em um bairro fixo, com público da cidade toda.",
    action: "Quero agendamento e contato rápido.",
    channels: "As clientes chegam pelo Instagram e pelo WhatsApp.",
    presence: "Tenho Instagram forte e algumas avaliações boas no Google.",
    volume: "Quero mostrar poucos tratamentos, mas com mais detalhe.",
    media: "Tenho fotos de antes e depois e imagens da clínica.",
    faq: "Tempo de sessão, indicação e valores.",
    pricing: "Prefiro mostrar alguns valores e deixar o restante sob consulta.",
    booking: "sim",
    selling: "não",
    auth: "não",
    visual: "Quero uma sensação premium, leve e moderna.",
    brandAssets: "Tenho logo dourado e branco.",
  },
  {
    id: "salao",
    label: "Salão de beleza",
    businessName: "Studio Bela",
    opening:
      "Tenho um salão de beleza e quero um site para mostrar serviços, atrair clientes e marcar horário.",
    whatYouDo:
      "Faço cabelo, unhas, sobrancelha e maquiagem.",
    audience: "Público feminino da região e clientes que gostam de cuidar da aparência.",
    scope: "Atendo só na minha cidade.",
    action: "Quero que a pessoa marque horário.",
    channels: "Hoje o agendamento vai por WhatsApp e Instagram.",
    presence: "Tenho Instagram e várias fotos de trabalhos.",
    volume: "Quero mostrar 6 serviços principais.",
    media: "Tenho fotos boas e vídeos curtos.",
    faq: "Duração do atendimento, horário de sábado e formas de pagamento.",
    pricing: "Quero mostrar valores básicos.",
    booking: "sim",
    selling: "não",
    auth: "não",
    visual: "Quero algo moderno, feminino e acolhedor.",
    brandAssets: "Tenho logo rosa e branco.",
  },
  {
    id: "loja",
    label: "Loja de roupas",
    businessName: "Moda Viva",
    opening:
      "Tenho uma loja de roupas e quero um site para mostrar catálogo, separar novidades e receber pedidos.",
    whatYouDo:
      "Vendemos roupas femininas, acessórios e peças de temporada.",
    audience: "Mulheres que compram pela internet e também quem passa na loja.",
    scope: "Atendo online e também na loja física.",
    action: "Quero receber pedidos e chamar para comprar.",
    channels: "Hoje a maioria fala com a gente pelo Instagram e WhatsApp.",
    presence: "Tenho Instagram com catálogo e algumas campanhas antigas.",
    volume: "Quero mostrar bastante coisa, mas com organização.",
    media: "Tenho fotos de catálogo e ensaios.",
    faq: "Troca, envio, tamanho e prazo de entrega.",
    pricing: "Quero mostrar alguns preços e promoções.",
    booking: "não",
    selling: "sim",
    auth: "não",
    visual: "Quero um visual elegante e comercial.",
    brandAssets: "Tenho logo minimalista em preto e bege.",
  },
];
