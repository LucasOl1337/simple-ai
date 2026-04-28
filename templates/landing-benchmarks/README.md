# Landing Benchmarks — SIMPLE-AI

Pasta de benchmarking de landing pages externas, organizada para consumo por LLM (humanos tambem).

## Para que serve

Quando um agente (ou colaborador humano) precisar projetar, refatorar ou propor mudancas na landing page do SIMPLE-AI, esta pasta e a fonte de referencia visual e estrutural. Nao copiar 1:1 — usar como benchmark.

## Estrutura

```text
templates/landing-benchmarks/
├── README.md           <- este arquivo. Indice + instrucoes de uso
├── SCHEMA.md           <- contrato de dados que cada entrada do index.yaml segue
├── index.yaml          <- TODAS as 23 referencias em formato estruturado (LLM-readable)
├── patterns.md         <- padroes transversais extraidos do conjunto
├── recommendations.md  <- como aplicar no SIMPLE-AI especificamente
└── deep-dives/         <- analises detalhadas das referencias mais relevantes
    ├── nisa.md
    ├── voxr.md
    ├── chatspark.md
    ├── cleo.md
    ├── silent-house.md
    └── ollie-wagner.md
```

## Como um agente LLM deve usar

Ordem de leitura recomendada quando a tarefa envolver landing/UI publica:

1. **Sempre comecar por** [recommendations.md](recommendations.md) — diretriz especifica para o SIMPLE-AI.
2. Depois [patterns.md](patterns.md) — padroes que ja foram destilados.
3. So entao abrir [index.yaml](index.yaml) e filtrar por `category` ou `relevance_score` para escolher as referencias certas.
4. Para as referencias mais relevantes, abrir o `deep-dives/<slug>.md` correspondente.

Filtros uteis no `index.yaml`:
- `category: chat-first` — primeiro tier, mais relevante (10 sites)
- `category: minimal` — referencia de tom visual (7 sites)
- `category: general-2025` — benchmark amplo de tendencias (6 sites)
- `relevance_score: >= 8` — apenas as mais aderentes ao DNA do SIMPLE-AI
- `voice_first: true` — referencias de UX para entrada por voz

## Como um humano deve usar

Mesma ordem de leitura. Quando um link de inspiracao novo aparecer, adicionar:
1. Uma entrada nova no [index.yaml](index.yaml) seguindo o [SCHEMA.md](SCHEMA.md).
2. Se a referencia tiver `relevance_score >= 8`, escrever um `deep-dives/<slug>.md`.

## Manutencao

- Fonte primaria: https://www.awwwards.com/
- Coletado em: 2026-04-27
- Branch: dev-localhost
