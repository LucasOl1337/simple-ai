from __future__ import annotations

import threading
import time
from collections import deque
from typing import Any, Deque, Dict, Optional


_MAX_EVENTS = 300
_events: Deque[Dict[str, Any]] = deque(maxlen=_MAX_EVENTS)
_lock = threading.Lock()


def add_runtime_log(
    source: str,
    level: str,
    message: str,
    *,
    job_id: Optional[str] = None,
    stage: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    event = {
        "id": f"log_{int(time.time() * 1000)}_{len(_events)}",
        "ts": time.time(),
        "source": source,
        "level": level,
        "message": message,
        "job_id": job_id,
        "stage": stage,
        "details": details or {},
    }
    with _lock:
        _events.append(event)
    return event


def list_runtime_logs(limit: int = 120, level: Optional[str] = None) -> list[Dict[str, Any]]:
    safe_limit = max(1, min(int(limit or 120), _MAX_EVENTS))
    with _lock:
        items = list(_events)
    if level:
        wanted = level.strip().lower()
        items = [item for item in items if str(item.get("level") or "").lower() == wanted]
    return items[-safe_limit:]
