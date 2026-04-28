# GitHub Scorecard

## Papel da fonte

GitHub e a melhor fonte para transformar inspiracao em anatomia tecnica: templates, blocos, HTML/CSS patterns e estruturas reutilizaveis.

## Fontes priorizadas

| Fonte | Nota | Melhor uso |
|---|---:|---|
| `https://github.com/PaulleDemon/awesome-landing-pages` | 960 | mineracao de landing pages e secoes |
| `https://github.com/designmodo/html-website-templates` | 920 | HTML estatico e fallback local |
| `https://github.com/shsfwork/awesome-inspiration` | 890 | descoberta de fontes e bibliotecas |
| `https://github.com/MarsX-dev/floatui` | 875 | blocos modernos e composicao |
| `https://github.com/Ashutoshx7/VengenceUI` | 840 | motion e acabamento visual |
| `https://github.com/shadcnstore/shadcn-dashboard-landing-template` | 780 | polish tecnico |
| `https://github.com/birobirobiro/awesome-shadcn-ui` | 760 | descoberta de componentes |

## O que extrair

- section blueprints
- estruturas de hero
- CTA strips
- grids de catalogo
- padroes de HTML/CSS autocontidos

## O que evitar

- importar runtime e dependencias desnecessarias
- replicar look SaaS em segmentos locais sem filtro
- copiar componentes fora de contexto de marca e publico

## Aplicacao no SIMPLE-AI

- gerar `templates/*/anatomy.md`
- reforcar `_build_local_html_v2()` com renderers especificos por template
- alimentar a camada de selecao por template
