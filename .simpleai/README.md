# .simpleai — Especificacao Core do Sistema

**Este diretorio contem a especificacao de comportamento dos agentes SIMPLE-AI.**

Estes arquivos NAO sao documentacao auxiliar. Sao o **cerebro do produto**. Qualquer agente (IA, voz, Convo, ou humano) que atuar neste projeto DEVE ler estes arquivos ANTES de escrever codigo, gerar resposta ou tomar decisao.

---

## Mudanca importante (2026-04-27)

O SIMPLE-AI agora suporta **multiplos agentes** em uma orquestracao silenciosa. O usuario continua vendo a mesma lousa vazia + dock de 2 botoes — mas por baixo, o sistema escolhe o agente certo (website-builder, customer-support, content-creator, business-consultant) com base no que o usuario disse.

Detalhes em [core/routing.md](core/routing.md).

---

## Estrutura

```text
.simpleai/
├── README.md (este arquivo)
├── core/                              <- conceitos compartilhados por todos os agentes
│   ├── routing.md                     <- intent classifier + fallback + hand-off
│   ├── notepad.md                     <- estrutura de notepad compartilhada
│   ├── thresholds.md                  <- modelo generalizado de "ready_to_X"
│   └── conversation-rules.md          <- regras inviolaveis (R1-R10)
├── agents/                            <- um agente por subpasta
│   ├── _registry.yaml                 <- registro central (machine-readable)
│   ├── website-builder/               <- stable, default fallback
│   │   ├── README.md
│   │   ├── first-interaction.md
│   │   ├── agent-flow.md
│   │   └── flow-order.md
│   ├── customer-support/              <- skeleton
│   │   └── README.md
│   ├── content-creator/               <- skeleton
│   │   └── README.md
│   └── business-consultant/           <- skeleton
│       └── README.md
└── voice-convo-requirements.md        <- aplica a todos os agentes
```

---

## Ordem obrigatoria de leitura

Para qualquer agente / colaborador novo no projeto:

1. **[core/conversation-rules.md](core/conversation-rules.md)** — regras inviolaveis R1-R10.
2. **[core/routing.md](core/routing.md)** — como o sistema decide qual agente atende.
3. **[core/notepad.md](core/notepad.md)** — estrutura de notepad compartilhada.
4. **[core/thresholds.md](core/thresholds.md)** — modelo de "ready_to_X".
5. **[agents/_registry.yaml](agents/_registry.yaml)** — agentes disponiveis.
6. O README do agente especifico que voce vai trabalhar.
7. [voice-convo-requirements.md](voice-convo-requirements.md) — se a tarefa envolve voz.

---

## Conceitos fundamentais (resumo)

### Caderno de Anotacoes (Notepad)
Estrutura compartilhada definida em [core/notepad.md](core/notepad.md). Cada campo tem `value`, `confidence` (0-1), `source`, `priority` e `shared`. Campos com `shared: true` migram entre agentes em hand-off.

### Threshold
Cada agente tem o seu `ready_to_X` definido em [core/thresholds.md](core/thresholds.md). Quando atingido, o agente PODE propor entregar (nunca impoe).

### Roteamento silencioso
O usuario nao escolhe agente. A primeira mensagem e classificada e roteia silenciosamente. Detalhes em [core/routing.md](core/routing.md). Default fallback: `website-builder`.

### Regras inviolaveis (R1-R10)
Em [core/conversation-rules.md](core/conversation-rules.md). Resumo:
- R1: Linguagem leiga.
- R2: Uma pergunta por vez.
- R3: Decisoes silenciosas.
- R4: Notepad e fonte de verdade.
- R5: Lousa minima.
- R6: Dock minima (2 botoes).
- R7: Voz e texto com peso visual igual.
- R8: Nunca expor a orquestracao.
- R9: Erro humano.
- R10: Confirmar antes de agir grande.

---

## Relacao com o codigo

| Spec | Implementacao |
|------|--------------|
| `core/routing.md` | `src/features/orchestration/router.js`, `intent-classifier.js` |
| `agents/_registry.yaml` | `src/features/orchestration/registry.js` |
| `agents/website-builder/` | `src/features/agents/website-builder/planner.js` (em transicao a partir de `src/features/discovery/planner.js`) |
| `agents/<vertical>/` | `src/features/agents/<vertical>/planner.js` |
| Voz | `server-python/src/agent.py` |

---

## Quando atualizar estes arquivos

- Novo agente → criar pasta em `agents/<id>/` + entrada em `_registry.yaml`.
- Nova fase em algum agente → atualizar o `agent-flow.md` daquele agente.
- Novo campo de notepad compartilhado → atualizar `core/notepad.md` (cuidado: afeta todos os agentes).
- Mudanca em threshold → atualizar `core/thresholds.md` + README do agente.
- Nova regra inviolavel → atualizar `core/conversation-rules.md`.
- Nova integracao (voz, banco, etc) → atualizar o doc relevante.
