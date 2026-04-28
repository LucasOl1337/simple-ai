# Módulo API

**Responsabilidade:** Servidor FastAPI, orquestração entre módulos, fila de build, e serving dos sites gerados.

Este módulo é o backbone de infraestrutura do SIMPLE-AI. Expõe os endpoints que o frontend consome, inicializa o BuilderAgent, gerencia jobs em background, e serve os sites estáticos gerados.

---

## Estrutura Interna

```
api/
├── server.py              Entrypoint FastAPI + todas as rotas
├── agents/
│   └── oci_agent.py       Agente 03 (OCI/Oracle Cloud) — opcional
├── modules/
│   └── README.md          Documentação dos módulos HTTP auxiliares
├── sites/                 Sites gerados (servidos em /sites/{job_id}/)
├── .env.example           Variáveis de ambiente necessárias
├── .env.local             Credenciais locais (não commitado)
└── requirements.txt       Dependências Python
```

---

## Rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/v2/build` | Enfileira um job de build para o Agente 02 |
| GET | `/v2/build/{job_id}` | Consulta status de um job (queued/building/done/error) |
| GET | `/sites/{job_id}/` | Serve o site gerado como arquivo estático |
| POST | `/v3/oci-agent/chat` | Chat com o Agente 03 (OCI) — opcional |
| GET | `/v3/oci-agent/status` | Status do Agente 03 |

---

## Como rodar

```bash
cd api

# Primeira vez:
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env.local   # edite com suas credenciais

# Rodar:
python server.py   # http://localhost:8000
```

Ou da raiz do projeto:
```bash
npm run dev:backend   # equivalente a python api/server.py
```

---

## Variáveis de Ambiente

Configure em `api/.env.local`:

```env
# LLM para o Agente 02 (obrigatório para gerar sites via LLM)
AGENT_LLM_PROVIDER=anthropic
AGENT_LLM_API_KEY=sk-ant-...
AGENT_LLM_MODEL=claude-opus-4-7      # opcional
BUILDER_AGENT_PROFILE=site-builder-core

# Geração de imagens (opcional)
AGENT_IMAGE_API_KEY=sk-...
AGENT_IMAGE_MODEL=gpt-image-1
AGENT_IMAGE_ENABLED=1

# Agente 03 OCI (opcional)
# Requer ~/.oci/config configurado
```

---

## Dependências e contratos

- **Importa:** `builder.agent.builder_agent.BuilderAgent` (via sys.path = raiz do projeto)
- **Importa:** `agents.oci_agent.Agente03` (via api/ no sys.path)
- **Serve:** sites estáticos em `api/sites/{job_id}/`
- **Consumido por:** `intake/ui/` via fetch em `/api/v2/build` (proxy Vite → localhost:8000)

### Perfis de geração (AgentesProfiles)

O Builder suporta perfis em `.md` na pasta `AgentesProfiles/`.

- Perfil default: `BUILDER_AGENT_PROFILE` (env)
- Override por request: campo `agent_profile` no payload do `/v2/build`

Se o perfil solicitado não existir, o build falha explicitamente.

### Biblioteca de design (DesignTemplates)

Quando o payload de `/v2/build` inclui `design_plan` vindo do Intake, o Builder pode anexar contexto adicional da pasta `DesignTemplates/` ao prompt de geração.

Esse contexto e usado para reforcar:

- familia de layout
- estilo visual por segmento
- anti-padroes a evitar
- referencias curatoriais ligadas a `reference_ids`

Nao existe novo campo obrigatorio na API. A integracao e opportunistica: se `DesignTemplates/` estiver presente, o Builder usa; se nao estiver, o build segue normalmente.

## Intake Filter Agent

O filtro e obrigatorio no chat de intake. Se a endpoint OpenAI-compatible, o modelo ou o prompt retornarem erro, o backend deve responder erro e o frontend deve interromper a interacao. Nao existe passthrough/fallback para a mensagem original.

Novas rotas:

- `POST /v1/intake/filter`
- `GET /v1/intake/filter/status`

Variaveis recomendadas em `api/.env.local`:

```env
INTAKE_FILTER_ENABLED=1
INTAKE_FILTER_BASE_URL=http://localhost:20128/v1
INTAKE_FILTER_API_KEY=
INTAKE_FILTER_MODEL=cx/gpt-5.4
INTAKE_FILTER_TIMEOUT_SECONDS=20
INTAKE_FILTER_CONTEXT_FILES=docs/agents/intake-filter/system.md,docs/spec/NOTEPAD-SCHEMA.md,docs/spec/flow-order.md,docs/spec/first-interaction.md
```

## First Interaction Agent

O agente da primeira interacao roda depois do filtro e antes da resposta visivel do chat. Ele usa endpoint OpenAI-compatible do 9router para transformar a primeira mensagem do usuario em uma resposta natural do SIMPLE-AI.

Rotas:

- `POST /v1/intake/first-interaction`
- `POST /v1/intake/turn`
- `GET /v1/intake/first-interaction/status`

Variaveis recomendadas em `api/.env.local`:

```env
FIRST_INTERACTION_AGENT_ENABLED=1
FIRST_INTERACTION_BASE_URL=http://localhost:20128/v1
FIRST_INTERACTION_API_KEY=
FIRST_INTERACTION_MODEL=gpt-5.4-mini
FIRST_INTERACTION_TIMEOUT_SECONDS=30
FIRST_INTERACTION_CONTEXT_FILES=docs/spec/first-interaction.md,docs/spec/NOTEPAD-SCHEMA.md,docs/spec/flow-order.md
```

Regra operacional: se o 9router, a chave ou o modelo falhar, a interacao falha explicitamente. Nao ha resposta local silenciosa para substituir o agente.

O chat deve usar `/v1/intake/turn` em todas as respostas do usuario. A rota retorna uma `action` estruturada, incluindo `build_with_defaults` quando o usuario pede teste/demo/site de exemplo e nao quer fornecer mais detalhes.
