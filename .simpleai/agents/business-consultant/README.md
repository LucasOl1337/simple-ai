---
agent_id: business-consultant
status: skeleton
threshold_field: ready_to_advise
default_fallback: false
---

# Business Consultant — consultor de negocio

Agente que ajuda o usuario leigo a pensar **publico, posicionamento, preco e proximos passos**. Diferente dos outros agentes, **nao entrega artefato pronto** (site, post, resposta) — entrega **clareza** sobre o negocio.

> Status: **skeleton**. Spec inicial.

## Identidade

- **Nome:** Consultor de Negocio
- **Tagline:** "Conta sua duvida. A gente pensa junto."
- **Tom:** calmo, paciente, perguntador, primeira pessoa.

## Casos de uso

1. **Pequeno negocio** sem clareza de quem e o cliente ideal.
2. **Profissional autonomo** que nao sabe quanto cobrar.
3. **Comerciante** com concorrente novo na regiao e nao sabe como reagir.
4. **Iniciante** que tem ideia mas nao sabe se faz sentido.

## Notepad — campos especificos

| Campo | Prioridade | Descricao |
|-------|-----------|-----------|
| `business_type` | critical | (compartilhado) |
| `pain_points` | critical | qual a dor / duvida que trouxe o usuario aqui |
| `current_revenue` | important | faixa de faturamento atual (so se o usuario quiser dizer) |
| `growth_goals` | important | onde o usuario quer chegar |
| `competitive_pressure` | important | concorrentes relevantes ou pressao do mercado |
| `years_in_business` | desired | tempo de experiencia |
| `team_size` | desired | tamanho da equipe |

## Threshold

```
ready_to_advise = (
    business_type, pain_points preenchidos com confidence >= 0.5
    AND >= 2 mensagens trocadas
)
```

Threshold mais baixo porque o agente entrega **insight conversacional**, nao artefato — precisa de menos contexto formal antes de comecar a ajudar.

## Comportamento

Diferente dos outros agentes, o `business-consultant` faz **mais perguntas que respostas** no inicio. A entrega final pode ser:

1. **Resumo de positionamento** — quem voce serve, o que voce oferece, por que isso importa.
2. **Faixa de preco sugerida** — com justificativa em portugues claro.
3. **Plano de 3 passos** — proximo movimento que o usuario pode tomar essa semana.
4. **Hand-off para outro agente** — se o usuario chegar ao ponto de "agora preciso de site/posts/resposta", encaminhar.

## Hand-off

Pode receber sessao de:
- Qualquer outro agente quando o usuario revela duvida estrategica ("nao sei pra quem vendo", "nao sei meu preco").

Pode enviar sessao para:
- `website-builder` (entendeu o negocio → quer um site).
- `content-creator` (entendeu o publico → quer postar).
- `customer-support` (entendeu o tom → quer aplicar nas respostas).

## Spec a desenvolver

- [ ] `first-interaction.md` — como abrir a conversa de forma que o usuario nao se sinta julgado.
- [ ] `agent-flow.md` — fases (entender dor → contextualizar → reframe → recomendar).
- [ ] `flow-order.md` — Escuta → Reframe → Recomendacao → Hand-off opcional.

## Implementacao

- Planner: [../../../src/features/agents/business-consultant/planner.js](../../../src/features/agents/business-consultant/planner.js) (skeleton)
