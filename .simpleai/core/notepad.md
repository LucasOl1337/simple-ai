# Notepad — padrao compartilhado entre agentes

O **notepad** e a estrutura de dados que cada agente usa para acumular contexto da conversa. Todos os agentes do SIMPLE-AI seguem o mesmo padrao, com campos especificos por vertical.

## Anatomia de um campo

```yaml
field_name:
  value: <conteudo>            # o dado em si (string, list, etc)
  confidence: 0.0-1.0          # quanta certeza o agente tem
  source: "user" | "inferred"  # veio da fala do usuario ou foi deduzido
  priority: critical | important | desired
  shared: true | false         # se outros agentes podem ler esse campo
```

## Prioridades

- **critical** — sem esse campo, o agente nao pode entregar nada. Bloqueia `ready_to_X`.
- **important** — melhora muito a entrega mas nao bloqueia.
- **desired** — bom ter, nao essencial.

## Campos compartilhados (cross-agent)

Estes campos sao preenchidos por qualquer agente e ficam visiveis para todos os outros em hand-off:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `business_type` | string | Tipo de negocio (padaria, oficina, clinica, etc) |
| `brand_name` | string | Nome do negocio |
| `target_audience` | string | Quem e o cliente tipico |
| `region` | string | Regiao de atuacao |
| `tone_preference` | string | Tom preferido (acolhedor, profissional, etc) |

Todos com `shared: true`.

## Campos especificos por agente

Cada agente declara os seus em `.simpleai/agents/<agent>/notepad.md`. Exemplos:

- `website-builder`: `primary_cta`, `pages_needed`, `visual_references`, `payment_required`, `booking_required`
- `customer-support`: `channels_used`, `common_questions`, `response_tone`, `escalation_rules`
- `content-creator`: `posting_frequency`, `platforms`, `visual_assets`, `campaign_goals`
- `business-consultant`: `current_revenue`, `growth_goals`, `competitive_pressure`, `pain_points`

## Regras inviolaveis

1. **Confidence inicial** quando extraido do usuario: 0.7. O usuario pode confirmar (sobe pra 0.95) ou corrigir (volta pra 0.0).
2. **Confidence inferida** sem confirmacao: maximo 0.5. Nunca tomar decisao critica em campo inferido.
3. **Source `inferred`** exige confirmacao silenciosa antes de subir confidence.
4. **Notepad e a unica fonte de verdade** — nao tomar decisao olhando o transcript bruto.
5. **Persistencia** — notepad sobrevive a hand-offs entre agentes via `shared: true`.

## Visualizacao na lousa

A lousa do SIMPLE-AI mostra o notepad em tempo real, mas **so os campos com `confidence >= 0.5`** e **so os relevantes para o agente atual**. Campos compartilhados de outros agentes aparecem so se forem relevantes para a conversa em curso.

A lousa nunca mostra `confidence` numericamente. A representacao visual e:
- Campo solido = confirmado (>= 0.85)
- Campo em italico = provavel (0.5 - 0.85)
- Campo ausente = ainda nao sabemos
