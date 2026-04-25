<p align="center">
  <img src="../assets/logo.svg" alt="SIMPLE-AI" width="280" />
</p>

<h3 align="center">Crie um site apenas conversando.</h3>
<p align="center"><em>Hackathon Cognition SP 2026 · Agora Conversational AI Engine</em></p>

---

# Apresentacao — SIMPLE-AI

> **Leitura rapida para avaliadores.** Este documento resume o que e o projeto, como funciona, o que ja esta implementado e o que vem pela frente.

**Navegacao rapida:**
- [Slides Visuais](SLIDES.md) — apresentacao completa em imagens
- [O Problema](#o-problema)
- [A Solucao](#a-solucao)
- [Como Funciona](#como-funciona)
- [Interface](#interface)
- [Tecnologias](#tecnologias)
- [O Que Ja Esta Implementado](#o-que-ja-esta-implementado)
- [Arquitetura](#arquitetura)
- [Roadmap](#roadmap)
- [Equipe](#equipe)
- [Como Rodar](#como-rodar)

---

## O Problema

Criar um site exige conhecimento que a maioria das pessoas nao tem:

| Ferramenta | Barreira |
|---|---|
| Wix / Squarespace | Precisa entender drag-and-drop e conceitos visuais |
| Lovable / v0 | Precisa escrever prompts tecnicos em ingles |
| Formularios tradicionais | Cansativo, alta taxa de abandono |
| Agencias | Caro e demorado |

**A barreira nao e o codigo — e a interface.**

O usuario leigo nao sabe o que e "frontend", "deploy" ou "responsivo". Ele so sabe que precisa de "um site".

---

## A Solucao

**SIMPLE-AI** elimina toda interface de configuracao. O usuario conversa — por **voz** ou **texto** — como se estivesse falando com um amigo que entende de tecnologia.

```
Usuario fala/escreve em linguagem natural
         |
Agente faz perguntas simples (discovery)
         |
Lousa preenche o briefing progressivamente
         |
Briefing completo --> gera site HTML automaticamente
         |
Usuario ve o resultado e pode pedir ajustes
```

**Diferencial unico:** a unica ferramenta onde o usuario **so precisa conversar em portugues** para ter um site.

---

## Como Funciona

### 3 Fases do Fluxo

```
 DISCOVERY           PRODUCAO            ITERACAO
 (coleta)     --->   (geracao)    --->   (refinamento)
```

**1. Discovery** — O agente conduz uma conversa natural para descobrir:
- **Nome do negocio** (ex: "Auto Center Silva")
- **O que faz** (ex: "Oficina mecanica")
- **Acao principal do site** (ex: "Pedir orcamento pelo WhatsApp")
- **Canal de contato** (ex: "WhatsApp")
- **Publico-alvo** (ex: "Donos de carro da regiao")

**2. Producao** — Quando tem informacao suficiente, o agente decide **sozinho e em silencio**:
- Qual template usar
- Quais secoes incluir (hero, servicos, contato, mapa, etc.)
- Qual estilo visual aplicar
- Gera o site HTML completo via GPT-4o

**3. Iteracao** — O usuario ve o resultado e pode pedir mudancas por conversa:
- "Muda a cor" / "Tira essa parte" / "Adiciona precos"
- O agente aplica e mostra a nova versao

### Sistema de Confianca (Notepad)

O agente mantem um **caderno de anotacoes interno** atualizado a cada resposta:

| Campo | Prioridade | Exemplo |
|---|---|---|
| `brand_name` | Critico | "Auto Center Silva" |
| `business_type` | Critico | "Oficina mecanica" |
| `primary_cta` | Critico | "Pedir orcamento" |
| `contact_channel` | Critico | "WhatsApp" |
| `target_audience` | Critico | "Donos de carro" |
| `offerings` | Opcional | ["troca de oleo", "freio", "revisao"] |
| `scope` | Opcional | "Zona Norte, SP" |
| `brand_tone` | Opcional | "profissional e acessivel" |

**Threshold de producao:** o agente so propoe gerar o site quando:
- Todos os campos criticos estao preenchidos
- Minimo de 5 interacoes realizadas

### Regras Inviolaveis

1. **O usuario NAO sabe tecnologia** — zero jargao tecnico
2. **Uma pergunta por vez** — nunca bombardear
3. **O agente decide stack/layout/modulos SOZINHO** — o usuario nunca ve "React", "API", "banco de dados"
4. **Tom conversacional** — como falar com um amigo

---

## Interface

### Layout Principal

```
+------------------------------+------------------+
|                              |                  |
|         L O U S A            |    C H A T       |
|                              |                  |
|  (vazia no inicio)           |  bolhas de       |
|                              |  conversa        |
|  Preenche conforme           |                  |
|  o briefing avanca:          |                  |
|                              |                  |
|  OK  Nome do negocio         |                  |
|  OK  Objetivo do site        |                  |
|  ... Cores / estilo          |                  |
|  ... Canal de contato        |  +-----------+   |
|                              |  | [msg] [mic]|  |
|                              |  +-----------+   |
+------------------------------+------------------+
```

### Principios de UX

- **Dock com apenas 2 controles:** enviar mensagem + microfone
- **Lousa comeca completamente vazia** — so mostra quando tem conteudo real
- **Sem menus, tabs, toggles, dashboards ou botoes tecnicos**
- **Responsivo** — funciona no celular
- **Teste de realidade:** se um idoso de 68 anos consegue usar, qualquer pessoa consegue

### O Que NUNCA Aparece na Interface

- Tabs ou abas
- Botao de "modo texto" / "modo voz"
- Indicadores tecnicos (agent_id, status da API)
- Menus de configuracao
- Progresso em porcentagem

---

## Tecnologias

| Camada | Stack |
|---|---|
| **Frontend** | React 19 + Vite 8 |
| **Backend** | Python + FastAPI |
| **Voz em tempo real** | Agora Conversational AI Engine (ASR + LLM + TTS) |
| **Reconhecimento de fala** | Deepgram Nova-3 (pt-BR) |
| **Inteligencia** | OpenAI GPT-4o / GPT-4o-mini |
| **Sintese de voz** | MiniMax TTS |
| **Deploy** | Oracle Cloud (VM Ubuntu + Nginx + SSL) |
| **Tunnel (dev)** | Cloudflare Tunnel |
| **SDK Voz** | Agora RTC Web SDK 4.23 + RTM 2.2 |

---

## O Que Ja Esta Implementado

### Frontend (React + Vite)
- [x] Interface whiteboard + chat dock
- [x] Lousa com checklist do briefing (preenche campo a campo)
- [x] Chat com historico de conversa (bolhas de mensagem)
- [x] Microfone com Web Speech API (pt-BR)
- [x] Upload de imagem de referencia
- [x] Persistencia de sessao em localStorage
- [x] Botao "Gerar e publicar meu site"
- [x] Card de publicacao (preview local + link publico)
- [x] Estados visuais: gerando, publicando, pronto, erro
- [x] Design responsivo (mobile-friendly)
- [x] Light theme com Manrope + IBM Plex Mono

### Backend (Python + FastAPI)
- [x] Rota `GET /get_config` — configuracao e token Agora
- [x] Rota `POST /v2/startAgent` — inicia agente de voz
- [x] Rota `POST /v2/stopAgent` — encerra agente
- [x] Rota `POST /generate-site` — gera HTML via GPT-4o
- [x] Rota `GET /published/{site_id}` — serve site gerado
- [x] Rota `POST /discovery/session/start` — inicia sessao de discovery
- [x] Rota `POST /discovery/session/message` — processa mensagem do usuario
- [x] Agente Convo com system prompt que segue a spec do produto
- [x] Gerador de sites HTML auto-contidos (zero dependencias externas)
- [x] Cloudflare Tunnel para links publicos em dev

### Engine de Discovery (planner.js)
- [x] Sistema de notepad com 14 campos (critico/importante/desejado)
- [x] Confianca por campo (0 a 1) com rastreamento de fonte
- [x] Extracao automatica de sinais (NLP / pattern matching)
- [x] Deteccao de: tipo de negocio, CTA, canal de contato, escopo, publico
- [x] Banco de perguntas adaptativo (pula o que ja sabe)
- [x] Threshold de `ready_to_build` automatico
- [x] Resolucao de template baseado no tipo de negocio + CTA
- [x] Construcao de briefing para o gerador

### Integracao Agora
- [x] Modulo RTC/RTM no frontend
- [x] Hook `useAgoraSession` para gerenciar sessao de voz
- [x] Painel de sessao Agora
- [x] Backend com token generation via agora-agent-client-toolkit
- [x] Agente com Deepgram STT + OpenAI LLM + MiniMax TTS
- [x] System prompt bilingual (segue spec .simpleai/)

---

## Arquitetura

```
ORACLE CLOUD (VM Ubuntu)
|
+-- Nginx (porta 443, SSL via Certbot)
|   +-- /         --> serve build estatico do Vite (frontend)
|   +-- /api      --> proxy para FastAPI (porta 8000)
|
+-- FastAPI (gunicorn + uvicorn, porta 8000)
|   +-- POST /api/agent/start   --> inicia agente Agora
|   +-- POST /api/agent/stop    --> encerra agente
|   +-- POST /api/generate      --> gera HTML via GPT-4o
|   +-- POST /discovery/...     --> sessoes de discovery
|
+-- Frontend (build estatico servido pelo Nginx)
    +-- src/app/App.jsx         --> UI principal
    +-- src/features/discovery/ --> engine de discovery (planner)
    +-- src/integrations/agora/ --> Agora RTC/RTM SDK
```

### Fluxo de Dados

```
1. Browser carrega o app React
2. App inicia sessao de discovery (backend)
3. Agente faz perguntas --> usuario responde por texto ou voz
4. Planner analisa respostas --> extrai campos do briefing
5. Lousa atualiza campo a campo
6. Campos criticos completos --> propoe gerar site
7. Backend chama GPT-4o --> retorna HTML auto-contido
8. Lousa exibe resultado com link de preview
```

> Para detalhes tecnicos completos, veja [ARQUITETURA.md](ARQUITETURA.md).

---

## Roadmap

### Ja Entregue (Hackathon)
- Discovery conversacional completo (texto + voz)
- Geracao de site HTML a partir do briefing
- Publicacao com preview local + tunnel publico
- Interface minimalista e acessivel

### Proximo Passo
- [ ] Integracao completa Agora Convo no fluxo principal (substituir Web Speech API)
- [ ] Transcript em tempo real da Agora alimentando o planner automaticamente
- [ ] Iteracao por voz: "muda o estilo", "adiciona precos"
- [ ] Filler words durante geracao ("Deixa eu ver...", "Entendi, um segundo...")

### Futuro
- [ ] Templates multiplos (e-commerce, portfolio, restaurante, profissional)
- [ ] Deploy direto em dominio customizado (Oracle Cloud)
- [ ] Painel de edicao visual pos-geracao
- [ ] Multi-idioma (en-US, es-ES)
- [ ] Integracao com Instagram (importar fotos automaticamente)
- [ ] Sistema de pagamento integrado para sites e-commerce

---

## Equipe

| Membro | Papel | Foco |
|---|---|---|
| **Renan** | CTO / Produto | System prompt, fluxo de discovery, UX, demo |
| **Dev FS 1** | Backend lead | Agente Agora, FastAPI, geracao de sites |
| **Dev FS 2** | Infra / Backend | Oracle VM, Nginx, SSL, planner.js |
| **Dev Frontend** | Frontend lead | App.jsx, Agora SDK, lousa, dock, estados |

---

## Como Rodar

### 1. Clone e instale

```bash
git clone https://github.com/LucasOl1337/simple-ai.git
cd simple-ai
npm install --legacy-peer-deps
```

### 2. Configure o backend

```bash
python -m venv server-python/.venv
server-python\.venv\Scripts\python -m pip install -r server-python/requirements.txt
copy server-python\.env.example server-python\.env.local
```

Preencha em `server-python/.env.local`:
- `APP_ID` — do Agora Console
- `APP_CERTIFICATE` — do Agora Console

### 3. Rode

```bash
npm run dev:full
```

Ou em dois terminais:
```bash
npm run dev
server-python\.venv\Scripts\python server-python/src/server.py
```

Acesse: **http://localhost:5173**

---

## Estrutura do Projeto

```
simple-ai/
  .simpleai/                 <-- CORE: spec de comportamento do agente
  src/
    app/App.jsx              <-- UI principal (whiteboard + chat)
    features/discovery/      <-- engine de discovery (planner.js)
    integrations/agora/      <-- Agora RTC/RTM SDK
  server-python/
    src/agent.py             <-- agente de voz Agora
    src/server.py            <-- API FastAPI
    src/discovery_agent.py   <-- gerenciador de sessoes discovery
    src/generate.py          <-- gerador de sites HTML
    src/tunnel.py            <-- Cloudflare Tunnel
  assets/                    <-- logo e imagens
  apresentacao/              <-- voce esta aqui
```

---

<p align="center">
  <strong>SIMPLE-AI</strong> · Hackathon Cognition SP 2026 · NexUnio Solucoes em IA<br/>
  <em>"O unico produto que funciona mesmo se o usuario nunca usou um computador."</em>
</p>
