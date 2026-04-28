# Recomendacao especifica para a landing do SIMPLE-AI

Aplicacao dos padroes em [patterns.md](patterns.md) ao DNA do SIMPLE-AI definido em [.simpleai/](../../.simpleai/) e na [README.md](../../README.md).

## Principio reitor

**A landing nao pode trair a promessa do produto.**

A regra global do SIMPLE-AI e "lousa vazia + dock de chat com 2 botoes". Uma landing convencional cheia de features, depoimentos animados e grid de logos seria uma traicao da promessa.

> **A landing deve ser a propria interface — funcional, viva, acima da dobra.**

## Estrutura recomendada (one-page)

### Bloco 1 — Hero ao vivo

Acima da dobra, ocupa a tela inteira:
- **Lousa em branco** a esquerda (ou no centro em mobile).
- **Dock de chat funcional** com os 2 botoes ja presentes: enviar (texto) e microfone (voz).
- **Frase unica** acima ou ao lado, em fonte grande: *"Conte sobre seu negocio. Eu cuido do resto."*
- **Sem menu, sem logo gigante, sem CTA secundario.**
- **Sem auto-play de audio.** O microfone clica para iniciar.

Inspiracao primaria: **nisa** (chat-as-hero), **voxr** (peso visual da voz), **silent-house** (restraint).

### Bloco 2 — Como funciona (3 passos)

Abaixo da dobra, 1 scroll curto:
- **3 passos**, 1 frase cada.
  1. **Conversar** — voce fala ou escreve.
  2. **Briefing visivel** — a lousa mostra o que ja sabemos.
  3. **Construir** — quando tiver tudo, viramos producao.
- **Sem icones complexos**, sem ilustracoes 3D. Tipografia + numeros.

Inspiracao: **hints** (3 passos curtos), **ollie-wagner** (whitespace).

### Bloco 3 — Provas (opcional, so se houver)

- **1-2 depoimentos curtos**, 1 frase cada, com nome.
- **Sem carousel automatico**, sem video.
- Se nao houver depoimentos reais, **omitir o bloco inteiro**.

### Bloco 4 — CTA final

- Mesma dock da hero, repetida no final.
- Microcopy: *"Comecar a conversar"*.
- **Nao** colocar 3 CTAs diferentes ("Falar com vendas", "Ver demo", "Comecar"). Apenas 1.

### Footer

- Minimo: nome do produto, ano, 1 link de contato.
- **Sem changelog, sem links de redes sociais infladas, sem newsletter signup.**

## Diretrizes de tom

- **Linguagem:** portugues coloquial, "voce" (nao "voces"), zero jargao tecnico.
- **Frases:** afirmativas, nao descritivas. "Conto pra ele e ele resolve" > "Plataforma de AI para descoberta de produto".
- **Lexico proibido:** "AI-powered", "synergy", "leverage", "platform", "stack", "framework", "MVP", "PMF" — qualquer termo que um usuario idoso nao reconheceria.

## Diretrizes visuais

- **Paleta:** warm-neutral amber, definida no codigo em [src/app/styles.css](../../src/app/styles.css).
  - Tema claro: off-white quente `#fbfaf7` + cream `#f1eee6` + ink quente `#1b1813` + acento amber `#C77D2A`.
  - Tema escuro: charcoal `#100E0A` + ink claro `#F0EBE0` + acento amber `#E5A55B`.
  - Esta paleta substitui o verde neon original — o verde nao alinhava com o publico do SIMPLE-AI (leigo / idoso, tom acolhedor).
- **Tipografia:** uma fonte sans-serif legivel (Inter, Geist, ou similar). Tamanho da hero >= 56px.
- **Espaco em branco:** ao menos 20% da tela vazio acima da dobra.
- **Sem dark mode na v1.** Avaliar so apos lancamento.
- **Sem animacao de hero.** Microanimacoes apenas em estados (botao pressionado, microfone gravando).

## O que NAO fazer

- Grid de 6 features com icones.
- Logos de "trusted by" antes de ter clientes.
- Carousel de depoimentos animado.
- Video de fundo na hero.
- Modal de cookies gigante.
- Banner de "novidade!" no topo.
- Pop-up de newsletter.
- Mais de 1 CTA primario por bloco.

## Referencias diretas para puxar primeiro

| Inspiracao para | Referencia | URL |
|-----------------|------------|-----|
| Chat-as-hero (estrutura) | Nisa | https://nisa.peachworlds.com |
| Peso visual da voz | VOXR | https://voxr.ai |
| Restraint / disciplina visual | Silent House | https://silent-house.com |
| Whitespace / hierarquia | Ollie Wagner | https://olliewagner.com |
| Tom amigavel de copy | Cleo (com moderacao) | https://web.meetcleo.com |
| Promessa de simplicidade no headline | Hints | https://hints.so |

Para deep-dives ver pasta [deep-dives/](deep-dives/).
