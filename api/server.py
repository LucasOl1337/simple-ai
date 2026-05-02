# -*- coding: utf-8 -*-
import json
import os
import random
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from runtime_logs import add_runtime_log, list_runtime_logs

# Add project root to sys.path so builder.* modules can be imported
_API_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT_DIR = os.path.dirname(_API_DIR)
if _ROOT_DIR not in sys.path:
    sys.path.insert(0, _ROOT_DIR)

try:
    from agents.oci_agent import Agente03
except ImportError as error:  # pragma: no cover
    Agente03 = None
    OCI_IMPORT_ERROR = error
else:
    OCI_IMPORT_ERROR = None

try:
    from agents.intake_filter_agent import IntakeFilterAgent
except ImportError as error:  # pragma: no cover
    IntakeFilterAgent = None
    INTAKE_FILTER_IMPORT_ERROR = error
else:
    INTAKE_FILTER_IMPORT_ERROR = None

try:
    from agents.first_interaction_agent import FirstInteractionAgent
except ImportError as error:  # pragma: no cover
    FirstInteractionAgent = None
    FIRST_INTERACTION_IMPORT_ERROR = error
else:
    FIRST_INTERACTION_IMPORT_ERROR = None

try:
    from agents.link_content_agent import LinkContentAgent, extract_urls
except ImportError as error:  # pragma: no cover
    LinkContentAgent = None
    extract_urls = None
    LINK_CONTENT_IMPORT_ERROR = error
else:
    LINK_CONTENT_IMPORT_ERROR = None

from builder.agent.builder_agent import BuilderAgent
from builder.core.site_score import score_site_html


BASE_DIR = _API_DIR
load_dotenv(os.path.join(BASE_DIR, ".env.local"))
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv(os.path.join(_ROOT_DIR, ".env.local"))
load_dotenv(os.path.join(_ROOT_DIR, ".env"))


def to_http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, RuntimeError):
        return HTTPException(status_code=500, detail=str(exc))
    return HTTPException(status_code=500, detail=f"Internal error: {exc}")


def safe_print(message: str) -> None:
    try:
        print(message)
    except UnicodeEncodeError:
        print(message.encode("ascii", "backslashreplace").decode("ascii"))


SITES_DIR = Path(BASE_DIR) / "sites"
LINK_ASSETS_DIR = Path(BASE_DIR) / "link-assets"
try:
    builder = BuilderAgent(sites_dir=SITES_DIR)
    add_runtime_log("api", "info", "BuilderAgent inicializado", stage="startup")
except RuntimeError as error:
    print(f"Warning: failed to initialize Agente 02 builder: {error}")
    add_runtime_log("api", "error", "Falha ao inicializar BuilderAgent", stage="startup", details={"error": str(error)})
    builder = None

try:
    if Agente03 is None:
        raise RuntimeError(f"Agente 03 import failed: {OCI_IMPORT_ERROR}")
    oci_agent: Optional[Agente03] = Agente03()
except Exception as error:  # noqa: BLE001
    print(f"Warning: failed to initialize Agente 03 (OCI): {error}")
    oci_agent = None

try:
    if IntakeFilterAgent is None:
        raise RuntimeError(f"IntakeFilterAgent import failed: {INTAKE_FILTER_IMPORT_ERROR}")
    intake_filter_agent: Optional[IntakeFilterAgent] = IntakeFilterAgent(project_root=Path(_ROOT_DIR))
except Exception as error:  # noqa: BLE001
    print(f"Warning: failed to initialize intake filter agent: {error}")
    intake_filter_agent = None

try:
    if FirstInteractionAgent is None:
        raise RuntimeError(f"FirstInteractionAgent import failed: {FIRST_INTERACTION_IMPORT_ERROR}")
    first_interaction_agent: Optional[FirstInteractionAgent] = FirstInteractionAgent(project_root=Path(_ROOT_DIR))
except Exception as error:  # noqa: BLE001
    print(f"Warning: failed to initialize first interaction agent: {error}")
    first_interaction_agent = None

try:
    if LinkContentAgent is None:
        raise RuntimeError(f"LinkContentAgent import failed: {LINK_CONTENT_IMPORT_ERROR}")
    link_content_agent: Optional[LinkContentAgent] = LinkContentAgent(
        project_root=Path(_ROOT_DIR),
        storage_dir=LINK_ASSETS_DIR,
    )
except Exception as error:  # noqa: BLE001
    print(f"Warning: failed to initialize ConverteLinkEmConteudo: {error}")
    link_content_agent = None


app = FastAPI(
    title="SIMPLE-AI Backend",
    version="1.0.0",
    description="Backend service for SIMPLE-AI site generation and auxiliary agents",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
router = APIRouter()


class StartAgentRequest(BaseModel):
    channelName: str
    rtcUid: str
    userUid: str
    briefingContext: Optional[str] = None
    priorityQuestion: Optional[str] = None
    language: str = "pt-BR"


class StopAgentRequest(BaseModel):
    agentId: str


class StopAllAgentsRequest(BaseModel):
    scope: str = "known"


class OciAgentChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, Any]]] = None
    max_turns: int = 8


class BuildRequest(BaseModel):
    business_name: Optional[str] = None
    segment: Optional[str] = None
    current_workflow: Optional[str] = None
    primary_pain: Optional[str] = None
    user_facing_actions: Optional[List[Any]] = None
    data_entities: Optional[List[Dict[str, Any]]] = None
    needs_admin_panel: Optional[bool] = None
    needs_notifications: Optional[bool] = None
    needs_login_for_customers: Optional[bool] = None
    raw_quotes: Optional[List[str]] = None
    design_plan: Optional[Dict[str, Any]] = None
    visual_plan: Optional[Dict[str, Any]] = None
    link_content: Optional[Dict[str, Any]] = None
    summary: Optional[Dict[str, Any]] = None
    agent_profile: Optional[str] = None
    builder_model: Optional[str] = None
    builder_provider: Optional[str] = None
    flow_mode: Optional[str] = "fluxo"

    class Config:
        extra = "allow"


class EvaluateUrlRequest(BaseModel):
    url: str
    business_name: Optional[str] = None
    segment: Optional[str] = None
    use_llm: bool = True


def _extract_json_object(raw: str) -> Dict[str, Any]:
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
        parsed = json.loads(text[start : end + 1])
        if isinstance(parsed, dict):
            return parsed
    raise RuntimeError("Avaliador GPT retornou JSON invalido.")


def _call_site_quality_llm(*, url: str, html: str, technical_score: Dict[str, Any], business_name: str, segment: str) -> Dict[str, Any]:
    base_url = (
        os.getenv("SITE_QUALITY_BASE_URL", "").strip()
        or os.getenv("AGENT_LLM_BASE_URL", "").strip()
        or "http://localhost:20128/v1"
    ).rstrip("/")
    model = os.getenv("SITE_QUALITY_MODEL", "cx/gpt-5.5").strip() or "cx/gpt-5.5"
    api_key = (
        os.getenv("SITE_QUALITY_API_KEY", "").strip()
        or os.getenv("AGENT_LLM_API_KEY", "").strip()
        or os.getenv("NINEROUTER_API_KEY", "").strip()
        or os.getenv("OPENAI_API_KEY", "").strip()
        or "local-no-key"
    )
    timeout = float(os.getenv("SITE_QUALITY_TIMEOUT_SECONDS", "60").strip() or "60")
    html_sample = html[:180_000]
    render_risk_signals = _site_render_risk_signals(html)
    payload = {
        "url": url,
        "business_name": business_name,
        "segment": segment,
        "technical_score": technical_score,
        "render_risk_signals": render_risk_signals,
        "html_sample": html_sample,
    }
    system_prompt = """
You are Agente 03, a strict but fair senior website quality evaluator.

Evaluate the real website represented by the HTML sample, render risk signals, and technical score. Do not blindly trust heuristic issues: if a section exists semantically under a different name, credit it. Penalize real UX, clarity, trust, conversion, content, accessibility, visual polish, and completeness problems.

Important calibration:
- If render_risk_signals indicate generic remote/fallback images, missing visual assets, oversized hero media, clipped hero copy, or likely broken first viewport, cap the score at 3000 unless there is strong evidence the page still renders beautifully.
- If the first viewport likely looks broken, empty, cropped, or placeholder-like, score around 1000-3000 even if the HTML structure is technically valid.
- A local business site with generic stock/fallback visuals and shallow commercial content should normally be 1500-4500, not 7000+.

Score from 0 to 10000:
- 9000-10000: world-class, polished, memorable, clear, conversion-ready, very few issues.
- 7000-8999: strong professional site with some fixable gaps.
- 5000-6999: decent but common, usable, not impressive.
- 3000-4999: weak/unfinished or generic.
- 0-2999: broken, confusing, placeholder-heavy, or poor.

Return ONLY valid JSON:
{"score":0,"max_score":10000,"verdict":"...","summary":"...","strengths":["..."],"weaknesses":["..."],"recommendations":["..."],"confidence":0.0}
""".strip()
    request_payload = {
        "model": model,
        "temperature": 0.15,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ],
    }
    http_request = Request(
        f"{base_url}/chat/completions",
        data=json.dumps(request_payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        method="POST",
    )
    with urlopen(http_request, timeout=timeout) as response:  # noqa: S310 - configured local/OpenAI-compatible endpoint
        response_payload = json.loads(response.read().decode("utf-8"))
    if isinstance(response_payload, dict) and response_payload.get("error"):
        raise RuntimeError(json.dumps(response_payload["error"], ensure_ascii=False))
    content = response_payload.get("choices", [{}])[0].get("message", {}).get("content", "")
    parsed = _extract_json_object(str(content))
    raw_score = parsed.get("score", 0)
    try:
        parsed["score"] = max(0, min(10000, int(raw_score)))
    except (TypeError, ValueError):
        parsed["score"] = 0
    parsed["max_score"] = 10000
    parsed["agent"] = "Agente 03 - GPT 5.5 avaliador"
    parsed["model"] = model
    parsed["base_url"] = base_url
    return parsed


def _site_render_risk_signals(html: str) -> Dict[str, Any]:
    lowered = (html or "").lower()
    return {
        "uses_source_unsplash": "source.unsplash.com" in lowered,
        "uses_unsplash": "unsplash.com" in lowered,
        "generic_remote_image_count": lowered.count("source.unsplash.com") + lowered.count("images.unsplash.com"),
        "has_large_hero_media": bool("hero-image" in lowered or "hero-media" in lowered),
        "has_overflow_hidden_near_hero": "hero" in lowered and "overflow: hidden" in lowered,
        "has_object_fit_cover": "object-fit: cover" in lowered,
        "potential_first_viewport_risk": "source.unsplash.com" in lowered and "hero" in lowered,
    }


def _builder_model_label(model_id: str) -> str:
    labels = {
        # Anthropic
        "claude-opus-4-7": "Claude Opus 4.7",
        "claude-sonnet-4-6": "Claude Sonnet 4.6",
        "claude-haiku-4-5-20251001": "Claude Haiku 4.5",
        # OpenAI
        "gpt-4o": "GPT-4o",
        "gpt-4o-mini": "GPT-4o Mini",
        # 9router (Lucas's internal router; available only when localhost:20128 is up)
        "cx/gpt-5.5": "GPT 5.5",
        "cx/gpt-5.4": "GPT 5.4",
        "cx/gpt-5.4-mini": "GPT 5.4 Mini",
        "glm-5.1": "GLM 5.1",
        "glm-5": "GLM 5",
        "glm-4.7": "GLM 4.7",
        "glm-4.6v": "GLM 4.6V",
    }
    return labels.get(model_id, model_id)


def _builder_model_provider(model_id: str) -> str:
    m = model_id.lower()
    if m.startswith("claude-") or m.startswith("anthropic/"):
        return "anthropic"
    if m.startswith("gpt-") or m.startswith("o1-") or m.startswith("o3-") or m.startswith("openai/"):
        return "openai-compatible"
    if m.startswith("glm-"):
        return "zai"
    return "default"

def _builder_model_note(model_id: str, provider: str) -> str:
    if model_id.startswith("claude-"):
        return "Anthropic — qualidade máxima" if "opus" in model_id else "Anthropic"
    if model_id.startswith("gpt-"):
        return "OpenAI — baixo custo" if "mini" in model_id else "OpenAI"
    if model_id == os.getenv("AGENT_LLM_MODEL", "").strip():
        return "default atual"
    if model_id.startswith("glm-"):
        return "Z.ai via zai"
    if model_id.startswith("cx/"):
        return "9router"
    return provider


def _load_local_9router_models() -> list[str]:
    base_url = (os.getenv("AGENT_LLM_BASE_URL", "").strip() or "http://localhost:20128/v1").rstrip("/")
    request = Request(f"{base_url}/models", headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=5) as response:  # noqa: S310 - local/dev endpoint configured by env
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as error:  # noqa: BLE001
        add_runtime_log("api", "warn", "Nao foi possivel carregar modelos do 9router", stage="models", details={"error": str(error)})
        return []
    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, list):
        return []
    return [str(item.get("id") or "").strip() for item in data if isinstance(item, dict) and item.get("id")]


def _builder_model_catalog() -> list[Dict[str, Any]]:
    """Build the model dropdown catalog from currently-configured providers.

    Order: Anthropic first (when ANTHROPIC_API_KEY set), OpenAI next (when
    OPENAI_API_KEY set), 9router last (only when localhost:20128 is reachable).
    The frontend takes models[0] as the default when localStorage has no
    valid stored selection — putting Anthropic first means the platform
    defaults to a working model.
    """
    catalog: list[Dict[str, Any]] = []

    def _push(model_id: str, source: str) -> None:
        provider = _builder_model_provider(model_id)
        catalog.append({
            "id": model_id,
            "provider": provider,
            "label": _builder_model_label(model_id),
            "note": _builder_model_note(model_id, provider),
            "available": True,
            "source": source,
        })

    # Anthropic — included whenever ANTHROPIC_API_KEY is set
    if os.getenv("ANTHROPIC_API_KEY", "").strip():
        for model_id in ("claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"):
            _push(model_id, "anthropic")

    # OpenAI — included whenever OPENAI_API_KEY is set
    if os.getenv("OPENAI_API_KEY", "").strip():
        for model_id in ("gpt-4o", "gpt-4o-mini"):
            _push(model_id, "openai")

    # 9router (Lucas's localhost:20128) — only when the router actually answers
    available_9router = set(_load_local_9router_models())
    if available_9router:
        preferred_9router = ("cx/gpt-5.5", "cx/gpt-5.4", "cx/gpt-5.2", "cx/gpt-5.1",
                             "glm-5.1", "glm-5", "glm-4.7", "glm-4.6v")
        for model_id in preferred_9router:
            if model_id in available_9router:
                _push(model_id, "9router-local")

    return catalog


class IntakeFilterRequest(BaseModel):
    user_message: str
    current_question: Optional[str] = None
    current_question_id: Optional[str] = None
    transcript: Optional[List[Dict[str, Any]]] = None
    notepad: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None


class FirstInteractionRequest(BaseModel):
    user_message: str
    filtered_message: Optional[str] = None
    notepad: Optional[Dict[str, Any]] = None
    local_next_question: Optional[str] = None
    transcript: Optional[List[Dict[str, Any]]] = None
    session_id: Optional[str] = None
    is_first_turn: bool = False


class LinkContentInspectRequest(BaseModel):
    url: Optional[str] = None
    user_message: Optional[str] = None
    urls: Optional[List[str]] = None
    session_id: Optional[str] = None
    transcript: Optional[List[Dict[str, Any]]] = None
    notepad: Optional[Dict[str, Any]] = None


@router.post("/v2/build")
def build(request: BuildRequest):
    if builder is None:
        add_runtime_log("api", "error", "Build rejeitado: BuilderAgent indisponivel", stage="queue")
        raise HTTPException(
            status_code=500,
            detail=(
                "Agente 02 nao configurado. Defina AGENT_LLM_PROVIDER e a chave "
                "correspondente (ex: AGENT_LLM_API_KEY ou ANTHROPIC_API_KEY) em "
                "api/.env.local."
            ),
        )

    job_id = f"job_{int(time.time())}_{random.randint(1000, 9999)}"
    spec_dump = request.dict()
    spec_dump["flow_mode"] = "fluxo"
    safe_print(f"[BUILD] queued job_id={job_id}")
    safe_print(f"[BUILD] spec={json.dumps(spec_dump, ensure_ascii=False, default=str)}")
    add_runtime_log(
        "api",
        "info",
        "Build enfileirado",
        job_id=job_id,
        stage="queue",
        details={
            "business_name": spec_dump.get("business_name"),
            "segment": spec_dump.get("segment"),
            "builder_model": spec_dump.get("builder_model"),
            "builder_provider": spec_dump.get("builder_provider"),
            "agent_profile": spec_dump.get("agent_profile"),
        },
    )

    builder.enqueue(job_id, spec_dump)

    return {
        "code": 0,
        "msg": "success",
        "data": {
            "status": "queued",
            "job_id": job_id,
            "message": "Agente 02 esta construindo seu site.",
            "flow_mode": "fluxo",
        },
    }


@router.get("/v2/build/{job_id}")
def build_status(job_id: str):
    if builder is None:
        raise HTTPException(status_code=500, detail="Agente 02 nao esta disponivel.")

    job = builder.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} nao encontrado.")

    return {"code": 0, "msg": "success", "data": job.snapshot()}


@router.get("/v1/logs")
def logs(limit: int = 120, level: Optional[str] = None):
    return {"code": 0, "msg": "success", "data": {"events": list_runtime_logs(limit=limit, level=level)}}


@router.post("/v1/site-quality/evaluate-url")
def evaluate_site_url(request: EvaluateUrlRequest):
    raw_url = (request.url or "").strip()
    if not raw_url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL precisa comecar com http:// ou https://")
    try:
        http_request = Request(
            raw_url,
            headers={
                "Accept": "text/html,application/xhtml+xml",
                "User-Agent": "SimpleAIQualityBot/1.0",
            },
        )
        with urlopen(http_request, timeout=20) as response:  # noqa: S310 - explicit URL supplied for local quality eval
            content_type = response.headers.get("content-type", "")
            raw_body = response.read(2_500_000)
        html = raw_body.decode("utf-8", errors="replace")
        result = score_site_html(
            html,
            spec={"business_name": request.business_name or "", "segment": request.segment or ""},
        ).usage_payload()
        llm_result = None
        if request.use_llm:
            llm_result = _call_site_quality_llm(
                url=raw_url,
                html=html,
                technical_score=result,
                business_name=request.business_name or "",
                segment=request.segment or "",
            )
    except HTTPException:
        raise
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Avaliador nao conseguiu ler o site: {error}")
    return {
        "code": 0,
        "msg": "success",
        "data": {
            "url": raw_url,
            "content_type": content_type,
            "bytes_read": len(raw_body),
            "site_score": result,
            "llm_quality": llm_result,
            "quality_bot": llm_result or result.get("quality_bot"),
        },
    }


@router.get("/v1/builder/models")
def builder_models():
    return {"code": 0, "msg": "success", "data": {"models": _builder_model_catalog()}}


@router.post("/v3/oci-agent/chat")
def oci_agent_chat(request: OciAgentChatRequest):
    if oci_agent is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Agente 03 indisponivel. Verifique ~/.oci/config "
                "(profile DEFAULT) e ANTHROPIC_API_KEY em api/.env.local."
            ),
        )

    try:
        result = oci_agent.chat(
            user_message=request.message,
            history=request.history,
            max_turns=request.max_turns,
        )
        return {"code": 0, "msg": "success", "data": result}
    except Exception as error:
        raise to_http_error(error)


@router.get("/v3/oci-agent/status")
def oci_agent_status():
    return {
        "code": 0,
        "msg": "success",
        "data": {
            "available": oci_agent is not None,
            "model": getattr(oci_agent, "model", None),
            "tools_count": 5,
        },
    }


@router.post("/v1/intake/filter")
def intake_filter(request: IntakeFilterRequest):
    raw_text = (request.user_message or "").strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Mensagem vazia: o filtro nao deve rodar sem conteudo.")

    if intake_filter_agent is None:
        raise HTTPException(
            status_code=503,
            detail="Agente-filtro indisponivel. O chat nao roda sem o filtro configurado.",
        )

    try:
        data = intake_filter_agent.filter_message(
            user_message=raw_text,
            current_question=request.current_question,
            current_question_id=request.current_question_id,
            transcript=request.transcript,
            notepad=request.notepad,
            session_id=request.session_id,
        )
        data["available"] = True
        return {"code": 0, "msg": "success", "data": data}
    except Exception as error:
        print(f"Error: intake filter failed: {error}")
        raise HTTPException(status_code=502, detail=f"Agente-filtro falhou: {error}")


@router.get("/v1/intake/filter/status")
def intake_filter_status():
    return {
        "code": 0,
        "msg": "success",
        "data": {
            "available": intake_filter_agent is not None,
            "enabled": bool(getattr(intake_filter_agent, "enabled", False)) if intake_filter_agent else False,
            "model": getattr(intake_filter_agent, "model", None),
            "base_url": getattr(intake_filter_agent, "base_url", None),
        },
    }


@router.post("/v1/intake/first-interaction")
def intake_first_interaction(request: FirstInteractionRequest):
    raw_text = (request.user_message or "").strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Mensagem vazia: a primeira interacao precisa de conteudo.")

    if first_interaction_agent is None:
        raise HTTPException(
            status_code=503,
            detail="Agente da primeira interacao indisponivel. Configure FIRST_INTERACTION_* antes de usar o chat.",
        )

    try:
        data = first_interaction_agent.generate_reply(
            user_message=raw_text,
            filtered_message=request.filtered_message,
            notepad=request.notepad,
            local_next_question=request.local_next_question,
            session_id=request.session_id,
        )
        data["available"] = True
        return {"code": 0, "msg": "success", "data": data}
    except Exception as error:
        print(f"Error: first interaction agent failed: {error}")
        raise HTTPException(status_code=502, detail=f"Agente da primeira interacao falhou: {error}")


@router.post("/v1/intake/turn")
def intake_turn(request: FirstInteractionRequest):
    raw_text = (request.user_message or "").strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Mensagem vazia: o agente de turno precisa de conteudo.")

    if first_interaction_agent is None:
        raise HTTPException(
            status_code=503,
            detail="Agente de turno indisponivel. Configure FIRST_INTERACTION_* antes de usar o chat.",
        )

    try:
        data = first_interaction_agent.generate_turn_reply(
            user_message=raw_text,
            filtered_message=request.filtered_message,
            notepad=request.notepad,
            local_next_question=request.local_next_question,
            transcript=request.transcript,
            session_id=request.session_id,
            is_first_turn=request.is_first_turn,
        )
        data["available"] = True
        return {"code": 0, "msg": "success", "data": data}
    except Exception as error:
        print(f"Error: intake turn agent failed: {error}")
        raise HTTPException(status_code=502, detail=f"Agente de turno falhou: {error}")


@router.post("/v1/link-content/inspect")
def inspect_link_content(request: LinkContentInspectRequest):
    if link_content_agent is None:
        raise HTTPException(status_code=500, detail="ConverteLinkEmConteudo nao esta disponivel.")

    urls: List[str] = []
    if request.url:
        urls.append(request.url)
    if request.urls:
        urls.extend(request.urls)
    if not urls and request.user_message and extract_urls is not None:
        urls.extend(extract_urls(request.user_message))
    urls = list(dict.fromkeys([url for url in urls if url]))
    if not urls:
        raise HTTPException(status_code=400, detail="Nenhum link encontrado para inspecionar.")

    try:
        sources = [
            link_content_agent.inspect_url(
                url=url,
                session_id=request.session_id,
                user_message=request.user_message or "",
                notepad=request.notepad,
                transcript=request.transcript,
            )
            for url in urls[:3]
        ]
    except Exception as exc:  # noqa: BLE001
        raise to_http_error(exc)

    return {
        "code": 0,
        "msg": "success",
        "data": {
            "agent": "ConverteLinkEmConteudo",
            "sources": sources,
        },
    }


@router.get("/v1/intake/first-interaction/status")
def intake_first_interaction_status():
    return {
        "code": 0,
        "msg": "success",
        "data": {
            "available": first_interaction_agent is not None,
            "enabled": bool(getattr(first_interaction_agent, "enabled", False)) if first_interaction_agent else False,
            "model": getattr(first_interaction_agent, "model", None),
            "base_url": getattr(first_interaction_agent, "base_url", None),
        },
    }


app.include_router(router)
app.mount("/sites", StaticFiles(directory=str(SITES_DIR), html=True), name="sites")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
