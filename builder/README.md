# Módulo Builder

**Responsabilidade:** Receber o briefing técnico consolidado e gerar um site HTML funcional e publicável.

Este módulo é o Agente 02 do SIMPLE-AI. Ele recebe os dados estruturados do Intake, chama um LLM (ou usa fallback local) e produz um `index.html` completo e responsivo.

Ele também suporta perfis de agente em `.md` pela pasta `AgentesProfiles/`, permitindo estilos/estratégias diferentes de geração com o mesmo runtime.

Além disso, o runtime agora consegue anexar guidance curado da pasta `DesignTemplates/` ao system prompt do build, usando o `design_plan` vindo do Intake para reforçar layout, estilo visual, anti-padroes e referencias recomendadas.

---

## Estrutura Interna

```
builder/
├── agent/
│   └── builder_agent.py      Agente 02: BuilderAgent class
│                             Suporta: anthropic, openai-compatible,
│                             nvidia, zai, openrouter, fallback local
├── client/
│   ├── siteBuilderClient.js  Cliente JS: queueSiteBuild / getSiteBuildStatus
│   └── index.js              Barrel export
├── prompts/
│   └── builder.py            System prompt + build_messages() para o LLM
AgentesProfiles/
├── site-builder-core.md
├── landing-direta.md
├── catalogo-moderno.md
└── servico-local-confianca.md
DesignTemplates/
├── agent-ready/              Regras operacionais e indices de referencia
├── taxonomy/                 Taxonomia de estilos, layouts e anti-padroes
└── galleries/                Galerias curatoriais por familia de pagina
```

---

## O que recebe / O que entrega

**Recebe:** spec JSON com:
```json
{
  "business_name": "Padaria Aurora",
  "segment": "Padaria",
  "user_facing_actions": [...],
  "raw_quotes": [...],
  "summary": { "brand_name": "...", "primary_cta": "...", ... }
}
```

**Entrega:** `index.html` em disco em `api/sites/{job_id}/index.html`

O status é consultável via GET `/api/v2/build/{job_id}`.

---

## Configuração do LLM

O BuilderAgent resolve o provider via variáveis de ambiente (lidas de `api/.env.local`):

| Variável | Descrição |
|----------|-----------|
| `AGENT_LLM_PROVIDER` | `anthropic` \| `openai-compatible` \| `nvidia` \| `zai` \| `openrouter` |
| `AGENT_LLM_API_KEY` | Chave do provedor escolhido |
| `AGENT_LLM_BASE_URL` | (opcional) URL base para provedores custom |
| `AGENT_LLM_MODEL` | (opcional) modelo a usar — tem defaults por provedor |

Sem configuração: usa fallback determinístico local com temas por segmento.

### Perfil de agente (novo)

- Default global: `BUILDER_AGENT_PROFILE` em `api/.env.local`
- Override por build: `agent_profile` no payload de `/v2/build`

Exemplo:

```json
{
  "business_name": "Padaria Aurora",
  "segment": "Padaria",
  "summary": {},
  "agent_profile": "servico-local-confianca"
}
```

Se o perfil não existir em `AgentesProfiles/`, o build falha explicitamente.

### Biblioteca de design (novo)

Se o payload incluir `design_plan` com campos como `layout_family`, `visual_style` e `design_notes.reference_ids`, o `BuilderAgent` tenta enriquecer o system prompt com contexto de `DesignTemplates/`:

- `agent-ready/design-rules.md`
- `agent-ready/style-to-segment-map.md`
- `agent-ready/layout-selection-matrix.md`
- `taxonomy/anti-patterns.md`
- galeria relevante por familia de layout
- referencias filtradas por `reference_ids`

Se a pasta `DesignTemplates/` nao existir ou algum arquivo estiver ausente, o builder continua funcionando normalmente.

---

## Fallback Local

Quando nenhum LLM está configurado, o `BuilderAgent._build_local_html_v2()` gera um site limpo e responsivo baseado no briefing. O site usa:
- Temas de cores por segmento (bakery, mechanic, clinic, beauty, etc.)
- Imagens via Unsplash (ou geradas via API de imagem se `AGENT_IMAGE_API_KEY` configurado)
- Google Fonts por segmento

---

## Como testar isoladamente

```bash
cd api  # o server.py inicializa o BuilderAgent
python server.py

# POST /v2/build com payload de spec
curl -X POST http://localhost:8000/v2/build \
  -H "Content-Type: application/json" \
  -d '{"business_name":"Teste","segment":"loja","summary":{}}'
```

---

## Dependências e contratos

- **Depende de:** `builder/prompts/builder.py` (importado via `from builder.prompts.builder import ...`)
- **Depende de:** `DesignTemplates/` de forma opcional para enriquecer o prompt com guidance curado
- **Importado por:** `api/server.py` via `from builder.agent.builder_agent import BuilderAgent`
- **Requer PYTHONPATH incluindo a raiz do projeto** (configurado automaticamente por `api/server.py`)
