# -*- coding: utf-8 -*-
"""LLM agent for SIMPLE-AI intake chat turns."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib import error as urlerror
from urllib import request as urlrequest


_DEFAULT_CONTEXT_FILES = [
    "docs/spec/first-interaction.md",
    "docs/spec/NOTEPAD-SCHEMA.md",
    "docs/spec/flow-order.md",
]


def _load_context_text(project_root: Path) -> str:
    configured = os.getenv("FIRST_INTERACTION_CONTEXT_FILES", "").strip()
    files = (
        [entry.strip() for entry in configured.split(",") if entry.strip()]
        if configured
        else _DEFAULT_CONTEXT_FILES
    )
    chunks: List[str] = []
    for rel_path in files:
        path = (project_root / rel_path).resolve()
        if not path.exists() or not path.is_file():
            raise RuntimeError(f"Arquivo de contexto da primeira interacao nao encontrado: {rel_path}")
        chunks.append(f"# CONTEXT FILE: {rel_path}\n{path.read_text(encoding='utf-8')}".strip())
    return "\n\n".join(chunks).strip()


class FirstInteractionAgent:
    def __init__(self, project_root: Path):
        self.enabled = os.getenv("FIRST_INTERACTION_AGENT_ENABLED", "1").strip().lower() not in {
            "0",
            "false",
            "no",
            "off",
        }
        self.base_url = os.getenv("FIRST_INTERACTION_BASE_URL", "http://localhost:20128/v1").strip()
        self.model = os.getenv("FIRST_INTERACTION_MODEL", "gpt-5.4-mini").strip() or "gpt-5.4-mini"
        self.timeout_s = float(os.getenv("FIRST_INTERACTION_TIMEOUT_SECONDS", "30").strip() or "30")
        self.api_key = (
            os.getenv("FIRST_INTERACTION_API_KEY", "").strip()
            or os.getenv("NINEROUTER_API_KEY", "").strip()
            or os.getenv("OPENAI_API_KEY", "").strip()
        )
        self.context_text = _load_context_text(project_root)

        if not self.enabled:
            print("[FIRST_INTERACTION] disabled via FIRST_INTERACTION_AGENT_ENABLED.")
            return

        print(
            f"[FIRST_INTERACTION] enabled base_url={self.base_url!r} "
            f"model={self.model!r} context_loaded={bool(self.context_text)}"
        )

    def generate_reply(
        self,
        *,
        user_message: str,
        filtered_message: Optional[str] = None,
        notepad: Optional[Dict[str, Any]] = None,
        local_next_question: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        raw = (user_message or "").strip()
        filtered = (filtered_message or raw).strip()
        if not raw:
            raise ValueError("Mensagem vazia: a primeira interacao precisa de conteudo do usuario.")
        if not self.enabled:
            raise RuntimeError("Agente da primeira interacao desativado.")

        payload = {
            "session_id": session_id,
            "user_message": raw,
            "filtered_message": filtered,
            "notepad_state": notepad or {},
            "local_next_question": local_next_question,
        }
        result = self.generate_turn_reply(
            user_message=raw,
            filtered_message=filtered,
            notepad=notepad,
            local_next_question=local_next_question,
            transcript=[],
            session_id=session_id,
            is_first_turn=True,
        )
        return {
            "assistant_message": result["assistant_message"],
            "provider": result["provider"],
            "model": result["model"],
            "base_url": result["base_url"],
        }

    def generate_turn_reply(
        self,
        *,
        user_message: str,
        filtered_message: Optional[str] = None,
        notepad: Optional[Dict[str, Any]] = None,
        local_next_question: Optional[str] = None,
        transcript: Optional[List[Dict[str, Any]]] = None,
        session_id: Optional[str] = None,
        is_first_turn: bool = False,
    ) -> Dict[str, Any]:
        raw = (user_message or "").strip()
        filtered = (filtered_message or raw).strip()
        if not raw:
            raise ValueError("Mensagem vazia: o agente de turno precisa de conteudo do usuario.")
        if not self.enabled:
            raise RuntimeError("Agente de turno desativado.")

        payload = {
            "session_id": session_id,
            "is_first_turn": is_first_turn,
            "user_message": raw,
            "filtered_message": filtered,
            "notepad_state": notepad or {},
            "local_next_question": local_next_question,
            "transcript_tail": (transcript or [])[-10:],
        }
        content = self._chat_completion(
            messages=[
                {"role": "system", "content": self._build_system_prompt()},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ]
        )
        parsed = self._extract_json(content)
        assistant_message = str(parsed.get("assistant_message") or "").strip()
        if not assistant_message:
            raise RuntimeError("Agente de turno retornou resposta invalida: assistant_message ausente.")
        action = str(parsed.get("action") or "continue").strip()
        if action not in {"continue", "build_with_defaults", "start_build", "answer_only"}:
            action = "continue"
        return {
            "assistant_message": assistant_message,
            "action": action,
            "intent": str(parsed.get("intent") or "intake_turn").strip(),
            "confidence": parsed.get("confidence", 0.8),
            "provider": "9router-openai-compatible",
            "model": self.model,
            "base_url": self.base_url,
        }

    def _build_system_prompt(self) -> str:
        return f"""
You are the SIMPLE-AI intake turn agent.

Your job: answer every user turn intelligently before the local planner continues.

Product rules:
- Speak in Portuguese unless the user clearly used another language.
- Do not use technical jargon: no frontend, backend, API, deploy, database, endpoint, stack.
- Assume the user is very non-technical, like an elderly person or a small local business owner.
- Guide the user gently. Your tone should feel calm, practical, and reassuring.
- Prefer simple words, concrete examples, and short sentences.
- Adapt to the user request. Do not blindly repeat local_next_question.
- Ask at most one next question.
- Prefer local_next_question only when it fits the user's latest intent.
- If the user seems unsure, give a short example of the kind of answer that helps.
- Prioritize reaching a useful first preview quickly. The first preview should usually be possible within 4 useful user answers.
- Once the basics are clear enough for a decent first version, avoid digging for optional details. Suggest moving forward.
- If the user asks which model/agent is responding, answer directly and then return to the task.
- If the user says they do not want to provide more details and asks for defaults/test/demo/example, choose action build_with_defaults.
- If the provided notepad_state already shows enough basics for a first version, choose action start_build instead of asking another optional question.
- If action is build_with_defaults, do not ask another question. Say you will create a test version using safe defaults.
- Keep it concise: 2 short paragraphs maximum.
- Return ONLY valid JSON in this shape:
  {{"assistant_message":"...","action":"continue|build_with_defaults|start_build|answer_only","intent":"...","confidence":0.0}}

Context:
{self.context_text}
""".strip()

    def _extract_json(self, raw: str) -> Dict[str, Any]:
        text = (raw or "").strip()
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                parsed = json.loads(text[start : end + 1])
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass
        raise RuntimeError("Agente de turno retornou JSON invalido.")

    def _chat_completion(self, *, messages: List[Dict[str, Any]]) -> str:
        endpoint = f"{self.base_url.rstrip('/')}/chat/completions"
        payload = self._post_json(
            endpoint=endpoint,
            payload={"model": self.model, "temperature": 0.2, "messages": messages},
        )
        if isinstance(payload, dict) and "error" in payload:
            message = json.dumps(payload.get("error", {}), ensure_ascii=False)
            raise RuntimeError(f"Agente da primeira interacao recusado pelo endpoint: {message}")

        content = payload.get("choices", [{}])[0].get("message", {}).get("content", "")
        if not content:
            raise RuntimeError("Endpoint da primeira interacao retornou resposta vazia.")
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
                raise RuntimeError(f"first interaction endpoint HTTP {error.code}: {text[:300]}") from json_error
        except Exception as error:
            raise RuntimeError(f"first interaction endpoint request failed: {error}") from error
