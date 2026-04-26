# -*- coding: utf-8 -*-
import json
import os
import random
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

try:
    from agora_agent.agentkit.token import generate_convo_ai_token
except ImportError as error:  # pragma: no cover - optional during local dev fallback
    generate_convo_ai_token = None
    AGORA_TOKEN_IMPORT_ERROR = error
else:
    AGORA_TOKEN_IMPORT_ERROR = None

try:
    from agent import Agent
except ImportError as error:  # pragma: no cover - optional during local dev fallback
    Agent = None
    AGENT_IMPORT_ERROR = error
else:
    AGENT_IMPORT_ERROR = None

try:
    from agents.oci_agent import Agente03
except ImportError as error:  # pragma: no cover - optional during local dev fallback
    Agente03 = None
    OCI_IMPORT_ERROR = error
else:
    OCI_IMPORT_ERROR = None

from builder import BuilderAgent


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env.local"))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def to_http_error(exc: Exception) -> HTTPException:
    error_text = str(exc)
    if "Invalid token" in error_text:
        return HTTPException(
            status_code=401,
            detail=(
                "A Agora recusou o token do agente. Confira se APP_ID e "
                "APP_CERTIFICATE pertencem ao mesmo projeto e se o certificado esta ativo."
            ),
        )
    if "Invalid authentication credentials" in error_text:
        return HTTPException(
            status_code=401,
            detail=(
                "A Agora recusou as credenciais REST. Confira AGORA_CUSTOMER_ID "
                "e AGORA_CUSTOMER_SECRET ou use autenticacao por token."
            ),
        )
    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, RuntimeError):
        return HTTPException(status_code=500, detail=str(exc))
    return HTTPException(status_code=500, detail=f"Internal error: {exc}")


try:
    if Agent is None:
        raise ValueError(f"Agora backend import failed: {AGENT_IMPORT_ERROR}")
    agent = Agent()
except ValueError as error:
    print(f"Warning: failed to initialize Agora backend: {error}")
    agent = None


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
except Exception as error:  # noqa: BLE001 — surface any init failure as warning
    print(f"Warning: failed to initialize Agente 03 (OCI): {error}")
    oci_agent = None


app = FastAPI(
    title="SIMPLE-AI Agora Core",
    version="1.0.0",
    description="Realtime voice agent service for SIMPLE-AI",
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
    summary: Optional[Dict[str, Any]] = None

    class Config:
        extra = "allow"


@router.get("/get_config")
def get_config():
    if agent is None:
        raise HTTPException(
            status_code=500,
            detail="Agora backend is not configured. Fill APP_ID and APP_CERTIFICATE in server-python/.env.local.",
        )
    if generate_convo_ai_token is None:
        raise HTTPException(
            status_code=500,
            detail=f"Agora token generator unavailable: {AGORA_TOKEN_IMPORT_ERROR}",
        )

    try:
        user_uid = random.randint(1000, 9_999_999)
        agent_uid = random.randint(10_000_000, 99_999_999)
        channel_name = f"simple_ai_{int(time.time())}"
        app_id = os.getenv("APP_ID")
        app_certificate = os.getenv("APP_CERTIFICATE")

        token = generate_convo_ai_token(
            app_id=app_id,
            app_certificate=app_certificate,
            channel_name=channel_name,
            account=str(user_uid),
            token_expire=86400,
        )

        return {
            "code": 0,
            "msg": "success",
            "data": {
                "app_id": app_id,
                "token": token,
                "uid": str(user_uid),
                "channel_name": channel_name,
                "agent_uid": str(agent_uid),
            },
        }
    except Exception as error:
        raise to_http_error(error)


@router.post("/v2/startAgent")
def start_agent(request: StartAgentRequest):
    if agent is None:
        raise HTTPException(
            status_code=500,
            detail="Agora backend is not configured. Fill APP_ID and APP_CERTIFICATE in server-python/.env.local.",
        )

    try:
        result = agent.start(
            channel_name=request.channelName,
            agent_uid=request.rtcUid,
            user_uid=request.userUid,
            briefing_context=request.briefingContext,
            priority_question=request.priorityQuestion,
            language=request.language,
        )
        return {"code": 0, "msg": "success", "data": result}
    except Exception as error:
        raise to_http_error(error)


@router.post("/v2/stopAgent")
def stop_agent(request: StopAgentRequest):
    if agent is None:
        raise HTTPException(
            status_code=500,
            detail="Agora backend is not configured. Fill APP_ID and APP_CERTIFICATE in server-python/.env.local.",
        )

    try:
        agent.stop(request.agentId)
        return {"code": 0, "msg": "success"}
    except Exception as error:
        if isinstance(error, ValueError):
            raise HTTPException(status_code=404, detail=str(error))
        raise to_http_error(error)


@router.post("/v2/build")
def build(request: BuildRequest):
    if builder is None:
        raise HTTPException(
            status_code=500,
            detail="Agente 02 não configurado. Defina ANTHROPIC_API_KEY em server-python/.env.local.",
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
            "message": "Agente 02 está construindo seu site.",
        },
    }


@router.get("/v2/build/{job_id}")
def build_status(job_id: str):
    if builder is None:
        raise HTTPException(status_code=500, detail="Agente 02 não configurado.")

    job = builder.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} não encontrado.")

    return {"code": 0, "msg": "success", "data": job.snapshot()}


@router.post("/v3/oci-agent/chat")
def oci_agent_chat(request: OciAgentChatRequest):
    if oci_agent is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Agente 03 indisponível. Verifique ~/.oci/config "
                "(profile DEFAULT) e ANTHROPIC_API_KEY em server-python/.env.local."
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


app.include_router(router)
app.mount("/sites", StaticFiles(directory=str(SITES_DIR), html=True), name="sites")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
