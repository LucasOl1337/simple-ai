# Fashion Local Boutique Image Policy

## Regras gerais

- A imagem principal precisa parecer de moda, colecao, vitrine ou boutique.
- Nao usar imagem com texto embutido, letreiro estranho ou marca conflitante.
- Nao usar imagem que pareca banco de imagem aleatorio sem relacao com produto.

## Hero

- Preferir proporcao vertical `4:5`.
- No mobile, evitar `background-image` com `cover` quando isso destruir enquadramento.
- Se houver pessoas, preservar rosto, torso e produto principal.
- Preferir `object-position: center top`.

## Galeria

- Proporcao `4:5` ou `1:1`.
- `object-fit: cover` e aceitavel apenas se o produto continuar reconhecivel.
- Mostrar textura, caimento, look ou composicao de vitrine.

## Sinais de rejeicao

- marca de terceiro visivel
- logo estranho ou texto inventado na imagem
- pessoa cortada no rosto ou no produto principal
- imagem excessivamente cinematografica para um negocio local simples

## Uso no builder

- instruir o image pipeline a preferir visual de vitrine e colecao
- instruir o renderer a evitar crop cego por slot
- registrar warning de QA quando o template de moda receber hero horizontal generico
