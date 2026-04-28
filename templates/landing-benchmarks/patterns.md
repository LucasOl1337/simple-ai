# Padroes transversais — Landing Benchmarks

Sintese cruzada das 23 referencias coletadas em [index.yaml](index.yaml). Para a aplicacao especifica ao SIMPLE-AI, ver [recommendations.md](recommendations.md).

## P1 — Hero sem decoracao

Aparece em: nisa, voxr, silent-house, ollie-wagner, montone-studio, hints, orbitai

A hero da maioria das referencias com `relevance_score >= 7` tem **uma frase grande, uma subfrase, um CTA**. Sem screenshot lotado, sem 3D pesado, sem video de fundo.

## P2 — Demo in-line acima da dobra

Aparece em: nisa, voxr, cleo

Em vez de um botao "ver demo", o produto **roda dentro da landing**. No caso de chat, o campo de chat ja esta ativo. No caso de voz, ha um audio de exemplo ou um botao de microfone funcional.

Forte para o SIMPLE-AI: a propria interface (lousa + dock) deveria ser a hero.

## P3 — Tipografia carrega o peso visual

Aparece em: silent-house, ollie-wagner, montone-studio, carlos-prado, dvdrod, the-laend, barbora-design

Quando a paleta e neutra e nao ha ilustracao, **a tipografia e o produto visual**. Fonte grande, leading generoso, hierarquia explicita.

## P4 — Paleta neutra com 1 acento

Aparece em: orbitai, neurable, nisa, ausdata

Preto, branco, off-white + 1 cor de destaque (CTA, microfone ativo, estado "gravando"). Mais que isso comeca a virar ruido.

## P5 — One-page / single-column

Aparece em: ollie-wagner, montone-studio, dvdrod, hints, chatspark, cleo, wickside, barbora-design

Landings nao precisam de menu de navegacao. Scroll narrativo curto. Quando ha menu, e minimo (3 itens) e some no scroll.

## P6 — Copy direto e curto

Aparece em: hints, chatspark, neurable, nisa

Frases como **afirmacoes**, nao listas de features. Headers que **prometem um resultado**, nao que **descrevem a tecnologia**.

Anti-exemplo: "Plataforma de AI conversacional empresarial com integracoes nativas".
Pro-exemplo: "Conte sobre seu negocio. Cuido do resto."

## P7 — Voz e texto com peso visual igual

Aparece em: voxr (referencia unica de voice-first explicito)

Quando voz e input primario, o microfone **nao** e um icone secundario. E um botao do mesmo tamanho ou maior que o de texto. Microcopy "Fale" aparece **antes** de "Escreva".

Forte para o SIMPLE-AI: a regra global ja exige esse tratamento.

## P8 — Microcopy de acessibilidade visivel

Aparece em: cleo, hints, voxr

Sites bem-feitos tem **labels de acessibilidade visiveis** (nao escondidos atras de tooltips). "Fale" e "Escreva" como dois caminhos de igual peso, nao um escondido atras de hover.

## P9 — Dark mode opcional, nao obrigatorio

Aparece em: nisa, voxr, neurable, cleo, dvdrod, carlos-prado, barbora-design (com dark) vs. silent-house, ollie-wagner, montone-studio, chatspark, hints (sem)

Dark mode aparece em ~50% das referencias. Nao e obrigatorio para parecer "moderno". Para o SIMPLE-AI, **comecar sem** — adicionar so se houver pedido real do publico.

## P10 — Sem ilustracao 3D pesada nem hero animado

Aparece em: praticamente todo o tier 2 e maioria do tier 1

Tendencia de 2025 que se confirma nas referencias com `relevance_score >= 8`: zero animacao de hero, zero 3D, zero video de fundo. O ruido visual cansa o usuario leigo — exatamente o publico do SIMPLE-AI.

---

## Anti-padroes (o que NAO copiar)

- **Grid de "features" com 6+ cards** — viraliza em landings SaaS B2B mas nao serve aqui (ver pulsr, wow-page).
- **Copy corporativo abstrato** — "synergy", "leverage", "powered by AI" (ver pulsr, ausdata).
- **Animacao de scroll que segura o usuario** — fere a regra de "menos decisoes".
- **Auto-play de audio/video sem consentimento** — bloqueia em mobile e gera atrito.
- **Cookie banner gigante** — quando inevitavel, manter discreto.
