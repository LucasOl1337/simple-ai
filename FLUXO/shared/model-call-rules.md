# Regras De Chamada De Modelo

- Toda chamada deve declarar modelo, base URL, timeout e numero maximo de tentativas.
- Toda resposta JSON obrigatoria deve ser validada antes de salvar o step como concluido.
- Steps estruturais nao usam fallback silencioso.
- Logs devem registrar step, modelo, duracao e tentativas.
- O conteudo do usuario e dos steps anteriores deve ser passado como JSON no user message.
