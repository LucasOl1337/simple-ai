---
agent_id: website-builder
status: stable
threshold_field: ready_to_build
default_fallback: true
---

# Website Builder — agente padrao

O agente original do SIMPLE-AI. Ajuda o usuario leigo a criar um site ou landing page a partir de uma conversa simples, sem nunca usar termos tecnicos.

## Identidade

- **Nome:** Construtor de Site
- **Tagline:** "Conta sobre seu negocio. Eu cuido do site."
- **Tom:** acolhedor, calmo, primeira pessoa, brasileiro coloquial.

## Spec

Ordem de leitura:

1. [first-interaction.md](first-interaction.md) — abertura, extracao de sinais, notepad inicial.
2. [agent-flow.md](agent-flow.md) — 7 fases, perguntas por fase, decisoes silenciosas.
3. [flow-order.md](flow-order.md) — Discovery → Producao → Iteracao + threshold `ready_to_build`.

## Notepad — campos especificos

Alem dos campos compartilhados definidos em [../../core/notepad.md](../../core/notepad.md):

| Campo | Prioridade | Descricao |
|-------|-----------|-----------|
| `business_type` | critical | (compartilhado) tipo de negocio |
| `brand_name` | critical | (compartilhado) nome do negocio |
| `primary_cta` | critical | acao principal que o visitante deve fazer no site |
| `offerings` | important | servicos / produtos oferecidos |
| `pages_needed` | important | secoes do site que o usuario quer |
| `visual_references` | desired | referencias visuais ou tom visual |
| `payment_required` | desired | site precisa de pagamento embutido |
| `booking_required` | desired | site precisa de agendamento embutido |
| `auth_required` | desired | site precisa de login |

## Threshold

```
ready_to_build = (
    business_type, brand_name, primary_cta preenchidos com confidence >= 0.5
    AND confianca media geral >= 0.55
    AND >= 3 mensagens trocadas
)
```

## Hand-off

Pode receber sessao de:
- `business-consultant` (depois de definir publico/posicionamento, parte para criar o site)
- `content-creator` (cliente disse "preciso postar mas tambem nao tenho site")

Pode enviar sessao para:
- `content-creator` (depois do site pronto, naturalmente surge "agora preciso de posts")

## Implementacao

- Planner: [../../../src/features/agents/website-builder/planner.js](../../../src/features/agents/website-builder/planner.js)
- UI: [../../../src/app/App.jsx](../../../src/app/App.jsx)
- Agente de voz: [../../../server-python/src/agent.py](../../../server-python/src/agent.py)

> Em transicao: o codigo legacy ainda vive em `src/features/discovery/planner.js`. O modulo em `src/features/agents/website-builder/` reexporta a partir de la para manter compatibilidade. Ver [../../../src/features/agents/website-builder/planner.js](../../../src/features/agents/website-builder/planner.js).
