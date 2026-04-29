from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from urllib import error as urlerror
from urllib import request as urlrequest


def extract_json_object(raw: str) -> Optional[Dict[str, Any]]:
    text = (raw or "").strip()
    if not text:
        return None
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
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


@dataclass(frozen=True)
class FluxoModelConfig:
    model: str
    base_url: str
    api_key: str
    temperature: float
    timeout_seconds: float
    max_retries: int
    retry_backoff_seconds: float


class FluxoModelClient:
    def __init__(self, config: FluxoModelConfig):
        self.config = config

    @classmethod
    def from_env(
        cls,
        *,
        model_env: str,
        default_model: str,
        temperature: float = 0.2,
        timeout_seconds: float = 90,
        max_retries: int = 2,
        retry_backoff_seconds: float = 2,
    ) -> "FluxoModelClient":
        base_url = (
            os.getenv("FLUXO_MODEL_BASE_URL", "").strip()
            or os.getenv("AGENT_LLM_BASE_URL", "").strip()
            or "http://localhost:20128/v1"
        ).rstrip("/")
        api_key = (
            os.getenv("FLUXO_MODEL_API_KEY", "").strip()
            or os.getenv("AGENT_LLM_API_KEY", "").strip()
            or os.getenv("OPENAI_API_KEY", "").strip()
            or "local-no-key"
        )
        model = os.getenv(model_env, "").strip() or default_model
        return cls(FluxoModelConfig(
            model=model,
            base_url=base_url,
            api_key=api_key,
            temperature=temperature,
            timeout_seconds=timeout_seconds,
            max_retries=max_retries,
            retry_backoff_seconds=retry_backoff_seconds,
        ))

    def complete_json(self, *, system_prompt: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False, default=str)},
        ]
        last_error: Optional[Exception] = None
        attempts = max(1, self.config.max_retries + 1)
        for attempt in range(1, attempts + 1):
            try:
                started = time.time()
                content = self._chat_completion(messages)
                parsed = extract_json_object(content)
                if not parsed:
                    raise RuntimeError("modelo nao retornou JSON valido")
                parsed.setdefault("_fluxo_model", self.config.model)
                parsed.setdefault("_fluxo_duration_ms", int((time.time() - started) * 1000))
                parsed.setdefault("_fluxo_attempts", attempt)
                return parsed
            except Exception as error:  # noqa: BLE001
                last_error = error
                if attempt < attempts:
                    time.sleep(self.config.retry_backoff_seconds * attempt)
        raise RuntimeError(f"chamada de modelo FLUXO falhou: {last_error}") from last_error

    def _chat_completion(self, messages: List[Dict[str, str]]) -> str:
        endpoint = f"{self.config.base_url}/chat/completions"
        body = json.dumps({
            "model": self.config.model,
            "temperature": self.config.temperature,
            "messages": messages,
        }, ensure_ascii=False).encode("utf-8")
        req = urlrequest.Request(
            endpoint,
            data=body,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.config.api_key}"},
            method="POST",
        )
        try:
            with urlrequest.urlopen(req, timeout=self.config.timeout_seconds) as response:  # nosec B310
                payload = json.loads(response.read().decode("utf-8"))
        except urlerror.HTTPError as error:
            text = error.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"modelo HTTP {error.code}: {text[:500]}") from error
        except Exception as error:  # noqa: BLE001
            raise RuntimeError(f"modelo request failed: {error}") from error
        if isinstance(payload, dict) and payload.get("error"):
            raise RuntimeError(json.dumps(payload.get("error"), ensure_ascii=False))
        content = payload.get("choices", [{}])[0].get("message", {}).get("content", "") if isinstance(payload, dict) else ""
        if not content:
            raise RuntimeError("modelo retornou resposta vazia")
        return str(content).strip()
