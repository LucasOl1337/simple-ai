"""
Agente 03 — Oracle Cloud Infrastructure operator agent.

This module exposes three layers, in order of decoupling:

1. ``OCI_TOOLS`` — Anthropic tool schemas (list/create/inspect ops).
   Other Claude-powered agents (a "Cláudio") can import this list and
   register the same tools in their own conversations.

2. ``execute_oci_tool(name, input, config=None)`` — pure executor.
   Takes a tool call (already parsed from a Claude tool_use block) and
   runs it against the OCI Python SDK. Returns a JSON-serializable dict.
   Reusable from any agent loop.

3. ``Agente03`` — full Claude-powered conversation loop. Runs tool use
   end-to-end, narrates results in PT-BR, returns the final answer plus
   a structured ``tool_calls`` audit log.

Auth:
- Uses standard OCI config file (``~/.oci/config`` by default).
- Override with env vars ``OCI_CONFIG_FILE`` / ``OCI_CONFIG_PROFILE``.
- Anthropic API key from env ``ANTHROPIC_API_KEY``.
"""
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import oci
from anthropic import Anthropic


# ───────────────────────────────────────────────────────────────────────────
# Tool schemas (for Anthropic tool use)
# ───────────────────────────────────────────────────────────────────────────

OCI_TOOLS: List[Dict[str, Any]] = [
    {
        "name": "get_tenancy_info",
        "description": (
            "Retorna informações da tenancy atual da OCI: nome, OCID, region "
            "e home region. Use quando precisar do compartment_id raiz "
            "(o tenancy OCID atua como compartment raiz)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "list_compute_instances",
        "description": (
            "Lista instâncias de compute (VMs) num compartmento. Use pra "
            "mostrar ao usuário ou outro agente o que está rodando."
        ),
        "input_schema": {
            "type": "object",
            "required": ["compartment_id"],
            "properties": {
                "compartment_id": {
                    "type": "string",
                    "description": "OCID do compartmento.",
                },
                "limit": {"type": "integer", "default": 25},
            },
        },
    },
    {
        "name": "list_autonomous_databases",
        "description": (
            "Lista Autonomous Databases num compartmento. Útil pra checar se "
            "já existe DB pronta antes de criar uma nova pro app gerado."
        ),
        "input_schema": {
            "type": "object",
            "required": ["compartment_id"],
            "properties": {
                "compartment_id": {"type": "string"},
                "limit": {"type": "integer", "default": 25},
            },
        },
    },
    {
        "name": "list_object_storage_buckets",
        "description": (
            "Lista buckets do Object Storage. Use pra encontrar onde guardar "
            "código gerado, mídias e backups dos apps construídos."
        ),
        "input_schema": {
            "type": "object",
            "required": ["compartment_id"],
            "properties": {
                "compartment_id": {"type": "string"},
            },
        },
    },
    {
        "name": "create_autonomous_database",
        "description": (
            "Cria um Autonomous Database (preferencialmente Free Tier) pra "
            "hospedar dados do app gerado pelo Agente 02. OPERAÇÃO DE WRITE: "
            "exija confirmação explícita do solicitante antes de chamar."
        ),
        "input_schema": {
            "type": "object",
            "required": [
                "compartment_id",
                "display_name",
                "db_name",
                "admin_password",
            ],
            "properties": {
                "compartment_id": {"type": "string"},
                "display_name": {
                    "type": "string",
                    "description": "Nome amigável (vai aparecer no console).",
                },
                "db_name": {
                    "type": "string",
                    "description": (
                        "DB name técnico: 1-14 caracteres, "
                        "apenas letras e dígitos, deve começar com letra."
                    ),
                },
                "admin_password": {
                    "type": "string",
                    "description": (
                        "Senha do ADMIN. Mínimo 12 caracteres, pelo menos "
                        "1 maiúscula, 1 minúscula, 1 dígito, 1 especial."
                    ),
                },
                "cpu_core_count": {"type": "integer", "default": 1},
                "data_storage_size_in_tbs": {"type": "integer", "default": 1},
                "is_free_tier": {"type": "boolean", "default": True},
                "db_workload": {
                    "type": "string",
                    "enum": ["OLTP", "DW", "AJD", "APEX"],
                    "default": "OLTP",
                },
            },
        },
    },
]


# ───────────────────────────────────────────────────────────────────────────
# Tool executor (reusable from any agent loop)
# ───────────────────────────────────────────────────────────────────────────


def _load_oci_config() -> Dict[str, Any]:
    """Load OCI config from ``~/.oci/config`` (or env override)."""
    config_path = os.path.expanduser(
        os.getenv("OCI_CONFIG_FILE", "~/.oci/config")
    )
    profile = os.getenv("OCI_CONFIG_PROFILE", "DEFAULT")
    config = oci.config.from_file(config_path, profile_name=profile)
    oci.config.validate_config(config)
    return config


def execute_oci_tool(
    tool_name: str,
    tool_input: Dict[str, Any],
    config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Execute a single OCI tool call.

    Designed so that *any* Claude conversation (not just Agente 03 itself)
    can route tool_use blocks here. Errors are returned as
    ``{"error": "...", "type": "..."}`` rather than raised, so the LLM
    can react and retry.
    """
    cfg = config or _load_oci_config()

    try:
        if tool_name == "get_tenancy_info":
            identity = oci.identity.IdentityClient(cfg)
            tenancy = identity.get_tenancy(cfg["tenancy"]).data
            return {
                "tenancy_id": tenancy.id,
                "name": tenancy.name,
                "region": cfg["region"],
                "home_region_key": tenancy.home_region_key,
            }

        if tool_name == "list_compute_instances":
            client = oci.core.ComputeClient(cfg)
            response = client.list_instances(
                compartment_id=tool_input["compartment_id"],
                limit=int(tool_input.get("limit", 25)),
            )
            return {
                "count": len(response.data),
                "instances": [
                    {
                        "id": i.id,
                        "name": i.display_name,
                        "shape": i.shape,
                        "state": i.lifecycle_state,
                        "region": i.region,
                    }
                    for i in response.data
                ],
            }

        if tool_name == "list_autonomous_databases":
            client = oci.database.DatabaseClient(cfg)
            response = client.list_autonomous_databases(
                compartment_id=tool_input["compartment_id"],
                limit=int(tool_input.get("limit", 25)),
            )
            return {
                "count": len(response.data),
                "databases": [
                    {
                        "id": d.id,
                        "display_name": d.display_name,
                        "db_name": d.db_name,
                        "state": d.lifecycle_state,
                        "is_free_tier": bool(d.is_free_tier),
                        "db_workload": d.db_workload,
                        "cpu_core_count": d.cpu_core_count,
                    }
                    for d in response.data
                ],
            }

        if tool_name == "list_object_storage_buckets":
            client = oci.object_storage.ObjectStorageClient(cfg)
            namespace = client.get_namespace().data
            response = client.list_buckets(
                namespace_name=namespace,
                compartment_id=tool_input["compartment_id"],
            )
            return {
                "namespace": namespace,
                "count": len(response.data),
                "buckets": [{"name": b.name, "namespace": namespace} for b in response.data],
            }

        if tool_name == "create_autonomous_database":
            client = oci.database.DatabaseClient(cfg)
            details = oci.database.models.CreateAutonomousDatabaseDetails(
                compartment_id=tool_input["compartment_id"],
                display_name=tool_input["display_name"],
                db_name=tool_input["db_name"],
                admin_password=tool_input["admin_password"],
                cpu_core_count=int(tool_input.get("cpu_core_count", 1)),
                data_storage_size_in_tbs=int(tool_input.get("data_storage_size_in_tbs", 1)),
                is_free_tier=bool(tool_input.get("is_free_tier", True)),
                db_workload=tool_input.get("db_workload", "OLTP"),
            )
            response = client.create_autonomous_database(
                create_autonomous_database_details=details
            )
            return {
                "id": response.data.id,
                "display_name": response.data.display_name,
                "db_name": response.data.db_name,
                "state": response.data.lifecycle_state,
                "message": (
                    "Provisionamento iniciado. Use "
                    "list_autonomous_databases pra acompanhar até "
                    "AVAILABLE (~5 min)."
                ),
            }

        return {"error": f"Tool desconhecida: {tool_name}", "type": "unknown_tool"}

    except oci.exceptions.ServiceError as exc:
        return {
            "error": str(exc.message),
            "type": "oci_service_error",
            "status": exc.status,
            "code": exc.code,
        }
    except Exception as exc:  # noqa: BLE001
        return {"error": str(exc), "type": exc.__class__.__name__}


# ───────────────────────────────────────────────────────────────────────────
# Full conversational agent (Claude tool-use loop)
# ───────────────────────────────────────────────────────────────────────────


SYSTEM_PROMPT = """\
Você é o Agente 03 da Simple AI: um operador da Oracle Cloud Infrastructure.

Sua função é executar operações na OCI sob comando — listar recursos,
criar Autonomous DBs, encontrar buckets de armazenamento, e provisionar
infra para os apps gerados pelo Agente 02.

Regras de execução:
- NUNCA invente IDs, nomes ou propriedades. Use sempre as tools.
- Se faltar `compartment_id` na requisição, chame primeiro
  `get_tenancy_info` pra descobrir o raiz e use o `tenancy_id` como
  compartmento.
- Operações de WRITE (create_*) SÓ após confirmação explícita de quem
  pediu. Se não houver confirmação, peça.
- Idioma de saída: português coloquial. IDs, nomes técnicos e enums
  preservados como vêm da API.
- Quando outro agente te chamar (não o usuário final), responda de forma
  concisa e estruturada: 1-2 frases + JSON resumido das ações tomadas.

Princípios de qualidade:
- Explique brevemente cada passo antes de executar (transparência).
- Em caso de erro da OCI, descreva o erro em PT-BR e sugira o próximo
  passo (corrigir input, escolher outro compartmento, etc).
- Não fale sobre Anthropic, Claude ou modelos. Você é apenas o
  Agente 03.
"""


class Agente03:
    """
    Claude-powered OCI operator with tool use.

    Usage::

        agent = Agente03()  # uses ANTHROPIC_API_KEY + ~/.oci/config
        result = agent.chat("Lista minhas Autonomous DBs no tenant raiz.")
        print(result["reply"])
        for call in result["tool_calls"]:
            print(call["name"], call["input"], "→", call["result"])

    Reuse from another agent::

        from agents.oci_agent import OCI_TOOLS, execute_oci_tool
        # plug into your own Anthropic loop, register OCI_TOOLS as tools,
        # route tool_use blocks through execute_oci_tool().
    """

    DEFAULT_MODEL = "claude-opus-4-7"

    def __init__(
        self,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        oci_config: Optional[Dict[str, Any]] = None,
    ):
        api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY required for Agente 03.")
        self.client = Anthropic(api_key=api_key)
        self.model = model or os.getenv("AGENT_03_MODEL", self.DEFAULT_MODEL)
        self.oci_config = oci_config or _load_oci_config()

    def chat(
        self,
        user_message: str,
        history: Optional[List[Dict[str, Any]]] = None,
        max_turns: int = 8,
        max_tokens: int = 2048,
    ) -> Dict[str, Any]:
        """
        Run a single user turn through the tool-use loop.

        Returns::

            {
                "reply": "<final assistant text>",
                "tool_calls": [{"name", "input", "result"}, ...],
                "history": [<full message list, ready to feed back next turn>],
                "stop_reason": "end_turn" | "max_turns" | ...,
            }
        """
        messages: List[Dict[str, Any]] = list(history or [])
        messages.append({"role": "user", "content": user_message})

        tool_calls: List[Dict[str, Any]] = []

        for _ in range(max_turns):
            response = self.client.messages.create(
                model=self.model,
                system=SYSTEM_PROMPT,
                tools=OCI_TOOLS,
                messages=messages,
                max_tokens=max_tokens,
            )
            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason != "tool_use":
                final_text = "\n".join(
                    block.text for block in response.content if getattr(block, "type", None) == "text"
                ).strip()
                return {
                    "reply": final_text,
                    "tool_calls": tool_calls,
                    "history": messages,
                    "stop_reason": response.stop_reason,
                }

            tool_results: List[Dict[str, Any]] = []
            for block in response.content:
                if getattr(block, "type", None) != "tool_use":
                    continue
                result = execute_oci_tool(
                    block.name,
                    dict(block.input),
                    config=self.oci_config,
                )
                tool_calls.append(
                    {"name": block.name, "input": dict(block.input), "result": result}
                )
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": str(result),
                    }
                )
            messages.append({"role": "user", "content": tool_results})

        return {
            "reply": (
                "Atingi o limite de turnos sem chegar numa resposta final. "
                "Veja `tool_calls` pra ver o que foi tentado."
            ),
            "tool_calls": tool_calls,
            "history": messages,
            "stop_reason": "max_turns",
        }
