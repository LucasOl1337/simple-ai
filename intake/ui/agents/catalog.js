export const AGENT_CATEGORIES = [
  { id: "todos", label: "Todos" },
  { id: "comercio", label: "Comércio" },
  { id: "saude", label: "Saúde" },
  { id: "servicos", label: "Serviços" },
  { id: "beleza", label: "Beleza" },
];

export const AGENTS_CATALOG = [
  {
    id: "padaria",
    icon: "🍞",
    title: "Padaria",
    category: "comercio",
    short: "Cardápio, horários e encomendas pelo WhatsApp.",
    examples: [
      "Cardápio com fotos das delícias",
      "Horários e dias que abre",
      "Botão pra pedir pelo WhatsApp",
    ],
  },
  {
    id: "clinica",
    icon: "🩺",
    title: "Clínica",
    category: "saude",
    short: "Especialidades, agendamento e equipe.",
    examples: [
      "Especialidades e procedimentos",
      "Equipe com fotos e currículo",
      "Agendamento e contato",
    ],
  },
  {
    id: "salao",
    icon: "💇",
    title: "Salão",
    category: "beleza",
    short: "Serviços, portfólio e horários.",
    examples: [
      "Cortes, coloração e tratamentos",
      "Portfólio antes e depois",
      "Reserva online ou WhatsApp",
    ],
  },
  {
    id: "oficina",
    icon: "🔧",
    title: "Oficina",
    category: "servicos",
    short: "Serviços, orçamento e localização.",
    examples: [
      "Tipos de serviço que faz",
      "Pedir orçamento na hora",
      "Mapa pra cliente achar fácil",
    ],
  },
  {
    id: "ecommerce",
    icon: "🛒",
    title: "E-commerce",
    category: "comercio",
    short: "Produtos, catálogo e pagamento simples.",
    examples: [
      "Vitrine de produtos com fotos",
      "Categorias e busca",
      "Checkout simples ou link de pagamento",
    ],
  },
  {
    id: "auto",
    icon: "✨",
    title: "Automático",
    category: null,
    short: "A gente identifica pelo caminho da conversa.",
    examples: [
      "Você fala sobre seu negócio",
      "A gente escolhe o melhor jeito",
      "Site sai pronto sem você decidir nada",
    ],
  },
];
