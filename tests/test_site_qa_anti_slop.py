"""Tests for the new anti-slop warnings in site_qa."""
from __future__ import annotations

from pathlib import Path

from builder.core.site_qa import _flag_anti_slop, SiteQAResult


def _r() -> SiteQAResult:
    return SiteQAResult(html="", passed=True)


def test_flags_emoji_in_h1():
    html = "<html><body><h1>🚀 Bem-vindo</h1></body></html>"
    result = _r()
    _flag_anti_slop(html, result)
    assert any("emoji em heading" in w.lower() for w in result.warnings)


def test_does_not_flag_emoji_in_body_paragraph():
    html = "<html><body><p>Adoramos café ☕ pela manhã</p></body></html>"
    result = _r()
    _flag_anti_slop(html, result)
    assert not any("emoji em heading" in w.lower() for w in result.warnings)


def test_flags_section_without_heading():
    html = (
        "<html><body>"
        "<section><p>Texto sem cabeçalho</p></section>"
        "<section><h2>Com cabeçalho</h2><p>texto</p></section>"
        "</body></html>"
    )
    result = _r()
    _flag_anti_slop(html, result)
    assert any("section sem heading" in w.lower() for w in result.warnings)


def test_does_not_flag_section_with_aria_label_only():
    # Sections that delegate semantics to aria-label are acceptable.
    html = (
        "<html><body>"
        "<section aria-label='Galeria'><img src='./assets/x.jpg' alt='x'></section>"
        "</body></html>"
    )
    result = _r()
    _flag_anti_slop(html, result)
    assert not any("section sem heading" in w.lower() for w in result.warnings)


def test_warnings_do_not_set_passed_false():
    # Anti-slop warnings are non-blocking. passed stays True unless other
    # repairs flag broken images.
    html = "<html><body><h1>🚀 Welcome</h1><section><p>x</p></section></body></html>"
    result = SiteQAResult(html="", passed=True)
    _flag_anti_slop(html, result)
    assert result.passed is True
