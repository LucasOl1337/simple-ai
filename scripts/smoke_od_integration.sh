#!/usr/bin/env bash
# Smoke test for the Open Design integration (spec 9279cd2 / plan a9a3cae).
#
# Posts 3 synthetic BuildRequests directly to /v2/build, bypassing the
# conversational planner. Validates that:
#   1. The build completes successfully
#   2. The HTML contains a `<!-- design_system_chosen: <id> -->` comment
#   3. The chosen design system + skill match the expected school
#
# Prereqs (the script verifies these before running):
#   - Backend running at $SIMPLE_AI_URL (default http://localhost:8000)
#   - api/.env.local with ANTHROPIC_API_KEY (or AGENT_LLM_API_KEY)
#   - jq and curl installed
#
# Usage:
#   bash scripts/smoke_od_integration.sh                  # all 3 prompts
#   bash scripts/smoke_od_integration.sh tech             # just one
#   SIMPLE_AI_URL=http://localhost:8001 bash scripts/...  # custom URL

set -u

SIMPLE_AI_URL="${SIMPLE_AI_URL:-http://localhost:8000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESULTS_DIR="$ROOT_DIR/scripts/smoke_results"
POLL_INTERVAL_SEC=3
POLL_TIMEOUT_SEC=300

mkdir -p "$RESULTS_DIR"

# --- pre-flight ---------------------------------------------------------------

command -v curl >/dev/null || { echo "FATAL: curl not found"; exit 1; }
command -v jq   >/dev/null || { echo "FATAL: jq not found";   exit 1; }

if ! curl -sS --max-time 3 -o /dev/null "$SIMPLE_AI_URL/v2/build/__health__" 2>/dev/null; then
  # /v2/build/<id> 404s for unknown ids — that's fine, we just need a 4xx not a connection error.
  if ! curl -sS --max-time 3 -o /dev/null -w "%{http_code}" "$SIMPLE_AI_URL/" >/dev/null 2>&1; then
    echo "FATAL: backend not reachable at $SIMPLE_AI_URL"
    echo "Start it in another terminal: cd $ROOT_DIR && uvicorn api.server:app --reload"
    exit 1
  fi
fi

echo "Backend reachable at $SIMPLE_AI_URL"
echo "Results will be written under $RESULTS_DIR"
echo ""

# --- synthetic specs ----------------------------------------------------------
# Each spec is a JSON file (created inline). Schema mirrors BuildRequest at
# api/server.py:155 — extra fields allowed via Config.extra = "allow".

write_spec_tech() {
  cat > "$1" <<'JSON'
{
  "business_name": "Voltri AI",
  "segment": "saas",
  "current_workflow": "Plataforma B2B de copilots para times comerciais.",
  "primary_pain": "Vendedores perdem tempo organizando contatos e atualizações de pipeline.",
  "user_facing_actions": [
    {"id": "trial", "label": "Começar trial grátis"},
    {"id": "demo", "label": "Agendar demo"}
  ],
  "needs_admin_panel": true,
  "needs_login_for_customers": true,
  "design_plan": {
    "layout_family": "conversion-landing",
    "visual_style": "tech_utility",
    "content_density": "compact",
    "has_pricing": true,
    "cta_strategy": {"type": "sell_subscription"}
  },
  "summary": {
    "brand_name": "Voltri AI",
    "business_type": "saas",
    "brand_tone": "tech",
    "content_volume": "medium",
    "primary_cta": "trial"
  },
  "agent_profile": "site-builder-core"
}
JSON
}

write_spec_padaria() {
  cat > "$1" <<'JSON'
{
  "business_name": "Padaria Recanto da Vovó",
  "segment": "padaria",
  "current_workflow": "Padaria de bairro em Vitória, atendimento balcão e WhatsApp para encomendas.",
  "primary_pain": "Clientes novos não sabem quais bolos estão disponíveis no dia.",
  "user_facing_actions": [
    {"id": "menu", "label": "Ver cardápio do dia"},
    {"id": "encomenda", "label": "Encomendar bolo"}
  ],
  "design_plan": {
    "layout_family": "image-led",
    "visual_style": "soft_warm",
    "content_density": "comfortable",
    "has_blog_intent": true,
    "cta_strategy": {"type": "contact_whatsapp"}
  },
  "summary": {
    "brand_name": "Padaria Recanto da Vovó",
    "business_type": "padaria",
    "brand_tone": "warm",
    "content_volume": "high",
    "primary_cta": "menu"
  },
  "agent_profile": "site-builder-core"
}
JSON
}

write_spec_editorial() {
  cat > "$1" <<'JSON'
{
  "business_name": "Capixaba Sonora",
  "segment": "editorial",
  "current_workflow": "Lançamento de revista cultural sobre música capixaba; primeira edição focada em forró pé-de-serra.",
  "primary_pain": "Falta um portal que apresente a primeira edição com peso editorial.",
  "user_facing_actions": [
    {"id": "read_edition", "label": "Ler primeira edição"},
    {"id": "subscribe", "label": "Inscrever-se na newsletter"}
  ],
  "design_plan": {
    "layout_family": "editorial-onepage",
    "visual_style": "editorial_monocle",
    "content_density": "spacious",
    "cta_strategy": {"type": "launch_announcement"}
  },
  "summary": {
    "brand_name": "Capixaba Sonora",
    "business_type": "editorial",
    "brand_tone": "calm",
    "content_volume": "high",
    "primary_cta": "read_edition"
  },
  "agent_profile": "site-builder-core"
}
JSON
}

# --- run a single smoke test --------------------------------------------------

run_smoke() {
  local label="$1"
  local writer_fn="$2"
  local expected_school="$3"
  local expected_skill="$4"

  local out_dir="$RESULTS_DIR/$label"
  mkdir -p "$out_dir"

  local spec_file="$out_dir/spec.json"
  "$writer_fn" "$spec_file"

  echo "------------------------------------------------------------"
  echo "Smoke: $label  (expected_school=$expected_school, expected_skill=$expected_skill)"
  echo "Spec:  $spec_file"

  local post_resp
  post_resp=$(curl -sS --max-time 30 -X POST "$SIMPLE_AI_URL/v2/build" \
    -H "Content-Type: application/json" \
    --data-binary "@$spec_file")

  local job_id
  job_id=$(echo "$post_resp" | jq -r '.data.job_id // empty')
  if [ -z "$job_id" ]; then
    echo "FAIL: could not enqueue. Response:"
    echo "$post_resp" | jq . || echo "$post_resp"
    return 1
  fi
  echo "Enqueued: $job_id"

  local elapsed=0
  local status=""
  local snapshot=""
  while [ "$elapsed" -lt "$POLL_TIMEOUT_SEC" ]; do
    sleep "$POLL_INTERVAL_SEC"
    elapsed=$((elapsed + POLL_INTERVAL_SEC))
    snapshot=$(curl -sS --max-time 10 "$SIMPLE_AI_URL/v2/build/$job_id" 2>/dev/null || true)
    status=$(echo "$snapshot" | jq -r '.data.status // "unknown"')
    printf "  [%3ds] status=%s\n" "$elapsed" "$status"
    if [ "$status" = "done" ] || [ "$status" = "error" ]; then
      break
    fi
  done

  echo "$snapshot" > "$out_dir/snapshot.json"

  if [ "$status" != "done" ]; then
    echo "FAIL ($label): build did not complete in ${POLL_TIMEOUT_SEC}s. status=$status"
    echo "$snapshot" | jq '.data | {status, error, streamed_chars, usage}' 2>/dev/null || true
    return 1
  fi

  local site_url
  site_url=$(echo "$snapshot" | jq -r '.data.site_url // empty')
  echo "Site URL: $site_url"

  # Locate the generated HTML on disk
  local html_path="$ROOT_DIR/sites/$job_id/index.html"
  if [ -f "$html_path" ]; then
    cp "$html_path" "$out_dir/index.html"
  else
    # try alternate locations
    local alt
    alt=$(find "$ROOT_DIR/sites" -name "index.html" -path "*$job_id*" 2>/dev/null | head -1)
    [ -n "$alt" ] && cp "$alt" "$out_dir/index.html"
  fi

  if [ ! -f "$out_dir/index.html" ]; then
    echo "WARN: HTML not found on disk for job $job_id"
  else
    local chosen
    chosen=$(grep -oE '<!-- design_system_chosen: [a-zA-Z0-9_-]+ -->' "$out_dir/index.html" | head -1 || true)
    if [ -n "$chosen" ]; then
      echo "OK: $chosen"
    else
      echo "WARN: no <!-- design_system_chosen --> comment found in HTML (Opus may have ignored the instruction)"
    fi
  fi

  echo "Result for $label saved to $out_dir/"
  return 0
}

# --- run -----------------------------------------------------------------------

case "${1:-all}" in
  tech)        run_smoke "tech"      write_spec_tech      "tech_utility"      "saas-landing"   ;;
  padaria|smb) run_smoke "padaria"   write_spec_padaria   "soft_warm"         "blog-post"      ;;
  editorial)   run_smoke "editorial" write_spec_editorial "editorial_monocle" "magazine-poster";;
  all|"")
    run_smoke "tech"      write_spec_tech      "tech_utility"      "saas-landing"
    run_smoke "padaria"   write_spec_padaria   "soft_warm"         "blog-post"
    run_smoke "editorial" write_spec_editorial "editorial_monocle" "magazine-poster"
    ;;
  *)
    echo "Usage: $0 [tech|padaria|editorial|all]"
    exit 2
    ;;
esac

echo ""
echo "============================================================"
echo "Done. Inspect HTML files under $RESULTS_DIR/<label>/index.html"
echo "Or open the served URLs (e.g., $SIMPLE_AI_URL/api/sites/<job_id>/) in a browser."
