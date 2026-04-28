from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from builder.core.text import clean_text, normalize_for_match


@dataclass(frozen=True)
class LayoutRecipe:
    name: str
    best_for: str
    composition: str
    sections: list[str]
    avoid: list[str]


@dataclass(frozen=True)
class LayoutRecipeSet:
    segment_id: str
    recipes: list[LayoutRecipe]
    rule: str

    def to_prompt_block(self) -> str:
        lines = [
            "# RECEITAS DE LAYOUT PARA VARIAR A COMPOSIÇÃO",
            f"segment_id: {self.segment_id}",
            self.rule,
            "",
        ]
        for index, recipe in enumerate(self.recipes, start=1):
            lines.extend([
                f"## Opção {index}: {recipe.name}",
                f"- Melhor para: {recipe.best_for}",
                f"- Composição: {recipe.composition}",
                f"- Seções: {', '.join(recipe.sections)}",
                f"- Evite: {', '.join(recipe.avoid)}",
                "",
            ])
        return "\n".join(lines).strip()


def build_layout_recipes(spec: dict[str, Any]) -> LayoutRecipeSet:
    summary = spec.get("summary") or {}
    raw = normalize_for_match(" ".join([
        clean_text(spec.get("segment") or summary.get("business_type") or "Negócio local"),
        clean_text(spec.get("current_workflow") or summary.get("scope") or "", fallback=""),
        str(summary),
        str(spec.get("raw_quotes") or []),
    ]))

    if any(token in raw for token in ("roupa", "moda", "loja", "catalogo", "varejo", "boutique")):
        return _fashion_recipes()
    if any(token in raw for token in ("padaria", "confeitaria", "cafe", "bolo", "doce", "salgado")):
        return _bakery_recipes()
    if any(token in raw for token in ("clinica", "consultorio", "dentista", "saude", "fisioterapia")):
        return _clinic_recipes()
    if any(token in raw for token in ("oficina", "mecanica", "automotivo", "carro", "moto")):
        return _mechanic_recipes()
    if any(token in raw for token in ("salao", "barbearia", "beleza", "manicure", "cabelo", "estetica")):
        return _beauty_recipes()
    if any(token in raw for token in ("restaurante", "pizzaria", "lanchonete", "hamburguer", "comida")):
        return _restaurant_recipes()
    return _local_business_recipes()


def _set(segment_id: str, recipes: list[LayoutRecipe]) -> LayoutRecipeSet:
    return LayoutRecipeSet(
        segment_id=segment_id,
        recipes=recipes,
        rule="Escolha UMA opção e execute de forma clara. Não misture todas e não use o template padrão se uma receita abaixo encaixar melhor.",
    )


def _bakery_recipes() -> LayoutRecipeSet:
    return _set("bakery", [
        LayoutRecipe(
            name="Menu board artesanal",
            best_for="padaria, confeitaria, café e negócios com produtos do dia",
            composition="Hero com imagem grande e bloco tipo quadro de menu ao lado; produtos em faixas com divisórias finas; CTA como pedido/encomenda.",
            sections=["hero com quadro de destaques", "produtos do dia", "encomendas", "contato"],
            avoid=["cards SaaS", "galeria repetida", "benefícios abstratos"],
        ),
        LayoutRecipe(
            name="Jornada da fornada",
            best_for="negócio artesanal que vende rotina, frescor e encomenda",
            composition="Página em timeline vertical: preparo, balcão, encomenda, retirada. Use uma imagem como textura lateral ou faixa quente.",
            sections=["hero sensorial", "linha do tempo", "produtos", "pedido"],
            avoid=["grid simétrico demais", "texto corporativo", "mapa sem endereço real"],
        ),
    ])


def _fashion_recipes() -> LayoutRecipeSet:
    return _set("fashion-retail", [
        LayoutRecipe(
            name="Vitrine editorial",
            best_for="loja de roupas com apelo visual e novidades",
            composition="Hero assimétrico com imagem editorial dominante; categorias em trilho horizontal; CTA para consultar peça/tamanho.",
            sections=["hero editorial", "categorias", "novidades", "como pedir", "contato"],
            avoid=["cards genéricos", "feed falso", "foto que não pareça loja"],
        ),
        LayoutRecipe(
            name="Catálogo boutique",
            best_for="loja que precisa mostrar variedade sem preço definido",
            composition="Topo compacto + mosaico de categorias; blocos de produto por ocasião; CTA fixo discreto para pedir disponibilidade.",
            sections=["mosaico de categorias", "destaques", "pedido guiado", "contato"],
            avoid=["hero institucional grande demais", "depoimentos inventados", "preços falsos"],
        ),
    ])


def _clinic_recipes() -> LayoutRecipeSet:
    return _set("clinic", [
        LayoutRecipe(
            name="Clareza clínica",
            best_for="clínicas, consultórios e serviços de saúde",
            composition="Layout limpo com muito branco, hero calmo, cards de atendimento sem exagero e bloco de confiança antes do CTA.",
            sections=["hero calmo", "atendimentos", "como agendar", "confiança", "contato"],
            avoid=["promessa de resultado", "cores agressivas", "antes/depois falso"],
        ),
        LayoutRecipe(
            name="Guia de agendamento",
            best_for="serviço em que o usuário precisa entender o próximo passo",
            composition="Estrutura tipo checklist: sintomas/necessidade, atendimento, preparo, agendamento. Use ícones só se forem discretos.",
            sections=["hero objetivo", "passos", "serviços", "perguntas", "contato"],
            avoid=["venda agressiva", "galeria decorativa", "jargão médico"],
        ),
    ])


def _mechanic_recipes() -> LayoutRecipeSet:
    return _set("mechanic", [
        LayoutRecipe(
            name="Oficina industrial",
            best_for="oficina, auto center e serviços automotivos",
            composition="Hero escuro com acento forte; serviços como placas ou ordens de serviço; processo de diagnóstico em passos.",
            sections=["hero forte", "serviços", "diagnóstico", "urgência/agendamento", "contato"],
            avoid=["visual delicado", "paleta pastel", "texto premium vazio"],
        ),
        LayoutRecipe(
            name="Checklist de revisão",
            best_for="oficina que vende revisão, freio, óleo e diagnóstico",
            composition="Página baseada em checklist grande e legível, com blocos de problema -> solução -> orçamento.",
            sections=["problemas comuns", "checklist", "como pedir orçamento", "contato"],
            avoid=["galeria extensa", "promessa de preço", "efeitos suaves demais"],
        ),
    ])


def _beauty_recipes() -> LayoutRecipeSet:
    return _set("beauty", [
        LayoutRecipe(
            name="Editorial de beleza",
            best_for="salão, estética, manicure, barbearia premium",
            composition="Hero com imagem grande e tipografia elegante; serviços em blocos amplos; atmosfera antes/depois sem inventar resultado.",
            sections=["hero aspiracional", "serviços", "experiência", "agendamento"],
            avoid=["visual SaaS", "antes/depois falso", "cards técnicos"],
        ),
        LayoutRecipe(
            name="Agenda boutique",
            best_for="serviço de beleza com reserva/agendamento",
            composition="Layout com faixas suaves, bloco de horários/ritual de atendimento e CTA de agendamento sempre claro.",
            sections=["promessa", "ritual", "serviços", "agendamento"],
            avoid=["galeria sem fotos reais", "depoimentos inventados", "texto genérico"],
        ),
    ])


def _restaurant_recipes() -> LayoutRecipeSet:
    return _set("restaurant", [
        LayoutRecipe(
            name="Cardápio visual",
            best_for="restaurante, pizzaria, lanche e delivery",
            composition="Hero apetitoso; categorias como menu board; pedido/reserva cedo; destaque para delivery/retirada se informado.",
            sections=["hero apetitoso", "cardápio por categoria", "como pedir", "contato"],
            avoid=["pratos inventados", "preços falsos", "visual corporativo"],
        ),
        LayoutRecipe(
            name="Noite de casa",
            best_for="restaurante com experiência de salão ou clima local",
            composition="Layout imersivo com imagem de atmosfera, blocos largos e CTA para reserva ou pedido.",
            sections=["atmosfera", "destaques", "experiência", "reserva/pedido"],
            avoid=["lista seca demais", "feed falso", "mapa sem endereço"],
        ),
    ])


def _local_business_recipes() -> LayoutRecipeSet:
    return _set("local-business", [
        LayoutRecipe(
            name="Serviço local direto",
            best_for="negócio local com ação principal simples",
            composition="Hero objetivo; bloco de problema/solução; processo em três passos; CTA final forte.",
            sections=["hero", "o que resolve", "como funciona", "contato"],
            avoid=["seções decorativas", "números falsos", "cards repetidos"],
        ),
        LayoutRecipe(
            name="Presença de confiança",
            best_for="serviço que precisa parecer real e próximo",
            composition="Topo sóbrio; imagem de contexto; bloco de confiança; atendimento e contato sem distração.",
            sections=["hero com contexto", "confiança", "serviços", "contato"],
            avoid=["visual startup", "gradiente genérico", "texto abstrato"],
        ),
    ])
