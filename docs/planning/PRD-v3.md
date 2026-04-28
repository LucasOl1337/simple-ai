# SIMPLE-AI — Planning PRD v3

> **Versao:** 3.0 (post-hackathon, multi-agent)
> **Data:** 2026-04-27
> **Status:** Em desenvolvimento ativo
> **Predecessor:** [prd.md v2.0](../../prd.md) (hackathon Cognition SP 2026)
> **Branch atual:** `feat/multi-agent-orchestration`

> Este e um documento de **planejamento**: define onde estamos, onde queremos ir, e que pesquisa precisa acontecer para chegar la. Nao substitui a v2 — a v2 e um snapshot do escopo do hackathon. A v3 amplia o produto.

---

## TL;DR

O SIMPLE-AI deixa de ser **um construtor de site conversacional** e vira uma **plataforma de assistencia conversacional para nao-tecnicos**, com multiplos agentes orquestrados silenciosamente sob a mesma interface (lousa vazia + dock de 2 botoes).

A regra inviolavel da v2 ("simplicidade extrema na UI") permanece. O que muda e o **escopo do que pode ser feito por essa interface unica**:

- v2: voce conversa → ganha um site.
- v3: voce conversa → ganha o que voce precisar (site, resposta a cliente, post de redes sociais, conselho de negocio, e mais no futuro).

A escolha do agente e silenciosa — feita por classificador de intent, sem menu visivel.

---

## 1. Visao do produto

### 1.1 Problema

Pessoas leigas em tecnologia tem **muitas necessidades digitais** que nao sabem como atender:
- Criar uma presenca online (sites, redes sociais)
- Responder mensagens de cliente sem soar mal
- Entender o proprio negocio (publico, preco, posicionamento)
- Gerar conteudo regular para divulgar

Cada uma dessas necessidades hoje exige uma ferramenta diferente, com sua propria curva de aprendizado, sua propria UI, seu proprio jargao. Para o publico do SIMPLE-AI (idoso, leigo, dono de pequeno negocio), isso e uma soma de barreiras intransponiveis.

### 1.2 Solucao

Uma unica interface conversacional — lousa vazia + dock de 2 botoes (enviar, microfone) — que **escolhe sozinha** qual agente vai atender cada necessidade. O usuario nao precisa saber que existem agentes diferentes. Ele so conversa.

### 1.3 Diferencial vs alternativas

| Produto | Cobertura | Barreira |
|---------|-----------|----------|
| Wix / Squarespace | so site | drag-and-drop, conceitos visuais |
| Canva | so design grafico | curva de aprendizado |
| ChatGPT / Claude direto | tudo | precisa saber escrever prompt, sem UX dirigida |
| Lovable / v0 | so site/app | precisa saber prompt tecnico |
| **SIMPLE-AI v3** | **tudo que cabe em conversa** | **zero — so falar em portugues** |

### 1.4 Hipotese de mercado

> Existe um publico brasileiro de **dezenas de milhoes** de pequenos negocios e profissionais autonomos que tem demandas digitais frequentes, paga por solucoes pontuais (de R$50 a R$500 por servico), e abandonaria todas elas por uma interface unica que **funciona por conversa**.

Esta hipotese precisa ser validada — ver [Pesquisa P-1](#p-1-tamanho-real-do-mercado).

---

## 2. Usuarios-alvo

### 2.1 Persona principal — A Empreendedora Sem Tempo
> **Juliana, 34**, dona de atelie de croche em Sao Bernardo. Quer aparecer online, responder cliente sem ofender, postar coisa interessante. Usa WhatsApp pra tudo. Nao tem agencia, nao tem tempo, nao tem paciencia pra app novo. Pagaria R$80/mes se uma coisa so resolvesse.

### 2.2 Persona secundaria — O Profissional Autonomo
> **Carlos, 41**, consultor de seguros. Sabe o que quer comunicar, nao sabe escrever post nem montar site. Odeia perder tempo. Pagaria mais caro se for mais rapido.

### 2.3 Persona de stress test — O Usuario Idoso
> **Dona Maria, 67**, dona de uma loja de costura. Nao tem celular bom, mal mexe em app. So usa WhatsApp porque o filho instalou. **Se a interface tiver mais de 2 botoes, ela desiste.**

### 2.4 Personas explicitamente fora do escopo
- Desenvolvedores tecnicos que querem controle granular.
- Designers que querem editar pixel a pixel.
- Empresas de medio/grande porte com equipe de marketing.
- Usuarios que precisam de sites complexos (e-commerce com 1000 SKUs, plataformas SaaS).

Quem cabe nestas linhas, **nao e cliente do SIMPLE-AI**. Recusar projeto bem feito.

---

## 3. Principios de produto (R1–R10)

Os 10 principios estao definidos formalmente em [.simpleai/core/conversation-rules.md](../../.simpleai/core/conversation-rules.md). Resumo:

| # | Principio | Ponto-chave |
|---|-----------|-------------|
| R1 | Linguagem leiga | Zero jargao tecnico ou de marketing |
| R2 | Uma pergunta por vez | Nunca empilhar perguntas |
| R3 | Decisoes silenciosas | Agente escolhe o que so ele precisa decidir |
| R4 | Notepad e fonte de verdade | Nao usar transcript bruto pra decisao |
| R5 | Lousa minima | So mostra o que ja foi descoberto + o que falta |
| R6 | Dock minima | 2 botoes (enviar + microfone) |
| R7 | Voz e texto com peso visual igual | Microfone nao e icone secundario |
| R8 | Nunca expor a orquestracao | Usuario nao ve "qual agente" esta atendendo |
| R9 | Erro humano | Mensagens de erro em portugues coloquial |
| R10 | Confirmar antes de agir grande | Nao entregar artefato sem "sim" do usuario |

**Estes principios sao gates de PR.** Codigo que viola e revertido.

---

## 4. Arquitetura

### 4.1 Visao geral

```
[usuario]
    |  (voz ou texto)
    v
[dock]                        [lousa]
    |                          ^
    v                          |
[App.jsx]                      |
    |                          |
    v                          |
[orchestration/router] -- 1ª mensagem ---+
    |                                    |
    v                                    |
[intent-classifier]                      |
    |                                    |
    v                                    |
[agente selecionado]----notepad atualizado
    |                                    |
    +-- ask next question -> [App.jsx] --+
    |
    +-- ready_to_X -> propor entrega -> [build/respond/create/advise]
```

### 4.2 Camadas

#### Frontend (`src/`)
- `app/App.jsx` — UI principal (lousa + dock + chat)
- `features/orchestration/` — registry, router, intent-classifier, session
- `features/agents/<vertical>/` — planner especifico por agente
- `features/discovery/` — planner legacy do website-builder (em transicao)
- `integrations/agora/` — voz em tempo real

#### Backend (`server-python/src/`)
- `server.py` — FastAPI, rotas /get_config, /v2/startAgent, /v2/stopAgent
- `agent.py` — agente Convo da Agora (segue spec do .simpleai/)
- `builder.py` — gerador de HTML para website-builder
- `agents/oci_agent.py` — agente especializado (Oracle Cloud Infrastructure)

#### Spec (`.simpleai/`)
- `core/` — regras, routing, notepad, thresholds (compartilhado)
- `agents/<vertical>/` — spec por agente

### 4.3 Agentes atuais

| Agente | Status | Threshold | Entrega |
|--------|--------|-----------|---------|
| `website-builder` | stable | `ready_to_build` | site HTML estatico ou React |
| `customer-support` | skeleton | `ready_to_respond` | rascunho de resposta a cliente |
| `content-creator` | skeleton | `ready_to_create` | post / legenda / anuncio |
| `business-consultant` | skeleton | `ready_to_advise` | clareza + plano de 3 passos |

### 4.4 Hand-off entre agentes

Em qualquer ponto, o classifier pode detectar que a conversa migrou. O agente atual passa o notepad compartilhado para o proximo, sem expor a transicao ao usuario. Detalhes em [.simpleai/core/routing.md](../../.simpleai/core/routing.md).

---

## 5. Estado atual (verdade)

### 5.1 O que funciona
- Frontend Vite em http://localhost:5173/ (UI completa, paleta warm-neutral amber)
- Backend FastAPI em http://127.0.0.1:8765/ (token Agora gerado, healthcheck OK)
- Planner do `website-builder` (heuristica client-side, sem dependencia de LLM para basico)
- Hot reload funcionando, build limpo (`npm run build` em ~500ms)
- Estrutura completa de orquestracao em codigo (registry, router, classifier)
- Specs em `.simpleai/` para todos os 4 agentes (1 stable + 3 skeleton)
- Benchmarks de landing pages curados em `templates/landing-benchmarks/`

### 5.2 O que ainda nao funciona
- **LLM nao conectado** — sem `ANTHROPIC_API_KEY` (ou outro), o agente conversacional cai em fallback deterministico.
- **Agora nao conectado** — sem `APP_ID` e `APP_CERTIFICATE` reais, voz em tempo real nao funciona.
- **Orchestration nao wired no App.jsx** — o codigo da orquestracao existe, mas o `App.jsx` ainda chama o planner legacy direto. Wire pendente.
- **3 agentes skeleton** — `customer-support`, `content-creator`, `business-consultant` tem README mas nao tem fluxo implementado.
- **Geracao do site** — o builder gera HTML, mas falta validar com usuario real que o resultado e bom o suficiente.
- **Mobile** — UI responsiva existe mas nao foi testada em devices de baixa potencia (publico-alvo).
- **Deploy** — nao ha Oracle Cloud rodando ainda. Tudo local.

### 5.3 Bloqueios criticos

1. **LLM key** — sem isso, nada de inteligencia conversacional real.
2. **Agora key** — sem isso, voz nao funciona.
3. **Decisoes de produto pendentes** — ver secao 8 (research backlog).

---

## 6. Roadmap

### Fase 0 — Fechar o loop basico (proximas 2 semanas)
**Objetivo:** website-builder funcional end-to-end, com voz.

- [ ] Adquirir `ANTHROPIC_API_KEY` ou alternativa (ver P-3 sobre escolha de provider)
- [ ] Adquirir `APP_ID` + `APP_CERTIFICATE` da Agora
- [ ] Validar conversa de voz funcionando (latencia < 2s)
- [ ] Validar geracao de HTML com 5 cenarios reais
- [ ] Wirar `orchestration/` no `App.jsx` (substituindo `discovery/planner.js` direto)
- [ ] Testar orchestration silencioso (a 1ª mensagem roteia certo)

### Fase 1 — Implementar 1 agente novo (semanas 3-5)
**Objetivo:** provar que o sistema multi-agente funciona com mais de um vertical.

Escolher 1 dos 3 skeletons. Recomendacao: **customer-support** (caso de uso mais frequente para o publico-alvo, mais simples de implementar que content-creator, mais concreto que business-consultant).

- [ ] Detalhar `.simpleai/agents/customer-support/agent-flow.md` + `first-interaction.md` + `flow-order.md`
- [ ] Implementar `src/features/agents/customer-support/planner.js` real
- [ ] Implementar fluxo de hand-off `website-builder ↔ customer-support`
- [ ] Testar com 5 cenarios reais

### Fase 2 — Validacao com usuario real (semanas 6-8)
**Objetivo:** confirmar que a hipotese do publico funciona.

- [ ] Recrutar 5 usuarios das personas principais (Juliana, Carlos)
- [ ] Recrutar 2 usuarios stress test (Dona Maria)
- [ ] Sessoes de teste moderadas — ver P-5 sobre metodologia
- [ ] Iterar com base nos achados

### Fase 3 — Implementar segundo + terceiro agentes (semanas 9-12)
**Objetivo:** plataforma com 4 verticais funcionando.

- [ ] `content-creator` completo
- [ ] `business-consultant` completo
- [ ] Hand-off entre todos os pares
- [ ] Painel de "ativacao" silencioso (estatistica interna de uso por agente, sem expor ao usuario)

### Fase 4 — Deploy + monetizacao (semanas 13-16)
**Objetivo:** produto cobravel rodando em producao.

- [ ] Deploy Oracle Cloud com SSL
- [ ] Sistema de cobranca (recorrente + por uso?)
- [ ] LGPD compliance — ver P-7
- [ ] Monitoramento (latencia, taxa de erro, abandono por fase)
- [ ] Onboarding sem fricao (entrar e usar; cobrar so depois de N sessoes)

### Fase 5+ — Crescer
- Novos agentes (sales-assistant, ops-helper, financial-advisor leve, etc).
- Memoria entre sessoes (notepad persistente, com consentimento).
- Integracao com WhatsApp (canal nativo do publico).
- Versao multilingue (espanhol primeiro?).

---

## 7. Sucesso — como medimos

### 7.1 Metricas de produto
- **Time-to-first-value (TTFV)** — minutos entre primeira mensagem e primeiro entregavel util.
  - Meta v3: ≤ 4 min para website-builder, ≤ 2 min para customer-support.
- **Taxa de conclusao por agente** — % de sessoes que chegam ao `ready_to_X` e entregam.
  - Meta v3: ≥ 70% para qualquer agente.
- **Abandono por fase** — onde o usuario desiste no fluxo.
  - Meta v3: nenhuma fase com abandono > 20%.
- **Taxa de hand-off** — quantas sessoes acabam mudando de agente. (Sinal de boa cobertura.)
  - Meta v3: 10-25% (extremos pra cima ou pra baixo sao ruins).

### 7.2 Metricas de UX
- **Tempo em cada pergunta** — > 30s e sinal de que a pergunta confunde.
- **Taxa de resposta tipo "nao entendi"** — < 5%.
- **NPS** — meta inicial: ≥ 30 (cresce ao longo das fases).

### 7.3 Metricas de negocio
- **Conversao para pagante** — % de usuarios free → pago.
- **Churn mensal** — < 8% para um produto SaaS desse perfil seria bom.
- **CAC vs LTV** — definir quando houver dados.

### 7.4 Metricas inviolaveis (hard limits)
- **Numero de botoes na dock = 2.** Sempre. Sem excecao.
- **Tempo de resposta do agente < 3s** (apos finalizar fala).
- **Latencia de voz < 2s** (apos detectar fim de turno).

---

## 8. Research backlog

Aqui vivem as **perguntas em aberto** que precisam de pesquisa para destravar decisoes. Cada item tem hipotese, metodo sugerido, e qual decisao a resposta destrava.

### P-1 — Tamanho real do mercado
**Pergunta:** quantos brasileiros encaixam nas personas (pequeno negocio + leigo digital + disposto a pagar)?
**Hipotese:** 10-30 milhoes de pessoas no recorte combinado.
**Metodo:** triangular dados do IBGE (MEI, microempreendedores), Sebrae, Conta Azul, dados de uso do WhatsApp Business.
**Destrava:** dimensionamento de funding, pricing, escolha de canais de aquisicao.
**Prioridade:** alta (antes de fundraising).

### P-2 — Validacao de "voz primeiro" para esse publico
**Pergunta:** o publico-alvo realmente prefere falar a digitar, ou e fricao?
**Hipotese:** voz e preferida pelo segmento idoso, indiferente para o segmento mid-30s, dispreferida por profissionais autonomos em ambiente publico.
**Metodo:** teste A/B em sessoes moderadas; medir adocao de microfone vs digitacao por persona.
**Destrava:** decisao de manter voz como cidadao de 1ª classe ou rebaixar a feature opcional.
**Prioridade:** alta (antes de Fase 2).

### P-3 — Escolha de provider LLM
**Pergunta:** qual provider de LLM oferece a melhor combinacao de **qualidade pt-BR + custo + latencia + alinhamento com regras leigas**?
**Hipoteses:**
  - Anthropic Claude 4.6/4.7: melhor pt-BR conversacional, custo medio.
  - GPT-4o-mini: custo mais baixo, qualidade pt-BR boa mas as vezes formal demais.
  - Z.AI / NVIDIA: custo baixo, qualidade variavel.
  - Modelos locais (Llama 3.x via Ollama): custo zero por token, mas latencia alta sem GPU.
**Metodo:** teste lado a lado com os mesmos prompts em pt-BR, escutar com o publico-alvo (ouvido leigo).
**Destrava:** escolha do `AGENT_LLM_PROVIDER` default + estrategia de cache + economia.
**Prioridade:** media (decidir antes de chegar a 1000 sessoes/mes).

### P-4 — Heuristica vs classifier LLM para intent
**Pergunta:** a heuristica v1 (palavras-chave) e suficiente, ou precisa virar um classifier LLM dedicado?
**Hipotese:** heuristica resolve 80% dos casos com confidence alta. Os 20% restantes valem uma chamada LLM barata.
**Metodo:** logar 500 primeiras mensagens de usuarios reais; classificar manualmente; comparar com saida da heuristica.
**Destrava:** decisao de implementar v2 do classifier (agora ou esperar mais sinal).
**Prioridade:** media (apos coletar log de usuario real).

### P-5 — Metodologia de teste com publico idoso
**Pergunta:** como testar interface de produto com idoso de forma que o sinal nao seja contaminado pela presenca do pesquisador?
**Hipotese:** sessoes remotas com camera off + transcript sao melhores que sessoes presenciais com observador.
**Metodo:** revisar literatura academica de UX para idosos (Sanchez-Rossi, Fisk et al.); aplicar com 2 usuarios cada metodo, comparar.
**Destrava:** protocolo das sessoes da Fase 2.
**Prioridade:** alta (antes da Fase 2).

### P-6 — Padroes de orquestracao multi-agente
**Pergunta:** como sistemas similares (AutoGen, CrewAI, LangGraph, Anthropic Computer Use) lidam com hand-off, notepad compartilhado, e classificacao silenciosa?
**Hipotese:** existem padroes consagrados que podemos adotar; nosso intent classifier hoje e ingenuo demais.
**Metodo:** revisao tecnica de 5 sistemas; documentar padroes em `docs/research/multi-agent-patterns.md`.
**Destrava:** evolucao da camada `src/features/orchestration/` para padroes mais robustos.
**Prioridade:** media (Fase 1 ou 2).

### P-7 — LGPD para dados conversacionais
**Pergunta:** quais sao as obrigacoes especificas para um produto que coleta voz, transcript, e dados de negocio do usuario? Como minimizar exposicao?
**Hipotese:** o transcript de voz e dado pessoal sensivel; precisa ter retencao curta + opcao de delecao + consentimento explicito.
**Metodo:** consulta a juridico especializado em LGPD digital (Mattos Filho, Pinheiro Neto, BMA tem praticas dedicadas). Documento curto com requisitos.
**Destrava:** politica de privacidade, design do consentimento na 1ª sessao, retencao de dados.
**Prioridade:** alta (antes do deploy publico).

### P-8 — Modelo de monetizacao
**Pergunta:** o publico paga melhor por **assinatura mensal**, **uso unitario** (R$X por entrega), ou **freemium com gates**?
**Hipotese:** assinatura mensal de R$50-99 funciona pra Juliana; uso unitario pra Carlos (que so usa quando precisa); freemium pra adquirir Dona Maria.
**Metodo:** validar com 30 entrevistas qualitativas (10 por persona); benchmark de produtos similares no Brasil (Conta Azul, Hotmart, Tunes, Wix BR).
**Destrava:** estrategia comercial de Fase 4.
**Prioridade:** media (paralela a Fase 2).

### P-9 — Canal nativo: WhatsApp
**Pergunta:** o produto deveria viver dentro do WhatsApp (via WABA — WhatsApp Business API), em vez de tela web?
**Hipotese:** o publico ja vive no WhatsApp; uma versao via WhatsApp removeria a fricao de "abrir um site novo". Mas WABA tem custos por mensagem e templating restritivo — pode quebrar o tom conversacional.
**Metodo:** prototipo simples via WABA; teste com 5 usuarios; medir engajamento vs versao web.
**Destrava:** roadmap de canais — Fase 5+.
**Prioridade:** baixa (apos Fase 4).

### P-10 — Acessibilidade conformante
**Pergunta:** como atender WCAG 2.2 AA num produto de voz + chat? O que e *acessivel para idoso* alem do WCAG (ex: contraste, tamanho de toque, latencia tolerada)?
**Hipotese:** o WCAG cobre 70%; o restante e especifico (tamanho de toque > 56px, tempo de leitura sem auto-skip, sem decisao por hover).
**Metodo:** auditoria WCAG via ferramenta automatica (axe, Lighthouse); teste manual com leitor de tela; consulta em literatura de gerontotecnologia.
**Destrava:** checklist de acessibilidade que vira gate de PR.
**Prioridade:** media (continua).

---

## 9. Riscos atualizados

| # | Risco | Impacto | Mitigacao |
|---|-------|---------|-----------|
| 1 | Multi-agente sem maturidade explode em casos limite | Alto | Heuristica conservadora, fallback no `website-builder` |
| 2 | Custo de LLM cresce com uso real | Medio | Cache, escolha de provider barato, ver P-3 |
| 3 | LGPD nao cumprida com voz | Critico | P-7 antes de deploy publico |
| 4 | Publico-alvo nao adota voz | Medio | P-2 valida; ter fallback texto sempre |
| 5 | UI fica complexa demais com 4 agentes | Alto | R5/R6/R8 sao gates de PR |
| 6 | Hand-off entre agentes confunde usuario | Medio | Notepad compartilhado + transicao silenciosa; testar em P-5 |
| 7 | Dependencia de Agora cria lock-in | Medio | Camada de abstracao em `src/integrations/`; avaliar alternativas (Daily, LiveKit) anualmente |
| 8 | Crescimento atrai concorrencia (big tech / Wix) | Alto | Diferencial e UX para leigo, nao tech; manter foco |

---

## 10. Apendice — links

### Specs internas
- [.simpleai/README.md](../../.simpleai/README.md) — entrada para tudo
- [.simpleai/core/conversation-rules.md](../../.simpleai/core/conversation-rules.md) — R1-R10
- [.simpleai/core/routing.md](../../.simpleai/core/routing.md) — orquestracao
- [.simpleai/core/notepad.md](../../.simpleai/core/notepad.md) — modelo de notepad
- [.simpleai/core/thresholds.md](../../.simpleai/core/thresholds.md) — ready_to_X
- [.simpleai/agents/_registry.yaml](../../.simpleai/agents/_registry.yaml) — registro de agentes

### Codigo
- [src/features/orchestration/](../../src/features/orchestration/) — router + classifier + session
- [src/features/agents/](../../src/features/agents/) — planners por agente

### Setup local
- [docs/local-setup-status.md](../local-setup-status.md) — onde esta cada coisa rodando

### Benchmarking
- [templates/landing-benchmarks/](../../templates/landing-benchmarks/) — referencias de design

### Documentos relacionados
- [prd.md (v2)](../../prd.md) — PRD do hackathon (snapshot historico)

---

## 11. Como manter este documento

Este PRD e vivo. Atualizar quando:
- Novo agente entra para o registro → secao 4.3 e roadmap.
- Decisao de produto fechada → mover de "research backlog" para corpo do doc.
- Resposta a uma das P-X chega → atualizar a entrada com o achado e mover a decisao destravada.
- Roadmap muda → atualizar fase + data + status.
- Risco materializa → atualizar com mitigacao real adotada.

Versionar com sufixo (v3.1, v3.2 ...). Mudancas grandes (escopo) viram v4.

---

**Ultima revisao:** 2026-04-27 — branch `feat/multi-agent-orchestration`.
