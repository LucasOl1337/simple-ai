# Simple.AI — Benchmarks Curados (2026-04-29)

## Como usar este doc

Este documento é uma curadoria de referências externas para inspirar o design do **Simple.AI** — plataforma B2C pt-BR de orquestração de agentes operacionais para leigos. As referências estão organizadas em 6 categorias (landings de AI builders, UX de produto, marketplace, pricing, pt-BR/LATAM e onboarding). Para cada item há **URL real verificada**, o que faz bem, o que copiar para qual superfície específica do Simple.AI (landing, builder, playground, marketplace, pricing, onboarding) e, quando relevante, anti-padrões a evitar. Use como input para decisões de IV (identidade visual), copy, hierarquia de telas e fluxos críticos. Hipóteses não verificadas estão marcadas com **[hipótese]**; URLs que não consegui confirmar diretamente em fetch estão marcadas com **[verificar]**.

---

## 1. Landing pages de plataformas AI builder / agent

### 1.1 Lovable
- **URL:** https://lovable.dev/
- **O que faz bem:** Hero com input gigante "What do you want to build?" no centro da fold — converte intent em ação imediata. Galeria de "remixes" da comunidade rolando logo abaixo prova social viva. Visual limpo, tipografia editorial.
- **O que copiar:** **Landing** — input central como protagonista da fold (não botão CTA), feed de "agentes feitos pela comunidade" como prova social rolando. **Builder** — espelhar o padrão "descreve em texto e veja acontecer" no chat builder.
- **O que evitar:** Lovable mistura "build apps" com "build everything" (decks, BI, marketing) — perdeu foco em 2026. Simple.AI deve manter foco em agentes operacionais, não virar um Swiss-army-knife.

### 1.2 v0 (Vercel)
- **URL:** https://v0.app/
- **O que faz bem:** "Build agents, apps, and websites with AI" — copy direta. Demo interativa antes de exigir login. Templates organizados por caso de uso. Estética dark + neutros, tipografia Inter/Geist.
- **O que copiar:** **Landing** — demo interativa antes do login (deixar o leigo brincar 30s sem criar conta). **Marketplace** — categorização por caso de uso, não por arquétipo técnico.
- **O que evitar:** Tom muito "for developers" — Simple.AI precisa traduzir tudo para vocabulário de operador de negócio.

### 1.3 Bolt.new
- **URL:** https://bolt.new/
- **O que faz bem:** Hero brutalmente simples: textarea + "Build" e nada mais acima da dobra. Tagline "Prompt, run, edit, and deploy" em verbos diretos.
- **O que copiar:** **Landing** — radicalismo na fold: zero distrações, só o input que importa. Para leigo brasileiro, isso reduz fricção de entrada.
- **O que evitar:** A landing não explica o que acontece *depois* do prompt — leigo brasileiro provavelmente quer ver 1 print do playground antes de mergulhar.

### 1.4 Cursor
- **URL:** https://cursor.com/
- **O que faz bem:** Hero com vídeo curto mostrando o produto em uso, sem explicar features. Copy "The best way to code with AI" — afirmação confiante e curta.
- **O que copiar:** **Landing** — vídeo loop de 8-15s mostrando o builder do Simple.AI conversando + um agente sendo gerado. Vale mais que 3 parágrafos de descrição.

### 1.5 Lindy
- **URL:** https://www.lindy.ai/
- **O que faz bem:** Posicionamento explícito ("The Ultimate AI Assistant For Work"), galeria de Lindies pré-prontos, copy focada em outcomes ("draft emails", "research leads"), não em features.
- **O que copiar:** **Landing + Marketplace** — apresentar agentes pré-prontos por *outcome de negócio* ("redatora de propostas comerciais", "revisora de contratos") em vez de arquétipos abstratos. **Hero** — slot de "vídeos de agente trabalhando" para prova social concreta.
- **O que evitar:** Lindy peca em densidade (muitos blocos, muitas cores, muito CTA). Simple.AI deve manter respiro.

### 1.6 Relevance AI
- **URL:** https://relevanceai.com/
- **O que faz bem:** Conceito "AI Workforce" — antropomorfiza agentes como funcionários ("recruit, manage, build teams of AI agents"). Marketplace de agentes em https://marketplace.relevanceai.com/ é showcase forte.
- **O que copiar:** **Marketplace** — preview cards mostrando "o que esse agente entrega" (input → output exemplo) em vez de só descrição. **Pricing** — vinculação clara entre tier e quantidade de agentes ativos.
- **O que evitar:** Linguagem "agent workforce" pode soar fria para o leigo brasileiro. Preferir "seus assistentes" ou "sua equipe de agentes" em pt-BR.

### 1.7 Gumloop
- **URL:** https://www.gumloop.com/
- **O que faz bem:** Hero com canvas visual de workflow rodando em background — vê-se o produto antes de ler copy. Logos de Shopify, Ramp, Gusto como prova social pesada.
- **O que copiar:** **Landing** — preview animado do builder/playground rodando em background do hero é mais convincente que screenshots estáticos. **Trust bar** — mesmo sem grandes logos, agregar "+X agentes criados" ou "+Y mensagens processadas" como prova de tração.

### 1.8 Linear
- **URL:** https://linear.app/
- **O que faz bem:** Tipografia editorial (Inter Display), animações sutis, espaçamento generoso, dark mode bem feito. Define o "look" de software premium B2B 2024-2026.
- **O que copiar:** **Landing inteira** — Linear é o benchmark de hierarquia tipográfica e respiro. Vale roubar: tamanhos de heading, line-height, escala de cinzas no dark mode, gradientes sutis.
- **O que evitar:** Linear é minimalista quase ao ponto de gélido — Simple.AI pt-BR deve adicionar 1-2 elementos quentes (ilustração, sotaque visual) para não soar importado.

### 1.9 Notion AI (página dedicada)
- **URL:** https://www.notion.com/product/ai
- **O que faz bem:** Estrutura "AI integrada ao seu trabalho" + demos curtas por caso de uso (escrever, resumir, traduzir, perguntar). Tom acessível, não-técnico.
- **O que copiar:** **Landing** — seção "para quem é" com 3-4 personas concretas (ex: "para o profissional liberal", "para o pequeno empresário", "para o agente de marketing freelancer") em vez de listar features.

### 1.10 Granola
- **URL:** https://www.granola.ai/
- **O que faz bem:** Landing curtíssima, tom humano ("AI Notepad for back-to-back meetings"). Foco em *uma coisa só*. Vídeo demo no fold.
- **O que copiar:** **Landing** — manter landing curta (1 fold + 3 seções no máximo na v0). Tom humano e específico vence tom genérico de "plataforma AI completa".

---

## 2. Product UX de AI builders / agents

### 2.1 Lovable — Builder + preview lado-a-lado
- **URL:** https://lovable.dev/ (entrar no app)
- **O que faz bem:** Chat à esquerda + preview ao vivo à direita; cada mensagem do AI gera diff visível imediato. Variantes acessíveis via histórico de versões.
- **O que copiar:** **Builder** — split layout chat + preview do agente. **Playground com variantes paralelas** — usar a mesma metáfora de "histórico de versões clicáveis" para alternar entre variantes A/B/C do mesmo agente.

### 2.2 v0 — Generations e iteração
- **URL:** https://v0.app/chat
- **O que faz bem:** Cada turno do chat produz um "block" que pode ser fork/branch — leigo entende "voltar" e "tentar outra coisa" sem precisar saber o que é git.
- **O que copiar:** **Playground** — fork visual de variantes ("e se esse agente fosse mais formal?") com 1 clique. Não pedir ao usuário pra entender "branches" — usar metáfora de "remix" ou "variação".

### 2.3 Cursor — Composer / chat
- **URL:** https://cursor.com/
- **O que faz bem:** Modo "ask vs agent vs edit" — usuário escolhe o nível de autonomia explicitamente.
- **O que copiar:** **Builder** — toggle visível entre "modo conversacional" (chat livre) e "modo guiado" (wizard com perguntas) para cobrir tanto leigo extremo quanto power-user.

### 2.4 Lindy — Workflow visual + chat
- **URL:** https://www.lindy.ai/
- **O que faz bem:** Builder híbrido: chat constrói o workflow visual à direita. Leigo vê o "diagrama" sendo desenhado a partir do que ele descreve em linguagem natural.
- **O que copiar:** **Builder conversacional** — espelhar perfeitamente: chat à esquerda, **spec declarativo legível** (não código) à direita atualizando em tempo real. Esse é o coração do "Lovable de agentes pt-BR".

### 2.5 Gumloop — Canvas de workflow
- **URL:** https://www.gumloop.com/
- **O que faz bem:** Drag-and-drop nodes com ícones grandes e labels em linguagem natural. Status colorido por nó (cinza/amarelo/verde) durante execução.
- **O que copiar:** **Playground / runs** — reutilizar a paleta de status (não-iniciado / executando / sucesso / erro) com cores universais; **botão "ver passo a passo"** para auditar a execução de um agente, indispensável para confiança do leigo.
- **O que evitar:** Canvas drag-and-drop puro é overkill para Simple.AI v0 — manter spec textual + visualização de runs separada.

### 2.6 Relevance AI — Agent Studio
- **URL:** https://relevanceai.com/agents
- **O que faz bem:** Configuração de agente com tabs claras: Identidade, Ferramentas, Conhecimento, Triggers. Cada tab é uma decisão pequena, não um formulário gigante.
- **O que copiar:** **Builder (modo guiado)** — quebrar configuração avançada em 4-5 tabs estreitas após o chat inicial. Reduz medo do leigo de "configurar tudo errado".

### 2.7 OpenAI Playground
- **URL:** https://platform.openai.com/playground
- **O que faz bem:** Comparison view nativo (rodar mesmo prompt em 2-3 modelos lado-a-lado).
- **O que copiar:** **Playground com variantes paralelas** — adotar layout em colunas para 2-3 variantes simultâneas, com mesmo input → outputs distintos abaixo.

### 2.8 Anthropic Workbench
- **URL:** https://console.anthropic.com/
- **O que faz bem:** Edição estruturada de system prompt + variáveis nomeadas. Auditoria fácil de cada turn.
- **O que copiar:** **Builder avançado (Studio tier)** — expor variáveis do agente como campos nomeados editáveis (ex: `{{tom}}`, `{{publico_alvo}}`) em vez de obrigar o usuário a editar prompt cru.

---

## 3. Marketplace / catálogo / discovery

### 3.1 GPT Store (OpenAI)
- **URL:** https://chatgpt.com/gpts
- **O que faz bem:** Categorias temáticas (Writing, Productivity, Research, Programming, Education, Lifestyle), seção "Featured" curada, "Trending" com leaderboard. Cada GPT card mostra autor, descrição curta, número de chats.
- **O que copiar:** **Marketplace** — categorias por *caso de uso de negócio* (Marketing, Vendas, Operação, Atendimento, Conteúdo, RH) + seção "Em destaque pela equipe Simple.AI" + "Mais usados esta semana". Mostrar contagem de uso é prova social barata.
- **O que evitar:** GPT Store sofre de spam e duplicatas. Simple.AI deve curar ativamente os 12 presets oficiais e separar visualmente "oficial" de "comunidade" desde o dia 1.

### 3.2 Zapier — Templates marketplace
- **URL:** https://zapier.com/templates
- **O que faz bem:** Templates como *exemplos concretos de problema*, não features genéricas. Plan requirements visíveis upfront ("requires Zapier Pro"). Filtros por app + por categoria de função.
- **O que copiar:** **Marketplace** — cada agente preset deve ser apresentado como "resolve o problema X" com 1 frase de outcome ("este agente lê seu inbox e resume os 5 mais urgentes às 8h"). Marcar tier requerido no card (Starter / Pro / Studio) para reduzir frustração de upgrade-surpresa.

### 3.3 Make.com — Templates gallery
- **URL:** https://www.make.com/en/templates
- **O que faz bem:** "Guided setup" de template — wizard que pergunta "qual conta Gmail?", "qual planilha?" antes de ativar. Bubbles de status (cinza/amarelo/verde) durante setup.
- **O que copiar:** **Onboarding pós-marketplace** — quando usuário escolhe um preset, entrar em wizard guiado de 3-5 perguntas (não joga no playground vazio). Reduz fricção do "e agora o que faço".

### 3.4 HuggingFace Spaces
- **URL:** https://huggingface.co/spaces
- **O que faz bem:** Cada Space tem demo interativa embedada na própria página de listagem. Você testa antes de "instalar".
- **O que copiar:** **Marketplace** — "demo embed" no card do agente: leigo pode mandar 1 input de teste e ver o output sem nem criar conta ainda. Conversão massiva para trial.
- **O que evitar:** UI do HF é claramente para devs (terminal-ish). Simple.AI deve manter cards calorosos e visuais.

### 3.5 Figma Community
- **URL:** https://www.figma.com/community
- **O que faz bem:** Curadoria visual forte (preview thumbnail grande), navegação por "Plugins / Templates / Widgets / Files", tags claras, badge de autor verificado.
- **O que copiar:** **Marketplace** — thumbnail grande no card (preview do output do agente, ou ilustração do caso de uso). Badge "Curado pela Simple.AI" para diferenciar dos 12 presets oficiais vs comunidade futura.

### 3.6 VS Code Extensions Marketplace
- **URL:** https://marketplace.visualstudio.com/vscode
- **O que faz bem:** Sistema de tags, ratings, contagem de instalações, "trending this week". Página de detalhe com README completo + changelog.
- **O que copiar:** **Marketplace** — página de detalhe do agente com seção "Como usar" (3-5 passos) + "Exemplos de inputs" + "Versão atual / changelog" para presets que evoluem.

### 3.7 Relevance AI Marketplace
- **URL:** https://marketplace.relevanceai.com/
- **O que faz bem:** Filtros por função de negócio (Sales, Marketing, Ops). Cada agente tem "Clone & customize" como CTA primário — fork em vez de só usar.
- **O que copiar:** **Marketplace** — CTA primário "Personalizar" (não "Usar"), reforçando que o agente vira **seu** após adoção. Fortalece a tese da plataforma high-margin de personalização.

---

## 4. Pricing pages

### 4.1 Linear
- **URL:** https://linear.app/pricing
- **O que faz bem:** 3 tiers visíveis (Free, Basic, Business) + Enterprise discreto. Cada tier tem 5-7 bullets focados em "o que você ganha", não checklist exaustiva. Tier do meio destacado visualmente.
- **O que copiar:** **Pricing** — 3 cards principais (Starter R$ 29, Pro R$ 79, Studio R$ 249), Trial separado acima como "experimente 7 dias grátis". Pro destacado como "mais popular". 5-7 bullets por tier no máximo. Add-ons em seção separada **abaixo** dos tiers, não inline.

### 4.2 Notion
- **URL:** https://www.notion.com/pricing
- **O que faz bem:** Tabela comparativa expansível ("Compare plans") *abaixo* dos 4 cards principais — leigo decide pelo card, power-user expande pra detalhes.
- **O que copiar:** **Pricing** — manter cards limpos no fold + tabela comparativa expansível abaixo para quem quer detalhe. Não jogar tabela gigante de cara.

### 4.3 Framer
- **URL:** https://www.framer.com/pricing
- **O que faz bem:** 5 tiers (Free, Basic, Pro, Scale, Enterprise) sem virar confusão graças a copy curtíssimo por tier e visual hierarquia clara.
- **O que copiar:** **Pricing** — se Simple.AI precisar expor 4+ tiers no futuro (Trial / Starter / Pro / Studio / Enterprise), Framer mostra como fazer sem caos. Padrão: card menor para Free/Trial e Enterprise, cards maiores para os tiers monetizáveis no meio.
- **O que evitar:** Framer expõe limites técnicos (CMS items, bandwidth) que confundem leigo. Simple.AI deve traduzir para "X agentes ativos", "Y execuções/mês", "Z variantes paralelas" — vocabulário do operador.

### 4.4 Lovable
- **URL:** https://lovable.dev/pricing
- **O que faz bem:** Pricing por créditos/mensagens explícito. Calculator embedado para estimar uso.
- **O que copiar:** **Pricing** — se Simple.AI tiver gating por execuções, expor um calculator simples ("quantos agentes? quantas execuções/dia?") para o leigo se auto-classificar no tier certo.
- **O que evitar:** Lovable mudou o modelo de pricing 3 vezes em 12 meses — usuários reclamam de unpredictability. Simple.AI deve estabilizar pricing nos primeiros 90 dias e *não* mexer.

### 4.5 Replit
- **URL:** https://replit.com/pricing
- **O que faz bem:** Tier "Starter (Free)" + Core $20 + Pro $100 + Enterprise. Effort-based pricing exposto ("simple changes ~$0.25").
- **O que copiar:** **Pricing — add-ons** — Replit é exemplo de como apresentar overage de uso sem gerar bill shock. Para Simple.AI, expor "execuções extras: R$ X / 100" como add-on, não esconder.
- **O que evitar:** Replit gerou backlash em 2025-2026 por bills inesperadas de $1000+. Simple.AI deve ter **hard cap visual** ("você atingiu 80% do plano — quer aumentar ou pausar?") obrigatório.

### 4.6 Anthropic / Claude
- **URL:** https://claude.com/pricing
- **O que faz bem:** Free / Pro $20 / Max $100-200 / Team / Enterprise. Cada tier mostra "X vezes mais uso que Pro" como ancoragem comparativa.
- **O que copiar:** **Pricing** — ancoragem relativa entre tiers ("Pro R$ 79 = 3x as execuções do Starter") ajuda leigo a entender quando upgrade faz sentido.

### 4.7 Vercel
- **URL:** https://vercel.com/pricing
- **O que faz bem:** Hobby (Free) → Pro $20 → Enterprise. Toggle Monthly/Annual com desconto visível.
- **O que copiar:** **Pricing** — toggle Mensal/Anual com badge "economize 2 meses" ou "20% OFF" — driver clássico de conversão para tier high-margin Studio.

### 4.8 Superhuman
- **URL:** https://superhuman.com/pricing
- **O que faz bem:** Pricing premium ($30/mês) defendido por copy emocional ("Be brilliant at what you do"). Não pede desculpa pelo preço.
- **O que copiar:** **Pricing — tier Studio R$ 249** — não pedir desculpa pelo preço alto. Copy aspiracional ("Para quem opera múltiplos agentes em produção", "Para a operação séria") em vez de "tier mais caro".

---

## 5. Pt-BR / LATAM

### 5.1 Nubank
- **URL:** https://nubank.com.br/
- **O que faz bem:** Tipografia bold + roxo icônico, ilustrações humanas, copy direto em pt-BR coloquial mas profissional ("Conta digital sem tarifas"). Design system NuDS exemplar.
- **O que copiar:** **Landing + IV** — referência número 1 de design pt-BR profissional para massa. Roubar: peso tipográfico bold, uso de cor única forte como assinatura, copy curto declarativo ("Crie um agente em 2 minutos" > "Plataforma para criação de agentes inteligentes").
- **O que evitar:** Roxo já é "do Nubank". Simple.AI precisa de cor própria (verde-elétrico, ciano, magenta — depende da decisão IV).

### 5.2 Stone
- **URL:** https://www.stone.com.br/
- **O que faz bem:** Verde icônico, copy "para empreendedores", tom de proximidade ("Sua maquininha", "Seu negócio"). Personagens reais nas fotos, não stock.
- **O que copiar:** **Landing pt-BR** — possessivos ("seus agentes", "sua operação") em vez de impessoal ("agentes", "operação"). Fotos/ilustrações de operadores brasileiros reais (não tech bros estilo SF).

### 5.3 Hotmart
- **URL:** https://hotmart.com/pt-br
- **O que faz bem:** Foco extremo em creators e small business pt-BR. Tom de "você consegue" sem ser condescendente. Cases reais de criadores brasileiros.
- **O que copiar:** **Landing — prova social** — depoimentos em vídeo curto de operadores brasileiros reais usando Simple.AI ("a Marília automatizou o atendimento da loja dela com 2 agentes"). Vence qualquer logo grid de empresas gringas.

### 5.4 RD Station
- **URL:** https://www.rdstation.com/
- **O que faz bem:** Microcopy pt-BR profissional sem anglicismos pesados ("Marketing Digital" em vez de "Growth Stack"). Onboarding com persona de marketing.
- **O que copiar:** **Microcopy / tom de voz** — banir anglicismos sempre que pt-BR funciona ("painel" > "dashboard", "execução" > "run", "fluxo" > "workflow", "modelo" > "template" — ou pelo menos parear). Manter "agente" sempre em pt-BR.
- **O que evitar:** RD às vezes pesa em jargão de marketing ("MQL", "BOFU"). Simple.AI deve traduzir para o vocabulário do operador comum.

### 5.5 Mottu
- **URL:** https://mottu.com.br/
- **O que faz bem:** Vermelho saturado, tipografia industrial, copy curto e direto pra entregador ("Alugue sua moto"). Mobile-first óbvio. Tom popular sem ser baixo.
- **O que copiar:** **Landing — estética IV** — se Simple.AI for pelo refresh tipográfico (vs dark/cyber atual), Mottu prova que estética industrial+limpa funciona em pt-BR sem virar "gringa traduzida". **Mobile-first** — Simple.AI provavelmente é desktop-primary, mas landing/marketing tem que ser excelente no mobile.

### 5.6 QuintoAndar
- **URL:** https://www.quintoandar.com.br/
- **O que faz bem:** Onboarding pesado mas humanizado — formulários com microcopy de tranquilização ("Não se preocupe, você pode editar isso depois"). Referência LATAM de UX humanizada.
- **O que copiar:** **Onboarding wizard** — microcopy de tranquilização em cada passo ("Pode mudar isso depois", "Não precisa decidir agora", "Vamos te guiar"). Reduz drop-off do leigo medroso.

### 5.7 Loft
- **URL:** https://www.loft.com.br/
- **O que faz bem:** Estética premium pt-BR (foi o primeiro "Airbnb-like UX" no setor imobiliário BR). Fotografia editorial.
- **O que copiar:** **Visual de marketplace** — fotografia/ilustração editorial nos cards de agentes presets, não ícones genéricos.

---

## 6. Onboarding conversacional

### 6.1 Linear — first-run experience
- **URL:** https://linear.app/ (signup flow)
- **O que faz bem:** Wizard de 3-4 passos: time → projeto → membros → import. Cada passo skipável. Estado vazio com CTAs claros após onboarding.
- **O que copiar:** **Onboarding** — máximo 4 passos, todos skipáveis, com 1 outcome concreto no fim ("seu primeiro agente está rodando"). **Empty states** em todas as páginas com 1 CTA dominante.

### 6.2 Notion — onboarding por persona
- **URL:** https://www.notion.com/ (signup)
- **O que faz bem:** Pergunta "para que você vai usar?" e adapta templates iniciais à resposta. Reduz "blank canvas paralysis".
- **O que copiar:** **Onboarding** — primeira pergunta "o que você quer automatizar?" → bifurca para 3-4 presets relevantes do marketplace. **Não** mostrar os 12 presets de cara — leigo congela.

### 6.3 Stripe — checkout / Connect onboarding
- **URL:** https://stripe.com/connect/onboarding
- **O que faz bem:** Progress bar clara, campos largos mobile-friendly, mensagens de erro humanas, feedback contínuo. Aumentou conversão Express em 5.3% só com refinos.
- **O que copiar:** **Pricing → Trial → Builder** — progress bar visível na transição (Você está em: "Escolha o plano" → "Configure seu agente" → "Pronto"). Mensagens de erro humanas em pt-BR sem códigos técnicos.

### 6.4 Cursor — first project
- **URL:** https://cursor.com/ (download flow)
- **O que faz bem:** Onboarding mínimo: instala, abre, "fala com o AI". Não força tour.
- **O que copiar:** **Builder primeiro uso** — opção "pular tour, deixa eu mexer" sempre visível. Power-user agradece.

### 6.5 Lindy — wizard de criação de agente
- **URL:** https://www.lindy.ai/ (signup)
- **O que faz bem:** Após signup, leva direto para "qual sua primeira Lindy?" com sugestões prontas + opção "do zero". Time-to-value < 60s.
- **O que copiar:** **Onboarding** — replicar exatamente: signup → tela única "qual seu primeiro agente?" com 4-6 sugestões grandes (do marketplace) + botão "criar do zero" pequeno. Time-to-value < 60s deve ser meta dura.

### 6.6 Granola — onboarding por contexto
- **URL:** https://www.granola.ai/
- **O que faz bem:** Conecta calendário, fica em background, "aparece" quando reunião começa. Onboarding é quase invisível.
- **O que copiar:** **Triggers / agendamento** — quando agente Simple.AI tiver triggers (cron, webhook, email), o onboarding desse trigger deve ser uma única tela com defaults inteligentes.
- **O que evitar:** Granola foi criticada por onboarding confuso em 2024-2025 — primeira sessão sem tutorial deixou usuários perdidos. Simple.AI deve ter um *único* tooltip explicando o split chat+spec na primeira run, e nunca mais.

### 6.7 Lovable — first prompt
- **URL:** https://lovable.dev/ (signup)
- **O que faz bem:** Após signup, abre direto no chat builder com placeholder sugerido. Cada turno ensina implicitamente como o produto funciona.
- **O que copiar:** **Builder primeiro uso** — placeholder pré-preenchido com exemplo concreto pt-BR ("Ex: Crie um agente que lê meus emails de orçamento e responde com um template padrão"). Editar é mais fácil que escrever do zero.

---

## Padrões transversais que apareceram

1. **Input gigante na fold supera CTA tradicional.** Lovable, v0, Bolt.new, Cursor — todos colocam o textarea/prompt como protagonista da landing. Para Simple.AI, isso é mais convincente que botão "Comece grátis".

2. **Demo ao vivo > screenshot.** Vídeo loop curto (8-15s) ou demo interativa antes do login viralizou. Granola, Cursor, Lovable, Lindy fazem. Screenshots estáticos parecem datados em 2026.

3. **Marketplace por outcome de negócio, não por arquétipo.** GPT Store, Lindy, Relevance, Zapier — todos categorizam por "o que isso resolve" (Marketing, Vendas, Ops). Simple.AI deve **esconder** os arquétipos Geradores/Revisores/Orquestradores na superfície e só expor para usuário avançado.

4. **Pricing com tier do meio destacado + 5-7 bullets por card.** Linear, Notion, Vercel, Anthropic — padrão consolidado. Tabela comparativa expansível abaixo, nunca de cara. Simple.AI Pro R$ 79 deve ser o card destacado.

5. **Builder = chat + visualização lado-a-lado.** Lovable, v0, Lindy, Cursor — split layout virou padrão. Simple.AI já está no caminho certo com chat → spec declarativo → playground.

6. **Personalização > uso no marketplace.** Relevance AI ensinou: CTA "Personalizar" (clone & customize) converte melhor que "Usar" porque dá ownership psicológico ao usuário.

7. **Onboarding < 60s para primeiro outcome.** Lindy, Granola, Linear, Lovable miram nisso. Simple.AI deve ter um agente rodando antes de 60s desde signup.

---

## Padrões a evitar

1. **Drag-and-drop puro (estilo Make/n8n) como builder principal.** Confunde leigo, exige aprender semântica de nodes. Reservar para "modo avançado" futuro, não v0.

2. **Pricing por créditos opaco com bill shock.** Replit e Lovable foram criticados em 2025-2026 por usuários que receberam contas inesperadas. Sempre expor hard cap configurável e estimativa.

3. **Linguagem "AI workforce / hire agents".** Soa frio em pt-BR. Preferir "seus agentes", "sua equipe", "sua operação".

4. **Anglicismos desnecessários.** "Workflow", "dashboard", "run", "template" têm equivalentes pt-BR aceitáveis (fluxo, painel, execução, modelo). Pode parear nas primeiras menções, mas não importar cru.

5. **Landing genérica de plataforma "para tudo".** Lovable está se tornando isso em 2026 e perdendo identidade. Simple.AI deve manter foco cirúrgico em **agentes operacionais para leigos pt-BR** e resistir tentação de expandir scope na copy.

6. **Marketplace com spam/duplicatas (estilo GPT Store).** Curar manualmente os 12 presets oficiais + separar visualmente "oficial" vs "comunidade" desde o início. Não esperar virar problema.

7. **Onboarding que joga no playground vazio.** Sempre conduzir para um preset relevante baseado em 1-2 perguntas iniciais. Blank canvas mata leigo.

8. **Tour em modal forçado.** Power-users odeiam, leigos esquecem. Preferir tooltips contextuais únicos + opção "pular tour, deixa eu mexer" sempre visível.
