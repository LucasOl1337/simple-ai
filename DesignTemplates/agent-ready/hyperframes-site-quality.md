# HyperFrames-Inspired Site Quality

Este guia adapta principios uteis do HyperFrames para websites estaticos do SIMPLE-AI. O objetivo nao e renderizar video nem adicionar dependencias. O objetivo e melhorar composicao, ritmo visual e acabamento.

## Principios aplicaveis a sites

1. Identidade antes de layout: escolha mood, paleta e tipografia antes de montar secoes.
2. Layout antes de movimento: a pagina precisa estar forte parada, sem depender de animacao.
3. Frame hero forte: a primeira dobra deve parecer uma cena intencional, nao um template preenchido.
4. Narrativa por secoes: cada bloco precisa responder uma pergunta do visitante.
5. Movimento como acabamento: se existir, use apenas para reforcar foco, nao para distrair.

## Como aplicar no Builder

- Construa o hero como uma composicao visual completa: titulo, frase, CTA, prova/contexto e imagem/forma devem se equilibrar.
- Use escala tipografica marcante no hero e reduza a densidade depois.
- Prefira uma assinatura visual por segmento: padaria quente e texturizada, oficina escura e precisa, clinica limpa e calma, beleza refinada, restaurante sensorial, servico local humano.
- Use microinteracoes simples em hover/focus quando fizer sentido: `transform`, `opacity`, `box-shadow` discreto.
- Inclua `@media (prefers-reduced-motion: reduce)` quando houver transicoes.

## Nao fazer

- Nao incluir GSAP no site final por padrao.
- Nao criar video, canvas pesado ou runtime HyperFrames no site publicado.
- Nao usar animacoes infinitas chamativas.
- Nao esconder informacao essencial atras de interacao.
- Nao sacrificar clareza para parecer cinematografico.

## Validacao

- A primeira dobra parece desenhada ou apenas preenchida?
- A pagina tem ritmo visual entre blocos densos e blocos leves?
- O segmento do negocio seria reconhecivel sem ler todos os textos?
- A acao principal continua obvia no mobile?
