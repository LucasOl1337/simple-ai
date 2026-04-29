"""Shared pytest fixtures for builder module tests."""
from __future__ import annotations

from pathlib import Path

import pytest


@pytest.fixture
def vendor_path() -> Path:
    """Return the vendored Open Design root."""
    root = Path(__file__).resolve().parent.parent
    return root / "vendor" / "open-design"


@pytest.fixture
def design_systems_path(vendor_path: Path) -> Path:
    return vendor_path / "design-systems"


@pytest.fixture
def skills_path(vendor_path: Path) -> Path:
    return vendor_path / "skills"
