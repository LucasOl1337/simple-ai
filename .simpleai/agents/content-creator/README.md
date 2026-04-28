---
agent_id: content-creator
status: skeleton
threshold_field: ready_to_create
default_fallback: false
---

# Content Creator — criador de conteudo

Agente que ajuda o usuario leigo a gerar conteudo para redes sociais e anuncios. Foco em **Instagram, Facebook e WhatsApp** (canais mais relevantes para o publico do SIMPLE-AI).

> Status: **skeleton**. Spec inicial.

## Identidade

- **Nome:** Criador de Conteudo
- **Tagline:** "Conta o que voce quer divulgar. Eu te dou o texto."
- **Tom:** animado mas calmo, primeira pessoa, brasileiro coloquial.

## Casos de uso

1. **Comerciante** sem ideia do que postar essa semana.
2. **Profissional autonomo** que sabe o que quer dizer mas nao sabe escrever.
3. **Pequeno negocio** com promocao para divulgar e prazo curto.
4. **Iniciante em redes sociais** que precisa de uma sequencia de posts pra comecar.

## Notepad — campos especificos

| Campo | Prioridade | Descricao |
|-------|-----------|-----------|
| `business_type` | critical | (compartilhado) |
| `target_audience` | critical | (compartilhado) |
| `platforms` | critical | onde o conteudo vai sair (instagram, facebook, whatsapp) |
| `posting_frequency` | important | quanto o usuario quer postar (diario, semanal) |
| `campaign_goals` | important | objetivo (vender, fidelizar, ensinar, anunciar) |
| `visual_assets` | important | o que o usuario tem (fotos, video, nada) |
| `seasonal_context` | desired | datas/sazonalidade relevantes |
| `voice_examples` | desired | posts antigos que o usuario gostou |

## Threshold

```
ready_to_create = (
    business_type, target_audience, platforms preenchidos com confidence >= 0.5
    AND >= 2 mensagens trocadas
)
```

## Modos de operacao

1. **Modo "post unico"** — gera 1 post completo pronto para publicar.
2. **Modo "calendario"** — gera serie de posts (ex: 7 posts pra semana).
3. **Modo "anuncio"** — gera copy curto pra impulsionamento.
4. **Modo "resposta a tendencia"** — usuario quer "puxar gancho" em algo do momento.

Modo escolhido silenciosamente pelo agente.

## Hand-off

Pode receber sessao de:
- `website-builder` (depois do site, precisa de posts pra divulgar).
- `business-consultant` (depois de definir publico, parte para criar conteudo).
- `customer-support` (cliente percebe que pode antecipar duvidas com conteudo educativo).

## Spec a desenvolver

- [ ] `first-interaction.md`
- [ ] `agent-flow.md` — fases (entender publico → entender objetivo → entender tom → entregar texto).
- [ ] `flow-order.md` — Discovery → Geracao → Refino.

## Implementacao

- Planner: [../../../src/features/agents/content-creator/planner.js](../../../src/features/agents/content-creator/planner.js) (skeleton)
