# FLUXO

FLUXO e o sistema principal de execucao do SIMPLE-AI. A conversa, o teste rapido e qualquer entrada futura apenas alimentam este pipeline de agentes.

## Ordem Oficial

1. `step_01_contexto` normaliza a entrada em contexto de build.
2. `step_02_estruturador` organiza conteudo, prioridades, estilo e prompts de imagem.
3. `step_03_imagens` materializa assets a partir dos prompts estruturados.
4. `step_04_instrucoes_build` transforma contexto e assets em instrucoes finais.
5. `step_05_builder_final` gera o site usando o motor escolhido no frontend.

## Regras

- A ordem dos steps e obrigatoria.
- Um step so roda se o anterior tiver produzido seus arquivos obrigatorios.
- Erro estrutural para o pipeline e nao pode ter fallback silencioso.
- Fallback de imagem e permitido, desde que registrado no manifesto de assets.
- `FLUXO/temp` guarda somente os runs mais recentes conforme `config.md`.
