# Simple.AI — Brainstorm da Plataforma de Agentes (Fundação)

**Data:** 2026-04-28
**Status:** Brainstorm em andamento (pré-spec)
**Escopo desta sessão:** definir as primitivas da fundação. Marketplace, tier Enterprise e integrações ficam como sub-projetos pra rodadas posteriores.

---

## 1. Virada estratégica

Simple.AI deixa de ser "construtor de sites com IA" e passa a ser **orquestrador de agentes operacionais pra não-técnicos**. O construtor de sites vira **um dos agentes** dentro da plataforma — não o produto inteiro.

**Modelo de negócio:** B2C com tier Enterprise futuro (padrão Notion/Figma/Linear — checkout individual, mas com camada corporativa quando demanda crescer).

**Feature diferenciadora levantada:** geração paralela de N variantes (ex.: 10 sites/agentes simultâneos) com seleção contextual pelo usuário.

---

## 2. Por que uma empresa contrataria Simple.AI? (Foco: Oracle)

### Briefing Oracle (síntese da pesquisa de 2026-04-28)

**O que a Oracle é hoje:** virou empresa de infraestrutura de IA. Deal-âncora com OpenAI/Stargate ~US$300B em 5 anos para 4,5 GW adicionais. Contratos com Meta (treino Llama), xAI (Grok 3/4 no OCI), Cohere. OCI cresceu 66% YoY no Q2 FY26 — mas ainda só ~3% de market share global (vs AWS 29 / Azure 20 / GCP 13).

**Outubro 2025 (Oracle AI World):** lançaram **AI Agent Studio for Fusion + AI Agent Marketplace** com agentes pra Finance/HR/SCM e suporte multi-LLM (OpenAI, Anthropic, Cohere, Google, Meta, xAI).

**Fraquezas identificadas (que viram oportunidade pra Simple.AI):**

1. **Prompt-to-app não existe no portfólio.** APEX e Visual Builder são "low-code técnico" (PL/SQL, modelagem de DB). Microsoft Power Platform domina narrativa de citizen-developer; Oracle não tem resposta conversacional.
2. **Onboarding de OCI é a dor #1 pra dev individual.** Trustpilot 1,4/5, sign-up de free trial quebrado, suporte lento. Bottom-up adoption (dev tenta sozinho) é zero.
3. **AI Agent Marketplace acabou de nascer.** Vazio, procurando parceiros.

**Via realista de entrada:** Oracle for Startups (sem equity, 70% off OCI por 2 anos) → publicar agente no Fusion AI Agent Marketplace → parceria comercial. M&A direta improvável (Oracle compra grande e maduro: NetSuite US$9,3B, Cerner US$28B).

### Os três ângulos da história Enterprise

a) **"Power Platform da Oracle em pt-BR"** — camada conversacional de geração de apps. Tier Enterprise = SSO, deploy em VCN privada, integração Fusion. Cliente-âncora: empresa com Oracle DB que quer democratizar mini-apps internos.

b) **"Front-end humano da OCI"** — jeito leigo de subir stack na Oracle Cloud. Tier Enterprise = governance, cost guardrails, templates corporativos. Cliente-âncora: empresa migrando pra OCI que precisa onboardar times não-técnicos.

c) **"Marketplace de agentes operacionais"** ⭐ — orquestrador onde leigos montam workflows de agentes (incluindo QA de material visual). Tier Enterprise = catálogo corporativo, audit trail, integração Fusion data. Cliente-âncora: time de marketing/ops que quer automatizar QA/conteúdo sem TI.

**Decisão:** (c) é a história #1. (a) e (b) ficam como histórias aliadas / fase 2 — a fundação deve ser desenhada de forma que ambas encaixem depois sem retrabalho.

### Onde a ideia de "10 em paralelo" encaixa

Surpreendentemente forte no ângulo (b): pessoa descreve o que quer → Simple.AI gera N variantes de stack OCI (Autonomous DB + APEX, ou Container + Postgres, ou Functions + Object Storage) → ela escolhe a que servir. Ataca exatamente o "não consigo subir nada sozinho na Oracle" — coisa que Power Platform não faz porque não roda em OCI.

Mesma mecânica vale pra (c): gerar N variantes de **agente** pra um problema, deixar usuário escolher.

---

## 3. Arquétipos de agente em discussão

A pergunta aberta agora é quais formas de agente entram na **v1 da fundação**. Cinco identificados:

| Arquétipo | O que faz | Exemplo |
|-----------|-----------|---------|
| **Geradores** | Recebem pedido, produzem entregável estático. Rodam uma vez. | Construtor de site atual; slides; docs; vídeo |
| **Revisores/QA** | Recebem material, devolvem veredito + feedback | QA visual de materiais; QA de copy; QA de marca |
| **Vigias/automatizadores** | Escutam gatilho, agem sozinhos | Email novo → resume; arquivo no Drive → rotula |
| **Pesquisadores** | Recebem pergunta, buscam e sintetizam | Web research; lookup em planilha; consulta a dados internos |
| **Orquestradores** | Combinam vários acima em workflow | "Toda segunda: busca leads (pesquisador) → gera proposta (gerador) → revisa marca (revisor) → envia (vigia)" |

**Decisão (2026-04-28):** v1 da fundação suporta **(a) Geradores + (b) Revisores + (e) Orquestradores**.

- (c) Vigias e (d) Pesquisadores ficam pra fase 2
- Sem listeners externos, sem RAG/busca persistente na v1
- Triggers de Orquestradores ficam restritos a **manual + agendado** (sem webhook/listener)
- Variantes paralelas funcionam tanto pra agente singular quanto pra cada step de workflow

**Razão:** a+b são unidades atômicas (um shot, input → output); e compõe ambos em workflow. Cobre a tese central (gera N → revisa → escolhe → encadeia) sem carregar infra pesada de listeners e RAG. Risco principal: (e) é o maior salto de complexidade — exige formato de workflow, engine de execução, passagem de estado, retry/resume, observabilidade por step.

---

## 4. Decisões pendentes (próximas perguntas do brainstorm)

1. ✅ B2C ou B2B? → **B2C com Enterprise futuro**
2. ✅ Qual ângulo é a história #1? → **(c) Marketplace de agentes operacionais**
3. ✅ Quais arquétipos entram na v1? → **(a) Geradores + (b) Revisores + (e) Orquestradores**
4. ✅ Como modelar "agente" como primitiva? → **Declarativo (spec estruturado)**. Leigo só vê chat pt-BR; internamente cada agente é dado estruturado.
5. ✅ Schema de agente — ver seção 5.1 abaixo. Tipagem forte de I/O, versionamento imutável, sem tools na v1 (slot reservado).
6. ✅ Schema de workflow (Orquestradores) — ver seção 5.2 abaixo. Trigger manual + agendado, steps com input_mapping referenciando outputs anteriores.
7. ✅ Runtime de execução → **arquitetura de jobs desde dia 1, com modo "esperar síncrono" como variante**. Ver seção 6.
8. ✅ Storage → **Postgres pra spec/metadata, Object Storage pra arquivos, sem vector DB na v1**. Ver seção 7.
9. ✅ Tenancy → **single-user workspaces (workspace_id = user_id), schema namespaceado pra multi-tenant futuro**. Ver seção 8.
10. ✅ UX do prompt-pra-agente → **conversa pt-BR + extração progressiva de spec**. Ver seção 9.
11. ✅ Verificação antes do deploy → **playground integrado obrigatório com test run**. Ver seção 10.
12. ✅ Billing → **Híbrido (c)**: assinatura mensal com cota generosa de créditos + top-up avulso quando estoura. Plano grátis pequeno pra teste. Modelo Lovable/Replit/Bolt validado.
13. ✅ Marketplace primitive → fork & customize tipo HuggingFace Spaces. Visibilidade `private | unlisted | public`. v1 = registro interno, sem UI pública. Spec pronto pra UI vir na fase 2.
14. ✅ Conectores externos → **fora da v1**. Slot `tools: []` no schema reservado. Conectores entram como tools registrados quando Vigias/Pesquisadores chegarem na fase 2.
15. ✅ Stack técnica → Python 3.12 + FastAPI (backend), React 19 + Vite (frontend), Postgres 16, Redis (queue: RQ/Dramatiq), S3-compatible (object), abstração multi-LLM (OpenAI + Anthropic + OCI Generative AI). Deploy v1 neutro com módulo IaC OCI pronto.
16. ✅ Avaliação de variantes paralelas → **(a) na v1**: só humano escolhe. (d) híbrido aprendido fica como roadmap fase 2 — moat real pro Enterprise mas risco alto na v1.

---

## 4.1 Vertentes preservadas (saídas arquiteturais)

Princípio: cada decisão da v1 deve deixar **costura explícita** pra rota alternativa, caso capacidade de software/operação ou demanda de mercado obrigue pivô.

| Decisão v1 | Vertente preservada | Custo de pivotar depois |
|------------|---------------------|-------------------------|
| **B2C com Enterprise futuro** | Schema namespaceado por `workspace_id` desde dia 1 (em v1, `workspace_id = user_id`). Multi-tenant vira feature flag, não refactor. | Baixo |
| **Agent orchestration como história #1** | Builder de site continua sendo um agente do tipo Gerador. Se mercado puxar pra "Lovable de site pt-BR" puro, o vertical fica pronto pra ser destacado. | Baixo |
| **v1 = Geradores + Revisores + Orquestradores** | Runtime tem interface de "trigger source" pluggable (não assume sempre humano-iniciado). Adicionar Vigias (event listener) e Pesquisadores (RAG) é plug-in de novo trigger + novo provider de contexto. | Médio |
| **Spec declarativo** | Spec tem campo opcional `executor: "declarative" \| "code"` reservado mas só `declarative` aceito na v1. Adicionar code escape hatch (rota híbrida d) é plug de novo executor. | Baixo |
| **Tipagem forte de I/O** | Tipo `any` reservado mas discouraged via lint. Novos tipos (audio, video, pdf-parsed) entram aditivamente. | Baixo |
| **Versionamento imutável** | Conceito de "draft" reservado no schema (`status: draft \| published`). Adicionar workspace mutável de rascunho é UI + filtro de query. | Baixo |
| **Sem tools na v1** | Spec já tem `tools: []` como array vazio (não ausente). Adicionar tools = preencher array + executor passar a interpretar. Contrato do runtime já antecipa tool-call. | Baixo |
| **Trigger só manual + agendado** | Trigger é polimórfico desde dia 1 (`type: manual \| schedule \| webhook \| event`). v1 rejeita os dois últimos no validator, futuro só remove a rejeição. | Baixo |
| **Single-LLM por agente** | Camada de execução abstrai "LLM call" atrás de interface única. Trocar pra cascade multi-LLM, RAG-augmented, ou tool-using vira upgrade de runtime sem quebrar specs existentes. | Baixo |

**Regra de ouro:** se uma decisão da v1 tem custo "Alto" pra pivotar depois, ela é candidata a ser revisitada **agora**, não depois.

## 5. Schemas declarativos da v1

### 5.1 Schema do agente (Geradores e Revisores)

```yaml
agent:
  id: uuid
  workspace_id: uuid               # = user_id na v1, prep multi-tenant
  name: "Revisor de identidade visual"
  description: "Checa se materiais seguem brand book"
  archetype: generator | reviewer
  status: draft | published         # imutável após publish; novo edit gera nova version
  version: int                      # incrementa a cada published edit
  inputs:
    - name: material
      type: text | image | url | file | json | enum
      required: bool
      description: "O que mostrar pro leigo no runtime"
  outputs:
    - name: veredito
      type: text | image | url | file | structured | enum
      enum_values?: [aprovado, ajustes, reprovado]
  prompt: "..." | template com {{input.material}}
  model:
    provider: openai | anthropic | oracle_oci | ...
    id: claude-opus-4-7 | gpt-4.1 | ...
    params: { temperature, max_tokens, ... }
  tools: []                         # array vazio reservado pra fase 2
  executor: declarative             # único valor aceito na v1; reservado pra "code" futuro
  metadata:
    created_at, updated_at, owner_id
```

### 5.2 Schema do workflow (Orquestradores)

```yaml
workflow:
  id, workspace_id, name, description
  status: draft | published
  version: int
  trigger:
    type: manual | schedule | webhook | event   # v1 aceita só manual + schedule
    schedule?: "0 9 * * MON"
  inputs:
    - name: lead_data
      type: json
  steps:
    - id: gerar_proposta
      agent_ref:
        agent_id: <uuid>
        version: int                # pin de versão pra workflow não quebrar quando agente edita
      input_mapping:
        lead: $workflow.inputs.lead_data
    - id: revisar_marca
      agent_ref: { ... }
      input_mapping:
        material: $steps.gerar_proposta.outputs.documento
  outputs:
    proposta_final: $steps.gerar_proposta.outputs.documento
    veredito_marca: $steps.revisar_marca.outputs.veredito
```

---

## 6. Runtime de execução

**Decisão:** arquitetura de jobs desde dia 1.

- Toda execução = Job submetido a uma queue (Redis Streams ou equivalente)
- Worker process consome jobs, chama executor declarativo, registra resultado
- UX decide se "espera sync" ou "mostra progresso async"
  - Sync: agente rápido (<30s previsto), frontend abre conexão e bloqueia
  - Async: workflow longo, N variantes paralelas, geração pesada — frontend recebe progresso via SSE/WebSocket
- Variantes paralelas = N jobs disparados em fan-out, fan-in pra UI quando todos terminam (ou stream à medida que chegam)

**Por que:** primitiva única (Job+Worker+Queue) evita dois caminhos divergentes. Retry, throttling, prioridade, distributed workers depois são config.

**Vertente preservada:** se Redis virar gargalo de custo/latência pra agentes simples, executor in-process é destacável (frontend chama executor direto, pula queue) sem afetar workflows.

---

## 7. Storage

| O quê | Onde | Por quê |
|-------|------|---------|
| Agent specs (todas versões), workflow specs | Postgres | relacional, query por workspace |
| Run metadata (input/output refs, status, custo, duração) | Postgres | append-only, auditável |
| Identidade, workspace, billing | Postgres | óbvio |
| Arquivos de input (imagens, docs do usuário) | Object Storage (S3/OCI) | binário, fora do row |
| Outputs gerados (sites, PDFs, imagens) | Object Storage | idem |
| Artefatos intermediários de steps | Object Storage com TTL | tira do storage permanente |
| Embeddings / vetores | **Não existe na v1** | Pesquisadores são fase 2 |

**Vertente preservada:** schema `runs` tem campo opcional `extra_refs jsonb` — adicionar `embedding_ref` ou nova tabela `run_embeddings` é aditivo, sem migration destrutiva.

---

## 8. Tenancy + identidade (B2C v1)

- Single-user workspace. `workspace_id = user_id` sempre na v1.
- Auth: email/senha + Google OAuth (Apple na fase 2)
- Toda tabela com `workspace_id` desde nascimento
- Permissões = sempre full owner do próprio workspace na v1

**Vertente preservada:** multi-user team = feature flag. Adiciona tabela `workspace_members(workspace_id, user_id, role)`, query passa de `workspace_id = user.id` pra `workspace_id IN (user.workspaces)`. Zero migration de schema existente.

---

## 9. UX do prompt-pra-agente

**Fluxo:**
1. Usuário descreve em pt-BR o que quer ("quero um agente que olha as artes do meu Instagram e diz se estão na identidade da marca")
2. LLM "Extractor" interpreta e propõe spec preenchido (archetype: reviewer, input: image, outputs: enum + text)
3. Usuário vê **resumo legível em pt-BR** ("vai receber uma imagem, devolver veredito e feedback") — nunca vê YAML
4. Refina via chat ("também quero que aceite vídeo curto") → Extractor atualiza spec
5. Quando spec está completo, botão "Testar" libera (gate pra seção 10)

**Variantes paralelas no builder:** botão "gerar N versões diferentes" dispara Extractor N vezes com abordagens variadas (diferentes temperatures, diferentes prompts internos do Extractor, diferentes modelos). Usuário compara e escolhe.

**Vertente preservada:** se Extractor for errático na prática (specs ruins, inputs/outputs mal interpretados), cai-se pra **wizard de templates** — biblioteca de "agent presets" (specs prontos curados) que já fazem parte da fundação independente da UX. Usuário escolhe template, preenche 2 campos, pronto. Os presets são ativo defensável (curadoria pt-BR).

---

## 10. Verificação antes do deploy

**Playground integrado obrigatório.** Antes de publicar:

- Pelo menos um test run com input de exemplo
- UI mostra: input dado, output gerado, custo estimado em US$, tempo de execução, modelo usado
- Se variantes paralelas: todas lado-a-lado pra comparação
- Pra Orquestradores: dry-run do workflow inteiro com input de exemplo, expandindo output de cada step

**Por que:** leigo precisa ver com olhos próprios. Agente sem teste = bug em produção que ele não sabe debugar.

**Vertente preservada:** "obrigatório" é gate de UI (botão "Publicar" desabilitado até primeiro test run bem-sucedido), não de schema. Vira opt-in se desacelerar adoção.

---

## 11. Restrições firmes

- Pt-BR como público primário (mas arquitetura deve permitir i18n)
- Trabalho técnico do Simple.AI acontece em `/Users/luskoliveira/simple-ai-lsouza` (branch L-SOUZA) — nunca tocar `main`
- Escopo atual do V2 visual é restrito a `intake/ui/styles.css` + `index.html`. Esta plataforma de agentes é **expansão de produto**, não substituição da V2 visual em curso.
- Antes de qualquer integração (pagamentos, domínios, OCI), fundação tem que estar sólida — instrução explícita do usuário.

---

## 12. Paisagem competitiva (pesquisa 2026-04-28)

### 6.1 Quem é quem

**Conversational app builders (geração de site/app via chat):**
- **Lovable** — full-stack via chat. ~US$400M ARR (fev/2026), valuation US$6.6B (Série B dez/2025). B2C/prosumer, US-first.
- **v0 (Vercel)** — gera UI/app React. 4M+ usuários. Vercel a US$9.3B (Série F set/2025).
- **Bolt.new (StackBlitz)** — full-stack via chat. US$40M ARR em 5 meses.
- **Replit Agent** — IDE+agente. US$10M→US$100M ARR em 9 meses, US$9B valuation.
- **Bubble/Webflow AI** — incumbentes no-code adicionando IA; B2B SMB.

**Plataformas de agentes pra não-técnicos:**
- **Lindy** — "AI employees" via chat, US$29+/mês, B2B SMB.
- **Relevance AI** — "AI workforce", US$24+/mês, B2B mid-market.
- **Stack AI** — enterprise puro (governo, seguros, finanças).
- **Gumloop** — no-code workflows, US$37 solo / US$244 team.
- **Cassidy AI / Sema4.ai / Dust / CrewAI** — todos B2B, foco vertical/enterprise.
- **Glean Apps** — enterprise search + agents, valuation US$7.2B (jun/2025).
- **Bardeen** — automação browser-first, Enterprise US$1.5k+/mês.

**Workflow/automation com IA:** Zapier Agents (8000+ apps), Make (Maia AI), n8n 2.0 (jan/2026, AI Agent node nativo), Pipedream.

**Big Tech (todos B2B enterprise):** Microsoft Copilot Studio, Salesforce Agentforce (US$125-550/user/mês), ServiceNow Now Assist + Moveworks, Google Vertex AI Agent Builder, Oracle AI Agent Studio.

### 6.2 Consolidações e M&A (2024-2026)

- **ServiceNow → Moveworks**: US$2.85B (dez/2025), 5M usuários funcionários
- **OpenAI**: 6 aquisições só no Q1/2026 (Statsig US$1.1B, io US$6.5B), pré-IPO platform play
- **Take Blip → Stilingue** (BR, 2022) — único player pt-BR com NLP nativo absorvido por incumbente conversacional
- **Padrão:** SaaS incumbente compra agente vertical pra plugar no stack. Múltiplos applied-AI subiram 47% YoY (~10x revenue). 266 deals de AI no Q1/26, +90% YoY.

### 6.3 Funding 2025-2026

Lovable US$330M (US$6.6B), Replit US$400M (US$9B), Vercel US$300M (US$9.3B), Glean US$150M (US$7.2B), Bolt US$105.5M.

**Tese dos investidores:** apostam em (i) "vibe coding" prosumer com ARR vertical, (ii) enterprise search+agents com moat de dados, (iii) plataformas com distribution embutida.

### 6.4 Gaps reais identificados

| Gap | Evidência |
|-----|-----------|
| **Geração paralela de N variantes como UX** | Existe academicamente (best-of-N) e em coding agents (Blackbox "Chairman"), mas nenhum builder mainstream pra não-técnico expõe como mecânica de escolha contextual visível |
| **Pt-BR nativo de orquestração de agentes** | Stilingue/Blip dominam atendimento, mas não há player pt-BR de orquestração de agentes operacionais pra leigos. Lindy/Relevance/Gumloop atendem PT por LLM mas UX/docs/comunidade/pricing são US-first |
| **B2C de agentes operacionais** | Confirmado — todos os players sérios são B2B/SMB (US$24-1500/mês). B2C real hoje é só ChatGPT/Gemini/Claude apps. **Não há "Lovable de agentes" pro consumidor final.** |
| **Convergência app-builder + agent-orchestrator** | Lovable/v0/Bolt geram apps mas não orquestram agentes pós-deploy; Lindy/Relevance orquestram mas não geram a UI conversacional. Convergência ainda não aconteceu. [hipótese: provável próximo movimento de M&A] |

### 6.5 Tese mais defensável dada a paisagem

> **Simple.AI = "Lovable de agentes operacionais, em pt-BR, com escolha contextual via variantes paralelas".**

**Moat (não é o LLM, que é commodity):**
1. Cultura/UX/comunidade pt-BR — defensável vs US, custoso pra Lindy replicar
2. Biblioteca curada de arquétipos de agente (gerador/revisor/vigia/pesquisador/orquestrador) com guard-rails pra leigo
3. Variantes paralelas como mecanismo de qualidade percebida e lock-in de preferência

**Tier Enterprise** vira upsell natural quando squads internas brasileiras pedirem deploy privado.

**Risco principal:** janela curta — se Lovable lançar pt-BR + agentes antes da SS1, o gap fecha. [hipótese]

---

## 13. Próximos passos

1. Receber resposta da pergunta sobre arquétipos (item 3 da seção 4)
2. Anexar resultado da pesquisa de concorrentes
3. Continuar brainstorm pelas perguntas em aberto
4. Quando design estiver fechado, migrar pra spec formal em `docs/superpowers/specs/`
5. Depois do spec, escrever plano de implementação (skill `writing-plans`)
