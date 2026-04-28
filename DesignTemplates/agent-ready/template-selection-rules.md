# Template Selection Rules

## Objetivo

Reduzir selecao generica de layout e aproximar o builder de templates realmente adequados ao tipo de pagina, independente da area.

## Ordem de decisao

1. Tipo de CTA principal
2. Volume de conteudo
3. Dependencia de imagem ou vitrine
4. Sinais de confianca
5. Sinais de catalogo ou descoberta visual

## Regras praticas

- CTA forte + pouco conteudo + necessidade de aparencia premium -> `conversion-editorial`.
- Muita variedade, categorias ou vitrine -> `catalog-showcase`.
- Contato direto, confianca e servico local claro -> `local-trust-clear`.

## Regras de exclusao

- Nao usar template de catalogo quando a pagina for curta e focada em uma unica acao.
- Nao usar template editorial quando a prioridade absoluta for clareza funcional e retorno rapido.
- Nao usar template trust-first quando a oferta depende muito mais de vitrine do que de processo.

## Saida esperada do selector

- `template_id`
- `reason`
- `section_blueprint`
- `image_policy`
- `qa_focus`
