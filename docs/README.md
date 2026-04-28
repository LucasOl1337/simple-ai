# Docs

Esta pasta contem documentacao auxiliar e anotacoes de contexto.

**A especificacao core do agente NAO fica aqui.**
Ela fica em [.simpleai/](../.simpleai/README.md) — essa e a fonte de verdade
para comportamento, fluxo, notepad e threshold de producao.

## Conteudo

- [planning/PRD-v3.md](planning/PRD-v3.md) — **PRD vivo** com vision, roadmap, metricas e research backlog (P-1 a P-10).
- [local-setup-status.md](local-setup-status.md) — estado do ambiente local: portas, healthchecks, o que falta conectar.
- [architecture.md](architecture.md) — visao tecnica de alto nivel.

## Leitura recomendada

1. [.simpleai/README.md](../.simpleai/README.md) — **COMECE AQUI** (spec core)
2. [planning/PRD-v3.md](planning/PRD-v3.md) — onde estamos e pra onde vamos
3. [README.md raiz](../README.md) — regras de produto e setup
4. [src/features/orchestration/](../src/features/orchestration/) — camada de orquestracao multi-agente
5. [src/features/agents/](../src/features/agents/) — planners por agente
6. [src/app/App.jsx](../src/app/App.jsx) — UI principal
