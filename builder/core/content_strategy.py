from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from builder.core.text import clean_text, normalize_for_match


@dataclass(frozen=True)
class ContentStrategy:
    segment_id: str
    required_sections: list[str]
    recommended_sections: list[str]
    avoid_sections: list[str]
    content_prompts: list[str]
    section_rules: list[str]
    missing_data_rules: list[str]

    def to_prompt_block(self) -> str:
        def lines(items: list[str]) -> str:
            return "\n".join(f"- {item}" for item in items) or "- não definido"

        return (
            "# ESTRATÉGIA DE CONTEÚDO POR SEGMENTO\n"
            f"segment_id: {self.segment_id}\n\n"
            "## Seções obrigatórias\n"
            f"{lines(self.required_sections)}\n\n"
            "## Seções recomendadas se houver conteúdo suficiente\n"
            f"{lines(self.recommended_sections)}\n\n"
            "## Evite\n"
            f"{lines(self.avoid_sections)}\n\n"
            "## Perguntas que a página precisa responder\n"
            f"{lines(self.content_prompts)}\n\n"
            "## Regras de escrita e composição\n"
            f"{lines(self.section_rules)}\n\n"
            "## Quando dados estiverem faltando\n"
            f"{lines(self.missing_data_rules)}"
        )


def build_content_strategy(spec: dict[str, Any]) -> ContentStrategy:
    summary = spec.get("summary") or {}
    segment_text = clean_text(spec.get("segment") or summary.get("business_type") or "Negócio local")
    current_workflow = clean_text(spec.get("current_workflow") or summary.get("scope") or "", fallback="")
    raw = normalize_for_match(" ".join([segment_text, current_workflow, str(summary), str(spec.get("raw_quotes") or [])]))

    if any(token in raw for token in ("roupa", "moda", "loja", "catalogo", "varejo", "boutique")):
        return _fashion_retail_strategy(spec)
    if any(token in raw for token in ("padaria", "confeitaria", "cafe", "bolo", "doce", "salgado")):
        return _bakery_strategy(spec)
    if any(token in raw for token in ("clinica", "consultorio", "dentista", "saude", "fisioterapia")):
        return _clinic_strategy(spec)
    if any(token in raw for token in ("oficina", "mecanica", "automotivo", "carro", "moto")):
        return _mechanic_strategy(spec)
    if any(token in raw for token in ("salao", "barbearia", "beleza", "manicure", "cabelo", "estetica")):
        return _beauty_strategy(spec)
    if any(token in raw for token in ("restaurante", "pizzaria", "lanchonete", "hamburguer", "comida")):
        return _restaurant_strategy(spec)
    return _default_local_strategy(spec)


def _has_signal(spec: dict[str, Any], *terms: str) -> bool:
    text = normalize_for_match(str(spec))
    return any(term in text for term in terms)


def _base_missing_data_rules(spec: dict[str, Any]) -> list[str]:
    rules = [
        "Não invente telefone, endereço, preço, perfil de Instagram, depoimentos ou números de clientes.",
        "Se WhatsApp/telefone não foi informado, o CTA deve dizer que o contato será confirmado e apontar para #contato.",
        "Se não houver fotos reais, use somente assets gerados/materializados pelo pipeline.",
    ]
    if not _has_signal(spec, "instagram", "@"):
        rules.append("Não crie seção de Instagram/feed se o perfil ou conteúdo concreto não foi informado.")
    return rules


def _fashion_retail_strategy(spec: dict[str, Any]) -> ContentStrategy:
    return ContentStrategy(
        segment_id="fashion-retail",
        required_sections=["hero com proposta de catálogo e pedido", "categorias ou tipos de peça", "novidades/como pedir", "contato"],
        recommended_sections=["destaques da semana", "retirada/entrega", "atendimento online e loja física", "prova de confiança simples"],
        avoid_sections=["feed Instagram falso", "cards genéricos de benefícios", "foto que pareça clínica/salão se o negócio é loja", "catálogo sem categorias"],
        content_prompts=[
            "Que tipo de roupa ou peça a loja vende?",
            "Como a pessoa escolhe uma peça e faz o pedido?",
            "Existe loja física, retirada, entrega ou atendimento online?",
            "O que há de novo ou em destaque agora?",
        ],
        section_rules=[
            "Use linguagem de compra: ver peças, escolher tamanho/cor, consultar disponibilidade, pedir pelo canal principal.",
            "Se não houver produtos concretos, fale em categorias honestas, não invente nomes de coleção ou preços.",
            "Imagens devem parecer loja, roupas, vitrine, araras, tecidos, cliente escolhendo peça ou catálogo visual.",
        ],
        missing_data_rules=_base_missing_data_rules(spec),
    )


def _bakery_strategy(spec: dict[str, Any]) -> ContentStrategy:
    return ContentStrategy(
        segment_id="bakery",
        required_sections=["hero sensorial", "produtos principais", "encomendas", "contato"],
        recommended_sections=["produção diária", "retirada/entrega", "itens por ocasião"],
        avoid_sections=["benefícios abstratos", "imagens frias de escritório", "preços inventados"],
        content_prompts=["Quais produtos são vendidos?", "Aceita encomenda?", "Como pedir?", "Atende bairro/região?"],
        section_rules=["Use textura, frescor e rotina real.", "Não invente sabores específicos se não foram ditos."],
        missing_data_rules=_base_missing_data_rules(spec),
    )


def _clinic_strategy(spec: dict[str, Any]) -> ContentStrategy:
    return ContentStrategy(
        segment_id="clinic",
        required_sections=["hero claro", "serviços/atendimentos", "confiança", "agendamento/contato"],
        recommended_sections=["como funciona", "estrutura", "perguntas frequentes"],
        avoid_sections=["promessas médicas", "antes/depois inventado", "tom agressivo de venda"],
        content_prompts=["Qual atendimento oferece?", "Como agendar?", "Que cuidado/confiança precisa transmitir?"],
        section_rules=["Use tom calmo e responsável.", "Não prometa resultados clínicos."],
        missing_data_rules=_base_missing_data_rules(spec),
    )


def _mechanic_strategy(spec: dict[str, Any]) -> ContentStrategy:
    return ContentStrategy(
        segment_id="mechanic",
        required_sections=["hero direto", "serviços automotivos", "processo/diagnóstico", "contato"],
        recommended_sections=["marcas/tipos de veículo", "garantia se informada", "urgência"],
        avoid_sections=["visual delicado", "promessas de preço", "jargão técnico excessivo"],
        content_prompts=["Quais serviços faz?", "Como solicitar orçamento?", "Atende emergência ou agendamento?"],
        section_rules=["Priorize clareza, força e confiança operacional."],
        missing_data_rules=_base_missing_data_rules(spec),
    )


def _beauty_strategy(spec: dict[str, Any]) -> ContentStrategy:
    return ContentStrategy(
        segment_id="beauty",
        required_sections=["hero aspiracional", "serviços", "experiência", "agendamento/contato"],
        recommended_sections=["galeria se houver fotos", "pacotes se informados", "cuidados"],
        avoid_sections=["depoimentos falsos", "antes/depois inventado", "visual SaaS"],
        content_prompts=["Quais serviços de beleza?", "Como agendar?", "Qual atmosfera do atendimento?"],
        section_rules=["Use sofisticação, cuidado e proximidade sem exagero."],
        missing_data_rules=_base_missing_data_rules(spec),
    )


def _restaurant_strategy(spec: dict[str, Any]) -> ContentStrategy:
    return ContentStrategy(
        segment_id="restaurant",
        required_sections=["hero com apetite", "cardápio/categorias", "pedido/reserva", "contato"],
        recommended_sections=["pratos destaque", "delivery/retirada", "horário se informado"],
        avoid_sections=["pratos/preços inventados", "imagens genéricas de escritório", "texto gourmet vazio"],
        content_prompts=["Que comida serve?", "Como pedir/reservar?", "Atende delivery ou salão?"],
        section_rules=["Use linguagem sensorial, mas concreta."],
        missing_data_rules=_base_missing_data_rules(spec),
    )


def _default_local_strategy(spec: dict[str, Any]) -> ContentStrategy:
    return ContentStrategy(
        segment_id="local-business",
        required_sections=["hero claro", "o que oferece", "como funciona", "contato"],
        recommended_sections=["prova de confiança", "área atendida", "perguntas frequentes"],
        avoid_sections=["seções decorativas sem conteúdo", "depoimentos inventados", "números falsos"],
        content_prompts=["O que o negócio faz?", "Para quem é?", "Qual a próxima ação?", "O que falta para confiar?"],
        section_rules=["Cada seção deve responder uma dúvida real do visitante."],
        missing_data_rules=_base_missing_data_rules(spec),
    )
