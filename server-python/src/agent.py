import os
import time
from typing import Any, Dict, Optional

from agora_agent import Agora, Area
from agora_agent.agentkit import (
    Agent as AgoraAgent,
    EndOfSpeechConfig,
    EndOfSpeechVadConfig,
    StartOfSpeechConfig,
    StartOfSpeechVadConfig,
    TurnDetectionConfig,
    TurnDetectionNestedConfig,
)
from agora_agent.agentkit.token import generate_convo_ai_token
from agora_agent.agentkit.vendors import AresSTT, Anthropic, DeepgramSTT, MiniMaxTTS, OpenAI


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
    # IMPORTANT: This prompt follows the spec defined in .simpleai/
    # See: .simpleai/first-interaction.md, .simpleai/agent-flow.md, .simpleai/flow-order.md
    base_prompt = f"""
You are the realtime discovery core for SIMPLE-AI.

Your job is to conduct a short live conversation that collects business requirements and converts them into usable product signals. You follow the behavioral spec in .simpleai/.

Core rules (from .simpleai/agent-flow.md):
- Speak in {language}.
- Be concise because this is a voice interaction.
- Ask only ONE question at a time — never bombard the user.
- The user knows NOTHING about technology — never use technical jargon.
- Prioritize critical fields first: business_type, brand_name, primary_cta.
- Then important fields: offerings, scope, current_channels.
- Then desired fields: target_audience, brand_tone, content_volume.
- If the user answer is vague, ask for one concrete example.
- Never invent business data.
- After each useful answer, acknowledge briefly and move to the next missing point.
- If the user shows frustration ("tanto faz", "decide voce"), reduce questions and assume smart defaults.
- If the user asks for a summary, summarize only what was explicitly said.
- Keep the conversation focused on collecting data for a website briefing.
- When you have enough context (3 critical fields + confidence >= 55%), propose building.
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
        self.area = AREA_MAP.get(area_name, Area.US)
        self.client = Agora(
            area=self.area,
            app_id=self.app_id,
            app_certificate=self.app_certificate,
        )
        self._sessions: Dict[str, Any] = {}

    @staticmethod
    def _normalize_provider(provider: Optional[str]) -> str:
        normalized = (provider or "anthropic").strip().lower()
        if normalized in {"openai-compatible", "openai_compatible", "openai-compatible-api"}:
            return "openai"
        if normalized in {"z.ai", "zai", "z-ai", "zhipu"}:
            return "zai"
        if normalized in {"openrouter", "open-router"}:
            return "openrouter"
        if normalized in {"nvidia", "nemo", "nim"}:
            return "nvidia"
        return normalized

    @staticmethod
    def _first_env(*names: str) -> Optional[str]:
        for name in names:
            value = os.getenv(name)
            if value and value.strip():
                return value.strip()
        return None

    def _build_llm(self, greeting: str):
        provider = self._normalize_provider(os.getenv("AGENT_LLM_PROVIDER"))
        model = os.getenv("AGENT_LLM_MODEL")
        temperature = float(os.getenv("AGENT_LLM_TEMPERATURE", "0.4"))
        top_p = float(os.getenv("AGENT_LLM_TOP_P", "0.9"))
        max_tokens = int(os.getenv("AGENT_LLM_MAX_TOKENS", "1024"))

        if provider == "anthropic":
            api_key = self._first_env("ANTHROPIC_API_KEY", "AGENT_LLM_API_KEY")
            if not api_key:
                raise ValueError(
                    "ANTHROPIC_API_KEY or AGENT_LLM_API_KEY is required for Agente 01 (intake)."
                )
            return Anthropic(
                api_key=api_key,
                model=model or "claude-opus-4-7",
                failure_message="Desculpe, tive um problema para processar essa parte. Pode repetir de forma curta?",
                max_history=15,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
            )

        if provider in {"openai", "openai-compatible", "nvidia", "zai", "openrouter"}:
            provider_defaults = {
                "openai": {
                    "api_key": self._first_env("AGENT_LLM_API_KEY", "OPENAI_API_KEY"),
                    "base_url": self._first_env(
                        "AGENT_LLM_BASE_URL", "OPENAI_BASE_URL", "OPENAI_API_BASE"
                    ),
                    "default_model": "gpt-4o-mini",
                },
                "nvidia": {
                    "api_key": self._first_env("NVIDIA_API_KEY", "AGENT_LLM_API_KEY"),
                    "base_url": self._first_env(
                        "AGENT_LLM_BASE_URL", "NVIDIA_BASE_URL"
                    )
                    or "https://integrate.api.nvidia.com/v1",
                    "default_model": "nvidia/llama-3.1-8b-instruct",
                },
                "zai": {
                    "api_key": self._first_env("ZAI_API_KEY", "AGENT_LLM_API_KEY"),
                    "base_url": self._first_env(
                        "AGENT_LLM_BASE_URL", "ZAI_BASE_URL"
                    )
                    or "https://api.z.ai/api/paas/v4",
                    "default_model": "glm-5.1",
                },
                "openrouter": {
                    "api_key": self._first_env("OPENROUTER_API_KEY", "AGENT_LLM_API_KEY"),
                    "base_url": self._first_env(
                        "AGENT_LLM_BASE_URL", "OPENROUTER_BASE_URL"
                    )
                    or "https://openrouter.ai/api/v1",
                    "default_model": "openai/gpt-4o-mini",
                },
            }
            provider_config = provider_defaults[provider]
            api_key = provider_config["api_key"]
            if not api_key:
                raise ValueError(
                    "A provider API key is required for Agente 01 (intake). "
                    "Set AGENT_LLM_API_KEY, OPENAI_API_KEY, NVIDIA_API_KEY, ZAI_API_KEY, or OPENROUTER_API_KEY."
                )
            selected_model = model or provider_config["default_model"]
            return OpenAI(
                api_key=api_key,
                model=selected_model,
                base_url=provider_config["base_url"],
                failure_message="Desculpe, tive um problema para processar essa parte. Pode repetir de forma curta?",
                max_history=15,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
            )

        raise ValueError(
            "Unsupported AGENT_LLM_PROVIDER. Use anthropic, openai, or openai-compatible."
        )

    def _build_stt(self, language: str):
        provider = (os.getenv("AGENT_STT_PROVIDER") or "ares").strip().lower()
        stt_language = os.getenv("AGENT_STT_LANGUAGE", language)

        if provider in {"ares", "agora", "native"}:
            return AresSTT(language=stt_language)

        if provider == "deepgram":
            return DeepgramSTT(
                api_key=self._first_env("DEEPGRAM_API_KEY", "AGENT_STT_API_KEY"),
                model=os.getenv("AGENT_STT_MODEL", "nova-3"),
                language=stt_language,
                smart_format=True,
                punctuation=True,
            )

        if provider == "openai":
            api_key = self._first_env("OPENAI_API_KEY", "AGENT_STT_API_KEY", "AGENT_LLM_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY or AGENT_STT_API_KEY is required for OpenAI STT.")
            from agora_agent.agentkit.vendors import OpenAISTT

            return OpenAISTT(
                api_key=api_key,
                model=os.getenv("AGENT_STT_MODEL", "whisper-1"),
                language=stt_language,
            )

        raise ValueError("Unsupported AGENT_STT_PROVIDER. Use ares, deepgram, or openai.")

    def _build_turn_detection(self):
        return TurnDetectionConfig(
            mode="default",
            type="agora_vad",
            interrupt_mode="interrupt",
            interrupt_duration_ms=180,
            prefix_padding_ms=320,
            silence_duration_ms=760,
            threshold=0.35,
            config=TurnDetectionNestedConfig(
                speech_threshold=0.35,
                start_of_speech=StartOfSpeechConfig(
                    mode="vad",
                    vad_config=StartOfSpeechVadConfig(
                        interrupt_duration_ms=180,
                        speaking_interrupt_duration_ms=180,
                        prefix_padding_ms=320,
                    ),
                ),
                end_of_speech=EndOfSpeechConfig(
                    mode="vad",
                    vad_config=EndOfSpeechVadConfig(silence_duration_ms=760),
                ),
            ),
        )

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
            "Olá. Eu sou a Simple. Me conta sobre o seu negócio que eu vou anotando aqui pra te ajudar a montar o site.",
        )
        instructions = build_agent_instructions(
            briefing_context=briefing_context,
            priority_question=priority_question,
            language=language,
        )

        llm = self._build_llm(greeting)
        stt = self._build_stt(language)
        tts = MiniMaxTTS(
            model=os.getenv("AGENT_TTS_MODEL", "speech_2_6_turbo"),
            voice_id=os.getenv("AGENT_TTS_VOICE_ID", "English_captivating_female1"),
        )

        agora_agent = AgoraAgent(
            name=agent_name,
            instructions=instructions,
            greeting=greeting,
            failure_message="Desculpe, tive um problema para responder agora.",
            turn_detection=self._build_turn_detection(),
            advanced_features={"enable_rtm": True},
            parameters={
                "data_channel": "rtm",
                "enable_error_message": True,
                "enable_metrics": True,
            },
        ).with_llm(llm).with_tts(tts).with_stt(stt)

        token_expire = 3600
        agent_token = generate_convo_ai_token(
            app_id=self.app_id,
            app_certificate=self.app_certificate,
            channel_name=channel_name,
            account=str(agent_uid),
            token_expire=token_expire,
        )
        session_client = Agora(
            area=self.area,
            app_id=self.app_id,
            app_certificate=self.app_certificate,
            auth_token=agent_token,
        )

        session = agora_agent.create_session(
            client=session_client,
            channel=channel_name,
            token=agent_token,
            agent_uid=str(agent_uid),
            remote_uids=[str(user_uid)],
            enable_string_uid=True,
            idle_timeout=0,
            expires_in=3600,
            debug=os.getenv("AGENT_DEBUG", "0") == "1",
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
