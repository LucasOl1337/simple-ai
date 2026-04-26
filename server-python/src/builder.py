"""
Agente 02 — Builder runtime.

Streams HTML from Claude (claude-opus-4-7) given a business spec, then writes
the result to disk for the FastAPI app to serve.
"""
from __future__ import annotations

import os
import re
import html
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import quote

try:
    import anthropic
except ImportError:  # pragma: no cover - optional in local fallback mode
    anthropic = None

from prompts.builder import (
    AGENTE_02_BUILDER_SYSTEM_PROMPT,
    PROMPT_VERSION,
    build_messages,
)


HTML_FENCE_PATTERN = re.compile(
    r"^```(?:html)?\s*\n(.*?)\n```\s*$",
    re.DOTALL,
)


@dataclass
class BuildJob:
    job_id: str
    status: str  # queued | building | done | error
    spec: Dict[str, Any]
    site_path: Optional[Path] = None
    site_url: Optional[str] = None
    error: Optional[str] = None
    streamed_chars: int = 0
    usage: Dict[str, int] = field(default_factory=dict)

    def snapshot(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "status": self.status,
            "site_url": self.site_url,
            "error": self.error,
            "streamed_chars": self.streamed_chars,
            "usage": self.usage,
        }


def _strip_html_fence(text: str) -> str:
    text = text.strip()
    match = HTML_FENCE_PATTERN.match(text)
    if match:
        return match.group(1).strip()
    if text.lower().startswith("<!doctype"):
        return text
    doctype_idx = text.lower().find("<!doctype")
    if doctype_idx > 0:
        return text[doctype_idx:].strip()
    return text


class BuilderAgent:
    def __init__(self, sites_dir: Path, model: Optional[str] = None):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        self.use_local_fallback = not api_key

        if api_key and anthropic is None:
            raise RuntimeError("anthropic package is required when ANTHROPIC_API_KEY is set.")

        self.client = anthropic.Anthropic(api_key=api_key) if api_key else None
        self.model = model or os.getenv("BUILDER_LLM_MODEL", "claude-opus-4-7")
        self.sites_dir = sites_dir
        self.sites_dir.mkdir(parents=True, exist_ok=True)

        self._jobs: Dict[str, BuildJob] = {}
        self._lock = threading.Lock()

        if self.use_local_fallback:
            print("[BUILDER] ANTHROPIC_API_KEY missing; using local deterministic builder.")

    def get_job(self, job_id: str) -> Optional[BuildJob]:
        with self._lock:
            return self._jobs.get(job_id)

    def enqueue(self, job_id: str, spec: Dict[str, Any]) -> BuildJob:
        job = BuildJob(job_id=job_id, status="queued", spec=spec)
        with self._lock:
            self._jobs[job_id] = job
        thread = threading.Thread(
            target=self._run_build,
            args=(job,),
            name=f"builder-{job_id}",
            daemon=True,
        )
        thread.start()
        return job

    def _run_build(self, job: BuildJob) -> None:
        with self._lock:
            job.status = "building"

        try:
            generated_html = (
                self._build_local_html(job)
                if self.use_local_fallback
                else _strip_html_fence(self._call_claude(job))
            )

            if not generated_html.lower().lstrip().startswith("<!doctype"):
                raise RuntimeError("Modelo não retornou um HTML válido (sem <!doctype>).")

            site_dir = self.sites_dir / job.job_id
            site_dir.mkdir(parents=True, exist_ok=True)
            site_path = site_dir / "index.html"
            site_path.write_text(generated_html, encoding="utf-8")

            with self._lock:
                job.site_path = site_path
                job.site_url = f"/api/sites/{job.job_id}/"
                job.status = "done"
                if self.use_local_fallback:
                    job.usage = {"local_fallback": 1}

            print(f"[BUILDER] job={job.job_id} done chars={len(generated_html)} url={job.site_url}")

        except Exception as exc:
            print(f"[BUILDER] job={job.job_id} error: {exc}")
            with self._lock:
                job.status = "error"
                job.error = str(exc)

    def _call_claude(self, job: BuildJob) -> str:
        if self.client is None:
            raise RuntimeError("ANTHROPIC_API_KEY is required for remote generation.")

        messages = build_messages(job.spec)

        chunks: list[str] = []
        with self.client.messages.stream(
            model=self.model,
            max_tokens=32000,
            system=[
                {
                    "type": "text",
                    "text": AGENTE_02_BUILDER_SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=messages,
            metadata={"user_id": f"simple-ai-builder-{PROMPT_VERSION}"},
        ) as stream:
            for text in stream.text_stream:
                chunks.append(text)
                with self._lock:
                    job.streamed_chars += len(text)

            final_message = stream.get_final_message()

        with self._lock:
            job.usage = {
                "input_tokens": final_message.usage.input_tokens,
                "output_tokens": final_message.usage.output_tokens,
                "cache_read_input_tokens": getattr(
                    final_message.usage, "cache_read_input_tokens", 0
                )
                or 0,
                "cache_creation_input_tokens": getattr(
                    final_message.usage, "cache_creation_input_tokens", 0
                )
                or 0,
            }

        return "".join(chunks)

    def _build_local_html(self, job: BuildJob) -> str:
        summary = job.spec.get("summary") or {}
        business_name = _clean_text(
            job.spec.get("business_name")
            or summary.get("brand_name")
            or "Seu negocio"
        )
        segment = _clean_text(
            job.spec.get("segment")
            or summary.get("business_type")
            or "Negocio local"
        )
        primary_cta = _clean_text(
            summary.get("primary_cta")
            or "Chamar no WhatsApp"
        )
        tone = _clean_text(summary.get("brand_tone") or "profissional e acessivel")
        scope = _clean_text(summary.get("scope") or "local")
        modules = job.spec.get("user_facing_actions") or summary.get("modules") or []
        quotes = job.spec.get("raw_quotes") or []

        module_labels = []
        for item in modules:
            if isinstance(item, dict):
                label = item.get("label") or item.get("id")
            else:
                label = str(item)
            if label:
                module_labels.append(_clean_text(label))

        if not module_labels:
            module_labels = ["Apresentacao clara", "Servicos ou produtos", "Contato"]

        quote_items = [_clean_text(q) for q in quotes[-3:] if str(q).strip()]
        cta_href = "#contato"
        if "whatsapp" in primary_cta.lower():
            message = quote(f"Ola, vim pelo site da {business_name}. Quero saber mais.")
            cta_href = f"https://wa.me/?text={message}"

        service_items = []
        quote_text = " ".join(quote_items).lower()
        for label in ["corte masculino", "barba", "combo corte com barba", "agendamento", "whatsapp", "instagram"]:
            if label in quote_text:
                service_items.append(label.title())
        if not service_items:
            service_items = module_labels[:3]

        return f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(business_name)} - site gerado</title>
  <style>
    :root {{
      color-scheme: light;
      --ink: #17211b;
      --muted: #5d6b63;
      --paper: #fbfaf6;
      --line: #d8ded5;
      --accent: #2f7d59;
      --accent-dark: #1f5f42;
      --warm: #f3dfb6;
      --card: rgba(255, 255, 255, 0.78);
      --shadow: 0 24px 70px rgba(23, 33, 27, 0.12);
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--paper);
      color: var(--ink);
      line-height: 1.55;
    }}
    header, section, footer {{ padding: 32px min(7vw, 72px); }}
    header {{
      min-height: 78vh;
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.75fr);
      align-items: center;
      gap: clamp(28px, 6vw, 96px);
      background:
        radial-gradient(circle at 78% 20%, rgba(47, 125, 89, 0.2), transparent 28%),
        linear-gradient(120deg, rgba(47, 125, 89, 0.16), rgba(243, 223, 182, 0.64)),
        var(--paper);
      border-bottom: 1px solid var(--line);
    }}
    .eyebrow {{ color: var(--accent-dark); font-weight: 700; text-transform: uppercase; font-size: 13px; }}
    h1 {{ max-width: 840px; margin: 0; font-size: clamp(40px, 7vw, 88px); line-height: 1; letter-spacing: 0; }}
    h2 {{ margin: 0 0 16px; font-size: clamp(26px, 3vw, 42px); letter-spacing: 0; }}
    p {{ max-width: 760px; margin: 0; color: var(--muted); font-size: 18px; }}
    .cta {{
      width: fit-content;
      display: inline-flex;
      align-items: center;
      min-height: 48px;
      padding: 0 20px;
      border-radius: 8px;
      background: var(--accent);
      color: white;
      text-decoration: none;
      font-weight: 700;
      box-shadow: 0 12px 28px rgba(47, 125, 89, 0.22);
    }}
    .hero-copy {{ display: grid; gap: 24px; }}
    .hero-panel {{
      background: rgba(255, 255, 255, 0.62);
      border: 1px solid rgba(23, 33, 27, 0.1);
      border-radius: 28px;
      box-shadow: var(--shadow);
      padding: clamp(22px, 4vw, 34px);
      display: grid;
      gap: 14px;
    }}
    .hero-panel h2 {{ font-size: clamp(24px, 3vw, 36px); margin: 0; }}
    .hero-list {{ display: grid; gap: 10px; padding: 0; margin: 0; list-style: none; }}
    .hero-list li {{
      align-items: center;
      background: white;
      border: 1px solid var(--line);
      border-radius: 14px;
      display: flex;
      justify-content: space-between;
      padding: 13px 14px;
      font-weight: 700;
    }}
    .hero-list span {{ color: var(--accent-dark); font-size: 13px; text-transform: uppercase; }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      max-width: 960px;
    }}
    .card {{
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 20px;
      background: var(--card);
      box-shadow: 0 12px 34px rgba(23, 33, 27, 0.055);
      min-height: 112px;
    }}
    .card strong {{ display: block; margin-bottom: 8px; }}
    .contact-strip {{
      align-items: center;
      background: #17211b;
      border-radius: 24px;
      color: white;
      display: flex;
      gap: 18px;
      justify-content: space-between;
      margin: 10px min(7vw, 72px) 42px;
      padding: 24px;
    }}
    .contact-strip p {{ color: rgba(255, 255, 255, 0.72); }}
    footer {{ border-top: 1px solid var(--line); color: var(--muted); }}
    @media (max-width: 820px) {{
      header {{ grid-template-columns: 1fr; min-height: auto; padding-top: 72px; }}
      .contact-strip {{ align-items: flex-start; flex-direction: column; margin-inline: 18px; }}
    }}
  </style>
</head>
<body>
  <header>
    <div class="hero-copy">
      <div class="eyebrow">{html.escape(segment)}</div>
      <h1>{html.escape(business_name)}</h1>
      <p>Uma presenca digital clara para apresentar o negocio, destacar os servicos certos e levar o visitante direto para a proxima acao: {html.escape(primary_cta)}.</p>
      <a class="cta" href="{cta_href}">{html.escape(primary_cta)}</a>
    </div>
    <aside class="hero-panel" aria-label="Resumo do site">
      <span class="eyebrow">Primeira versao</span>
      <h2>Pronto para converter visitantes em conversas.</h2>
      <ul class="hero-list">
        {"".join(f'<li>{html.escape(item)}<span>incluido</span></li>' for item in service_items[:4])}
      </ul>
    </aside>
  </header>

  <section>
    <h2>O que o site precisa comunicar</h2>
    <div class="grid">
      <div class="card"><strong>Negocio</strong><span>{html.escape(segment)}</span></div>
      <div class="card"><strong>Regiao</strong><span>{html.escape(scope)}</span></div>
      <div class="card"><strong>Tom</strong><span>{html.escape(tone)}</span></div>
    </div>
  </section>

  <section>
    <h2>Estrutura sugerida</h2>
    <div class="grid">
      {"".join(f'<div class="card"><strong>{html.escape(label)}</strong><span>Bloco pensado para explicar, reduzir duvidas e aproximar o cliente do contato.</span></div>' for label in module_labels)}
    </div>
  </section>

  <section>
    <h2>Briefing usado</h2>
    <div class="grid">
      {"".join(f'<div class="card"><span>{html.escape(q)}</span></div>' for q in quote_items) or '<div class="card"><span>Sem frases recentes no briefing.</span></div>'}
    </div>
  </section>

  <div class="contact-strip" id="contato">
    <div>
      <strong>Gostou da estrutura?</strong>
      <p>Use esta primeira versao como base e refine textos, fotos e chamadas com o Simple-AI.</p>
    </div>
    <a class="cta" href="{cta_href}">{html.escape(primary_cta)}</a>
  </div>

  <footer>Primeira versao local gerada em modo desenvolvimento.</footer>
</body>
</html>
"""


def _clean_text(value: Any) -> str:
    text = str(value or "").strip()
    return text if text else "Nao informado"
