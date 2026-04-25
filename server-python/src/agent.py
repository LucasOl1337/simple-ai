import os
import time
from typing import Any, Dict, Optional

from agora_agent import Agora, Area
from agora_agent.agentkit import Agent as AgoraAgent
from agora_agent.agentkit.vendors import DeepgramSTT, MiniMaxTTS, OpenAI


AREA_MAP = {
    "US": Area.US,
    "EU": Area.EU,
    "AP": Area.AP,
}


def build_agent_instructions(
    briefing_context: Optional[str] = None,
    priority_question: Optional[str] = None,
    language: str = "pt-BR",
) -> str:
    base_prompt = f"""
You are the realtime discovery core for SIMPLE-AI.

Your job is to conduct a short live conversation that collects business requirements and converts them into usable product signals.

Behavior rules:
- Speak in {language}.
- Be concise because this is a voice interaction.
- Ask only one question at a time.
- Prioritize these fields: brand name, main offer, main call to action, region served, contact channels, visual tone.
- If the user answer is vague, ask for one concrete example.
- Never invent business data.
- After each useful answer, acknowledge briefly and move to the next missing point.
- If the user asks for a summary, summarize only what was explicitly said.
- Keep the conversation focused on collecting data for a website or product briefing.
""".strip()

    context_block = ""
    if briefing_context:
        context_block = f"\n\nCurrent known context from the app:\n{briefing_context.strip()}"

    question_block = ""
    if priority_question:
        question_block = (
            "\n\nHighest-priority gap to close next:\n"
            f"{priority_question.strip()}\n"
            "Prefer steering the conversation toward this if it still makes sense."
        )

    return f"{base_prompt}{context_block}{question_block}"


class Agent:
    def __init__(self):
        self.app_id = os.getenv("APP_ID")
        self.app_certificate = os.getenv("APP_CERTIFICATE")

        if not self.app_id or not self.app_certificate:
            raise ValueError("APP_ID and APP_CERTIFICATE are required")

        area_name = os.getenv("AGORA_AREA", "US").upper()
        self.client = Agora(
            area=AREA_MAP.get(area_name, Area.US),
            app_id=self.app_id,
            app_certificate=self.app_certificate,
        )
        self._sessions: Dict[str, Any] = {}

    def start(
        self,
        channel_name: str,
        agent_uid: str,
        user_uid: str,
        briefing_context: Optional[str] = None,
        priority_question: Optional[str] = None,
        language: str = "pt-BR",
    ) -> Dict[str, Any]:
        if not channel_name or not str(channel_name).strip():
            raise ValueError("channel_name is required and cannot be empty")
        if not agent_uid or not str(agent_uid).strip():
            raise ValueError("agent_uid is required and cannot be empty")
        if not user_uid or not str(user_uid).strip():
            raise ValueError("user_uid is required and cannot be empty")

        agent_name = f"simple_ai_core_{channel_name}_{agent_uid}_{int(time.time())}"
        greeting = os.getenv(
            "AGENT_GREETING",
            "Ola. Eu sou o core de descoberta da SIMPLE-AI. Pode me contar sobre o negocio e eu vou coletar os dados mais importantes.",
        )
        instructions = build_agent_instructions(
            briefing_context=briefing_context,
            priority_question=priority_question,
            language=language,
        )

        llm = OpenAI(
            model="gpt-4o-mini",
            greeting_message=greeting,
            failure_message="Desculpe, tive um problema para processar essa parte. Pode repetir de forma curta?",
            max_history=15,
            max_tokens=1024,
            temperature=0.4,
            top_p=0.9,
        )
        stt = DeepgramSTT(
            model="nova-3",
            language=os.getenv("AGENT_STT_LANGUAGE", language),
        )
        tts = MiniMaxTTS(
            model=os.getenv("AGENT_TTS_MODEL", "speech_2_6_turbo"),
            voice_id=os.getenv("AGENT_TTS_VOICE_ID", "English_captivating_female1"),
        )

        agora_agent = AgoraAgent(
            name=agent_name,
            instructions=instructions,
            greeting=greeting,
            failure_message="Desculpe, tive um problema para responder agora.",
            advanced_features={"enable_rtm": True},
            parameters={"data_channel": "rtm", "enable_error_message": True},
        ).with_llm(llm).with_tts(tts).with_stt(stt)

        session = agora_agent.create_session(
            client=self.client,
            channel=channel_name,
            agent_uid=str(agent_uid),
            remote_uids=["*"],
            enable_string_uid=True,
            idle_timeout=30,
            expires_in=3600,
        )

        agent_id = session.start()
        self._sessions[agent_id] = session

        return {
            "agent_id": agent_id,
            "channel_name": channel_name,
            "status": "started",
            "language": language,
        }

    def stop(self, agent_id: str) -> None:
        if not agent_id or not str(agent_id).strip():
            raise ValueError("agent_id is required and cannot be empty")

        session = self._sessions.pop(agent_id, None)
        if session:
            session.stop()
            return

        raise ValueError(f"No active session found for agent_id: {agent_id}")
