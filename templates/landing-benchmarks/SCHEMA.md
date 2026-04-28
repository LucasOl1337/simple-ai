# SCHEMA — index.yaml

Contrato de dados para cada entrada de [index.yaml](index.yaml). Toda entrada nova precisa seguir este formato.

## Formato YAML

```yaml
- slug: nisa                                  # kebab-case, unico, usado como id
  name: Nisa AI Chatbot                       # nome publico do site
  url: https://nisa.peachworlds.com           # URL real (nao do Awwwards)
  source: awwwards                            # de onde a referencia veio
  category: chat-first                        # enum: chat-first | minimal | general-2025
  relevance_score: 10                         # int 1-10 vs. DNA do SIMPLE-AI
  visual_style: [minimalist, dark]            # tags livres para tom visual
  hero_pattern: chat-as-hero                  # enum: chat-as-hero | tagline-first | demo-inline | typography-only | product-shot
  voice_first: false                          # boolean, true se voz e o input primario
  one_page: true                              # boolean
  has_dark_mode: true                         # boolean
  copy_tone: friendly                         # enum: friendly | technical | corporate | playful | austere
  takeaways:                                  # 1-3 frases, o que o site faz bem
    - Landing inteira em torno de um chat ao vivo
  steal:                                      # 1-3 frases, o que copiar para o SIMPLE-AI
    - Pattern de hero ser o proprio chat
  avoid:                                      # 0-2 frases, o que NAO trazer
    - Branding muito infantil
  has_deep_dive: true                         # boolean — se existe arquivo em deep-dives/<slug>.md
```

## Enums

### category
- **chat-first** — produto centrado em chat ou conversa. Tier 1 — mais relevante.
- **minimal** — referencia de minimalismo visual extremo. Tier 2 — tom.
- **general-2025** — landing 2025 generica de qualidade, contexto amplo. Tier 3.

### hero_pattern
- **chat-as-hero** — a interface de chat e a hero, sem screenshot intermediario.
- **demo-inline** — produto roda dentro da landing acima da dobra.
- **tagline-first** — frase grande domina a hero, CTA logo abaixo.
- **typography-only** — apenas tipografia carrega o peso, zero ilustracao.
- **product-shot** — captura/mockup do produto e o foco visual.

### copy_tone
- **friendly** — coloquial, "voce", contracao.
- **technical** — jargao, voltado a desenvolvedores.
- **corporate** — formal, B2B, abstrato.
- **playful** — humor, emojis, microcopy criativo.
- **austere** — minimo de palavras, neutro.

## Regras

1. `slug` e `url` sao obrigatorios e unicos no arquivo.
2. `relevance_score` e subjetivo mas deve refletir aderencia ao DNA do SIMPLE-AI (conversa-first + simplicidade extrema + voz). Sites genericos boas-de-design ficam em 5-6; sites que sao quase o SIMPLE-AI ficam em 9-10.
3. Tags em `visual_style` sao livres mas reusar valores existentes antes de inventar novos.
4. Se `has_deep_dive: true`, o arquivo `deep-dives/<slug>.md` precisa existir.
