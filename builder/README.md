# Módulo Builder

**Responsabilidade:** Receber o briefing técnico consolidado, preparar os assets da V1 e só então gerar um site HTML funcional e publicável.

Este módulo é o Agente 02 do SIMPLE-AI. Ele recebe os dados estruturados do Intake, resolve a direção visual da V1, materializa os assets necessários e produz um `index.html` completo e responsivo já embutindo esses assets.

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

Quando houver assets visuais gerados, eles também são gravados em `api/sites/{job_id}/assets/` antes da montagem final do HTML.

O status é consultável via GET `/api/v2/build/{job_id}`.

---

## Configuração dos Modelos

O Builder usa dois modelos diferentes no fluxo principal. Ambos sao configurados em `api/.env.local`; `api/.env.example` e o contrato versionado para novos ambientes.

| Responsabilidade | Variavel principal | Runtime | Saida |
|------------------|--------------------|---------|-------|
| Gerar assets visuais | `AGENT_IMAGE_MODEL` | `builder/core/image_pipeline.py` | imagens em `api/sites/{job_id}/assets/` ou fallback por slot |
| Construir o HTML final | `AGENT_LLM_MODEL` | `builder/agent/builder_agent.py` | `api/sites/{job_id}/index.html` |

Fluxo simplificado:

```txt
AGENT_IMAGE_MODEL
→ materializa assets visuais
→ injeta assets em job.spec["_materialized_assets"]
→ AGENT_LLM_MODEL recebe esses assets no prompt
→ gera o index.html final
```

### Modelo textual do Builder

O `BuilderAgent` resolve o provider textual via variáveis de ambiente:

| Variável | Descrição |
|----------|-----------|
| `AGENT_LLM_PROVIDER` | `anthropic` \| `openai-compatible` \| `nvidia` \| `zai` \| `openrouter` |
| `AGENT_LLM_API_KEY` | Chave do provedor escolhido |
| `AGENT_LLM_BASE_URL` | (opcional) URL base para provedores custom |
| `AGENT_LLM_MODEL` | Modelo que escreve o HTML final |
| `BUILDER_LLM_MODEL` | Fallback legado se `AGENT_LLM_MODEL` estiver vazio |

Se `AGENT_LLM_PROVIDER` ou chave nao estiverem configurados, o builder usa fallback deterministico local com temas por segmento.

### Modelo de imagem do Builder

O `ImagePipeline` resolve a geracao de imagens via endpoint OpenAI-compatible de imagens:

| Variável | Descrição |
|----------|-----------|
| `AGENT_IMAGE_ENABLED` | Liga/desliga a tentativa de gerar imagens (`1` por default) |
| `AGENT_IMAGE_API_KEY` | Chave especifica de imagem; se vazia, tenta reutilizar outras chaves configuradas |
| `AGENT_IMAGE_BASE_URL` | Base URL do endpoint de imagens, default `http://localhost:20128/v1` |
| `AGENT_IMAGE_MODEL` | Modelo que processa os prompts visuais e gera imagens |
| `AGENT_IMAGE_SIZE` | Tamanho enviado ao endpoint, default `auto` |
| `AGENT_IMAGE_QUALITY` | Qualidade enviada ao endpoint, default `auto` |
| `AGENT_IMAGE_BACKGROUND` | Background enviado ao endpoint, default `auto` |
| `AGENT_IMAGE_DETAIL` | Detalhe enviado ao endpoint, default `high` |
| `AGENT_IMAGE_OUTPUT_FORMAT` | Formato salvo/esperado, default `png` |
| `AGENT_IMAGE_TIMEOUT_SECONDS` | Timeout geral de imagem |
| `AGENT_IMAGE_HERO_TIMEOUT_SECONDS` | Timeout do slot principal/hero |
| `AGENT_IMAGE_OPTIONAL_SLOT_TIMEOUT_SECONDS` | Timeout dos slots secundarios |
| `AGENT_IMAGE_PARALLEL_WORKERS` | Concorrencia dos slots secundarios |

Se imagem estiver desabilitada, sem chave, ou um slot falhar, o builder usa fallback para aquele slot sem impedir a geracao do site.

### Exemplo recomendado local

```env
# Texto: gera o HTML final.
AGENT_LLM_PROVIDER=openai-compatible
AGENT_LLM_BASE_URL=http://localhost:20128/v1
AGENT_LLM_API_KEY=
AGENT_LLM_MODEL=cx/gpt-5.5
BUILDER_AGENT_PROFILE=site-builder-hyperframes-inspired

# Imagem: gera os assets antes do HTML.
AGENT_IMAGE_ENABLED=1
AGENT_IMAGE_BASE_URL=http://localhost:20128/v1
AGENT_IMAGE_API_KEY=
AGENT_IMAGE_MODEL=cx/gpt-5.4-image
AGENT_IMAGE_SIZE=auto
AGENT_IMAGE_QUALITY=auto
AGENT_IMAGE_BACKGROUND=auto
AGENT_IMAGE_DETAIL=high
AGENT_IMAGE_OUTPUT_FORMAT=png
```

### Perfil de agente (novo)

- Default global: `BUILDER_AGENT_PROFILE` em `api/.env.local`
- Override por build: `agent_profile` no payload de `/v2/build`
- Perfil recomendado para mais acabamento visual: `site-builder-hyperframes-inspired`

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

### API local OpenAI-compatible

Para usar o endpoint local do 9router/copycat em `http://localhost:20128/v1`, configure:

```env
AGENT_LLM_PROVIDER=openai-compatible
AGENT_LLM_BASE_URL=http://localhost:20128/v1
AGENT_LLM_API_KEY=
AGENT_LLM_MODEL=cx/gpt-5.5
BUILDER_AGENT_PROFILE=site-builder-hyperframes-inspired
```

Esse perfil usa principios de composicao do HyperFrames para orientar a qualidade visual do HTML final sem adicionar o runtime do HyperFrames ao site publicado.

### Video promocional opcional com HyperFrames

Depois que um site existir em `api/sites/{job_id}/index.html`, gere um projeto HyperFrames promocional com:

```bash
npm run hyperframes:promo -- job_1777341425_4595
npx hyperframes lint tmp/hyperframes-promos/promo-job_1777341425_4595
npx hyperframes preview tmp/hyperframes-promos/promo-job_1777341425_4595
```

Renderize para MP4 apenas quando quiser material final:

```bash
npx hyperframes render tmp/hyperframes-promos/promo-job_1777341425_4595 -o tmp/hyperframes-promos/promo-job_1777341425_4595/promo.mp4
```

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

Quando nenhum LLM está configurado, ou quando o provider textual falha em runtime e o builder cai para o modo resiliente, o `BuilderAgent._build_local_html_v2()` gera uma V1 limpa e responsiva baseada no briefing.

Contrato operacional do fallback local:

1. Receber `summary` + `design_plan`
2. Resolver a estratégia visual da V1
3. Tentar materializar os assets de imagem necessários
4. Só depois montar o HTML final apontando para os assets gerados
5. Se um asset secundário falhar, aplicar fallback nesse slot sem bloquear a V1 inteira

O site usa:
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
