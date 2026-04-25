"""
Agente 02 — Builder runtime.

Streams HTML from Claude (claude-opus-4-7) given a business spec, then writes
the result to disk for the FastAPI app to serve.
"""
from __future__ import annotations

import os
import re
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional

import anthropic

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
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is required for Agente 02.")

        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model or os.getenv("BUILDER_LLM_MODEL", "claude-opus-4-7")
        self.sites_dir = sites_dir
        self.sites_dir.mkdir(parents=True, exist_ok=True)

        self._jobs: Dict[str, BuildJob] = {}
        self._lock = threading.Lock()

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
            html = self._call_claude(job)
            html = _strip_html_fence(html)

            if not html.lower().lstrip().startswith("<!doctype"):
                raise RuntimeError("Modelo não retornou um HTML válido (sem <!doctype>).")

            site_dir = self.sites_dir / job.job_id
            site_dir.mkdir(parents=True, exist_ok=True)
            site_path = site_dir / "index.html"
            site_path.write_text(html, encoding="utf-8")

            with self._lock:
                job.site_path = site_path
                job.site_url = f"/api/sites/{job.job_id}/"
                job.status = "done"

            print(f"[BUILDER] job={job.job_id} done chars={len(html)} url={job.site_url}")

        except Exception as exc:
            print(f"[BUILDER] job={job.job_id} error: {exc}")
            with self._lock:
                job.status = "error"
                job.error = str(exc)

    def _call_claude(self, job: BuildJob) -> str:
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
