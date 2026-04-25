# -*- coding: utf-8 -*-
import json
import os
import random
import time
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agora_agent.agentkit.token import generate_convo_ai_token
from agent import Agent


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env.local"))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def to_http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, RuntimeError):
        return HTTPException(status_code=500, detail=str(exc))
    return HTTPException(status_code=500, detail=f"Internal error: {exc}")


try:
    agent = Agent()
except ValueError as error:
    print(f"Warning: failed to initialize Agora backend: {error}")
    agent = None


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


class BuildRequest(BaseModel):
    business_name: Optional[str] = None
    segment: Optional[str] = None
    current_workflow: Optional[str] = None
    primary_pain: Optional[str] = None
    user_facing_actions: Optional[List[str]] = None
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
    job_id = f"job_{int(time.time())}_{random.randint(1000, 9999)}"
    spec_dump = request.dict()
    print(f"[BUILD] queued job_id={job_id}")
    print(f"[BUILD] spec={json.dumps(spec_dump, ensure_ascii=False, default=str)}")
    return {
        "code": 0,
        "msg": "success",
        "data": {
            "status": "queued",
            "job_id": job_id,
            "message": "Agente 02 vai construir seu site em alguns minutos.",
        },
    }


app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
