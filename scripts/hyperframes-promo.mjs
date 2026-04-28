import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function usage() {
  console.log(`Usage: node scripts/hyperframes-promo.mjs <job_id|site_dir> [output_dir]

Examples:
  node scripts/hyperframes-promo.mjs job_1777341425_4595
  node scripts/hyperframes-promo.mjs api/sites/job_1777341425_4595 tmp/hyperframes-promos/demo

Then preview or render:
  npx hyperframes lint <output_dir>
  npx hyperframes preview <output_dir>
  npx hyperframes render <output_dir> -o <output_dir>/promo.mp4`);
}

function resolveSiteDir(input) {
  if (!input) return null;
  const direct = path.resolve(rootDir, input);
  if (fs.existsSync(path.join(direct, "index.html"))) return direct;
  const byJob = path.join(rootDir, "api", "sites", input);
  if (fs.existsSync(path.join(byJob, "index.html"))) return byJob;
  return direct;
}

function stripTags(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function matchFirst(html, regex) {
  const match = html.match(regex);
  return match ? stripTags(match[1] || "") : "";
}

function extractMeta(html) {
  const title = matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
    || matchFirst(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)
    || "Site gerado";
  const h1 = matchFirst(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || title;
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || matchFirst(html, /<p[^>]*>([\s\S]*?)<\/p>/i)
    || "Uma presenca digital clara, bonita e pronta para receber clientes.";
  const cta = matchFirst(html, /<a[^>]*>([\s\S]*?)<\/a>/i)
    || matchFirst(html, /<button[^>]*>([\s\S]*?)<\/button>/i)
    || "Conheca agora";
  const colors = [...html.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase());
  const uniqueColors = [...new Set(colors)].slice(0, 4);
  return { title, h1, description, cta, colors: uniqueColors };
}

function cssEscapeText(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function jsString(value) {
  return JSON.stringify(String(value));
}

function createIndex(meta) {
  const primary = meta.colors[0] || "#f59e0b";
  const accent = meta.colors[1] || "#38bdf8";
  const paper = meta.colors.find((color) => color !== primary && color !== accent) || "#f8fafc";
  const title = cssEscapeText(meta.h1 || meta.title);
  const description = cssEscapeText(meta.description);
  const cta = cssEscapeText(meta.cta);
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #08090d; }
      body { font-family: Georgia, 'Times New Roman', serif; color: ${paper}; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: radial-gradient(circle at 22% 18%, ${primary}66, transparent 30%), radial-gradient(circle at 82% 74%, ${accent}55, transparent 28%), linear-gradient(135deg, #08090d 0%, #151823 100%); }
      .grain { position: absolute; inset: 0; opacity: 0.18; background-image: repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px); mix-blend-mode: overlay; }
      .scene { position: absolute; inset: 0; width: 100%; height: 100%; padding: 112px 136px; display: flex; flex-direction: column; justify-content: center; gap: 34px; }
      .eyebrow { font: 700 30px/1.1 Arial, sans-serif; letter-spacing: 0.22em; text-transform: uppercase; color: ${accent}; }
      .title { max-width: 1180px; font-size: 122px; line-height: 0.92; letter-spacing: -0.06em; margin: 0; }
      .copy { max-width: 880px; font: 400 42px/1.28 Arial, sans-serif; color: rgba(248,250,252,0.84); margin: 0; }
      .cta { display: inline-flex; align-self: flex-start; margin-top: 18px; padding: 26px 38px; border: 2px solid rgba(255,255,255,0.24); border-radius: 999px; background: ${paper}; color: #0b0c10; font: 800 30px/1 Arial, sans-serif; }
      .panel { position: absolute; right: 120px; bottom: 112px; width: 520px; min-height: 300px; padding: 34px; border: 1px solid rgba(255,255,255,0.18); border-radius: 34px; background: rgba(255,255,255,0.09); backdrop-filter: blur(18px); font: 400 32px/1.35 Arial, sans-serif; color: rgba(255,255,255,0.86); }
      .bar { position: absolute; left: 136px; bottom: 96px; width: 720px; height: 10px; border-radius: 999px; background: rgba(255,255,255,0.14); overflow: hidden; }
      .bar span { display: block; width: 100%; height: 100%; transform-origin: left center; background: linear-gradient(90deg, ${primary}, ${accent}); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="12" data-width="1920" data-height="1080">
      <div class="grain"></div>
      <section id="scene" class="scene clip" data-start="0" data-duration="12" data-track-index="1">
        <div class="eyebrow">Novo site pronto</div>
        <h1 class="title">${title}</h1>
        <p class="copy">${description}</p>
        <div class="cta">${cta}</div>
      </section>
      <aside class="panel clip" data-start="3" data-duration="7" data-track-index="2">Uma pagina clara, responsiva e pensada para transformar visitantes em conversas reais.</aside>
      <div class="bar"><span></span></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
      tl.from(".eyebrow", { y: 34, opacity: 0, duration: 0.7 }, 0.2);
      tl.from(".title", { y: 68, opacity: 0, duration: 0.9 }, 0.45);
      tl.from(".copy", { y: 42, opacity: 0, duration: 0.75 }, 0.9);
      tl.from(".cta", { y: 28, scale: 0.96, opacity: 0, duration: 0.65, ease: "back.out(1.4)" }, 1.25);
      tl.from(".panel", { x: 80, opacity: 0, duration: 0.8, ease: "expo.out" }, 3.1);
      tl.fromTo(".bar span", { scaleX: 0 }, { scaleX: 1, duration: 11.4, ease: "none" }, 0.3);
      tl.to([".title", ".copy", ".cta", ".panel"], { y: -28, opacity: 0, duration: 0.65, stagger: 0.06, ease: "power2.in" }, 10.9);
      window.__timelines["main"] = tl;
      document.title = ${jsString(`Promo - ${meta.title}`)};
    </script>
  </body>
</html>`;
}

const input = process.argv[2];
if (!input || input === "--help" || input === "-h") {
  usage();
  process.exit(input ? 0 : 1);
}

const siteDir = resolveSiteDir(input);
const indexPath = path.join(siteDir, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error(`Site index.html not found: ${indexPath}`);
  process.exit(1);
}

const projectName = `promo-${path.basename(siteDir)}`.replace(/[^a-zA-Z0-9_-]/g, "-");
const outputDir = path.resolve(rootDir, process.argv[3] || path.join("tmp", "hyperframes-promos", projectName));
fs.mkdirSync(outputDir, { recursive: true });

const html = fs.readFileSync(indexPath, "utf-8");
const meta = extractMeta(html);
fs.writeFileSync(path.join(outputDir, "index.html"), createIndex(meta), "utf-8");
fs.writeFileSync(path.join(outputDir, "hyperframes.json"), JSON.stringify({
  $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
  registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
  paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
}, null, 2) + "\n", "utf-8");
fs.writeFileSync(path.join(outputDir, "meta.json"), JSON.stringify({
  id: projectName,
  name: projectName,
  sourceSite: path.relative(rootDir, siteDir).replace(/\\/g, "/"),
  createdAt: new Date().toISOString(),
}, null, 2) + "\n", "utf-8");

console.log(`HyperFrames promo project created: ${path.relative(rootDir, outputDir)}`);
console.log(`Run: npx hyperframes lint "${outputDir}"`);
console.log(`Run: npx hyperframes preview "${outputDir}"`);
console.log(`Run: npx hyperframes render "${outputDir}" -o "${path.join(outputDir, "promo.mp4")}"`);
