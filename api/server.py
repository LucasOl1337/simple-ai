# -*- coding: utf-8 -*-
import json
import os
import random
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

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

from builder.agent.builder_agent import BuilderAgent


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


SITES_DIR = Path(BASE_DIR) / "sites"
try:
    builder = BuilderAgent(sites_dir=SITES_DIR)
except RuntimeError as error:
    print(f"Warning: failed to initialize Agente 02 builder: {error}")
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
    summary: Optional[Dict[str, Any]] = None
    agent_profile: Optional[str] = None

    class Config:
        extra = "allow"


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


@router.post("/v2/build")
def build(request: BuildRequest):
    if builder is None:
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
    print(f"[BUILD] queued job_id={job_id}")
    print(f"[BUILD] spec={json.dumps(spec_dump, ensure_ascii=False, default=str)}")

    builder.enqueue(job_id, spec_dump)

    return {
        "code": 0,
        "msg": "success",
        "data": {
            "status": "queued",
            "job_id": job_id,
            "message": "Agente 02 esta construindo seu site.",
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
