# Simple.AI — Plataforma de Agentes (Design da Fundação v1)

**Data:** 2026-04-29
**Status:** Spec aprovado pendente de revisão final do usuário
**Origem:** Brainstorm em `2026-04-28-simpleai-agent-platform-brainstorm.md`
**Sub-projetos derivados:** Marketplace público (UI), Tier Enterprise, Conectores externos, Vigias + Pesquisadores (fase 2)

---

## 1. Resumo executivo

Simple.AI vira **plataforma B2C pt-BR de orquestração de agentes operacionais pra usuários não-técnicos**, com tier Enterprise futuro. O construtor de sites existente passa a ser **um agente do tipo Gerador** dentro da plataforma, não o produto inteiro.

A v1 da fundação suporta três arquétipos de agente — **Geradores, Revisores e Orquestradores** — definidos como specs declarativos, executados via runtime de jobs com queue, com UX conversacional em pt-BR no builder e variantes paralelas como diferencial central.

A tese defensável dada a paisagem competitiva: *"Lovable de agentes operacionais, em pt-BR, com escolha contextual via variantes paralelas"*. Nenhum player combina B2C + pt-BR + agent orchestration + variantes paralelas hoje.

---

## 2. Contexto e tese

### 2.1 Por que existe

Três gaps de mercado confirmados em pesquisa (abr/2026):

1. **B2C de agentes operacionais é vazio.** Lindy, Relevance AI, Stack AI, Gumloop, Cassidy, Sema4 — todos B2B, US$24-1500/mês. O B2C de agentes hoje é só ChatGPT/Gemini/Claude apps de propósito geral.
2. **Pt-BR de orquestração de agentes não existe.** Stilingue/Blip cobrem atendimento, não orquestração operacional. Players US atendem PT por LLM mas UX, docs, comunidade e preço são US-first.
3. **Geração de N variantes como mecânica de UX é ineditismo real.** Existe em research (best-of-N) e em coding agents (padrão "Chairman" da Blackbox), mas nenhum builder pra leigo expõe como escolha contextual visível.

### 2.2 Sinais de timing

- ServiceNow comprou Moveworks por US$2.85B (dez/2025) pra exatamente "agentes pra funcionários não-técnicos dentro do stack corporativo"
- Oracle lançou AI Agent Studio + AI Agent Marketplace no AI World 2025 (out/2025), procurando parceiros
- Lovable a US$6.6B (Série B dez/2025) com US$400M ARR — categoria "AI builder pra leigo" provada
- Janela curta: se Lovable lançar pt-BR + agentes antes de Simple.AI consolidar, o gap fecha [hipótese]

### 2.3 História pra Enterprise (vendida em 3 ângulos)

- **#1 (lead):** Marketplace de agentes operacionais pra times sem TI (marketing, ops, RH)
- **#2 (aliado):** Power Platform da Oracle em pt-BR (citizen-developer)
- **#3 (aliado):** Front-end humano da OCI (onboarding pra leigos)

A fundação é desenhada pra que os três ângulos plugem sem reescrita.

---

## 3. Escopo da v1

### 3.1 Dentro

(Atualizado 2026-04-29 com showcase, modo demo sem cadastro e segurança baseline.)


- Arquétipos: **Geradores + Revisores + Orquestradores**
- Spec declarativo de agente e workflow (versionamento imutável)
- Runtime de jobs com queue (sync wrapper + async com progresso)
- Variantes paralelas (N specs/runs em paralelo, comparação lado-a-lado)
- UX conversacional pt-BR no builder (Extractor LLM → spec)
- Playground integrado obrigatório antes de publicar
- Auth B2C (email/senha + Google OAuth)
- Billing híbrido (assinatura + top-up de créditos)
- Marketplace **interno** (registro de specs com visibilidade `private | unlisted | public`); UI pública é fase 2
- Multi-LLM provider (OpenAI + Anthropic + OCI Generative AI)
- Single-user workspace (`workspace_id = user_id`)
- Triggers de workflow: **manual + agendado**
- **Biblioteca de 12 presets curados** (showcase + onboarding + demos pra conversão) — ver §9.3
- **Modo "experimentar sem cadastro"** (rate-limited, sem persistência) na home, com 1-2 presets pra reduzir fricção de demo
- **Pilares de segurança baseline** (auth, isolamento por workspace, sanitização, limites duros) — ver §18
- **Billing high-margin com 4 tiers** (Trial 7d → Starter R$ 29 → Pro R$ 79 → Studio R$ 249) + add-ons + roteamento inteligente de modelos pra margem ≥ 75% — ver §13

### 3.2 Fora (com vertentes preservadas — ver seção 14)

- Vigias (event listeners, webhook triggers)
- Pesquisadores (RAG, vector search, KB)
- Conectores externos (Drive, Gmail, Slack, planilha) — slot `tools: []` reservado
- Tier Enterprise (multi-tenant real, SSO, governance, audit avançado, deploy privado)
- UI pública de marketplace (discovery, busca, ratings)
- Avaliação automática de variantes (LLM judge, heurística, aprendizado de preferência)
- Apple OAuth, SSO corporativo
- i18n (pt-BR-only na v1, mas arquitetura preparada)
- Mobile nativo

---

## 4. Arquitetura

### 4.1 Visão de alto nível

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (React + Vite)                │
│  Builder conversacional · Playground · Lista de agentes     │
│       Visualizador de runs · Marketplace interno (lista)     │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP/WebSocket/SSE
┌────────────────────────────▼────────────────────────────────┐
│                  API Layer (FastAPI)                         │
│   Auth · Specs CRUD · Jobs API · Runs API · Billing API     │
└──────┬─────────────────┬──────────────────┬─────────────────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
│  Postgres   │  │ Redis (queue)│  │  Object Storage  │
│             │  │  + RQ/Dram.  │  │   (S3-compat)    │
└─────────────┘  └──────┬───────┘  └──────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Workers Pool    │
              │  ─────────────── │
              │  Executor        │
              │  (Declarative)   │
              │  ─────────────── │
              │  LLM Providers:  │
              │  OpenAI, Anthropic, OCI │
              └──────────────────┘
```

### 4.2 Componentes principais

| Componente | Responsabilidade | Linguagem/Tech |
|------------|------------------|----------------|
| **Frontend** | Builder conversacional, playground, listagem de agentes/workflows/runs, marketplace interno | React 19 + Vite + TypeScript |
| **API Layer** | REST/WebSocket pra CRUD de specs, submissão de jobs, stream de runs, auth, billing | Python 3.12 + FastAPI |
| **Spec Store** | Persistência de agent specs e workflow specs (com versões imutáveis) | Postgres 16 |
| **Job Queue** | Fila de execução, dispatcher pra workers | Redis Streams + RQ ou Dramatiq |
| **Workers Pool** | Consome jobs, executa specs declarativos, registra runs | Python (mesma codebase do API) |
| **Executor (Declarative)** | Interpreta agent spec, valida I/O, chama LLM provider, salva output | Módulo Python |
| **LLM Provider Abstraction** | Interface única pra OpenAI / Anthropic / OCI Generative AI | Módulo Python |
| **Object Storage** | Arquivos de input/output, artefatos intermediários | S3-compatible (R2, MinIO, OCI) |
| **Identity & Billing** | Auth (email + Google OAuth), assinatura + créditos | Postgres + integração Stripe |

### 4.3 Princípios arquiteturais

1. **Tudo é Job.** Mesmo execução "instantânea" passa pela queue (sync wrapper bloqueia até terminar). Único caminho.
2. **Spec é dado, nunca código.** Agentes são linhas de Postgres com JSON estruturado. Marketplace = export/import desse JSON.
3. **Workspace_id everywhere.** Toda query namespaceada desde dia 1, mesmo com `workspace_id = user_id` na v1.
4. **Versão pinada em referências.** Workflow referencia agente por `(agent_id, version)`. Editar agente nunca quebra workflow rodando.
5. **Polimorfismo reservado.** Trigger types, executor types, output types — todos têm campo discriminador desde o nascimento, com v1 aceitando subset.

---

## 5. Schemas declarativos

### 5.1 Agente

```yaml
agent:
  id: uuid
  workspace_id: uuid
  name: string                       # user-facing, em pt-BR
  description: string                # como o usuário descreveu
  archetype: generator | reviewer    # ext: orchestrator (mas usa schema 5.2)
  status: draft | published
  version: int                       # incrementa a cada publish
  parent_version_id: uuid?           # linhagem
  inputs:
    - name: string                   # snake_case interno
      label: string                  # pt-BR pro runtime
      type: text | image | url | file | json | enum | any
      required: bool
      enum_values?: [string]
      description: string            # tooltip pro leigo
  outputs:
    - name: string
      label: string
      type: text | image | url | file | structured | enum
      enum_values?: [string]
  prompt: string                     # template com {{inputs.name}}
  model:
    provider: openai | anthropic | oracle_oci
    id: string
    params: { temperature, max_tokens, ... }
  tools: []                          # array vazio reservado pra fase 2
  executor: declarative              # único valor v1
  visibility: private | unlisted | public
  metadata:
    created_at, updated_at
    owner_user_id
    fork_of_agent_id?: uuid          # se foi clone do marketplace
```

**Regras:**
- `published` é imutável. Editar = nova `version` em `draft`.
- `name` único por workspace dentro do mesmo `archetype`.
- `inputs[].name` precisa aparecer no `prompt` template (validador).
- `outputs[].type = enum` exige `enum_values`.

### 5.2 Workflow (Orquestrador)

```yaml
workflow:
  id: uuid
  workspace_id: uuid
  name: string
  description: string
  status: draft | published
  version: int
  trigger:
    type: manual | schedule | webhook | event   # v1 aceita só primeiros dois
    schedule?: cron string                       # ex: "0 9 * * MON"
  inputs:
    - name: string
      type: ...                                  # mesmo set de tipos
  steps:
    - id: string                                 # único no workflow
      agent_ref:
        agent_id: uuid
        version: int                             # pin
      input_mapping:
        <agent_input_name>: <expression>
      variants: int                              # opcional, default 1, max 5 v1
      on_error: fail | skip | retry              # v1 = só fail
  outputs:
    <workflow_output_name>: <expression>
  visibility: private | unlisted | public
  metadata: ...
```

**Linguagem de expressões (v1, intencionalmente limitada):**
- `$workflow.inputs.<name>` → input do workflow
- `$steps.<step_id>.outputs.<name>` → output de step anterior
- Literais: string, number, bool

DSL de expressões fica como módulo isolado pra evoluir sem mexer em executor.

### 5.3 Run (registro de execução)

```yaml
run:
  id: uuid
  workspace_id: uuid
  kind: agent | workflow
  spec_ref: { kind, id, version }
  status: queued | running | succeeded | failed | cancelled
  inputs: { ... }                    # valores dados
  outputs: { ... }                   # valores produzidos (refs pra object storage quando binário)
  variant_group_id?: uuid            # se faz parte de batch de N variantes
  variant_index?: int
  cost_usd: decimal
  duration_ms: int
  model_calls: [ { provider, id, tokens_in, tokens_out, cost } ]
  step_runs?: [ { step_id, status, started_at, ... } ]   # só pra workflow
  error?: { kind, message, step_id? }
  extra_refs: jsonb                  # vertente pra embeddings, traces, etc
  created_at, started_at, finished_at
```

**Imutável após `succeeded | failed | cancelled`.** Append-only.

---

## 6. Runtime de execução

### 6.1 Modelo

Toda execução é um **Job** submetido à queue. O Worker:
1. Pega o job da queue
2. Carrega o spec (agent ou workflow) pinado
3. Valida inputs contra schema
4. Chama executor declarativo
5. Persiste run com status final
6. Emite evento de progresso/conclusão (Redis pub/sub → SSE pro frontend)

### 6.2 Sync wrapper

Pra agentes rápidos, o frontend chama API `/runs` com `wait=true` e a request bloqueia até o job terminar (timeout 60s). Por baixo é o mesmo job na queue, só que o cliente fica esperando.

### 6.3 Async com progresso

Pra workflows e variantes paralelas, frontend chama `/runs` com `wait=false`, recebe `run_id`, e abre WebSocket/SSE em `/runs/{id}/stream` pra eventos de progresso (queued → running → step X done → succeeded).

### 6.4 Variantes paralelas

Endpoint `/runs/variants` aceita `n: int` (limite 10 na v1) e dispara N jobs com mesmo spec, mesmo input, agrupados por `variant_group_id`. Frontend faz fan-in via WebSocket, mostra à medida que chegam.

Pra agentes: variantes vêm de **diferenças no spec gerado pelo Extractor** (no builder) ou **diferenças de seed/temperature no run** (no playground).

### 6.5 Limites de execução (guardrails v1)

- Max 60s por LLM call sync
- Max 10min por job
- Max 10 variantes paralelas por batch
- Max 20 steps por workflow
- Max 5 jobs concorrentes por workspace na v1 (ajustável por billing tier)

---

## 7. Storage

| Dado | Local | Notas |
|------|-------|-------|
| Agent specs (todas versões) | Postgres | tabela `agents` com `(id, version)` único |
| Workflow specs (todas versões) | Postgres | tabela `workflows` |
| Runs (metadata + outputs estruturados) | Postgres | tabela `runs` |
| Step runs (workflow) | Postgres | tabela `step_runs` |
| Identidade, workspace | Postgres | `users`, `workspaces` |
| Billing (assinatura, créditos, transações) | Postgres + Stripe | sync via webhooks |
| Arquivos de input | Object Storage | TTL 30 dias |
| Outputs binários (imagens, PDFs, sites) | Object Storage | sem TTL |
| Artefatos intermediários de step | Object Storage | TTL 7 dias |
| Embeddings/vetores | **inexistente v1** | vertente: campo `extra_refs.embedding` |

### 7.1 Modelo Postgres essencial

```
users(id, email, password_hash, oauth_providers jsonb, created_at)
workspaces(id, owner_user_id, name, plan, credits_balance, created_at)
agents(id, workspace_id, name, archetype, version, parent_version_id, status,
       spec jsonb, visibility, fork_of_agent_id, created_at, updated_at)
  unique(workspace_id, name, version)
workflows(id, workspace_id, name, version, parent_version_id, status, spec jsonb,
          visibility, created_at, updated_at)
runs(id, workspace_id, kind, spec_kind, spec_id, spec_version, status,
     inputs jsonb, outputs jsonb, variant_group_id, variant_index,
     cost_usd, duration_ms, model_calls jsonb, error jsonb, extra_refs jsonb,
     created_at, started_at, finished_at)
step_runs(id, run_id, step_id, status, inputs jsonb, outputs jsonb,
          cost_usd, duration_ms, error jsonb, started_at, finished_at)
billing_transactions(id, workspace_id, kind, amount, stripe_ref, created_at)
```

Indexes essenciais: `runs(workspace_id, created_at desc)`, `agents(workspace_id, status, archetype)`, `runs(variant_group_id)` quando aplicável.

---

## 8. Identidade e tenancy

- **Auth:** email/senha + Google OAuth na v1. Senhas com argon2id. Sessions via JWT short-lived + refresh token rotativo.
- **Workspace:** todo usuário tem 1 workspace na v1, criado no signup. `workspace_id = user_id` por convenção (nunca acoplado em código — sempre passa por lookup).
- **Permissões:** owner full em tudo do próprio workspace. Não há sharing de agente entre workspaces na v1 exceto via marketplace público (que copia o spec).

**Vertente Enterprise (não implementada):** tabela `workspace_members(workspace_id, user_id, role)` aditiva, todas queries existentes continuam válidas.

---

## 9. UX do builder

### 9.1 Fluxo conversacional

1. Usuário entra no `/novo-agente`, vê chat vazio com prompt sugerido em pt-BR ("descreva o que você quer que esse agente faça")
2. Usuário descreve em texto livre
3. **Extractor LLM** (modelo dedicado, prompt template fixo) interpreta e produz `agent_spec` parcial
4. UI renderiza o spec como **resumo legível em pt-BR**:
   - "Vai receber: uma imagem"
   - "Vai devolver: um veredito (aprovado/ajustes/reprovado) e um comentário"
   - "Usa modelo: Claude Sonnet 4.6"
5. Usuário refina via chat ("também aceite vídeo curto")
6. Extractor atualiza spec, UI re-renderiza
7. Quando todos os campos `required` estão preenchidos, botão **Testar** habilita
8. Botão **Gerar 5 variantes** está sempre disponível pós-passo 4

### 9.2 Variantes paralelas no builder

Botão "gerar N versões diferentes" dispara o Extractor N vezes, com:
- Diferentes temperatures (0.2, 0.5, 0.8, 1.0, 1.2)
- Variações de meta-prompt do Extractor (foco em precisão / criatividade / brevidade)
- Cards lado-a-lado com diff visual entre specs

Usuário escolhe um e segue. Os não escolhidos podem virar "alternativas" salvas (opcional).

### 9.3 Showcase / agent presets (first-class na v1)

Biblioteca curada de **agent presets** (specs prontos em pt-BR), entregue como vitrine pública e atalho de uso. Promovido de "vertente" pra **deliverable de v1** porque:

- Cada preset funciona como **demo reproduzível** pras primeiras conversões (atende a meta de 5 meses até primeiros pagantes)
- Acelera onboarding de leigo total — usuário em 30 segundos vê valor
- Fallback obrigatório se Extractor for errático (degrada com graça)
- **Ativo defensável**: curadoria pt-BR é moat custoso de replicar

**Set inicial de v1 (alvo: 12 presets curados):**

| Preset | Arquétipo | Demo value |
|--------|-----------|------------|
| Revisor de identidade visual | Reviewer | Marca/agência |
| Gerador de site institucional simples | Generator | Pequeno negócio |
| Gerador de propostas comerciais | Generator | Freela/B2B SMB |
| Revisor de copy de anúncio | Reviewer | Marketing |
| Gerador de roteiros de vídeo curto | Generator | Criador de conteúdo |
| Revisor de email comercial | Reviewer | Vendas |
| Gerador de descrição de produto e-commerce | Generator | E-commerce |
| Revisor de imagem de produto | Reviewer | E-commerce |
| Gerador de post de LinkedIn | Generator | Profissional |
| Revisor de slide de apresentação | Reviewer | Corporativo |
| Workflow: lead → proposta → revisão de marca → email | Orquestrador | Demo composta (showcase) |
| Workflow: imagem de produto → revisar → gerar descrição | Orquestrador | Demo composta (showcase) |

**Diferença pra Marketplace (§12):** presets são **curados internamente** (qualidade garantida pelo time), aparecem em local privilegiado da UI. Marketplace é **user-generated** (qualquer usuário publica). Schemas separados (`agents.is_preset bool` ou tabela `presets` referenciando `agent_id`), origens diferentes, ranking diferente.

---

## 10. Verificação e playground

### 10.1 Test run obrigatório

Botão **Publicar** desabilitado até pelo menos um test run bem-sucedido.

UI do playground:
- Formulário com inputs do agente, montado a partir do schema
- Botão "Rodar"
- Card de resultado com:
  - Output renderizado por tipo (imagem inline, texto formatado, JSON expandido, link pra arquivo)
  - Custo em US$
  - Tempo de execução
  - Modelo usado
- Botão "Rodar mais 5 variantes" → 5 runs paralelos lado-a-lado

### 10.2 Dry-run de workflow

Mesmo padrão pra Orquestradores: usuário fornece input do workflow, sistema executa todos os steps, UI mostra cascata expandida (input do workflow → output do step 1 → input do step 2 → ...).

---

## 11. Variantes paralelas (consolidação)

Aparece em **três lugares** distintos da v1:

| Lugar | O que varia | Quem dispara |
|-------|-------------|--------------|
| **Builder de agente** | Spec gerado pelo Extractor (different temperature/abordagens) | "Gerar N versões" |
| **Playground de agente** | Output do mesmo spec (different temperature/seed) | "Rodar N variantes" |
| **Step de workflow** | Output de um step (mesma mecânica do playground) | Configuração no spec do workflow (campo `variants: int` por step, v1 = max 5) |

**Avaliação:** v1 = humano escolhe sempre (sem LLM judge, sem heurística). Cards lado-a-lado com botão "Usar essa". Histórico de escolhas salvo (vertente: aprender preferência depois).

---

## 12. Marketplace interno (estrutural)

v1 entrega **schema e API**, sem UI pública.

### 12.1 Modelo

- Cada agente publicado tem `visibility: private | unlisted | public`
- `private`: só dono do workspace vê
- `unlisted`: acessível por link direto, não aparece em listagem
- `public`: aparece no marketplace (sem UI de discovery na v1, mas API existe)
- Instalar agente público = **fork**: copia o spec pro workspace do usuário, salva `fork_of_agent_id` pra rastreabilidade

### 12.2 API v1

- `GET /marketplace/agents?archetype=&q=` — lista agentes públicos (paginada, sem ratings/social)
- `POST /agents/{id}/fork` — clona pro workspace do chamador
- `PATCH /agents/{id}` — dono pode mudar visibility

### 12.3 Vertente UI (fase 2)

UI pública de discovery, busca, ratings, comentários, autores destacados. Schema atual já suporta — adiciona apenas tabelas de interação social.

---

## 13. Billing

### 13.1 Filosofia

Modelo desenhado pra **margem bruta ≥ 70% mesmo em 100% de utilização** dos créditos do plano. Por quê tão alto: existe CAPEX significativo a amortizar (build, time, possível reserva OCI, brand) e o caminho de sustentabilidade é margem alta + crescimento controlado, não growth-at-all-costs subsidiado por queima de caixa.

Trade-off explícito assumido: pricing 30-50% acima do "Lovable médio" reduz conversão talvez em 10-20%, mas amortiza CAPEX **2× mais rápido** e elimina dependência de rodada externa pra sustentar a operação. Crescimento saudável > crescimento performático.

### 13.2 Estrutura de planos

| Plano | Mensal (R$) | Anual (R$) — equivalente mensal | Créditos/mês | Workspaces | Variantes max | Concorrência | Top-up |
|-------|-------------|--------------------------------|--------------|------------|---------------|--------------|--------|
| **Trial (7 dias)** | 0 | — | 50 únicos | 1 | 3 | 1 | não |
| **Starter** | 29 | 279 (≈ 23/mês, -20%) | 350 | 1 | 3 | 2 | sim |
| **Pro** | 79 | 759 (≈ 63/mês, -20%) | 1.000 | 3 | 5 | 3 | sim |
| **Studio** | 249 | 2.390 (≈ 199/mês, -20%) | 3.000 | 10 | 10 | 5 | sim |
| **Enterprise** | sob consulta | sob consulta | sob consulta | ilimitado | configurável | configurável | sob consulta |

**Margem por plano (custo real R$ 0,025/crédito, sem otimizações de roteamento):**

| Plano | Margem 100% utilização | Margem 30% utilização (típico SaaS) |
|-------|------------------------|--------------------------------------|
| Starter | **70%** | 91% |
| Pro | **68%** | 90% |
| Studio | **70%** | 91% |

Com otimizações de §13.4 (roteamento Haiku-default, prompt caching, batch API), margem real **sobe pra 80-85%** mesmo no pior caso de utilização.

### 13.3 Sistema de créditos

**1 crédito = R$ 0,025 de custo real de LLM** (calibração inicial; ajustável por instrumentação real).

Tabela de consumo (créditos por 1k tokens, calibrar pós-launch com dados reais):

| Modelo | Créditos por 1k input | Créditos por 1k output |
|--------|----------------------|------------------------|
| OCI Cohere Command R | 0.2 | 0.4 |
| Claude Haiku 4.5 | 0.2 | 0.6 |
| GPT-4.1 mini | 0.3 | 0.9 |
| Claude Sonnet 4.6 | 0.4 | 1.2 |
| GPT-4.1 | 0.5 | 1.5 |
| Claude Opus 4.7 | 2.0 | 6.0 |

Top-up (créditos avulsos, sem expiração, **markup máximo**):
- Pacote 500 créditos: **R$ 99** (R$ 0,198/crédito = 7,9× markup, **87% margin**)
- Pacote 2.000 créditos: **R$ 349** (R$ 0,175/crédito = 7× markup, **86% margin**)
- Pacote 10.000 créditos: **R$ 1.499** (R$ 0,150/crédito = 6× markup, **83% margin**)

Top-up nunca substitui assinatura (não há plano "só top-up") — força usuário regular pra plano mensal, que tem cota de uso e previsibilidade.

### 13.4 Roteamento inteligente de modelos (lever de margem)

Default por arquétipo + complexidade:

| Cenário | Modelo default | Por quê |
|---------|----------------|---------|
| Reviewer simples (sim/não, classificação curta) | Haiku 4.5 | Sobra capacidade, custo mínimo |
| Generator de texto curto (post, descrição, email) | Sonnet 4.6 | Equilíbrio padrão |
| Generator de texto longo (proposta, roteiro) | Sonnet 4.6 | Idem |
| Generator de site/app | Sonnet 4.6 | Estrutura + criatividade |
| Reviewer complexo de imagem (multi-critério) | Sonnet 4.6 com vision | |
| Step de orquestração com decisão crítica | Sonnet 4.6 | |
| Opus 4.7 | **Opt-in explícito** com badge "modelo premium consome 5× créditos" | Evita queima silenciosa |

Otimizações habilitadas por padrão (impacto em margem):
- **Prompt caching** (Anthropic SDK nativo): -30 a -50% em workflows com prompts repetitivos
- **Batch API** (50% off): para jobs agendados não-urgentes (Orquestradores com `trigger.type = schedule`)
- **OCI Generative AI prioritário em Trial e Starter**: custo menor, mantém ângulo Oracle vivo

### 13.5 Add-ons monetizáveis (margem ~100%, custo marginal zero)

| Add-on | Preço/mês | Aplicável a | Margem |
|--------|-----------|-------------|--------|
| Workspace adicional | R$ 19 | Pro+ (até 10 extras) | ~100% |
| Histórico estendido (>90 dias até 2 anos) | R$ 29 | Pro+ | ~100% |
| Remoção do "Powered by Simple.AI" (white-label leve) | R$ 49 | Pro+ | ~100% |
| Acesso programático (API REST + webhooks) | R$ 99 | Pro+ (Studio inclui) | ~95% |
| Prioridade na fila (jobs furam fila comum) | R$ 39 | Pro+ | ~95% |

Esses add-ons são alavancas chave de ARPU sem aumentar custo variável. Audiência de agências/freelancers é o early-adopter natural.

### 13.6 Caps anti-abuso (proteção de margem)

Hard limits aplicados pelo executor antes de chamar LLM:

- Max **50 LLM calls** por job (workflow + variantes inclusas)
- Max **10 min** de duração por job
- Max **R$ 5** de custo estimado por job (preview obrigatório acima de **R$ 2**)
- Limite mensal de top-up sem confirmação adicional: **3× os créditos do plano**
  - Estourar pede confirmação 2FA + valida método de pagamento
- Trial: hard limit por **IP + fingerprint do dispositivo** pra evitar abuso de múltiplas contas
- Modo "experimentar sem cadastro" da home: **5 runs por IP por 24h** com modelo Haiku obrigatório

### 13.7 Política de plano grátis (intencionalmente apertada)

**Não há plano grátis perpétuo.** Existe **Trial de 7 dias** com 50 créditos one-shot, sem cartão. Após expiração, conta vira **read-only** (vê agentes que criou, mas não pode rodar) até assinar.

Razão: plano grátis perpétuo em produto AI = subsídio infinito pra usuário que nunca converte, queima caixa proporcional a adoção. Trial gera senso de urgência + qualifica intenção. Conversão alvo Trial → Starter: **15-20%** (típico SaaS B2C com trial pago).

Vertente preservada: se métrica de aquisição cair muito, transformar Trial num "Free com 30 créditos/mês forever + Haiku-only" é decisão reversível em UI/billing.

### 13.8 Pagamento

- **Stripe** (checkout, recurring, top-up, Pix Brasil)
- Anual cobrado upfront com 20% off (ajuda fluxo de caixa, reduz churn)
- Webhook Stripe atualiza `workspaces.credits_balance` e `plan`
- Inadimplência: 3 dias de grace + downgrade automático pra read-only

### 13.9 Implementação técnica

- `workspaces.credits_balance` decrementado por worker no fim de cada job (transação atômica)
- Pre-check: worker rejeita job se `estimativa_mínima > balance`
- Estimativa = (tokens_in_estimados + tokens_out_estimados) × tabela_conversão
- Métricas de uso expostas em `/billing/usage`: créditos consumidos, breakdown por modelo, projeção mensal vs cota
- Alert in-app quando usuário atinge **70% da cota mensal** (warning) e **90%** (urgência)

### 13.10 Métricas de saúde da operação (monitoramento contínuo)

| Métrica | Alvo | Frequência |
|---------|------|------------|
| Margem bruta mensal | ≥ 75% | semanal |
| Custo LLM / receita líquida | ≤ 25% | semanal |
| Utilização média de créditos (Pro) | 25-40% | mensal |
| ARPU (receita média por usuário pagante) | ≥ R$ 95 | mensal |
| LTV / CAC ratio | ≥ 3 | trimestral |
| Payback period (CAC pago em meses de margem) | ≤ 12 meses | trimestral |
| Net Revenue Retention (Pro→Studio + add-ons + top-up) | ≥ 110% | trimestral |
| Churn mensal (Pro+) | ≤ 5% | mensal |

Se margem bruta mensal cair abaixo de 70%, **gatilho automático de revisão** dos defaults de roteamento de modelos antes de subir preço.

---

## 14. Stack técnica e deploy

### 14.1 Stack

| Camada | Escolha | Razão |
|--------|---------|-------|
| Backend | Python 3.12 + FastAPI | Reaproveita `builder/` e `api/server.py` existentes |
| Worker | RQ (sobre Redis) | Simples, pythônico, suficiente pra v1 |
| Frontend | React 19 + Vite + TS | Já é o stack da V2 visual |
| Estilização | CSS hand-authored (continuação V2) | Consistente com convenção atual do repo |
| DB | Postgres 16 | Padrão. Managed: Neon na v1 inicial; OCI Autonomous Postgres como vertente |
| Cache/Queue | Redis 7 | Padrão |
| Object Storage | S3-compatible (Cloudflare R2 inicial) | Barato, dev-friendly |
| LLM Providers | OpenAI + Anthropic + OCI Generative AI | OCI desde dia 1 mantém ângulo Oracle vivo |
| Auth | Email/senha (argon2id) + Google OAuth | Mínimo viável B2C |
| Pagamento | Stripe (suporte a Pix Brasil ativo) | Padrão |
| IaC | Terraform com módulos Fly.io + módulo OCI pronto | Permite deploy alvo trocar sem refactor |

### 14.2 Deploy v1

- **Inicial:** Fly.io (ou Railway) — agilidade pra iterar e MVP rápido
- **Vertente OCI ativa:** terraform já modelou OCI Compute + Autonomous Postgres + Object Storage. Quando virar parceiro Oracle for Startups, switch é variável de ambiente + `terraform apply`.

### 14.3 Observabilidade mínima

- Logs estruturados (JSON) → stdout → coletor (Better Stack ou Logtail na v1)
- Métricas: latência por endpoint, jobs em fila, jobs failed/sec, custo de LLM agregado por workspace
- Sentry pra erros de aplicação

---

## 15. Vertentes preservadas (resumo)

Ver brainstorm seção 4.1 pra justificativa detalhada. Resumo:

| Decisão v1 | Vertente | Custo de pivotar |
|------------|----------|------------------|
| B2C single-user | Multi-user team via tabela `workspace_members` aditiva | Baixo |
| Agent orchestration como story #1 | Builder de site continua sendo um agente Gerador | Baixo |
| 3 arquétipos | Trigger pluggable + tools array reservado pra Vigias/Pesquisadores | Médio |
| Spec declarativo | Campo `executor` aceita futuramente `code` | Baixo |
| Tipagem forte de I/O | Tipo `any` reservado mas discouraged | Baixo |
| Versionamento imutável | Conceito `draft` reservado | Baixo |
| Sem tools v1 | Slot `tools: []` antecipa contrato de tool-call | Baixo |
| Triggers manual + schedule | Polimórfico desde dia 1 (`webhook | event` rejeitados no validator) | Baixo |
| Sync+async via mesma queue | Executor in-process destacável se Redis virar gargalo | Baixo |
| Sem vector DB | Campo `extra_refs jsonb` em runs antecipa | Baixo |
| Avaliação humana de variantes | Histórico de escolhas salvo pra alimentar judge/learning futuro | Baixo |
| Marketplace sem UI pública | Schema + API completos; UI é módulo separado | Baixo |
| Stack Python+React | LLM providers atrás de abstração; trocar provider é config | Baixo |
| Deploy neutro | Terraform com módulo OCI pronto pra ativar | Baixo |

---

## 16. Riscos e mitigações

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| Lovable lança pt-BR + agentes antes da SS1 | Alta | Priorizar story #1 + 1 arquétipo bem feito sobre "tudo de uma vez". Comunicar pt-BR+variantes paralelas como wedge desde dia 1. |
| Extractor erra muito ao gerar specs | Média | Templates pré-prontos como fallback obrigatório. Métricas de "spec gerado vs spec salvo após edits humanas". |
| Custo de LLM sobe acima da margem do plano Pro | Alta | Calibração de créditos antes do lançamento. Monitor de custo agregado por workspace. Modo "barato" com modelos menores. |
| Workflow falha no meio sem rollback | Média | Step runs imutáveis e auditáveis. Resume manual a partir do step que falhou (fase 2). |
| Variantes paralelas explodem custo | Média | Cap de 10 variantes por batch + 5 jobs concorrentes por workspace. Estimativa de custo mostrada antes do dispatch. |
| Marketplace público gera conteúdo abusivo (fase 2) | Baixa (ainda) | Schema já suporta `visibility: unlisted` como degraus. Moderação entra junto com UI. |
| OCI Generative AI muda API e quebra integração | Baixa | Provider abstrato. Outros providers cobrem o caso enquanto adapta. |

---

## 17. Métricas de sucesso e timeline

### 17.1 North Star

**Primeiros pagantes em ≤ 5 meses a partir do start de implementação.** Diretriz do usuário (2026-04-29). Implica MVP fechado em ~3 meses + ~1,5-2 meses de iteração com early users e warmup de demos.

### 17.2 Métricas (90 dias pós-launch público)

| Métrica | Alvo |
|---------|------|
| Trials iniciados | 1.500 |
| Conversão Trial → Starter ou Pro | ≥ 15% |
| Usuários pagantes ativos | 225+ |
| Distribuição de planos | 60% Starter / 30% Pro / 10% Studio |
| Agentes publicados (todos) | 600 |
| Workflows criados | 120 |
| % usuários que tocam pelo menos 1 preset showcase | 80% |
| % usuários que usam variantes paralelas pelo menos 1x | 40% |
| Tempo médio "signup → primeiro agente publicado" | < 10 min |
| **Margem bruta mensal** | **≥ 75%** |
| **ARPU (receita média/pagante)** | **≥ R$ 95** |
| **Custo LLM / receita líquida** | **≤ 25%** |
| Utilização média de créditos (Pro) | 25-40% |
| Net Revenue Retention | ≥ 110% |
| Churn mensal (pagantes) | ≤ 5% |
| LTV/CAC ratio | ≥ 3 |
| Payback period | ≤ 12 meses |
| NPS pt-BR | > 30 |

### 17.3 Marcos de implementação (alvo, ajustável após plano detalhado)

| Mês | Marco |
|-----|-------|
| 1 | Auth + workspace + spec store + executor declarativo (geradores) + 3 presets demo |
| 2 | Reviewers + playground + variantes paralelas + 6 presets totais |
| 3 | Orquestradores + workflows manuais/agendados + billing Stripe + MVP fechado |
| 4 | Beta fechada com 20-50 early users; iteração baseada em uso real; presets v2 |
| 5 | Lançamento público pt-BR + demos pra primeiras conversões + ajuste de pricing |

---

### 17.4 Sustentabilidade financeira e amortização de CAPEX

Modelo de billing (§13) desenhado pra **margem bruta ≥ 75%** após otimizações de roteamento. Em ARPU médio de R$ 95 e margem 75%, cada usuário pagante gera **~R$ 71 de margem livre/mês** após custos variáveis e antes de overhead operacional.

**Curva de amortização de CAPEX** (em usuários Pro-equivalentes pagantes ativos):

| CAPEX a amortizar | Pra recuperar em 12 meses | Em 24 meses |
|-------------------|---------------------------|-------------|
| R$ 200.000 | ~235 pagantes | ~120 pagantes |
| R$ 500.000 | ~590 pagantes | ~295 pagantes |
| R$ 1.000.000 | ~1.180 pagantes | ~590 pagantes |
| R$ 2.000.000 | ~2.350 pagantes | ~1.175 pagantes |

(Cálculo: CAPEX ÷ (margem_livre × meses). Não inclui burn operacional contínuo — apenas amortização do investimento inicial. Burn mensal contínuo precisa ser coberto adicionalmente pelo MRR líquido.)

**Estratégia de cash flow:**
- Anual upfront com 20% off — alvo **30% dos pagantes em anual no fim do ano 1**, gera reserva de caixa
- Top-up de alta margem como upsell natural pra power users
- Add-ons (white-label, API, prioridade) como expansion revenue sem custo variável

### 17.5 Estratégia de demonstração (first conversions)

Cada preset showcase de §9.3 é desenhado pra ser **demo gravável de 60s** que mostra:
1. Problema cotidiano do leigo (revisar arte, gerar proposta, validar copy)
2. Usuário descreve em pt-BR
3. Simple.AI gera N variantes em paralelo
4. Usuário escolhe uma e usa

**Canal de aquisição inicial planejado:**
- Vídeos curtos no Instagram/TikTok/YouTube Shorts mostrando preset rodando
- Webinar mensal "criando agentes em pt-BR sem código"
- Programa de embaixadores (10-20 criadores pt-BR rodando agentes ao vivo)

**Por que isso entra no spec:** porque a meta de 5 meses até primeiros pagantes só fecha se o produto for **demonstrável em 60s**. Isso retroage no design da home, do builder e dos presets — eles não podem ter fricção de auth/setup pra entrar na demo. Implica **modo "experimentar sem cadastro"** (rate-limited, sem persistência) na home — adicionar como item §3.1.

---

## 18. Segurança (pilares baseline)

Diretriz: produto pra leigo precisa ser seguro **por padrão**, não dependendo de configuração.

### 18.1 Aplicação

- Senhas argon2id (Argon2id, m=64MB, t=3, p=4)
- Sessions JWT short-lived (15min) + refresh token rotativo (30 dias) revogável
- Rate limiting por endpoint e por workspace
- CSRF protection no frontend
- CSP headers restritivos
- HTTPS-only, HSTS preload

### 18.2 Execução de agentes

- **Isolamento por workspace:** worker valida `workspace_id` em todo lookup; nunca cruzar dados
- **Sanitização de prompt:** inputs do usuário escapados no template (sem injection no prompt do sistema)
- **Defesa contra prompt injection em outputs:** outputs de agentes nunca são executados como código nem renderizados como HTML cru — sempre passam por sanitizer apropriado ao tipo
- **Limites duros:** max tokens, max duração, max custo por job (cap antes de chamar LLM)
- **Secrets nunca em spec:** se um agente um dia precisar de credenciais externas (fase 2 com tools), credenciais ficam em vault separado referenciadas por handle, nunca embedded no spec

### 18.3 Dados

- Encryption at rest no Postgres (managed)
- Encryption at rest no Object Storage (S3 SSE)
- Encryption in transit (TLS everywhere)
- Backup automático Postgres (PITR ≤ 24h)
- Logs sem PII (mascarar emails, sem prompt content em log de produção; opt-in pra debug)
- LGPD: consent registrado, direito a delete (cascading delete por workspace), export de dados via API

### 18.4 LLM providers

- API keys em secrets manager (não em código nem em env do app diretamente)
- Logs de chamadas LLM separados de logs de aplicação (auditável)
- Failover entre providers configurado (se OpenAI cair, Anthropic ou OCI assumem) — vertente, não obrigatório v1

### 18.5 Marketplace público (quando ativar)

- Conteúdo de agentes públicos passa por review automático antes de aparecer (LLM moderation pass)
- Flag de abuso 1-clique
- Rate limit em fork pra evitar scraping

---

## 19. Próximos passos

1. **Revisão deste spec pelo usuário** (gate antes de planejar implementação)
2. Após aprovação, escrever **plano de implementação** via skill `writing-plans` — decompor em sub-projetos sequenciados (provavelmente: Auth+Workspace → Spec store → Executor + Job queue → API → Frontend builder → Playground → Variantes → Billing → Marketplace interno)
3. Sub-projetos diferidos como specs separados quando chegar a hora: Marketplace público (UI), Tier Enterprise, Vigias+Pesquisadores, Conectores externos, Avaliação automática de variantes
