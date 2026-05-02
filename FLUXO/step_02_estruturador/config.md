# Config

model: cx/gpt-5.5
provider: openai-compatible
base_url_env: FLUXO_MODEL_BASE_URL
api_key_env: FLUXO_MODEL_API_KEY
temperature: 0.2
timeout_seconds: 90
max_retries: 2
retry_backoff_seconds: 2
response_format: json
required_outputs:
  - 02-estruturado.md
  - 02-estruturado.json
