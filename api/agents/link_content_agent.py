# -*- coding: utf-8 -*-
"""ConverteLinkEmConteudo: turns user-provided URLs into builder-ready context."""
from __future__ import annotations

import hashlib
import json
import os
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest


URL_RE = re.compile(r"https?://[^\s<>'\")]+", re.IGNORECASE)


def extract_urls(text: str) -> List[str]:
    urls = []
    for match in URL_RE.finditer(text or ""):
        url = match.group(0).rstrip(".,;!?")
        if url not in urls:
            urls.append(url)
    return urls


class _MetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title = ""
        self.meta: Dict[str, str] = {}
        self.links: List[str] = []
        self.images: List[str] = []
        self._in_title = False
        self._title_chunks: List[str] = []
        self._text_chunks: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[tuple[str, Optional[str]]]) -> None:
        attr = {key.lower(): value or "" for key, value in attrs}
        lower_tag = tag.lower()
        if lower_tag == "title":
            self._in_title = True
        elif lower_tag == "meta":
            key = (attr.get("property") or attr.get("name") or "").strip().lower()
            content = attr.get("content", "").strip()
            if key and content:
                self.meta[key] = content
        elif lower_tag == "a" and attr.get("href"):
            self.links.append(attr["href"])
        elif lower_tag == "img" and attr.get("src"):
            self.images.append(attr["src"])

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        text = re.sub(r"\s+", " ", data or "").strip()
        if not text:
            return
        if self._in_title:
            self._title_chunks.append(text)
        elif len(text) > 2:
            self._text_chunks.append(text)

    def finish(self) -> Dict[str, Any]:
        title = " ".join(self._title_chunks).strip() or self.meta.get("og:title", "")
        description = self.meta.get("description") or self.meta.get("og:description") or self.meta.get("twitter:description") or ""
        og_image = self.meta.get("og:image") or self.meta.get("twitter:image") or ""
        text = " ".join(self._text_chunks[:200])
        return {
            "title": title[:300],
            "description": description[:800],
            "og_image": og_image,
            "text": text[:8000],
            "links": self.links[:80],
            "images": self.images[:40],
            "meta": self.meta,
        }


class LinkContentAgent:
    def __init__(self, project_root: Path, storage_dir: Path):
        self.project_root = project_root
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.enabled = os.getenv("LINK_CONTENT_AGENT_ENABLED", "1").strip().lower() not in {"0", "false", "no", "off"}
        self.base_url = os.getenv("LINK_CONTENT_BASE_URL", os.getenv("FIRST_INTERACTION_BASE_URL", "http://localhost:20128/v1")).strip()
        self.model = os.getenv("LINK_CONTENT_MODEL", os.getenv("FIRST_INTERACTION_MODEL", "gpt-5.4-mini")).strip() or "gpt-5.4-mini"
        self.timeout_s = float(os.getenv("LINK_CONTENT_TIMEOUT_SECONDS", "20").strip() or "20")
        self.fetch_timeout_s = float(os.getenv("LINK_CONTENT_FETCH_TIMEOUT_SECONDS", "10").strip() or "10")
        self.max_images = int(os.getenv("LINK_CONTENT_MAX_IMAGES", "6").strip() or "6")
        self.api_key = (
            os.getenv("LINK_CONTENT_API_KEY", "").strip()
            or os.getenv("FIRST_INTERACTION_API_KEY", "").strip()
            or os.getenv("OPENAI_API_KEY", "").strip()
            or "local-no-key"
        )
        self.context_text = self._load_context_text()
        if self.enabled:
            print(f"[LINK_CONTENT] enabled base_url={self.base_url!r} model={self.model!r}")
        else:
            print("[LINK_CONTENT] disabled via LINK_CONTENT_AGENT_ENABLED.")

    def inspect_url(
        self,
        *,
        url: str,
        session_id: Optional[str] = None,
        user_message: str = "",
        notepad: Optional[Dict[str, Any]] = None,
        transcript: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("ConverteLinkEmConteudo desativado.")
        clean_url = self._validate_url(url)
        inspection_id = self._inspection_id(clean_url)
        source_type = self._source_type(clean_url)
        target_dir = self.storage_dir / self._safe_part(session_id or "anonymous") / inspection_id
        target_dir.mkdir(parents=True, exist_ok=True)

        fetched = self._fetch_metadata(clean_url)
        reference_images = self._materialize_reference_images(clean_url, fetched, target_dir)
        analysis = self._analyze(clean_url, source_type, fetched, user_message, notepad, transcript)
        result = {
            "inspection_id": inspection_id,
            "source_url": clean_url,
            "source_type": source_type,
            "status": "ok" if fetched.get("ok") else "partial",
            "captured_at": int(time.time()),
            "core_info": analysis.get("core_info") or {},
            "content_signals": analysis.get("content_signals") or {},
            "visual_signals": analysis.get("visual_signals") or {},
            "reference_images": reference_images,
            "builder_hints": analysis.get("builder_hints") or {},
            "summary": analysis.get("summary") or self._fallback_summary(clean_url, fetched),
            "warnings": list(dict.fromkeys([*(fetched.get("warnings") or []), *(analysis.get("warnings") or [])])),
            "raw_extract": {
                "title": fetched.get("title") or "",
                "description": fetched.get("description") or "",
                "text_sample": (fetched.get("text") or "")[:1200],
            },
        }
        (target_dir / "manifest.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        return result

    def _load_context_text(self) -> str:
        path = self.project_root / "docs" / "agents" / "link-content" / "system.md"
        try:
            return path.read_text(encoding="utf-8")
        except Exception:
            return ""

    def _validate_url(self, raw: str) -> str:
        url = (raw or "").strip()
        parsed = urlparse.urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Link invalido para inspeção.")
        return url

    def _inspection_id(self, url: str) -> str:
        digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:10]
        host = self._safe_part(urlparse.urlparse(url).netloc.split(":", 1)[0])[:30]
        return f"link_{host}_{digest}"

    def _source_type(self, url: str) -> str:
        host = urlparse.urlparse(url).netloc.lower()
        path = urlparse.urlparse(url).path.lower()
        if "instagram.com" in host:
            if "/p/" in path or "/reel/" in path:
                return "instagram_post"
            return "instagram_profile"
        if "facebook.com" in host:
            return "facebook"
        if "tiktok.com" in host:
            return "tiktok"
        if "linkedin.com" in host:
            return "linkedin"
        return "website"

    def _fetch_metadata(self, url: str) -> Dict[str, Any]:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 SIMPLE-AI-LinkContent/1.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        req = urlrequest.Request(url, headers=headers, method="GET")
        try:
            with urlrequest.urlopen(req, timeout=self.fetch_timeout_s) as response:  # nosec B310
                content_type = response.headers.get("content-type", "")
                body = response.read(1_500_000)
        except urlerror.HTTPError as error:
            return {"ok": False, "warnings": [f"Link retornou HTTP {error.code}"]}
        except Exception as error:
            return {"ok": False, "warnings": [f"Falha ao ler link: {error}"]}
        if "text/html" not in content_type and b"<html" not in body[:2000].lower():
            return {"ok": False, "warnings": ["Link não retornou HTML legível"]}
        text = body.decode("utf-8", errors="ignore")
        parser = _MetadataParser()
        parser.feed(text)
        data = parser.finish()
        data["ok"] = True
        data["warnings"] = []
        return data

    def _materialize_reference_images(self, url: str, fetched: Dict[str, Any], target_dir: Path) -> List[Dict[str, str]]:
        candidates = []
        if fetched.get("og_image"):
            candidates.append(fetched["og_image"])
        candidates.extend(fetched.get("images") or [])
        absolute = []
        for candidate in candidates:
            src = urlparse.urljoin(url, candidate)
            if src.startswith("http") and src not in absolute:
                absolute.append(src)
        result = []
        for index, image_url in enumerate(absolute[: self.max_images], start=1):
            saved = self._download_image(image_url, target_dir, index)
            if not saved:
                continue
            result.append({
                "source": self._source_type(url),
                "original_url": image_url,
                "local_path": saved.as_posix(),
                "alt": f"Imagem de referência {index}",
                "usage": "reference_or_reprocess",
            })
        return result

    def _download_image(self, image_url: str, target_dir: Path, index: int) -> Optional[Path]:
        req = urlrequest.Request(image_url, headers={"User-Agent": "Mozilla/5.0 SIMPLE-AI-LinkContent/1.0"}, method="GET")
        try:
            with urlrequest.urlopen(req, timeout=self.fetch_timeout_s) as response:  # nosec B310
                content_type = response.headers.get("content-type", "").lower()
                if not content_type.startswith("image/"):
                    return None
                ext = ".jpg"
                if "png" in content_type:
                    ext = ".png"
                elif "webp" in content_type:
                    ext = ".webp"
                data = response.read(4_000_000)
        except Exception:
            return None
        path = target_dir / f"image-{index:02d}{ext}"
        path.write_bytes(data)
        return path

    def _analyze(
        self,
        url: str,
        source_type: str,
        fetched: Dict[str, Any],
        user_message: str,
        notepad: Optional[Dict[str, Any]],
        transcript: Optional[List[Dict[str, Any]]],
    ) -> Dict[str, Any]:
        fallback = self._heuristic_analysis(url, source_type, fetched)
        if not fetched.get("ok"):
            return fallback
        try:
            content = self._chat_completion(messages=[
                {"role": "system", "content": self.context_text or "Converta links em briefing estruturado. Retorne JSON."},
                {"role": "user", "content": json.dumps({
                    "url": url,
                    "source_type": source_type,
                    "user_message": user_message,
                    "notepad_state": notepad or {},
                    "transcript_tail": (transcript or [])[-8:],
                    "page_extract": {
                        "title": fetched.get("title"),
                        "description": fetched.get("description"),
                        "text": (fetched.get("text") or "")[:5000],
                        "meta": fetched.get("meta") or {},
                    },
                }, ensure_ascii=False)},
            ])
            parsed = self._extract_json(content)
            return self._merge_analysis(fallback, parsed)
        except Exception as error:
            fallback.setdefault("warnings", []).append(f"Análise LLM indisponível: {error}")
            return fallback

    def _heuristic_analysis(self, url: str, source_type: str, fetched: Dict[str, Any]) -> Dict[str, Any]:
        title = fetched.get("title") or ""
        description = fetched.get("description") or ""
        text = " ".join([title, description, fetched.get("text") or ""])
        normalized = self._normalize(text)
        business_type = ""
        strategy = "local-business"
        layout = "Presença de confiança"
        if any(token in normalized for token in ("moda", "roupa", "look", "vestido", "loja")):
            business_type, strategy, layout = "loja de roupas", "fashion-retail", "Vitrine editorial"
        elif any(token in normalized for token in ("padaria", "bolo", "paes", "cafe", "confeitaria")):
            business_type, strategy, layout = "padaria", "bakery", "Menu board artesanal"
        elif any(token in normalized for token in ("clinica", "dentista", "saude", "consulta")):
            business_type, strategy, layout = "clínica", "clinic", "Clareza clínica"
        elif any(token in normalized for token in ("oficina", "mecanica", "auto", "carro")):
            business_type, strategy, layout = "oficina mecânica", "mechanic", "Oficina industrial"
        elif any(token in normalized for token in ("salao", "beleza", "barbearia", "estetica")):
            business_type, strategy, layout = "beleza", "beauty", "Editorial de beleza"
        elif any(token in normalized for token in ("restaurante", "pizza", "lanche", "delivery")):
            business_type, strategy, layout = "restaurante", "restaurant", "Cardápio visual"
        handle = self._extract_handle(url)
        business_name = self._clean_title(title, handle)
        offerings = self._extract_keywords(normalized)
        return {
            "core_info": {
                "business_name": business_name,
                "business_type": business_type,
                "bio": description[:500],
                "location": "",
                "contacts": self._extract_contacts(text),
                "social_handles": [handle] if handle else [],
            },
            "content_signals": {
                "offerings": offerings,
                "tone": self._tone_from_text(normalized),
                "target_audience": "",
                "frequent_words": offerings[:8],
                "cta_patterns": self._extract_ctas(normalized),
            },
            "visual_signals": {
                "colors": [],
                "style": self._style_from_source(source_type, strategy),
                "image_mood": self._image_mood(strategy),
                "composition_notes": [layout],
            },
            "builder_hints": {
                "content_strategy": strategy,
                "layout_suggestion": layout,
                "image_prompt_additions": self._image_mood(strategy),
                "do_not_invent": ["preços", "endereço", "telefone", "depoimentos"],
            },
            "summary": self._fallback_summary(url, fetched),
            "warnings": [],
        }

    def _chat_completion(self, *, messages: List[Dict[str, Any]]) -> str:
        endpoint = f"{self.base_url.rstrip('/')}/chat/completions"
        payload = {"model": self.model, "temperature": 0.1, "messages": messages}
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urlrequest.Request(endpoint, data=body, headers=self._headers(), method="POST")
        with urlrequest.urlopen(req, timeout=self.timeout_s) as response:  # nosec B310
            data = json.loads(response.read().decode("utf-8"))
        if isinstance(data, dict) and data.get("error"):
            raise RuntimeError(json.dumps(data["error"], ensure_ascii=False))
        return str(data.get("choices", [{}])[0].get("message", {}).get("content") or "").strip()

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _extract_json(self, raw: str) -> Dict[str, Any]:
        text = (raw or "").strip()
        try:
            parsed = json.loads(text)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            pass
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return {}
        try:
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}

    def _merge_analysis(self, fallback: Dict[str, Any], parsed: Dict[str, Any]) -> Dict[str, Any]:
        merged = dict(fallback)
        for key in ("core_info", "content_signals", "visual_signals", "builder_hints"):
            value = parsed.get(key)
            if isinstance(value, dict):
                merged[key] = {**(merged.get(key) or {}), **{k: v for k, v in value.items() if v not in (None, "", [])}}
        if parsed.get("summary"):
            merged["summary"] = str(parsed["summary"])
        warnings = []
        warnings.extend(merged.get("warnings") or [])
        if isinstance(parsed.get("warnings"), list):
            warnings.extend(str(item) for item in parsed["warnings"])
        merged["warnings"] = list(dict.fromkeys(warnings))
        return merged

    def _fallback_summary(self, url: str, fetched: Dict[str, Any]) -> str:
        title = fetched.get("title") or urlparse.urlparse(url).netloc
        description = fetched.get("description") or ""
        if description:
            return f"{title}: {description}"[:700]
        return f"Referência extraída de {title}"[:700]

    def _extract_handle(self, url: str) -> str:
        parsed = urlparse.urlparse(url)
        parts = [part for part in parsed.path.split("/") if part]
        if "instagram.com" in parsed.netloc.lower() and parts and parts[0] not in {"p", "reel", "stories", "explore"}:
            return f"@{parts[0]}"
        return ""

    def _clean_title(self, title: str, handle: str) -> str:
        value = re.sub(r"\s*\|\s*Instagram.*$", "", title or "", flags=re.IGNORECASE).strip()
        value = re.sub(r"\s*\(@[^)]+\).*$", "", value).strip()
        if value:
            return value[:120]
        return handle.lstrip("@") if handle else ""

    def _extract_contacts(self, text: str) -> List[str]:
        contacts = []
        for match in re.findall(r"\+?55?\s*\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}", text or ""):
            contacts.append(match.strip())
        for match in re.findall(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", text or ""):
            contacts.append(match.strip())
        return list(dict.fromkeys(contacts))[:6]

    def _extract_ctas(self, normalized: str) -> List[str]:
        ctas = []
        for token in ("direct", "whatsapp", "agende", "reserve", "peca", "orcamento", "delivery", "encomenda"):
            if token in normalized:
                ctas.append(token)
        return ctas[:6]

    def _extract_keywords(self, normalized: str) -> List[str]:
        keywords = []
        candidates = (
            "vestido", "blusa", "calca", "look", "moda", "paes", "bolo", "salgado", "cafe", "encomenda",
            "consulta", "tratamento", "limpeza", "revisao", "freio", "oleo", "corte", "barba", "manicure",
            "pizza", "lanche", "delivery", "sobremesa",
        )
        for candidate in candidates:
            if candidate in normalized:
                keywords.append(candidate)
        return keywords[:10]

    def _tone_from_text(self, normalized: str) -> str:
        if any(token in normalized for token in ("premium", "sofistic", "exclusiv")):
            return "premium e cuidadoso"
        if any(token in normalized for token in ("artesanal", "caseiro", "feito a mao")):
            return "artesanal e acolhedor"
        if any(token in normalized for token in ("promo", "oferta", "imperdivel")):
            return "direto e comercial"
        return "próximo e profissional"

    def _style_from_source(self, source_type: str, strategy: str) -> str:
        if strategy == "fashion-retail":
            return "editorial boutique"
        if strategy == "bakery":
            return "artesanal quente"
        if strategy == "mechanic":
            return "industrial confiável"
        if strategy == "clinic":
            return "limpo e clínico"
        if source_type.startswith("instagram"):
            return "social visual"
        return "presença local confiável"

    def _image_mood(self, strategy: str) -> List[str]:
        mapping = {
            "fashion-retail": ["editorial boutique", "luz natural", "produto em uso", "tons coerentes com o perfil"],
            "bakery": ["textura artesanal", "luz quente", "produto fresco", "ambiente de balcão"],
            "clinic": ["ambiente claro", "organização", "confiança", "cuidado humano"],
            "mechanic": ["oficina real", "ferramentas", "contraste industrial", "serviço em andamento"],
            "beauty": ["acabamento premium", "cuidado", "beleza em detalhe", "luz suave"],
            "restaurant": ["comida apetitosa", "mesa real", "luz quente", "experiência de pedido"],
        }
        return mapping.get(strategy, ["negócio local real", "atendimento próximo", "imagem confiável"])

    def _normalize(self, text: str) -> str:
        normalized = text.lower()
        replacements = str.maketrans("áàãâäéèêëíìîïóòõôöúùûüç", "aaaaaeeeeiiiiooooouuuuc")
        return normalized.translate(replacements)

    def _safe_part(self, raw: str) -> str:
        return re.sub(r"[^a-zA-Z0-9_-]+", "-", raw or "item").strip("-") or "item"
