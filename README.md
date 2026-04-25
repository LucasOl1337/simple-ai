# SIMPLE-AI

SIMPLE-AI e um projeto de descoberta conversacional para pessoas totalmente leigas em tecnologia. A interface e a arquitetura do produto precisam preservar simplicidade extrema em todas as entregas.

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

## Estado atual

SIMPLE-AI agora incorpora um core de conversa em tempo real com **Agora Conversational AI + RTC** dentro da propria repo.

## O que entrou

- frontend React/Vite com modulo de sessao de voz em tempo real
- backend FastAPI em `server-python/` para gerar token e iniciar/parar agentes
- fluxo atual de discovery aproveitando transcript final da voz para alimentar o planner
- contexto do briefing enviado ao agente para ele priorizar a proxima lacuna critica

## Estrutura

```text
.
├── src/
│   ├── agora/              # cliente Agora no frontend
│   ├── App.jsx             # simulador + ingestao de voz
│   └── planner.js          # engine do fluxo de discovery
├── server-python/
│   ├── src/agent.py        # prompt e sessao do agente
│   ├── src/server.py       # API local FastAPI
│   └── .env.example
└── vite.config.js          # proxy /api -> backend local
```

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

Sem `APP_ID` e `APP_CERTIFICATE` validos da Agora o backend sobe, mas a sessao real nao conecta.
