# SIMPLE-AI — Arquitetura Atual

> Última atualização: 2026-04-27
> Estrutura: 3 módulos, 5 pastas raiz

---

## Visão Geral

O projeto está organizado em **3 módulos operacionais** mapeados em **5 pastas de código raiz**:

```
simple-ai/
├── intake/          ← Módulo 1: Discovery (UI + engine conversacional)
├── builder/         ← Módulo 2: Geração de site (agente 02 + prompts)
├── api/             ← Módulo 3: Backend FastAPI + agente OCI
├── docs/            ← Especificações, arquitetura, hackathon
└── assets/          ← Recursos estáticos globais (logo, fontes, imagens)
```

---

## Responsabilidades por Módulo

### Módulo 1 — `intake/`

| Subpasta | Tecnologia | Função |
|----------|-----------|--------|
| `intake/ui/` | React 19 + Tailwind | Interface da conversa e acompanhamento de build |
| `intake/ui/components/` | JSX | Componentes visuais (dock, lousa, cards, modal) |
| `intake/ui/remotion/` | Remotion 4 | Players de vídeo (LaunchSequence, JourneyShareClip, OnboardingLoop) |
| `intake/engine/` | JS puro (sem LLM) | Agente 01: engine conversacional, notepad, confidence scoring |
| `intake/prompts/` | Python | Prompt de intake (texto enviado ao LLM para geração) |

**Ponto de entrada do frontend:** `intake/ui/main.jsx`  
**Orquestrador de UI:** `intake/ui/App.jsx`  
**Engine conversacional:** `intake/engine/planner.js` → implementa `docs/spec/`

---

### Módulo 2 — `builder/`

| Subpasta | Tecnologia | Função |
|----------|-----------|--------|
| `builder/agent/` | Python 3.11+ | Agente 02: gera HTML completo a partir do briefing |
| `builder/prompts/` | Python | Prompt de builder (system prompt + build_messages) |
| `builder/client/` | JS | Cliente fetch: `queueSiteBuild()` e `getSiteBuildStatus()` |

**Importado por:** `api/server.py` via `from builder.agent.builder_agent import BuilderAgent`  
**Importado por (frontend):** `intake/ui/App.jsx` via `../../builder/client`

---

### Módulo 3 — `api/`

| Subpasta/arquivo | Tecnologia | Função |
|-----------------|-----------|--------|
| `api/server.py` | FastAPI + uvicorn | Entrypoint, CORS, rotas `/api/v2/build` e `/api/v2/status` |
| `api/agents/oci_agent.py` | Python (OCI SDK) | Agente 03: operador OCI opcional, graceful fallback |
| `api/sites/` | Arquivos gerados | Sites HTML entregues em `/api/sites/{job_id}/` |
| `api/.env.local` | dotenv | Variáveis de ambiente do backend |

**Fallback de OCI:** Se `oci` não estiver instalado, `Agente03 = None` e o sistema continua sem OCI.

---

## Stack Técnica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend framework | React | 19 |
| Build tool | Vite | 8 |
| Estilização | Tailwind CSS | 4 |
| Animações de vídeo | Remotion | 4 |
| Backend | FastAPI | latest |
| Runtime Python | Python | 3.11+ |
| Concorrência | threading.Thread | stdlib |
| Banco de dados | — | **não existe** |
| Autenticação | — | **não existe** |

---

## Fluxo de Dados (7 Passos)

```
1. Usuário digita mensagem no browser
        │
        ▼
2. App.jsx → submitAnswer() → intake/engine/planner.js
   (Agente 01: atualiza notepad, calcula confidence, retorna próxima pergunta)
        │
        ▼
3. App.jsx avalia: ready_to_build?
   ├── Não → exibe próxima pergunta ao usuário
   └── Sim ↓
        │
        ▼
4. App.jsx → queueSiteBuild(notepad) → POST /api/v2/build
   (builder/client/siteBuilderClient.js)
        │
        ▼
5. api/server.py recebe request
   → instancia BuilderAgent(notepad)
   → dispara thread de geração
   → retorna { job_id }
        │
        ▼
6. BuilderAgent (builder/agent/builder_agent.py)
   → recebe briefing consolidado + design_plan
   → processa e materializa os assets visuais da V1
   → só depois monta o HTML final já apontando para os assets prontos
   → salva em api/sites/{job_id}/
        │
        ▼
7. App.jsx polling → GET /api/v2/status/{job_id}
   → quando status = "done", exibe preview do site
```

---

## Configuração de LLM

O backend suporta múltiplos providers via variável `AGENT_LLM_PROVIDER`:

| `AGENT_LLM_PROVIDER` | SDK usado | Variáveis necessárias |
|----------------------|-----------|-----------------------|
| `anthropic` | `anthropic` | `ANTHROPIC_API_KEY` |
| `openai-compatible` | `openai` | `OPENAI_API_KEY`, `OPENAI_BASE_URL` |
| `nvidia` | `openai` | `NVIDIA_API_KEY` |
| `zai` | `openai` | `ZAI_API_KEY`, `ZAI_BASE_URL` |
| `openrouter` | `openai` | `OPENROUTER_API_KEY` |

---

## Contrato Operacional da V1

O fluxo oficial entre os agentes é este:

1. O Agente 01 coleta contexto, atualiza o notepad e decide sozinho quando `ready_to_build = true`.
2. Nesse momento, ele envia para o Agente 02 apenas o briefing consolidado da primeira V1 de website.
3. O Agente 02 não deve publicar o site antes de resolver a camada de assets dessa V1.
4. A ordem interna do builder deve ser:
   - decidir layout/estilo/slots visuais
   - gerar ou materializar os assets necessários
   - montar o `index.html` final com esses assets já embutidos
5. Se algum asset secundário falhar ou ultrapassar o orçamento de tempo, o builder pode degradar esse slot individualmente, sem quebrar a V1 toda.

Esse contrato existe para evitar duas classes de erro:

- HTML final apontando para assets que ainda não existem
- experiência de preview inconsistente entre a geração visual e a página publicada

---

## Proxy Vite (Dev)

Em desenvolvimento, o Vite redireciona chamadas de API:

```js
// vite.config.js
proxy: {
  "/api": {
    target: "http://localhost:8000",
    changeOrigin: true,
  }
}
```

O frontend nunca faz chamadas diretas para `localhost:8000` — sempre usa `/api`.

---

## sys.path e Importações Python

`api/server.py` adiciona o diretório raiz ao `sys.path` antes de qualquer import:

```python
_API_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT_DIR = os.path.dirname(_API_DIR)
if _ROOT_DIR not in sys.path:
    sys.path.insert(0, _ROOT_DIR)
```

Isso permite:
- `from builder.agent.builder_agent import BuilderAgent`
- `from agents.oci_agent import Agente03`

Os `__init__.py` nos pacotes Python garantem que os imports funcionem corretamente:
- `builder/__init__.py`
- `builder/agent/__init__.py`
- `builder/prompts/__init__.py`
- `api/agents/__init__.py`

---

## O Que NÃO Existe

Para evitar confusão com features planejadas mas não implementadas:

| Feature | Status |
|---------|--------|
| Voz / STT / TTS | ❌ Removido — previsto para Fase 2 (roadmap) |
| Banco de dados | ❌ Não existe — sites são arquivos estáticos |
| Autenticação / Login | ❌ Não existe |
| CI/CD | ❌ Não configurado |
| Agora SDK | ❌ Removido completamente |
| Deepgram / MiniMax | ❌ Removido completamente |
| WebSockets | ❌ Não existe — polling simples |
| Admin panel | ❌ Não existe |

---

## Relação com as Specs

| Spec | Implementação |
|------|--------------|
| `docs/spec/agent-flow.md` | `intake/engine/planner.js` |
| `docs/spec/first-interaction.md` | `intake/engine/planner.js` |
| `docs/spec/flow-order.md` | `intake/engine/planner.js` |
| `docs/spec/NOTEPAD-SCHEMA.md` | `intake/engine/planner.js` |
| Stack Decision Matrix | `api/server.py` + `builder/agent/builder_agent.py` |
| Module Selection | `builder/agent/builder_agent.py` (via prompt) |
