<p align="center">
  <img src="../assets/logo.svg" alt="SIMPLE-AI" width="200" />
</p>

# Arquitetura Tecnica — SIMPLE-AI

> Detalhamento tecnico para avaliadores que querem entender a fundo como o sistema funciona.

---

## Visao Geral

```
+------------------+     +-----------------+     +------------------+
|   FRONTEND       |     |   BACKEND       |     |   SERVICOS       |
|   React + Vite   | <-->|   FastAPI Python | <-->|   EXTERNOS       |
+------------------+     +-----------------+     +------------------+
| App.jsx          |     | server.py       |     | Agora Convo AI   |
| planner.js       |     | agent.py        |     | OpenAI GPT-4o    |
| Agora RTC SDK    |     | discovery.py    |     | Deepgram STT     |
| styles.css       |     | generate.py     |     | MiniMax TTS      |
+------------------+     | tunnel.py       |     +------------------+
                          +-----------------+
```

---

## Frontend — React + Vite

### App.jsx — Interface Principal

Componente unico que gerencia toda a experiencia:

- **WhiteboardChecklist** — lousa com campos do briefing (OK / faltando)
- **TranscriptMessage** — bolhas de conversa (agente + usuario)
- **PublishCard** — card de status da publicacao (gerando, publicando, pronto, erro)
- **Chat Composer** — campo de texto + botao enviar + upload de imagem
- **Microfone** — Web Speech API com buffer e envio automatico

**Fluxo de estado:**
```
[Sem sessao] --> bootstrapDiscoveryAgent() --> [Sessao ativa]
     |                                              |
     v                                              v
[Agente conectando]                    [Loop de conversa]
                                              |
                                              v
                                    [readyToBuild = true]
                                              |
                                              v
                                    [Gerar e publicar site]
```

**Persistencia:** sessao salva em `localStorage` (chave `simple-ai-whiteboard-v7`)

### planner.js — Engine de Discovery

O cerebro do fluxo no frontend. Responsavel por:

1. **Manter o notepad** — 14 campos com prioridade e confianca
2. **Extrair sinais** — pattern matching em pt-BR
3. **Decidir proxima pergunta** — campos criticos primeiro
4. **Detectar ready_to_build** — todos criticos OK + minimo de interacoes

**Deteccoes automaticas:**

| O que detecta | Como | Exemplo |
|---|---|---|
| Tipo de negocio | Keywords (oficina, clinica, loja...) | "mecanica" --> "Oficina mecanica" |
| CTA principal | Sinais de acao (agendar, comprar...) | "whatsapp" --> "Chamar no WhatsApp" |
| Canal de contato | Keywords de canal | "zap" --> "WhatsApp" |
| Escopo/regiao | Regex + preposicoes (em/na/no + cidade) | "em Moema" --> "Moema" |
| Publico | Palavras-alvo (clientes, mulheres...) | "mulheres" --> extraido |
| Nome da marca | Regex de padroes ("chama...", "nome e...") | "nome e Alpha" --> "Alpha" |

**Templates resolvidos automaticamente:**

| Sinais | Template |
|---|---|
| Loja + produto + comprar | `product-showcase-lite` |
| Clinica + consultorio + profissional | `professional-trust` |
| Demais casos | `service-clean` |

---

## Backend — FastAPI Python

### Rotas da API

| Metodo | Rota | Funcao |
|---|---|---|
| GET | `/get_config` | Retorna app_id, token, uid, channel para o frontend |
| POST | `/v2/startAgent` | Inicia agente Agora com contexto do briefing |
| POST | `/v2/stopAgent` | Encerra agente e sessao de voz |
| POST | `/generate-site` | Gera HTML auto-contido via GPT-4o |
| GET | `/published/{site_id}` | Serve site gerado como pagina HTML |
| POST | `/discovery/session/start` | Inicia nova sessao de discovery |
| POST | `/discovery/session/message` | Processa mensagem do usuario na sessao |

### agent.py — Agente de Voz

Usa o **Agora Agent Client Toolkit** para criar sessoes de voz em tempo real:

```
Agora Agent
  |-- LLM:  OpenAI GPT-4o-mini (instrucoes em pt-BR)
  |-- STT:  Deepgram Nova-3 (reconhecimento de fala pt-BR)
  |-- TTS:  MiniMax TTS (sintese de voz)
  |-- RTM:  habilitado para data channel
```

O system prompt e gerado dinamicamente com:
- Regras do spec (.simpleai/)
- Contexto atual do briefing
- Proxima lacuna critica a ser preenchida

### generate.py — Gerador de Sites

- Recebe o briefing completo do planner
- Chama GPT-4o para gerar HTML auto-contido
- CSS inline dentro de `<style>`, JS dentro de `<script>`
- Zero dependencias externas (sem CDN)
- Salva em disco e serve via rota `/published/`

### tunnel.py — Cloudflare Tunnel

- Cria tunnel automaticamente para expor o backend local
- Permite gerar links publicos para os sites gerados
- Usado durante desenvolvimento e demo

---

## Integracao Agora Conversational AI

### Como a Voz Funciona

```
Usuario fala no microfone
         |
Agora RTC captura audio
         |
Deepgram STT transcreve (pt-BR)
         |
GPT-4o-mini gera resposta
         |
MiniMax TTS sintetiza voz
         |
Agora RTC envia audio de volta
         |
Usuario ouve a resposta
```

### Modulos no Frontend

- **AgoraSessionPanel.jsx** — painel de controle da sessao
- **useAgoraSession.js** — hook React para estado da sessao
- **api.js** — chamadas ao backend (config, start, stop, generate)

### Estado Atual da Integracao

O sistema Agora esta **preparado tecnicamente** com:
- Modulos frontend prontos
- Backend com rotas de start/stop
- Token generation configurado
- Agente com STT + LLM + TTS

**Gap atual:** unificar o fluxo Agora com o planner principal (o transcript da Agora deve alimentar o notepad automaticamente).

---

## Deploy — Oracle Cloud

```
Oracle Cloud VM (Ubuntu 22.04)
  |
  +-- Nginx (443 / SSL)
  |     +-- /     --> build estatico do Vite
  |     +-- /api  --> proxy para FastAPI (8000)
  |
  +-- FastAPI (gunicorn + uvicorn)
  |     +-- agente Agora
  |     +-- gerador de sites
  |     +-- discovery sessions
  |
  +-- Certbot (SSL obrigatorio para microfone)
```

**Por que SSL e obrigatorio:** o Chrome bloqueia acesso ao microfone em paginas HTTP. Sem HTTPS, a funcionalidade de voz nao funciona.

---

## Variaveis de Ambiente

### server-python/.env.local (secreto)

| Variavel | Descricao |
|---|---|
| `APP_ID` | ID do projeto no Agora Console |
| `APP_CERTIFICATE` | Certificado do projeto Agora |
| `AGORA_CUSTOMER_ID` | Credencial REST API Agora |
| `AGORA_CUSTOMER_SECRET` | Credencial REST API Agora |
| `OPENAI_API_KEY` | Chave da API OpenAI |
| `AZURE_TTS_KEY` | Chave do Azure Speech (TTS alternativo) |

---

<p align="center">
  <em>Para uma visao geral mais simples, volte para o <a href="README.md">README principal da apresentacao</a>.</em>
</p>
