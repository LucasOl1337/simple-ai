# Prompt para o Codex — Geracao de Imagens e Slides para Apresentacao SIMPLE-AI

> **Instrucao:** Copie este prompt completo para o Codex. Ele contem todo o contexto do projeto e instrucoes detalhadas para gerar cada imagem.

---

## PROMPT COMPLETO PARA O CODEX

```
Voce e um agente de design e apresentacao para o projeto SIMPLE-AI, um produto de hackathon (Cognition SP 2026 · Agora Conversational AI Engine).

## CONTEXTO DO PROJETO

SIMPLE-AI e uma plataforma conversacional que permite pessoas leigas em tecnologia criarem um site apenas conversando — por voz ou texto — em portugues. O usuario nao precisa saber nada de programacao, design ou termos tecnicos. Ele conversa com um agente de IA como se estivesse falando com um amigo, e o sistema coleta as informacoes necessarias, preenche um briefing visual na tela e gera um site HTML completo automaticamente.

### Stack tecnico:
- Frontend: React 19 + Vite 8
- Backend: Python + FastAPI
- Voz em tempo real: Agora Conversational AI Engine (ASR → LLM → TTS)
- Reconhecimento de fala: Deepgram Nova-3 (pt-BR)
- Inteligencia: OpenAI GPT-5.5 + Claude API
- Sintese de voz: MiniMax TTS
- Deploy: Oracle Cloud (VM Ubuntu + Nginx + SSL)
- SDK Voz: Agora RTC Web SDK 4.23 + RTM 2.2

### Como funciona (3 fases):
1. DISCOVERY — Agente conversa com o usuario e coleta dados do negocio (nome, tipo, CTA, publico, canal de contato)
2. PRODUCAO — Agente decide sozinho e em silencio: template, secoes, estilo, e aciona o pipeline de geracao do site
3. ITERACAO — Usuario ve o resultado e pede ajustes por conversa

### Interface:
- Layout: lousa (whiteboard) a esquerda + chat dock a direita
- Lousa comeca vazia e preenche campo a campo conforme a conversa avanca
- Dock tem APENAS 2 controles: enviar mensagem + microfone
- Zero menus, tabs, toggles ou botoes tecnicos
- Design clean, light theme, fontes Manrope + IBM Plex Mono
- Cores: fundo creme (#f6f0e6), accent verde escuro (#0f4c43), texto marrom escuro (#1d1a16)

### Personas:
- Juliana, 34 anos: dona de atelie de croche, quer vender online, sem budget, usa WhatsApp pra tudo
- Carlos, 41 anos: consultor, precisa de landing page, odeia perder tempo
- Seu Antonio, 68 anos: aposentado, servico de jardinagem, so usa WhatsApp — SE ELE CONSEGUE USAR, qualquer pessoa consegue

### Diferencial competitivo (vs concorrentes):
- Wix/Squarespace: precisa de drag-and-drop → barreira visual
- Lovable/v0: precisa escrever prompts tecnicos → barreira linguistica
- Formularios: cansativo, alta taxa de abandono → barreira de paciencia
- Agencias: caro e demorado → barreira financeira
- SIMPLE-AI: zero barreira — so conversar em portugues

---

## SUA TAREFA

Gere imagens para uma apresentacao profissional tipo slide deck do projeto SIMPLE-AI. Salve TODAS as imagens na pasta `apresentacao/slides/` do projeto (caminho: C:\Users\user\Desktop\SIMPLE-AI\apresentacao\slides\).

Gere cada imagem em alta qualidade (1920x1080, estilo apresentacao profissional).
Use a paleta de cores do projeto:
- Fundo: creme claro (#f6f0e6) ou branco (#fffcf7)
- Accent principal: verde escuro (#0f4c43)
- Texto: marrom escuro (#1d1a16)
- Muted: cinza quente (#75706a)
- Destaques quentes: dourado/laranja suave (rgba(201,130,72,0.12))

Estilo visual: moderno, minimalista, limpo, com bastante espaco em branco. Nada carregado. Sem gradientes exagerados. Tipografia grande e legivel.

---

## LISTA DE IMAGENS A GERAR (em ordem de slides)

### SLIDE 01 — Capa
**Arquivo:** `apresentacao/slides/01-capa.png`
**Conteudo:**
- Logo do SIMPLE-AI centralizado (use o texto "SIMPLE-AI" em tipografia bold moderna se nao conseguir usar o SVG)
- Subtitulo: "Crie um site apenas conversando."
- Rodape: "Hackathon Cognition SP 2026 · Agora Conversational AI Engine"
- Fundo limpo com a paleta creme/verde do projeto
- Pode ter um sutil icone de microfone ou balao de conversa como elemento decorativo

### SLIDE 02 — O Problema
**Arquivo:** `apresentacao/slides/02-problema.png`
**Conteudo:**
- Titulo: "O Problema"
- Grafico visual ou infografico comparativo mostrando 4 barreiras:
  - Wix/Squarespace → icone de drag-and-drop → "Barreira visual"
  - Lovable/v0 → icone de codigo/prompt → "Barreira tecnica"
  - Formularios → icone de formulario longo → "Barreira de paciencia"
  - Agencias → icone de cifrao → "Barreira financeira"
- Frase destaque no centro ou rodape: "A barreira nao e o codigo — e a interface."
- Visual de 4 colunas ou 4 blocos lado a lado, cada um com icone + texto curto

### SLIDE 03 — A Solucao
**Arquivo:** `apresentacao/slides/03-solucao.png`
**Conteudo:**
- Titulo: "A Solucao — SIMPLE-AI"
- Ilustracao conceitual de uma pessoa falando (icone de microfone ou balao de voz) e do outro lado um site aparecendo
- Fluxo visual simplificado em 4 passos horizontais com setas:
  1. Icone de pessoa falando → "Conversa natural"
  2. Icone de cerebro/IA → "Agente descobre"
  3. Icone de checklist → "Briefing preenche"
  4. Icone de tela/site → "Site gerado"
- Frase destaque: "So precisa conversar em portugues."

### SLIDE 04 — Interface / UI
**Arquivo:** `apresentacao/slides/04-interface.png`
**Conteudo:**
- Titulo: "Interface — Simplicidade Extrema"
- Mockup visual da interface do SIMPLE-AI mostrando:
  - Lado esquerdo: lousa/whiteboard com campos de briefing (checkmarks verdes para preenchidos, indicadores laranja para pendentes)
  - Lado direito: chat dock com bolhas de conversa e barra inferior com campo de texto + botao de microfone
- Rotulos apontando:
  - "Lousa: preenche automaticamente"
  - "Chat: conversa natural"
  - "Apenas 2 controles: enviar + microfone"
- Estilo que remeta a interface clean com fundo creme, cards com bordas suaves, sombras leves

### SLIDE 05 — Fluxo de Discovery
**Arquivo:** `apresentacao/slides/05-discovery.png`
**Conteudo:**
- Titulo: "Fluxo de Discovery"
- Diagrama de fluxo visual bonito mostrando:
  - Topo: "Usuario chega" (icone de pessoa)
  - Seta para baixo: "Agente pergunta" (icone de balao)
  - Seta para baixo: "Planner extrai sinais" (icone de engrenagem/cerebro)
  - Seta para baixo: "Notepad atualiza" (icone de caderno)
  - Loop visual: "Pergunta → Resposta → Atualiza → Repete"
  - Saida: "ready_to_build = true → Gera site"
- Usar cores do projeto, setas elegantes, icones simples

### SLIDE 06 — Notepad / Sistema de Confianca
**Arquivo:** `apresentacao/slides/06-notepad.png`
**Conteudo:**
- Titulo: "Caderno de Anotacoes do Agente"
- Tabela visual ou cards mostrando os campos do notepad:
  - CRITICOS (badge vermelho/laranja): brand_name, business_type, primary_cta, contact_channel, target_audience
  - OPCIONAIS (badge verde suave): offerings, scope, brand_tone
- Para cada campo, mostrar: nome legivel + exemplo de valor + barra de confianca (0% a 100%)
- Exemplo visual:
  - "Nome do negocio: Auto Center Silva" [barra 98%] ✅
  - "Tipo: Oficina mecanica" [barra 96%] ✅
  - "CTA: Pedir orcamento" [barra 74%] ⚠️
  - "Publico: ???" [barra 0%] ❌
- Rodape: "Threshold de producao: todos criticos preenchidos + 5 interacoes minimas"

### SLIDE 07 — Exemplo de Conversa
**Arquivo:** `apresentacao/slides/07-conversa-exemplo.png`
**Conteudo:**
- Titulo: "Exemplo Real de Conversa"
- Mockup de chat mostrando uma conversa completa:
  - Agente: "Me conta o que voce faz e o que voce precisa."
  - Usuario: "Tenho uma clinica de estetica em Moema, SP. Faco limpeza de pele, botox e harmonizacao. As clientes me acham pelo Instagram mas quero um site onde elas agendem pelo WhatsApp."
  - Agente: "Entendi! Voce tem uma clinica de estetica e quer que as clientes agendem pelo WhatsApp. Qual o nome da sua clinica?"
  - Usuario: "Clinica Belle"
  - Agente: "Otimo! Ja tenho o suficiente. Posso montar uma primeira versao agora?"
- Do lado esquerdo: lousa mostrando campos sendo preenchidos em tempo real
- Usar estilo de bolhas de chat, com bolhas do agente em branco e do usuario em verde claro

### SLIDE 08 — Arquitetura Tecnica
**Arquivo:** `apresentacao/slides/08-arquitetura.png`
**Conteudo:**
- Titulo: "Arquitetura Tecnica"
- Diagrama de arquitetura em 3 colunas:
  - FRONTEND (React + Vite):
    - App.jsx
    - planner.js
    - Agora RTC SDK
  - BACKEND (FastAPI Python):
    - server.py (rotas)
    - agent.py (agente Agora)
    - generate.py (gerador HTML)
    - discovery_agent.py (sessoes)
  - SERVICOS EXTERNOS:
    - Agora Conversational AI
    - OpenAI GPT-5.5
    - Claude API
    - Deepgram STT
    - MiniMax TTS
- Setas conectando as colunas mostrando fluxo de dados
- Na base: "Deploy: Oracle Cloud (Nginx + SSL + Gunicorn)"
- Icones representando cada servico

### SLIDE 09 — Fluxo de Dados Completo
**Arquivo:** `apresentacao/slides/09-fluxo-dados.png`
**Conteudo:**
- Titulo: "Fluxo de Dados"
- Diagrama de sequencia simplificado e visual (nao UML tecnico, mas bonito):
  1. Browser → "Carrega app React"
  2. App → Backend: "Inicia sessao"
  3. Agente → Usuario: "Pergunta por voz/texto"
  4. Usuario → Agente: "Responde"
  5. Planner: "Analisa e extrai campos"
  6. Lousa: "Atualiza campo ✅"
  7. Quando completo → Backend: "Gera site"
  8. Lousa: "Exibe resultado com link"
- Usar icones, setas coloridas e numeros grandes

### SLIDE 10 — Stack de Tecnologias
**Arquivo:** `apresentacao/slides/10-tecnologias.png`
**Conteudo:**
- Titulo: "Tecnologias"
- Grid visual com logos/icones para cada tecnologia:
  - React (logo) — "Frontend"
  - Vite (logo) — "Build"
  - Python (logo) — "Backend"
  - FastAPI (logo) — "API"
  - Agora (logo) — "Voz em tempo real"
  - OpenAI GPT-5.5 (logo) — "Inteligencia / Geracao"
  - Claude API (logo ou icone) — "LLM auxiliar"
  - Deepgram (logo ou icone de microfone) — "Speech-to-Text"
  - Oracle Cloud (logo) — "Deploy"
- Cada item em um card/bloco com icone + nome + funcao
- Layout grid 2x4 ou 4x2

### SLIDE 11 — Comparativo com Concorrentes
**Arquivo:** `apresentacao/slides/11-comparativo.png`
**Conteudo:**
- Titulo: "Por que SIMPLE-AI?"
- Tabela visual comparativa ou grafico:
  | Criterio | Wix | Lovable | Formulario | SIMPLE-AI |
  | Barreira tecnica | Media | Alta | Baixa | Zero |
  | Idioma | Multi | Ingles | Portugues | Portugues nativo |
  | Tempo para resultado | Horas | Minutos | Dias | 5 minutos |
  | Precisa saber tech | Sim | Sim | Nao | Nao |
  | Interacao | Visual | Prompt | Campos | Conversa natural |
- Usar checkmarks verdes para SIMPLE-AI e X vermelhos para limitacoes dos outros
- Destacar a coluna SIMPLE-AI com fundo verde suave

### SLIDE 12 — Personas
**Arquivo:** `apresentacao/slides/12-personas.png`
**Conteudo:**
- Titulo: "Para Quem Criamos"
- 3 cards lado a lado, cada um com:
  - Card 1 — Juliana, 34: Ilustracao/avatar feminino, "Dona de atelie de croche", "Quer vender online, sem budget, usa WhatsApp pra tudo"
  - Card 2 — Carlos, 41: Ilustracao/avatar masculino, "Consultor", "Precisa de landing page, nao sabe HTML, odeia perder tempo"
  - Card 3 — Seu Antonio, 68: Ilustracao/avatar idoso, "Aposentado, jardinagem", "So usa WhatsApp. Se ele consegue usar, QUALQUER PESSOA consegue."
- O card do Seu Antonio pode ter um destaque especial (borda dourada ou badge "teste de realidade")

### SLIDE 13 — O Que Ja Esta Implementado
**Arquivo:** `apresentacao/slides/13-implementado.png`
**Conteudo:**
- Titulo: "O Que Ja Entregamos"
- 4 blocos ou colunas com checkmarks:
  - FRONTEND: Interface whiteboard + chat, microfone, upload de imagem, design responsivo
  - BACKEND: API completa (6 rotas), agente Convo, gerador de sites, tunnel publico
  - ENGINE: Notepad com 14 campos, extracao automatica, threshold de producao, templates adaptativos
  - INTEGRACAO: Agora RTC/RTM, Deepgram STT, OpenAI GPT-5.5, Claude API, MiniMax TTS
- Cada bloco com 4-5 bullet points com checkmark verde
- Visual limpo, talvez icone representativo em cada coluna

### SLIDE 14 — Roadmap
**Arquivo:** `apresentacao/slides/14-roadmap.png`
**Conteudo:**
- Titulo: "Roadmap"
- Timeline visual horizontal ou vertical com 3 fases:
  - ENTREGUE (verde, a esquerda): Discovery conversacional, geracao HTML, publicacao com preview, interface minimalista
  - PROXIMO (amarelo, centro): Integracao completa Agora Convo, transcript em tempo real, iteracao por voz, filler words
  - FUTURO (azul, a direita): Templates multiplos, deploy em dominio customizado, edicao visual, multi-idioma, integracao Instagram, pagamentos
- Setas conectando as fases
- Badges de status em cada fase (Done, Next, Future)

### SLIDE 15 — Equipe
**Arquivo:** `apresentacao/slides/15-equipe.png`
**Conteudo:**
- Titulo: "Equipe"
- 4 cards lado a lado:
  - Renan — CTO / Produto — "System prompt, fluxo de discovery, UX, demo"
  - Dev FS 1 — Backend Lead — "Agente Agora, FastAPI, geracao de sites"
  - Dev FS 2 — Infra / Backend — "Oracle VM, Nginx, SSL, planner.js"
  - Dev Frontend — Frontend Lead — "App.jsx, Agora SDK, lousa, dock"
- Cada card com avatar placeholder, nome, papel e foco
- Estilo profissional, cards com sombra suave

### SLIDE 16 — Encerramento
**Arquivo:** `apresentacao/slides/16-encerramento.png`
**Conteudo:**
- Logo SIMPLE-AI grande centralizado
- Frase: "O unico produto que funciona mesmo se o usuario nunca usou um computador."
- Subtitulo: "Hackathon Cognition SP 2026 · NexUnio Solucoes em IA"
- Elemento visual sutil: icone de microfone + balao + tela com site
- Rodape: "github.com/LucasOl1337/simple-ai"
- Fundo elegante com a paleta do projeto

---

## INSTRUCOES FINAIS

1. Gere TODAS as 16 imagens e salve em `apresentacao/slides/`
2. Nomeie cada arquivo exatamente como indicado (01-capa.png, 02-problema.png, etc.)
3. Mantenha consistencia visual entre todos os slides (mesma paleta, mesma tipografia, mesmo estilo)
4. Resolucao: 1920x1080 (16:9, formato de apresentacao)
5. Apos gerar as imagens, crie um arquivo `apresentacao/SLIDES.md` que exiba todos os slides em sequencia com markdown, assim:

```markdown
# SIMPLE-AI — Apresentacao em Slides

## Slide 01 — Capa
![Capa](slides/01-capa.png)

## Slide 02 — O Problema
![O Problema](slides/02-problema.png)

(... e assim por diante para todos os 16 slides)
```

6. Tambem atualize o `apresentacao/README.md` adicionando no topo, logo apos a navegacao rapida, um link para os slides:
```markdown
- [Slides Visuais](SLIDES.md) — apresentacao completa em imagens
```
```

---

## COMO USAR ESTE PROMPT

1. Abra o Codex (ou ChatGPT com capacidade de geracao de imagens)
2. Cole o conteudo entre os ``` ``` acima como prompt
3. O Codex vai gerar cada imagem e salvar na pasta indicada
4. Ao final, voce tera 16 slides + o arquivo SLIDES.md montado

> **Dica:** Se o Codex tiver limite de imagens por sessao, divida em blocos:
> - Bloco 1: Slides 01-05 (capa, problema, solucao, interface, discovery)
> - Bloco 2: Slides 06-10 (notepad, conversa, arquitetura, fluxo, tecnologias)
> - Bloco 3: Slides 11-16 (comparativo, personas, implementado, roadmap, equipe, encerramento)
