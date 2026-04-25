# SIMPLE-AI — Product Requirements Document

> **Hackathon:** Cognition SP 2026 · Agora Conversational AI Engine  
> **Versão:** 2.0 · **Data:** 25/04/2026 · **Status:** 🟢 Em desenvolvimento  
> **Stack:** React/Vite · FastAPI Python · Agora Convo AI · OpenAI GPT-4o · Oracle Cloud  

---

## TL;DR para o Claude Code / Codex

```
Projeto: SIMPLE-AI
O que faz: usuário conversa por voz → agente descobre o que precisa →
           lousa preenche o briefing progressivamente → gera webapp HTML

Filosofia INEGOCIÁVEL: interface extremamente simples.
  Sem menus. Sem tabs. Sem toggles. Sem botões técnicos.
  Dois controles visíveis: enviar mensagem/imagem | microfone.
  A lousa fica vazia até ter conteúdo real para mostrar.

Stack:
  Frontend: React + Vite (src/)
  Backend:  FastAPI Python (server-python/)
  Voz:      Agora Conversational AI Engine (ASR → LLM → TTS)
  Deploy:   Oracle Cloud (VM Ubuntu, Nginx, SSL, gunicorn)
  Idioma:   pt-BR obrigatório

Estrutura de arquivos existente (não alterar):
  src/agora/          ← cliente Agora RTC no frontend
  src/App.jsx         ← simulador + ingestão de voz
  src/planner.js      ← engine do fluxo de discovery
  server-python/src/agent.py    ← prompt e sessão do agente
  server-python/src/server.py   ← API FastAPI
```

---

## Regras Globais de Produto ⚠️

> **Estas regras são obrigatórias para qualquer agente, dev ou colaborador.**  
> Qualquer PR ou commit que viole estas regras deve ser revertido.

1. **Simplicidade extrema** — a interface deve ser acessível para um usuário idoso ou sem familiaridade digital.
2. **Lousa começa vazia** — nenhum menu, dashboard, modo ou botão extra na tela inicial.
3. **Único fluxo visível = conversa** — tudo orbita a conversa. Nada compete com ela.
4. **Dock com apenas 2 controles:**
   - Botão primário: enviar mensagem ou imagem
   - Botão de microfone: iniciar conversa por voz
5. **Zero ações secundárias** — sem tabs, toggles, menus de modo, botões de preview, botões técnicos ou atalhos.
6. **Lousa mostra apenas o mínimo:** informações-chave já preenchidas, o que falta, o fluxo atual do briefing.
7. **Sempre preferir:** menos elementos · menos decisões · menos texto por tela.

> Se você está em dúvida se algo viola estas regras: viola. Remova.

---

## Índice

1. [Visão do Produto](#1-visão-do-produto)
2. [Usuários-Alvo](#2-usuários-alvo)
3. [UX e Interface](#3-ux-e-interface)
4. [Features](#4-features)
5. [Arquitetura Técnica](#5-arquitetura-técnica)
6. [Integração Agora Convo AI](#6-integração-agora-convo-ai)
7. [Backend FastAPI](#7-backend-fastapi)
8. [Planner — Engine de Discovery](#8-planner--engine-de-discovery)
9. [Geração do Webapp](#9-geração-do-webapp)
10. [Deploy na Oracle Cloud](#10-deploy-na-oracle-cloud)
11. [Variáveis de Ambiente](#11-variáveis-de-ambiente)
12. [Equipe e Responsabilidades](#12-equipe-e-responsabilidades)
13. [Timeline](#13-timeline)
14. [Critérios de Aceite](#14-critérios-de-aceite)
15. [Riscos e Mitigações](#15-riscos-e-mitigações)

---

## 1. Visão do Produto

### Problema

Criar um webapp exige conhecimento técnico que a maioria das pessoas não tem. Ferramentas no-code (Wix, Squarespace) ainda exigem que o usuário entenda conceitos visuais. Ferramentas de IA (Lovable, v0) exigem que o usuário saiba escrever prompts técnicos. A barreira não é o código — **é a interface**.

### Solução

**SIMPLE-AI** elimina toda interface de configuração do processo de criação. O usuário conversa — por voz ou texto — exatamente como falaria com um amigo técnico. Um agente descobre o que a pessoa precisa por meio de perguntas simples, preenche um briefing visível na lousa, e quando tem informação suficiente, gera o webapp.

### Fluxo macro

```
Usuário fala/escreve
      ↓
Agente faz perguntas (discovery)
      ↓
Lousa preenche progressivamente (planner.js)
      ↓
Briefing completo → gera webapp HTML
      ↓
Lousa exibe o resultado
```

### Diferencial

| Ferramenta | Barreira |
|---|---|
| Wix / Squarespace | Drag-and-drop, conceitos visuais |
| Lovable / v0 | Precisa escrever prompt técnico |
| Formulários | Cansativo, abandono alto |
| **SIMPLE-AI** | **Zero — só conversar em português** |

---

## 2. Usuários-Alvo

**Persona principal — A Empreendedora Sem Tempo**
> Juliana, 34 anos, dona de ateliê de crochê. Quer vender online, não tem budget pra agência, usa WhatsApp pra tudo. Se conseguisse falar o que precisa e aparecer um site, ela compraria na hora.

**Persona secundária — O Profissional Autônomo**
> Carlos, 41 anos, consultor. Precisa de landing page pra captar clientes. Sabe o que quer comunicar, não sabe HTML. Odeia perder tempo.

**Persona de stress test — O Usuário Idoso**
> Seu Antônio, 68 anos, aposentado, quer divulgar seu serviço de jardinagem. Usa celular só pra WhatsApp. Se tiver mais de 2 botões na tela, desiste.

> ⚠️ **O Seu Antônio é o teste de realidade de toda decisão de UX.**  
> Se ele consegue usar, qualquer pessoa consegue.

---

## 3. UX e Interface

### 3.1 Layout

```
┌─────────────────────────────┬──────────────────┐
│                             │                  │
│         L O U S A           │    C H A T       │
│                             │                  │
│  (vazia no início)          │  bolhas de       │
│                             │  conversa        │
│  Preenche conforme          │                  │
│  o briefing avança:         │                  │
│                             │                  │
│  ✅ Nome do negócio         │                  │
│  ✅ Objetivo do site        │                  │
│  ⬜ Cores / estilo          │                  │
│  ⬜ Informações de contato  │                  │
│                             │  ┌─────────────┐ │
│                             │  │ [msg] [🎤]  │ │
│                             │  └─────────────┘ │
└─────────────────────────────┴──────────────────┘
```

### 3.2 Estados da interface

| Estado | Lousa | Dock | Indicador |
|---|---|---|---|
| Inicial | Vazia | Habilitada | Nenhum |
| Ouvindo | Sem mudança | Microfone pulsando | Onda de voz |
| Agente falando | Sem mudança | Bloqueada | Avatar falando |
| Campo preenchido | Item aparece com ✅ | Normal | Animação suave |
| Gerando webapp | "Criando seu site..." | Bloqueada | Loading simples |
| Pronto | Resultado na lousa | Habilitada | "Seu site ficou assim" |

### 3.3 O que NUNCA deve aparecer na interface

- Tabs ou abas de qualquer tipo
- Botão de "modo texto" / "modo voz" (os dois coexistem naturalmente)
- Preview em iframe dentro do fluxo de conversa
- Botões de copiar código, abrir em nova aba, inspecionar
- Indicadores técnicos (agent_id, channel, status da API)
- Menus de configuração de voz, modelo ou qualidade
- Progresso em % (ex: "60% completo")

### 3.4 Lousa — comportamento

A lousa é uma **representação visual do briefing**, não um editor. O usuário nunca clica nela durante a conversa.

```javascript
// src/planner.js — estrutura do briefing
const BRIEFING_FIELDS = [
  { id: 'business_name',  label: 'Nome do negócio',       critical: true  },
  { id: 'objective',      label: 'Objetivo do site',       critical: true  },
  { id: 'target_audience',label: 'Para quem é',            critical: true  },
  { id: 'style',          label: 'Estilo visual',          critical: false },
  { id: 'contact_info',   label: 'Informações de contato', critical: false },
  { id: 'content',        label: 'Conteúdo principal',     critical: false },
];
// critical: true → agente prioriza perguntar esses primeiro
// A lousa mostra ✅ para preenchidos e ⬜ para pendentes
// Campos não críticos aparecem só quando os críticos estão ok
```

---

## 4. Features

### 4.1 MVP — Hackathon (obrigatório)

- [ ] Conversa por voz em pt-BR com o agente
- [ ] Conversa por texto como fallback natural
- [ ] Planner identifica próxima lacuna crítica do briefing
- [ ] Lousa preenche campo a campo conforme a conversa avança
- [ ] Geração de webapp HTML ao completar briefing crítico
- [ ] Lousa exibe o resultado final (link de download ou visualização simples)

### 4.2 Desejáveis (se der tempo)

- [ ] Envio de imagem de referência ("quero parecido com isso")
- [ ] Iteração por voz: "Muda o estilo pra mais colorido"
- [ ] Filler words durante a geração

---

## 5. Arquitetura Técnica

```
ORACLE CLOUD (OCI VM Ubuntu)
│
├── Nginx (porta 443, SSL via Certbot)
│   ├── / → serve build estático do Vite (src/)
│   └── /api → proxy para FastAPI (porta 8000)
│
├── FastAPI (gunicorn + uvicorn, porta 8000)
│   ├── POST /api/token       → gera RTC token
│   ├── POST /api/agent/start → inicia agente Agora
│   ├── POST /api/agent/stop  → encerra agente
│   └── POST /api/generate    → gera HTML via GPT-4o
│
└── Frontend (build estático servido pelo Nginx)
    ├── src/agora/            → Agora RTC Web SDK
    ├── src/App.jsx           → UI + ingestão de voz
    └── src/planner.js        → engine de discovery
```

### Fluxo de dados completo

```
1. Browser carrega app React (estático via Nginx)
2. App chama POST /api/token  →  { token, uid, channel }
3. Agora RTC SDK: client.join(appId, channel, token, uid)
4. App chama POST /api/agent/start  →  { agent_id }
5. Agora cria agente no canal → agente envia greeting em voz
6. Loop de conversa:
   a. Usuário fala → ASR transcreve → LLM responde → TTS vocaliza
   b. Transcript final chega ao frontend (via RTM datastream)
   c. planner.js analisa transcript → identifica campo preenchido
   d. Lousa atualiza com o novo campo ✅
   e. Contexto atualizado é enviado ao agente (próxima lacuna crítica)
7. Quando campos críticos estão todos ✅:
   a. Planner sinaliza briefing completo
   b. App chama POST /api/generate com o briefing
   c. FastAPI chama GPT-4o → retorna HTML
   d. Lousa exibe resultado
8. App chama POST /api/agent/stop → agente sai do canal
```

---

## 6. Integração Agora Convo AI

### 6.1 Autenticação REST

```python
# server-python/src/agent.py
import base64
import os

def get_auth_header():
    customer_id = os.getenv("AGORA_CUSTOMER_ID")
    customer_secret = os.getenv("AGORA_CUSTOMER_SECRET")
    credentials = base64.b64encode(
        f"{customer_id}:{customer_secret}".encode()
    ).decode()
    return {"Authorization": f"Basic {credentials}"}
```

### 6.2 Start do agente — POST /join

```python
# server-python/src/agent.py

SYSTEM_PROMPT = """
Você é um assistente do SIMPLE-AI. Seu trabalho é descobrir o que a pessoa quer criar.
Seu tom é amigável, paciente e simples — como um amigo que entende de tecnologia.

NUNCA use: HTML, CSS, código, componente, framework, pixel, responsivo.
USE SEMPRE: site, página, botão, cor, texto, imagem, formulário.

## FLUXO DE DISCOVERY

O contexto da conversa vai trazer quais campos do briefing já foram preenchidos
e qual é a próxima lacuna crítica. Faça UMA pergunta de cada vez sobre essa lacuna.

Seja conversacional. Se a pessoa desviar do assunto, traga de volta gentilmente.
Se a pessoa ficar em silêncio por mais de 5 segundos, pergunte: "Ainda estou aqui. Pode continuar."

Quando o sistema indicar que o briefing está completo, diga:
"Ótimo! Agora tenho tudo o que preciso. Vou criar o seu site. Pode olhar para a tela!"

Responda SEMPRE em português do Brasil.
Respostas de voz: máximo 2 frases. Sem listas. Sem pontos. Só falar natural.
"""

async def start_agent(channel: str, token: str, user_uid: str, briefing_context: str):
    app_id = os.getenv("APP_ID")
    base_url = f"https://api.agora.io/api/conversational-ai-agent/v2/projects/{app_id}"

    # Injeta o estado atual do briefing no system prompt
    dynamic_prompt = SYSTEM_PROMPT + f"\n\n## ESTADO ATUAL DO BRIEFING\n{briefing_context}"

    body = {
        "name": f"simple_ai_{int(time.time())}",
        "properties": {
            "channel": channel,
            "token": token,
            "agent_rtc_uid": "0",
            "remote_rtc_uids": [user_uid],
            "idle_timeout": 120,

            "asr": {
                "language": "pt-BR",    # CRÍTICO
                "vendor": "ares",       # built-in, sem necessidade de key extra
            },

            "llm": {
                "url": "https://api.openai.com/v1/chat/completions",
                "api_key": os.getenv("OPENAI_API_KEY"),
                "system_messages": [
                    {"role": "system", "content": dynamic_prompt}
                ],
                "greeting_message": "Olá! Vou te ajudar a criar um site. Me conta: o que você faz ou vende?",
                "failure_message": "Desculpa, não entendi direito. Pode repetir?",
                "params": {"model": "gpt-4o"},
                "max_history": 20,
                "style": "openai",
            },

            "tts": {
                "vendor": "microsoft",
                "params": {
                    "key": os.getenv("AZURE_TTS_KEY"),
                    "region": os.getenv("AZURE_TTS_REGION", "eastus"),
                    "voice_name": "pt-BR-AntonioNeural",
                },
                "skip_patterns": [3, 4, 5],  # pula (), [], {} — evita vocalizar JSON
            },

            # Filler words enquanto processa
            "filler_words": {
                "enable": True,
                "trigger": {
                    "mode": "fixed_time",
                    "fixed_time_config": {"response_wait_ms": 1500},
                },
                "content": {
                    "mode": "static",
                    "static_config": {
                        "phrases": [
                            "Deixa eu ver...",
                            "Entendi, um segundo...",
                            "Certo...",
                        ],
                        "selection_rule": "shuffle",
                    },
                },
            },

            # Turn detection otimizado para português conversacional
            "turn_detection": {
                "mode": "default",
                "config": {
                    "speech_threshold": 0.5,
                    "end_of_speech": {
                        "mode": "semantic",
                        "semantic_config": {
                            "silence_duration_ms": 400,
                            "max_wait_ms": 3000,
                        },
                    },
                },
            },

            "parameters": {
                "silence_config": {
                    "timeout_ms": 8000,
                    "action": "speak",
                    "content": "Ainda estou aqui. Pode continuar quando quiser.",
                },
            },
        },
    }

    response = requests.post(
        f"{base_url}/join",
        headers={**get_auth_header(), "Content-Type": "application/json"},
        json=body,
    )
    return response.json()  # { agent_id, create_ts, status }
```

### 6.3 Stop do agente

```python
async def stop_agent(agent_id: str):
    app_id = os.getenv("APP_ID")
    base_url = f"https://api.agora.io/api/conversational-ai-agent/v2/projects/{app_id}"

    response = requests.post(
        f"{base_url}/agents/{agent_id}/leave",
        headers=get_auth_header(),
    )
    return response.ok
```

---

## 7. Backend FastAPI

### 7.1 Estrutura

```
server-python/
  src/
    server.py   ← FastAPI app, rotas HTTP
    agent.py    ← lógica do agente Agora + system prompt
    token.py    ← geração de RTC token
    generate.py ← geração de HTML via GPT-4o
  requirements.txt
  .env.example
  .env.local    ← NÃO commitar
```

### 7.2 server.py — rotas

```python
# server-python/src/server.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # em prod: restringir ao domínio
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Modelos ──────────────────────────────────────────────

class StartAgentRequest(BaseModel):
    channel: str
    user_uid: str
    briefing_context: str = ""   # estado atual do briefing (do planner.js)

class StopAgentRequest(BaseModel):
    agent_id: str

class GenerateRequest(BaseModel):
    briefing: dict                # objeto completo do briefing preenchido

# ── Rotas ────────────────────────────────────────────────

@app.get("/api/token")
async def get_token(uid: str = "0", channel: str = ""):
    from token import build_rtc_token
    if not channel:
        channel = f"simple_ai_{int(time.time())}"
    token = build_rtc_token(channel, uid)
    return {"token": token, "uid": uid, "channel": channel}

@app.post("/api/agent/start")
async def start(req: StartAgentRequest):
    from agent import start_agent
    # Gera token pro agente
    agent_token = build_rtc_token(req.channel, "0")
    result = await start_agent(req.channel, agent_token, req.user_uid, req.briefing_context)
    return result   # { agent_id, status }

@app.post("/api/agent/stop")
async def stop(req: StopAgentRequest):
    from agent import stop_agent
    success = await stop_agent(req.agent_id)
    return {"success": success}

@app.post("/api/generate")
async def generate(req: GenerateRequest):
    from generate import generate_webapp
    html = await generate_webapp(req.briefing)
    return {"html": html}

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
```

### 7.3 token.py — geração de token RTC

```python
# server-python/src/token.py
from agora_token_builder import RtcTokenBuilder, Role_Publisher
import os, time

def build_rtc_token(channel: str, uid: str) -> str:
    app_id = os.getenv("APP_ID")
    app_cert = os.getenv("APP_CERTIFICATE")
    expire = int(time.time()) + 3600  # 1 hora
    return RtcTokenBuilder.buildTokenWithUid(
        app_id, app_cert, channel, int(uid) if uid != "0" else 0,
        Role_Publisher, expire, expire
    )
```

### 7.4 generate.py — geração do webapp

```python
# server-python/src/generate.py
from openai import AsyncOpenAI
import os

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CODEGEN_PROMPT = """
Você é um expert em criar sites modernos e bonitos.
Gere APENAS o código HTML completo — um único arquivo .html auto-contido.

Regras obrigatórias:
- Todo CSS dentro de <style> na <head>
- Todo JavaScript dentro de <script> no final do <body>
- ZERO dependências externas (sem CDN, sem imports externos)
- Design moderno, responsivo e mobile-first
- Conteúdo real baseado no briefing — sem Lorem Ipsum
- Retorne APENAS o HTML, sem markdown, sem backticks, sem explicações
"""

async def generate_webapp(briefing: dict) -> str:
    briefing_text = "\n".join([
        f"- {k}: {v}" for k, v in briefing.items() if v
    ])

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": CODEGEN_PROMPT},
            {"role": "user", "content": f"Crie um site com base neste briefing:\n\n{briefing_text}"},
        ],
        max_tokens=4096,
        temperature=0.7,
    )

    html = response.choices[0].message.content
    # Remove markdown se o modelo incluiu mesmo assim
    html = html.replace("```html", "").replace("```", "").strip()
    return html
```

### 7.5 requirements.txt

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
gunicorn>=22.0.0
python-dotenv>=1.0.0
requests>=2.31.0
openai>=1.30.0
agora-token>=2.0.0
pydantic>=2.0.0
```

---

## 8. Planner — Engine de Discovery

O `planner.js` é o cérebro do fluxo de discovery no frontend. Ele:
1. Mantém o estado atual do briefing
2. Analisa a transcrição recebida da voz para extrair campos preenchidos
3. Identifica qual é a próxima lacuna crítica
4. Envia o contexto atualizado ao agente
5. Notifica a lousa para atualizar

```javascript
// src/planner.js

const BRIEFING_SCHEMA = [
  { id: 'business_name',   label: 'Nome do negócio',        critical: true  },
  { id: 'objective',       label: 'Objetivo do site',        critical: true  },
  { id: 'target_audience', label: 'Para quem é',             critical: true  },
  { id: 'style',           label: 'Estilo / cores',          critical: false },
  { id: 'contact_info',    label: 'Contato',                 critical: false },
  { id: 'content',         label: 'Conteúdo principal',      critical: false },
];

export class Planner {
  constructor(onBriefingUpdate) {
    this.briefing = {};
    this.onBriefingUpdate = onBriefingUpdate; // callback → atualiza a lousa
  }

  // Chamado quando chega transcript final do agente ou do usuário
  ingestTranscript(transcript) {
    // Extrai campos identificados (pode ser feito via LLM local ou regex simples)
    // Por ora: envia pro backend /api/extract ou usa GPT-4o-mini no cliente
    this._extractAndUpdate(transcript);
  }

  _extractAndUpdate(transcript) {
    // TODO: implementar extração de campos da transcrição
    // Opção simples: chamar GPT-4o-mini com o transcript e pedir JSON
    // Opção mais simples ainda: o agente sempre responde em formato estruturado
    //   e o frontend parseia
    this.onBriefingUpdate(this.briefing);
  }

  getNextCriticalGap() {
    const missing = BRIEFING_SCHEMA
      .filter(f => f.critical && !this.briefing[f.id]);
    return missing[0] || null;
  }

  getBriefingContext() {
    const filled = Object.entries(this.briefing)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');

    const gap = this.getNextCriticalGap();
    const nextQuestion = gap
      ? `\nPROXIMA LACUNA CRITICA: ${gap.label}`
      : '\nBRIEFING COMPLETO. Avise o usuário e aguarde sinal para gerar.';

    return `CAMPOS PREENCHIDOS:\n${filled || '(nenhum ainda)'}${nextQuestion}`;
  }

  isCriticalComplete() {
    return BRIEFING_SCHEMA
      .filter(f => f.critical)
      .every(f => !!this.briefing[f.id]);
  }

  setField(fieldId, value) {
    this.briefing[fieldId] = value;
    this.onBriefingUpdate({ ...this.briefing });
  }
}
```

---

## 9. Geração do Webapp

Quando `planner.isCriticalComplete()` retorna `true`:

```javascript
// src/App.jsx

async function handleBriefingComplete(briefing) {
  // 1. Agente já avisou o usuário em voz: "Vou criar seu site agora!"
  // 2. Frontend chama o backend
  setLousaState('gerando');

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ briefing }),
  });

  const { html } = await response.json();

  // 3. Exibe na lousa (download link, não iframe inline durante a conversa)
  setGeneratedHtml(html);
  setLousaState('pronto');

  // 4. Para o agente
  await fetch('/api/agent/stop', {
    method: 'POST',
    body: JSON.stringify({ agent_id: currentAgentId }),
  });
}
```

### Lousa no estado "pronto"

```
┌─────────────────────────────┐
│                             │
│   ✅ Seu site está pronto!  │
│                             │
│   [  Baixar o HTML  ]       │
│                             │
│   Quer mudar alguma coisa?  │
│   É só falar.               │
│                             │
└─────────────────────────────┘
```

> ⚠️ **Não exibir iframe com o site dentro da interface principal.**  
> A lousa mostra o resultado com um botão de download e a opção de continuar conversando para ajustes.  
> Isso preserva a simplicidade e evita sobrecarga cognitiva.

---

## 10. Deploy na Oracle Cloud

### 10.1 Pré-requisitos OCI

```
VM: Ubuntu 22.04 · Shape: VM.Standard.E2.1.Micro (Always Free) ou superior
Portas abertas: 22 (SSH), 80 (HTTP), 443 (HTTPS)
IP público fixo (Reserved IP)
Domínio apontando para o IP — obrigatório para SSL e microfone HTTPS
```

### 10.2 Setup da VM

```bash
# Instalar dependências
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx python3 python3-pip python3-venv

# Instalar Node.js 20 (para build do frontend)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Abrir portas (OCI tem iptables próprio além do Security List)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### 10.3 Deploy da aplicação

```bash
# Clonar o repo
git clone https://github.com/SEU_ORG/simple-ai.git
cd simple-ai

# ── Backend ──────────────────────────────────────────────
python3 -m venv server-python/.venv
server-python/.venv/bin/pip install -r server-python/requirements.txt

# Criar .env.local
cp server-python/.env.example server-python/.env.local
nano server-python/.env.local  # preencher as chaves

# Testar backend
server-python/.venv/bin/python server-python/src/server.py
# → Deve rodar em http://localhost:8000

# ── Frontend ─────────────────────────────────────────────
npm install --legacy-peer-deps

# Criar .env para o Vite (variáveis públicas)
echo "VITE_AGORA_APP_ID=seu_app_id" > .env

# Build de produção
npm run build
# → gera pasta dist/

# ── Rodar backend em produção com gunicorn ────────────────
server-python/.venv/bin/gunicorn \
  -w 2 \
  -k uvicorn.workers.UvicornWorker \
  --chdir server-python/src \
  --bind 0.0.0.0:8000 \
  server:app \
  --daemon \
  --log-file /var/log/simple-ai-backend.log
```

### 10.4 Nginx — configuração

```nginx
# /etc/nginx/sites-available/simple-ai
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Serve o build estático do Vite
    root /home/ubuntu/simple-ai/dist;
    index index.html;

    # SPA — todas as rotas vão pro index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para o backend FastAPI
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

```bash
# Ativar e configurar SSL
sudo ln -s /etc/nginx/sites-available/simple-ai /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL (OBRIGATÓRIO — microfone não funciona sem HTTPS)
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

### 10.5 Script de redeploy

```bash
#!/bin/bash
# redeploy.sh — rodar após cada push

set -e
cd /home/ubuntu/simple-ai

# Puxar mudanças
git pull origin main

# Rebuildar frontend
npm install --legacy-peer-deps
npm run build

# Reinstalar dependências Python se necessário
server-python/.venv/bin/pip install -r server-python/requirements.txt -q

# Reiniciar backend
pkill -f "gunicorn" || true
sleep 1
server-python/.venv/bin/gunicorn \
  -w 2 -k uvicorn.workers.UvicornWorker \
  --chdir server-python/src \
  --bind 0.0.0.0:8000 \
  server:app --daemon \
  --log-file /var/log/simple-ai-backend.log

sudo systemctl reload nginx
echo "✅ Redeploy concluído"
```

---

## 11. Variáveis de Ambiente

### server-python/.env.local

```bash
# Agora RTC
APP_ID=                          # Agora Console → seu projeto
APP_CERTIFICATE=                 # Agora Console → seu projeto

# Agora REST API (para controle do agente)
AGORA_CUSTOMER_ID=               # Console → RESTful API credentials
AGORA_CUSTOMER_SECRET=           # Console → RESTful API credentials

# LLM
OPENAI_API_KEY=sk-...

# TTS
AZURE_TTS_KEY=
AZURE_TTS_REGION=eastus
```

### .env (frontend Vite)

```bash
# Apenas variáveis públicas — não colocar secrets aqui
VITE_AGORA_APP_ID=               # mesmo APP_ID do backend
VITE_API_BASE_URL=https://seu-dominio.com
```

> ⚠️ `APP_CERTIFICATE` e `AGORA_CUSTOMER_SECRET` ficam **apenas no backend**. Nunca no Vite.

---

## 12. Equipe e Responsabilidades

| Membro | Papel | Responsabilidades |
|---|---|---|
| **Renan** | CTO · Produto | System prompt, fluxo de discovery, decisões de UX, demo |
| **Dev FS 1** | Backend lead | `agent.py`, `server.py`, `token.py`, `generate.py`, integração Agora |
| **Dev FS 2** | Infra · Backend | Oracle VM, Nginx, SSL, gunicorn, `planner.js`, extração de campos |
| **Dev Frontend** | Frontend lead | `App.jsx`, Agora RTC SDK, lousa, dock, estados de UI |

### Mapa de arquivos por responsável

```
Dev FS 1:
  server-python/src/agent.py      ← sistema do agente (prompt + start/stop)
  server-python/src/server.py     ← rotas FastAPI
  server-python/src/token.py      ← RTC token
  server-python/src/generate.py   ← geração de HTML

Dev FS 2:
  src/planner.js                  ← engine de discovery e extração
  /etc/nginx/sites-available/     ← config Nginx
  redeploy.sh                     ← script de deploy

Dev Frontend:
  src/App.jsx                     ← app principal e estados
  src/agora/                      ← Agora RTC Web SDK
  src/components/Lousa.jsx        ← componente da lousa
  src/components/Dock.jsx         ← dock com 2 botões
```

---

## 13. Timeline

| Tempo | Fase | Owner | Entregável |
|---|---|---|---|
| 0–10min | Setup | Todos | Clone, `.env.local`, `npm run dev:full` rodando |
| 10–30min | Backend + Voz | FS1 | Agente respondendo em pt-BR localmente |
| 30–60min | Planner + Lousa | FS2 + Frontend | Lousa preenchendo campos ao conversar |
| 60–80min | Geração + resultado | FS1 + FS2 | HTML gerado, botão de download funcionando |
| 80–100min | Deploy Oracle | FS2 | App em HTTPS na VM OCI |
| 100–120min | Demo | Renan | Teste end-to-end, roteiro, apresentação |

---

## 14. Critérios de Aceite

### Voz — obrigatório

- [ ] Usuário clica no microfone e ouve o agente em menos de 3 segundos
- [ ] ASR reconhece pt-BR sem erros graves no vocabulário cotidiano
- [ ] TTS soa natural (pt-BR-AntonioNeural)
- [ ] Turn detection não corta o usuário no meio da frase
- [ ] `silence_config` fala "Ainda estou aqui" após 8s de silêncio

### Planner e Lousa — obrigatório

- [ ] Campo aparece na lousa imediatamente após ser mencionado na conversa
- [ ] Agente prioriza campos críticos faltantes (business_name, objective, target_audience)
- [ ] `isCriticalComplete()` aciona corretamente a geração

### Geração — obrigatório

- [ ] HTML gerado não tem dependências externas
- [ ] Botão de download funciona
- [ ] Lousa muda para estado "pronto" após geração

### UX — obrigatório

- [ ] Dock tem exatamente 2 botões: enviar e microfone
- [ ] Lousa começa completamente vazia
- [ ] Nenhum elemento técnico visível na interface
- [ ] Interface funciona em mobile

### Infra — obrigatório

- [ ] App acessível via HTTPS (sem isso microfone não funciona)
- [ ] SSL válido (não auto-assinado)
- [ ] Backend reinicia automaticamente após crash

---

## 15. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| ASR não extrai campos do briefing corretamente | Alto | Opção A: agente responde em JSON estruturado. Opção B: GPT-4o-mini extrai campos do transcript |
| HTTPS ausente → microfone bloqueado no Chrome | Crítico | Certbot no setup. Não demo sem SSL. Testar em 80min |
| Porta bloqueada no OCI | Alto | OCI tem 2 camadas de firewall: Security List (console) E iptables (OS). Liberar as duas |
| Planner não detecta campo preenchido | Médio | Fallback: usuário pode digitar na dock. O agente então confirma por voz |
| Token RTC expira durante demo | Alto | Gerar token novo a cada sessão. Validade: 3600s |
| Latência alta na geração do HTML | Médio | Filler words ativas. Lousa mostra "Criando seu site..." |
| Agente começa a falar tecniquês | Médio | System prompt com exemplos negativos. Renan valida antes da demo |

---

## Referências

- [Agora Convo AI REST API — POST /join](https://docs.agora.io/en/conversational-ai/rest-api/agent/join)
- [Agora Convo AI Quickstart](https://docs.agora.io/en/conversational-ai/get-started/quickstart)
- [Hackathon Repo SP 2026](https://github.com/AgoraIO-Community/cognition-hack-sp-2026)
- [Agora Console](https://console.agora.io/v2)
- [Vozes Azure pt-BR](https://speech.microsoft.com/portal/voicegallery)
- [Oracle Cloud — Security Lists](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Agora Token Builder Python](https://pypi.org/project/agora-token-builder/)

---

> **SIMPLE-AI** · Hackathon Cognition SP 2026 · NexUnio Soluções em IA  
> _"O único produto que funciona mesmo se o usuário nunca usou um computador."_