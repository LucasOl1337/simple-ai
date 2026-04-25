# SIMPLE-AI — Fluxo do Agente Conversacional

## Princípio Central
O usuário **não sabe nada de tecnologia**. Toda pergunta deve usar linguagem de negócio, nunca termos técnicos. O agente decide a stack, layout e arquitetura **silenciosamente** com base nas respostas.

---

## Fase 0: Abertura
> "Me conta o que você faz e o que você precisa. Fala do jeito que você explicaria pra um amigo."

O agente recebe um texto livre e extrai sinais iniciais:
- Tipo de negócio (serviço, produto, ambos)
- Complexidade aparente (site simples vs plataforma)
- Tom emocional (urgente, exploratório, detalhista)

---

## Fase 1: Entendimento do Negócio
Perguntas que o agente faz (uma por vez, adapta conforme respostas):

| # | Pergunta (linguagem leiga) | O que o agente extrai |
|---|---|---|
| 1.1 | "Qual o nome do seu negócio?" | brand_name |
| 1.2 | "Me explica o que você vende ou faz, como se eu fosse um cliente novo." | business_type, offerings, value_proposition |
| 1.3 | "Quem é o seu cliente típico? Idade, perfil, como ele te encontra?" | target_audience, discovery_channel |
| 1.4 | "Você atende numa região específica ou atende online/todo Brasil?" | scope (local/regional/national/online) |

**Decisão silenciosa após Fase 1:**
- Classificação do negócio (B2C serviço local, B2C produto, etc.)
- Estimativa de complexidade: LOW / MEDIUM / HIGH

---

## Fase 2: Objetivo e Ação Principal
| # | Pergunta | Extração |
|---|---|---|
| 2.1 | "Quando alguém entra no seu site, o que você mais quer que essa pessoa faça?" | primary_cta (agendar, comprar, ligar, pedir orçamento, etc.) |
| 2.2 | "Hoje como as pessoas entram em contato com você?" | current_channels (WhatsApp, telefone, Instagram, presencial) |
| 2.3 | "Você já tem algo online? Instagram, Google Meu Negócio, outro site?" | existing_presence |

**Decisão silenciosa após Fase 2:**
- CTA principal definido
- Necessidade de formulário, WhatsApp redirect, booking, ou e-commerce
- Se já tem conteúdo aproveitável (Instagram = fotos, GMB = reviews)

---

## Fase 3: Conteúdo e Volume
| # | Pergunta | Extração |
|---|---|---|
| 3.1 | "Quantos serviços ou produtos você quer mostrar de cara?" | content_volume (poucos = 1-5, médio = 6-15, muitos = 15+) |
| 3.2 | "Você tem fotos boas do seu trabalho/produto?" | has_media (sim/não/precisa produzir) |
| 3.3 | "Tem alguma informação que seus clientes sempre perguntam?" | faq_content, pain_points |
| 3.4 | "Você quer mostrar preços no site ou prefere que a pessoa peça orçamento?" | pricing_strategy (visible/hidden/on_request) |

**Decisão silenciosa após Fase 3:**
- Quantidade de páginas: 1 (landing), 3-5 (institucional), 5+ (catálogo)
- Layout: single-page scroll vs multi-page
- Necessidade de galeria, listagem, cards de preço
- Content gaps (o que o usuário ainda precisa produzir)

---

## Fase 4: Funcionalidades (detectadas, não perguntadas diretamente)
O agente analisa todas as respostas e identifica necessidades implícitas:

| Sinal nas respostas | Funcionalidade inferida | Impacto na stack |
|---|---|---|
| "agendar", "horário", "marcar" | Sistema de agendamento | +booking integration |
| "vender", "comprar", "carrinho" | E-commerce | +payment gateway |
| "login", "área do cliente" | Autenticação | +auth system |
| "muitos produtos", "catálogo" | CMS/listagem dinâmica | +database, admin |
| "receber mensagem", "formulário" | Form de contato | +form handler |
| WhatsApp como canal principal | WhatsApp redirect/button | Simples, sem backend |
| "Instagram" como fonte de fotos | Integração Instagram | +API integration |

Se detectar funcionalidade complexa, o agente **confirma com o usuário em linguagem simples**:
> "Pelo que você me contou, parece que você vai precisar de um jeito do cliente marcar horário direto pelo site. É isso mesmo ou no começo pode ser só pelo WhatsApp?"

---

## Fase 5: Preferência Visual (simplificada)
| # | Pergunta | Extração |
|---|---|---|
| 5.1 | "Me manda um site ou Instagram que você acha bonito, não precisa ser do mesmo ramo." | visual_reference |
| 5.2 | "Seu negócio é mais sério/profissional, descontraído/jovem, ou acolhedor/familiar?" | brand_tone |
| 5.3 | "Tem cores que você já usa? Logo?" | brand_colors, has_logo |

**Decisão silenciosa após Fase 5:**
- Paleta de cores
- Tipografia (serif = tradicional, sans = moderno, rounded = friendly)
- Estilo de layout (clean/minimal, bold/impactful, warm/organic)

---

## Fase 6: Consolidação e Confirmação
O agente apresenta um resumo visual:

```
📋 RESUMO DO SEU PROJETO

Negócio: [brand_name] — [business_type]
Objetivo: [primary_cta]
Público: [target_audience]
Região: [scope]

🏗️ O que vai ter no site:
- Página principal com [modules]
- [n] páginas no total
- [features list em linguagem leiga]

🎨 Estilo: [brand_tone] com cores [brand_colors]

⚡ Próximo passo: Vou montar a primeira versão. Quer ajustar algo?
```

O usuário pode pedir mudanças e o agente itera.

---

## Mapeamento Respostas → Decisões Técnicas (invisível pro usuário)

### Stack Decision Matrix
| Complexidade | Frontend | Backend | Database | Deploy |
|---|---|---|---|---|
| LOW (site simples, <5 páginas) | HTML/CSS estático ou React SPA | Nenhum | Nenhum (JSON local) | Netlify/Vercel |
| MEDIUM (formulários, listagem dinâmica) | React + Tailwind | API Routes / Serverless | Oracle (básico) | Vercel + Oracle Cloud |
| HIGH (auth, pagamento, booking) | React + Tailwind + shadcn | Node.js API | Oracle (completo) | Oracle Cloud + Vercel |

### Layout Decision Matrix
| Content Volume | Pricing Strategy | Layout |
|---|---|---|
| Poucos serviços (1-5) | Qualquer | Single page scroll |
| Médio (6-15) | Visível | Multi-page com listagem |
| Médio (6-15) | Sob consulta | Multi-page simples |
| Muitos (15+) | Visível | Catálogo com filtros |
| Muitos (15+) | Sob consulta | Catálogo + CTA orçamento |

### Module Selection
Baseado em `business_type` + `primary_cta` + `content_volume`:
- **Hero section**: SEMPRE (título + subtítulo + CTA)
- **Serviços/Produtos**: Se tem offerings
- **Sobre**: Se é serviço B2C local
- **Galeria**: Se has_media = true
- **Preços**: Se pricing_strategy = visible
- **FAQ**: Se faq_content existe
- **Contato**: SEMPRE
- **Depoimentos**: Se existing_presence inclui reviews
- **Mapa**: Se scope = local
- **WhatsApp Float**: Se canal principal = WhatsApp

---

## Regras do Agente

1. **Máximo 1 pergunta por mensagem** — nunca bombardear
2. **Sempre validar o que entendeu** — "Entendi que você [X], certo?"
3. **Sugerir quando o usuário travar** — "A maioria dos [business_type] começa com [sugestão]"
4. **Nunca usar jargão técnico** — "banco de dados" vira "guardar informações", "API" vira "conexão automática"
5. **Mostrar progresso** — "Já entendi bem o seu negócio. Agora só preciso de mais [n] informações."
6. **Permitir pular** — "Se não souber agora, pode pular que eu sugiro depois."
7. **Adaptar profundidade** — Se o usuário dá respostas curtas, simplificar. Se dá respostas longas, extrair mais.
