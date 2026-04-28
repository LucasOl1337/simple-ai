# -*- coding: utf-8 -*-
"""
Agent that filters each intake message before it reaches the local planner.

It uses an OpenAI-compatible endpoint and .md context files to keep filtering
aligned with the SIMPLE-AI intake flow.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib import error as urlerror
from urllib import request as urlrequest


_DEFAULT_CONTEXT_FILES = [
    "docs/agents/intake-filter/system.md",
    "docs/spec/NOTEPAD-SCHEMA.md",
    "docs/spec/flow-order.md",
    "docs/spec/first-interaction.md",
]


def _load_context_text(project_root: Path) -> str:
    configured = os.getenv("INTAKE_FILTER_CONTEXT_FILES", "").strip()
    files = (
        [entry.strip() for entry in configured.split(",") if entry.strip()]
        if configured
        else _DEFAULT_CONTEXT_FILES
    )

    chunks: List[str] = []
    for rel_path in files:
        path = (project_root / rel_path).resolve()
        if not path.exists() or not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except Exception:
            continue
        chunks.append(f"# CONTEXT FILE: {rel_path}\n{text}".strip())
    return "\n\n".join(chunks).strip()


def _extract_json_object(raw: str) -> Optional[Dict[str, Any]]:
    text = (raw or "").strip()
    if not text:
        return None

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


class IntakeFilterAgent:
    def __init__(self, project_root: Path):
        self.enabled = os.getenv("INTAKE_FILTER_ENABLED", "1").strip().lower() not in {
            "0",
            "false",
            "no",
            "off",
        }
        self.base_url = os.getenv("INTAKE_FILTER_BASE_URL", "http://localhost:20128/v1").strip()
        self.model = os.getenv("INTAKE_FILTER_MODEL", "cx/gpt-5.4").strip() or "cx/gpt-5.4"
        self.timeout_s = float(os.getenv("INTAKE_FILTER_TIMEOUT_SECONDS", "20").strip() or "20")
        self.api_key = (
            os.getenv("INTAKE_FILTER_API_KEY", "").strip()
            or os.getenv("OPENAI_API_KEY", "").strip()
            or "local-no-key"
        )
        self.context_text = _load_context_text(project_root)
        self.client = None
        self.transport = "openai-sdk"
        self.available_models: List[str] = []

        if not self.enabled:
            print("[INTAKE_FILTER] disabled via INTAKE_FILTER_ENABLED.")
            return

        try:
            import openai as _openai
        except ImportError:
            self.transport = "http"
            print("[INTAKE_FILTER] openai package not found, using HTTP transport.")
        else:
            self.client = _openai.OpenAI(
                api_key=self.api_key,
                base_url=self.base_url or None,
                timeout=self.timeout_s,
            )
        print(
            f"[INTAKE_FILTER] enabled base_url={self.base_url!r} "
            f"model={self.model!r} context_loaded={bool(self.context_text)} "
            f"transport={self.transport}"
        )
        self._discover_models()

    def _build_system_prompt(self) -> str:
        core_rules = """
You are the SIMPLE-AI Intake Filter Agent.
Goal: rewrite the user message so it is clearer for the local planner, without changing intent.

Rules:
- Keep original meaning and concrete facts.
- Preserve language (if user writes in Portuguese, output in Portuguese).
- Remove repetition, filler, and noise.
- Keep business details, constraints, channels, goals, and user preferences.
- Do not invent data.
- Do not answer the planner question directly if user did not provide that information.
- Keep response concise (normally one short paragraph).
- Return ONLY valid JSON in this exact shape:
  {"filtered_message":"...","intent":"...","confidence":0.0,"notes":"..."}
""".strip()

        if not self.context_text:
            return core_rules
        return f"{core_rules}\n\nContext:\n{self.context_text}"

    def filter_message(
        self,
        *,
        user_message: str,
        current_question: Optional[str] = None,
        current_question_id: Optional[str] = None,
        transcript: Optional[List[Dict[str, Any]]] = None,
        notepad: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        raw = (user_message or "").strip()
        if not raw:
            raise ValueError("Mensagem vazia: o filtro nao deve rodar sem conteudo.")

        if not self.enabled:
            raise RuntimeError("Agente-filtro desativado. Defina INTAKE_FILTER_ENABLED=1 para usar o chat.")

        payload = {
            "session_id": session_id,
            "current_question_id": current_question_id,
            "current_question": current_question,
            "user_message": raw,
            "transcript_tail": (transcript or [])[-8:],
            "notepad_state": notepad or {},
        }

        content = self._chat_completion(
            messages=[
                {"role": "system", "content": self._build_system_prompt()},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ]
        )
        parsed = _extract_json_object(content) or {}

        filtered = (parsed.get("filtered_message") or "").strip()
        if not filtered:
            raise RuntimeError("Agente-filtro retornou resposta invalida: filtered_message ausente.")
        intent = str(parsed.get("intent") or "").strip()
        notes = str(parsed.get("notes") or "").strip()

        confidence_raw = parsed.get("confidence")
        try:
            confidence = float(confidence_raw)
        except (TypeError, ValueError):
            confidence = 0.8
        confidence = max(0.0, min(1.0, confidence))

        return {
            "filtered_message": filtered,
            "intent": intent or "intake-message",
            "confidence": confidence,
            "notes": notes or "filtered",
            "passthrough": False,
            "provider": "openai-compatible",
            "model": self.model,
            "base_url": self.base_url,
        }

    def _chat_completion(self, *, messages: List[Dict[str, Any]]) -> str:
        if self.transport == "openai-sdk" and self.client is not None:
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    temperature=0.1,
                    messages=messages,
                )
                return (response.choices[0].message.content or "").strip()
            except Exception as error:
                raise RuntimeError(f"Agente-filtro falhou no SDK OpenAI-compatible: {error}") from error

        endpoint = f"{self.base_url.rstrip('/')}/chat/completions"
        payload = self._post_json(
            endpoint=endpoint,
            payload={"model": self.model, "temperature": 0.1, "messages": messages},
        )

        if isinstance(payload, dict) and "error" in payload:
            message = json.dumps(payload.get("error", {}), ensure_ascii=False)
            raise RuntimeError(f"Agente-filtro recusado pelo endpoint: {message}")

        content = payload.get("choices", [{}])[0].get("message", {}).get("content", "")
        if not content:
            raise RuntimeError("Agente-filtro retornou resposta vazia do endpoint.")
        return str(content).strip()

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _post_json(self, *, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urlrequest.Request(endpoint, data=body, headers=self._headers(), method="POST")
        try:
            with urlrequest.urlopen(req, timeout=self.timeout_s) as response:  # nosec B310
                return json.loads(response.read().decode("utf-8"))
        except urlerror.HTTPError as error:
            text = error.read().decode("utf-8", errors="ignore")
            try:
                return json.loads(text)
            except json.JSONDecodeError as json_error:
                raise RuntimeError(f"filter endpoint HTTP {error.code}: {text[:300]}") from json_error
        except Exception as error:
            raise RuntimeError(f"filter endpoint request failed: {error}") from error

    def _discover_models(self) -> None:
        endpoint = f"{self.base_url.rstrip('/')}/models"
        req = urlrequest.Request(endpoint, headers=self._headers(), method="GET")
        try:
            with urlrequest.urlopen(req, timeout=self.timeout_s) as response:  # nosec B310
                payload = json.loads(response.read().decode("utf-8"))
        except Exception:
            return

        items = payload.get("data", []) if isinstance(payload, dict) else []
        models = [str(item.get("id", "")).strip() for item in items if isinstance(item, dict)]
        self.available_models = [model for model in models if model]
        if not self.available_models:
            return
        if self.model not in self.available_models:
            raise RuntimeError(
                f"Modelo do agente-filtro indisponivel: {self.model!r}. "
                f"Modelos disponiveis: {', '.join(self.available_models)}"
            )
