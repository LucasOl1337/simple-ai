#!/usr/bin/env bash
# Local preview server for the vendored Open Design example.html files.
#
# Generates a small index page listing the 5 vendored skills (used by our
# integration) prominently, plus the rest of OD's example bundles for
# browsing. Then starts python3's built-in static server.
#
# Usage:
#   bash scripts/preview_od_examples.sh           # default port 8765
#   PORT=9000 bash scripts/preview_od_examples.sh # custom port
#
# Stop with Ctrl-C.

set -u

PORT="${PORT:-8765}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVE_DIR="$ROOT_DIR/vendor/open-design"
INDEX="$SERVE_DIR/od-preview-index.html"

VENDORED_SKILLS=(
  "pricing-page"
  "blog-post"
  "web-prototype"
  "saas-landing"
  "magazine-poster"
)

if [ ! -d "$SERVE_DIR" ]; then
  echo "FATAL: $SERVE_DIR not found. Did you run Task 1 (vendor)?" >&2
  exit 1
fi

cd "$SERVE_DIR"

# Generate the index
{
cat <<'HTML_HEAD'
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Open Design — preview local (vendored)</title>
<style>
  :root {
    --bg: #fafaf7;
    --ink: #1a1a1a;
    --muted: #6b6b6b;
    --accent: #2d4a3e;
    --rule: #e0ddd4;
    --card-bg: #fff;
    --shadow: 0 1px 3px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font: 16px/1.55 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    color: var(--ink);
    background: var(--bg);
    padding: clamp(24px, 5vw, 64px);
  }
  header { max-width: 980px; margin: 0 auto 48px; }
  h1 {
    font-size: clamp(28px, 4vw, 44px);
    margin: 0 0 12px;
    letter-spacing: -0.02em;
  }
  header p { color: var(--muted); max-width: 720px; margin: 0; }
  header code { background: #f0ede5; padding: 2px 6px; border-radius: 3px; font-size: .9em; }

  section { max-width: 980px; margin: 0 auto 56px; }
  section h2 {
    font-size: 18px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
    margin: 0 0 8px;
  }
  section .lede { color: var(--muted); margin: 0 0 24px; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 18px;
  }
  a.card {
    display: block;
    background: var(--card-bg);
    border-radius: 10px;
    padding: 20px 22px;
    text-decoration: none;
    color: inherit;
    box-shadow: var(--shadow);
    border: 1px solid transparent;
    transition: border-color .15s, transform .15s;
  }
  a.card:hover { border-color: var(--accent); transform: translateY(-2px); }
  a.card .name {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 4px;
    text-transform: capitalize;
  }
  a.card .meta { color: var(--muted); font-size: 13px; }
  a.card.vendored .name::after {
    content: "✓ vendored";
    margin-left: 8px;
    font-size: 11px;
    background: var(--accent);
    color: #fff;
    padding: 2px 8px;
    border-radius: 999px;
    text-transform: lowercase;
    font-weight: 500;
    vertical-align: middle;
    letter-spacing: 0;
  }
  hr { border: 0; border-top: 1px solid var(--rule); margin: 48px auto; max-width: 980px; }
  footer { max-width: 980px; margin: 0 auto; color: var(--muted); font-size: 13px; }
  footer a { color: var(--accent); }
</style>
</head>
<body>
<header>
  <h1>Open Design — preview local</h1>
  <p>
    Renderização dos arquivos <code>example.html</code> que vieram com cada skill do
    <a href="https://github.com/nexu-io/open-design">Open Design</a>
    (Apache-2.0, vendorizado em <code>vendor/open-design/</code>). Estes são os exemplos
    autorais do projeto upstream — mostram a estética que cada skill produz quando
    rodada com o stack original do OD. Não são (ainda) outputs do nosso builder
    integrado com Opus 4.7. Pra isso, rode <code>scripts/smoke_od_integration.sh</code>
    com <code>ANTHROPIC_API_KEY</code> setada.
  </p>
</header>

<section>
  <h2>Skills vendorizadas (5)</h2>
  <p class="lede">Estas são as skills que nossa integração injeta no system prompt do builder.</p>
  <div class="grid">
HTML_HEAD

for skill in "${VENDORED_SKILLS[@]}"; do
  example="skills/$skill/example.html"
  if [ -f "$example" ]; then
    size_kb=$(( $(stat -f%z "$example" 2>/dev/null || stat -c%s "$example") / 1024 ))
    cat <<EOF
    <a class="card vendored" href="$example" target="_blank">
      <div class="name">$skill</div>
      <div class="meta">${size_kb} KB · skills/$skill/example.html</div>
    </a>
EOF
  fi
done

cat <<'HTML_MID'
  </div>
</section>

<section>
  <h2>Outras skills do OD (não vendorizadas — disponíveis no working tree)</h2>
  <p class="lede">
    Estes example.html foram baixados pelo clone do upstream mas estão gitignorados
    (não fazem parte da nossa integração). Você pode vê-los para referência, mas o
    builder não tem acesso ao SKILL.md correspondente.
  </p>
  <div class="grid">
HTML_MID

for example in skills/*/example.html; do
  skill=$(basename "$(dirname "$example")")
  case " ${VENDORED_SKILLS[*]} " in
    *" $skill "*) continue ;;
  esac
  size_kb=$(( $(stat -f%z "$example" 2>/dev/null || stat -c%s "$example") / 1024 ))
  cat <<EOF
    <a class="card" href="$example" target="_blank">
      <div class="name">$skill</div>
      <div class="meta">${size_kb} KB · not vendored</div>
    </a>
EOF
done

cat <<'HTML_FOOT'
  </div>
</section>

<hr/>

<footer>
  <p>
    Servido por <code>python3 -m http.server</code> a partir de <code>vendor/open-design/</code>.
    Para ver o que nosso builder produzirá com Opus 4.7 + estes ativos, rode o smoke real
    quando <code>ANTHROPIC_API_KEY</code> estiver disponível.
  </p>
</footer>
</body>
</html>
HTML_FOOT
} > "$INDEX"

echo "Index gerado: $INDEX"
echo ""
echo "Servidor estático em http://localhost:$PORT/od-preview-index.html"
echo "Stop: Ctrl-C"
echo ""

exec python3 -m http.server "$PORT" --bind 127.0.0.1
