from __future__ import annotations

import unicodedata
from typing import Any


def clean_text(value: Any, fallback: str = "Não informado") -> str:
    text = str(value or "").strip()
    return text if text else fallback


def normalize_for_match(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", str(text or "").lower())
    return "".join(c for c in nfkd if unicodedata.category(c) != "Mn")


def is_missing_value(value: str) -> bool:
    normalized = normalize_for_match(value).strip()
    return normalized in {"", "nao informado", "nao definido", "none", "null"}
