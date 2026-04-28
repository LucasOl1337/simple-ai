# Thresholds — modelo generalizado de "ready_to_X"

Cada agente define um momento em que **ja sabe o suficiente para entregar valor**. No website-builder isso se chama `ready_to_build`. Outros agentes tem o equivalente: `ready_to_respond`, `ready_to_create`, `ready_to_advise`.

## Modelo geral

```
ready_to_X = (
    todos os campos critical preenchidos com confidence >= 0.5
    AND confianca media geral >= 0.55
    AND pelo menos N mensagens trocadas (N depende do agente)
)
```

## Por agente

| Agente | Threshold | Campos critical | N mensagens minimas |
|--------|-----------|-----------------|---------------------|
| website-builder | `ready_to_build` | business_type, brand_name, primary_cta | 3 |
| customer-support | `ready_to_respond` | business_type, common_questions, response_tone | 2 |
| content-creator | `ready_to_create` | business_type, target_audience, platforms | 2 |
| business-consultant | `ready_to_advise` | business_type, pain_points | 2 |

## Comportamento ao atingir o threshold

O agente **pode propor** entregar (nao deve impor). Exemplo:

> "Acho que ja tenho o suficiente pra te mostrar uma primeira versao. Quer que eu monte agora ou voce prefere me contar mais alguma coisa antes?"

O usuario decide. **Nunca cortar a conversa abruptamente** so porque o threshold foi atingido.

## Comportamento abaixo do threshold

O agente continua perguntando — **uma pergunta por vez**, na ordem que o flow do agente especifico define.

Se o usuario insistir em "ja resolve" antes do threshold, o agente:
1. Faz **uma ultima tentativa** de conseguir os campos critical com pergunta direta.
2. Se mesmo assim faltar, entrega o melhor possivel com aviso explicito do que ainda nao sabe.

Exemplo:
> "Beleza. So pra eu nao errar — voce ainda nao me disse o nome do negocio. Posso seguir e voce me diz depois?"

## Threshold compartilhado em hand-off

Se um agente passa a sessao para outro, o **novo agente recalcula seu proprio threshold** com base no notepad existente. Pode ja estar acima do threshold (campos compartilhados ja preenchidos) — nesse caso, o novo agente entra ja podendo propor entrega.
