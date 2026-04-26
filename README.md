# SIMPLE-AI

SIMPLE-AI e um projeto de descoberta conversacional para pessoas totalmente leigas em tecnologia. A interface e a arquitetura do produto precisam preservar simplicidade extrema em todas as entregas.

## Material para avaliadores

- [PDF da apresentacao](AVALIADORES%20READ%20ME/SIMPLE-AI-Apresentacao-Avaliadores.pdf)
- [Pasta de avaliadores](AVALIADORES%20READ%20ME/README.md)

## Regra global de produto

Estas regras sao obrigatorias para qualquer agente ou colaborador que atuar nesta repo:

- A interface deve ser extremamente simples, inclusive para um usuario idoso ou sem familiaridade digital.
- A tela inicial deve permanecer vazia no lado da lousa, sem menus, dashboards, modos ou botoes extras.
- O unico fluxo primario visivel deve ser a conversa.
- A dock de chat deve expor apenas dois controles de acao:
  - um botao primario para enviar mensagem ou imagem
  - um botao de microfone para iniciar a conversa por voz
- Nao adicionar acoes secundarias como tabs, toggles, menus de modo, botoes de preview, botoes tecnicos ou atalhos que aumentem carga cognitiva.
- A lousa da esquerda so deve mostrar o minimo necessario: informacoes-chave ja preenchidas, o que falta responder e o fluxo atual do briefing.
- Sempre preferir menos elementos, menos decisoes e menos texto por tela.

## Ordem de leitura para agentes

Se voce entrou agora na branch, siga esta ordem:

1. **[.simpleai/README.md](.simpleai/README.md)** - COMECE AQUI (spec core obrigatorio)
2. [.simpleai/first-interaction.md](.simpleai/first-interaction.md) - como o agente abre e conduz a primeira conversa
3. [.simpleai/agent-flow.md](.simpleai/agent-flow.md) - fases, perguntas e decisoes silenciosas
4. [.simpleai/flow-order.md](.simpleai/flow-order.md) - Discovery -> Producao -> Iteracao + ready_to_build
5. [src/features/discovery/planner.js](src/features/discovery/planner.js) - engine que implementa o spec
6. [src/app/App.jsx](src/app/App.jsx) - UI principal
7. [.simpleai/voice-convo-requirements.md](.simpleai/voice-convo-requirements.md) - requisitos de integracao de voz

## Estado atual

SIMPLE-AI incorpora um core de conversa em tempo real com Agora Conversational AI + RTC, mas a interface principal continua focada no fluxo mais simples possivel.

## Estrutura

```text
.
├── .simpleai/                          <- CORE: spec de comportamento do agente
│   ├── README.md                       <- Indice obrigatorio (primeira leitura)
│   ├── first-interaction.md            <- Abertura + notepad + threshold
│   ├── agent-flow.md                   <- Fases + decisoes silenciosas
│   ├── flow-order.md                   <- Discovery -> Producao -> Iteracao
│   └── voice-convo-requirements.md     <- Requisitos Convo/Voice
├── src/
│   ├── app/
│   │   ├── App.jsx
│   │   └── styles.css
│   ├── features/
│   │   └── discovery/
│   │       └── planner.js              <- Implementa o spec de .simpleai/
│   ├── integrations/
│   │   └── agora/
│   └── main.jsx
├── server-python/
│   ├── src/agent.py                    <- Agente Convo que segue .simpleai/ specs
│   ├── src/server.py
│   └── .env.example
├── docs/                               <- Docs auxiliares (nao core)
│   └── README.md
└── vite.config.js
```

## Responsabilidade por pasta

- `.simpleai/`: **CORE** - especificacao de comportamento, fluxo, notepad e threshold. Fonte de verdade.
- `src/app/`: interface principal e composicao da experiencia
- `src/features/discovery/`: engine que implementa o spec de `.simpleai/`
- `src/integrations/agora/`: camada de integracao com voz em tempo real
- `server-python/`: backend local para token, agente Convo e configuracao
- `docs/`: documentacao auxiliar e anotacoes (nao core)

## Setup

### 1. Frontend

```bash
npm install --legacy-peer-deps
```

### 2. Backend

```bash
python -m venv server-python/.venv
server-python\.venv\Scripts\python -m pip install -r server-python/requirements.txt
copy server-python\.env.example server-python\.env.local
```

Preencha em `server-python/.env.local`:

- `APP_ID`
- `APP_CERTIFICATE`
- `AGENT_LLM_PROVIDER` (`anthropic`, `openai-compatible`, `nvidia`, `zai`, `openrouter`)
- `AGENT_LLM_API_KEY` ou a chave especifica do provider (`ANTHROPIC_API_KEY`, `NVIDIA_API_KEY`, `ZAI_API_KEY`, `OPENROUTER_API_KEY`)
- `AGENT_LLM_BASE_URL` se quiser sobrescrever o endpoint padrao
- `AGENT_LLM_MODEL`

## Rodando

Em dois terminais:

```bash
npm run dev
server-python\.venv\Scripts\python server-python/src/server.py
```

Ou use:

```bash
npm run dev:full
```

Observacao: `dev:full` chama `python` do PATH. Se voce preferir usar a `venv`, rode o backend no comando acima.

## Validacao feita

- `npm run build`
- `server-python\.venv\Scripts\python -m compileall server-python\src`
- `server-python\.venv\Scripts\python -c "import sys; sys.path.insert(0, 'server-python/src'); import server; print('backend-import-ok')"`

## Limite atual

Sem `APP_ID` e `APP_CERTIFICATE` validos da Agora o backend sobe, mas a sessao real nao conecta. Se estiver usando `AGENT_LLM_PROVIDER=openai-compatible`, `nvidia`, `zai` ou `openrouter`, o backend tambem precisa da chave do provider e, se quiser, um `AGENT_LLM_BASE_URL` customizado.
