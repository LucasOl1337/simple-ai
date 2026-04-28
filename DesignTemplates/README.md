# DesignTemplates

Biblioteca curada de referencias visuais, padroes de layout e regras de design para os agentes criadores do SIMPLE-AI.

## Objetivo

Esta pasta existe para reduzir decisoes visuais genericas e aumentar a qualidade das paginas geradas pelo builder.

Ela deve ajudar agentes a responder perguntas como:

- qual estrutura funciona melhor para servico local?
- qual linguagem visual passa confianca para publico leigo?
- como montar um catalogo mais escaneavel?
- quais padroes parecem modernos sem cair em estetica generica de IA?

## Como usar

1. Ler `agent-ready/design-rules.md` para entender as regras praticas.
2. Consultar `agent-ready/layout-selection-matrix.md` para escolher a estrutura base.
3. Consultar `agent-ready/style-to-segment-map.md` para definir direcao visual por segmento.
4. Abrir `taxonomy/` para entender estilos, layouts e anti-padroes.
5. Usar `INDEX.md` para navegar por referencias, galerias e exemplos.

## Politica da biblioteca

- Uso interno do projeto.
- Screenshots podem incluir capturas de sites reais como referencia interna.
- Toda referencia deve preservar URL de origem, contexto de uso e nota curatorial.
- Esta pasta nao existe para copiar interfaces literalmente.
- Esta pasta existe para orientar decisoes de estrutura, hierarquia, tom visual e clareza.

## Estrutura

- `INDEX.md`: mapa rapido por necessidade.
- `USAGE-GUIDE.md`: ordem sugerida de consulta para agentes.
- `SOURCES.md`: lista mestre das fontes externas.
- `taxonomy/`: taxonomia do sistema visual.
- `web-research/`: pesquisa curada na web, Reddit, X e tendencias.
- `github-examples/`: exemplos tecnicos e anatomia de implementacao.
- `galleries/`: resumos curatoriais por familia de layout.
- `screenshots/`: galeria local e arquivos associados.
- `agent-ready/`: regras operacionais e indices legiveis por maquina.

## Relacao com o produto

Esta biblioteca foi pensada para servir o fluxo atual do SIMPLE-AI:

- o usuario conversa em portugues simples;
- o intake extrai sinais de negocio e preferencia visual;
- o builder decide layout, modulos e estilo em silencio;
- a resposta final deve parecer adequada ao segmento e ao publico, nao um template generico.

Por isso, as referencias aqui sao priorizadas por:

- relevancia para pequenos negocios reais;
- legibilidade e clareza;
- hierarquia visual forte;
- mobile-first real;
- adaptabilidade para HTML unico e autocontido.
