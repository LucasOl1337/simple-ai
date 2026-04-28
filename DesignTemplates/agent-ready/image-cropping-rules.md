# Image Cropping Rules

## Objetivo

Evitar imagens cortadas de forma destrutiva, especialmente no mobile.

## Regras gerais

- `object-fit: cover` nao e padrao universal.
- O slot define a politica, nao apenas a classe CSS.
- Hero com pessoas ou produtos deve usar enquadramento mais seguro.

## Politicas por slot

### Hero

- Preferir imagem no fluxo quando o enquadramento for critico.
- Evitar background horizontal generico no mobile.
- Se usar `cover`, definir `object-position` ou equivalente por segmento.

### Gallery

- `cover` e aceitavel se o item principal continuar reconhecivel.

### Card image

- Priorizar legibilidade do produto e nao apenas preenchimento da caixa.

## Warnings sugeridos

- `hero_crop_risk`
- `brand_conflict_visible_in_image`
- `unsafe_mobile_cover`
- `image_slot_wrong_aspect_ratio`
