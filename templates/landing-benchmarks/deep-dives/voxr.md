---
slug: voxr
name: VOXR AI
url: https://voxr.ai
relevance_score: 10
last_visited: 2026-04-27
---

# VOXR — voz como input primario

Referencia rara de produto **voice-first** dentro do conjunto. Critica para o SIMPLE-AI por causa do botao de microfone como acao primaria.

## Por que e relevante

O SIMPLE-AI tem 2 botoes de igual peso na dock: enviar (texto) e microfone (voz). A regra global proibe relegar a voz a um icone secundario. VOXR e a unica referencia coletada que **assume voz como input primario** sem se desculpar — o resto trata voz como feature secundaria.

## O que copiar

1. **Microfone com peso visual igual (ou maior) ao do texto** — nao e um icone discreto.
2. **Microcopy "Fale" antes de "Escreva"** — a ordem ensina o usuario sobre a hierarquia.
3. **Demo de audio in-line** — o usuario pode ouvir um exemplo sem clicar fora da landing.
4. **Estado de "gravando" claramente visivel** — indicador de que o sistema esta escutando.

## O que adaptar

- VOXR e voice-only (nao tem texto). O SIMPLE-AI tem **ambos**, com peso igual. A landing precisa comunicar que voz **e** texto sao caminhos validos, nao um substituindo o outro.
- Publico do VOXR e B2B / vendedores. Publico do SIMPLE-AI e leigo / idoso. **Tom precisa ser mais simples** que o do VOXR.

## O que NAO copiar

- Auto-play de audio na hero — VOXR pode flertar com isso, **nao fazer**.
- Branding tecnico (palavras como "AI agent", "lead gen") — proibido pelo lexico do SIMPLE-AI.
- Demo que consome muito tempo do usuario.

## Sinal de implementacao

Na hero do SIMPLE-AI, o botao do microfone deve ser o primeiro elemento que o usuario nota apos a frase principal. Tamanho minimo 56px de altura. Estado ativo (gravando) com cor de acento + animacao sutil de pulse.

A microcopy deveria ser literalmente: **"Fale ou escreva"** — nessa ordem.
