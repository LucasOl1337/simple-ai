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
2. [.simpleai/core/conversation-rules.md](.simpleai/core/conversation-rules.md) - regras inviolaveis R1-R10 (validas para todos os agentes)
3. [.simpleai/core/routing.md](.simpleai/core/routing.md) - como o sistema decide silenciosamente qual agente atende
4. [.simpleai/core/notepad.md](.simpleai/core/notepad.md) - estrutura de notepad compartilhada
5. [.simpleai/core/thresholds.md](.simpleai/core/thresholds.md) - modelo de "ready_to_X"
6. [.simpleai/agents/_registry.yaml](.simpleai/agents/_registry.yaml) - lista de agentes disponiveis
7. README do agente especifico (ex: [.simpleai/agents/website-builder/README.md](.simpleai/agents/website-builder/README.md))
8. [src/features/orchestration/](src/features/orchestration/) - router, registry e intent classifier
9. [src/features/agents/](src/features/agents/) - planners por agente
10. [src/app/App.jsx](src/app/App.jsx) - UI principal
11. [.simpleai/voice-convo-requirements.md](.simpleai/voice-convo-requirements.md) - requisitos de integracao de voz
12. [templates/landing-benchmarks/](templates/landing-benchmarks/) - benchmarking de landing pages

## Estado atual

SIMPLE-AI incorpora um core de conversa em tempo real com Agora Conversational AI + RTC. A interface principal continua focada no fluxo mais simples possivel — lousa vazia + dock de 2 botoes — mas por baixo o sistema agora suporta **multiplos agentes** orquestrados silenciosamente:

- **Construtor de Site** (`website-builder`, stable) — fluxo original.
- **Atendimento ao Cliente** (`customer-support`, skeleton).
- **Criador de Conteudo** (`content-creator`, skeleton).
- **Consultor de Negocio** (`business-consultant`, skeleton).

A escolha do agente acontece pelo intent classifier — o usuario nunca ve menu de selecao. Detalhes em [.simpleai/core/routing.md](.simpleai/core/routing.md).

## Estrutura

```text
.
├── .simpleai/                                 <- CORE: spec de comportamento dos agentes
│   ├── README.md                              <- Indice obrigatorio (primeira leitura)
│   ├── core/                                  <- conceitos compartilhados por todos agentes
│   │   ├── routing.md                         <- intent classifier + fallback + hand-off
│   │   ├── notepad.md                         <- estrutura compartilhada do notepad
│   │   ├── thresholds.md                      <- modelo de "ready_to_X"
│   │   └── conversation-rules.md              <- regras R1-R10 inviolaveis
│   ├── agents/                                <- um agente por subpasta
│   │   ├── _registry.yaml                     <- registro central (machine-readable)
│   │   ├── website-builder/                   <- stable, default fallback
│   │   ├── customer-support/                  <- skeleton
│   │   ├── content-creator/                   <- skeleton
│   │   └── business-consultant/               <- skeleton
│   └── voice-convo-requirements.md            <- requisitos Convo/Voice (vale para todos)
├── templates/                                 <- material de benchmarking
│   └── landing-benchmarks/                    <- referencias de landing curadas
├── src/
│   ├── app/
│   │   ├── App.jsx
│   │   └── styles.css                         <- paleta warm-neutral amber
│   ├── features/
│   │   ├── orchestration/                     <- router, registry, intent-classifier, session
│   │   ├── agents/                            <- um planner por agente
│   │   │   ├── website-builder/               <- reexporta de discovery/ (transicao)
│   │   │   ├── customer-support/              <- skeleton
│   │   │   ├── content-creator/               <- skeleton
│   │   │   └── business-consultant/           <- skeleton
│   │   └── discovery/                         <- planner legacy do website-builder (sera migrado)
│   ├── integrations/
│   │   └── agora/
│   └── main.jsx
├── server-python/
│   ├── src/agent.py                           <- Agente Convo que segue .simpleai/ specs
│   ├── src/server.py
│   └── .env.example
├── docs/                                      <- Docs auxiliares (nao core)
│   └── README.md
└── vite.config.js
```

## Responsabilidade por pasta

- `.simpleai/`: **CORE** - especificacao de comportamento de todos os agentes. Fonte de verdade.
- `templates/landing-benchmarks/`: material curado de benchmarking visual.
- `src/app/`: interface principal e composicao da experiencia.
- `src/features/orchestration/`: roteamento silencioso de intent + registry de agentes.
- `src/features/agents/`: planners por agente (cada um implementa sua propria spec).
- `src/features/discovery/`: planner legacy do `website-builder` (em transicao).
- `src/integrations/agora/`: camada de integracao com voz em tempo real.
- `server-python/`: backend local para token, agente Convo e configuracao.
- `docs/`: documentacao auxiliar e anotacoes (nao core).

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
