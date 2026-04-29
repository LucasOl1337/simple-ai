# Runtime

O runtime do FLUXO fica em `api/fluxo` e e responsavel por carregar configs, chamar modelos, validar contratos, salvar arquivos temporarios e executar os steps na ordem oficial.

Cada run usa uma pasta propria em `FLUXO/temp/{run_id}`. O `run_id` e o mesmo identificador do job de build.
