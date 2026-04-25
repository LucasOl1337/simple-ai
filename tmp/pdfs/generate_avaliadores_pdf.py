from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PYDEPS = ROOT / "tmp" / "pydeps"
if PYDEPS.exists():
    sys.path.insert(0, str(PYDEPS))

from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

IMAGES_DIR = ROOT / "AVALIADORES READ ME"
OUTPUT_PDF = IMAGES_DIR / "SIMPLE-AI-Apresentacao-Avaliadores.pdf"
PAGE_WIDTH = 960
PAGE_HEIGHT = 540
MARGIN = 24


def iter_slide_paths() -> list[Path]:
    return sorted(IMAGES_DIR.glob("*.png"))


def draw_cover(pdf: canvas.Canvas, slide_count: int) -> None:
    pdf.setTitle("SIMPLE-AI - Apresentacao para Avaliadores")
    pdf.setAuthor("SIMPLE-AI")
    pdf.setSubject("Slides visuais consolidados em PDF")

    pdf.setFillColorRGB(0.05, 0.08, 0.14)
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    pdf.setFillColorRGB(1, 1, 1)
    pdf.setFont("Helvetica-Bold", 28)
    pdf.drawString(60, PAGE_HEIGHT - 120, "SIMPLE-AI")

    pdf.setFont("Helvetica", 18)
    pdf.drawString(60, PAGE_HEIGHT - 160, "Apresentacao para avaliadores")

    pdf.setFont("Helvetica", 12)
    pdf.drawString(60, PAGE_HEIGHT - 215, f"PDF consolidado com {slide_count} slides em imagem.")
    pdf.drawString(60, PAGE_HEIGHT - 235, "Abra este arquivo diretamente no GitHub para leitura rapida.")
    pdf.drawString(60, PAGE_HEIGHT - 255, "Fonte: pasta AVALIADORES READ ME.")

    pdf.setFont("Helvetica", 10)
    pdf.setFillColorRGB(0.78, 0.84, 0.95)
    pdf.drawString(60, 50, "Gerado automaticamente a partir das imagens versionadas da apresentacao.")
    pdf.showPage()


def draw_slide(pdf: canvas.Canvas, image_path: Path) -> None:
    image = ImageReader(str(image_path))
    img_width, img_height = image.getSize()

    max_width = PAGE_WIDTH - (MARGIN * 2)
    max_height = PAGE_HEIGHT - (MARGIN * 2)
    scale = min(max_width / img_width, max_height / img_height)

    draw_width = img_width * scale
    draw_height = img_height * scale
    x = (PAGE_WIDTH - draw_width) / 2
    y = (PAGE_HEIGHT - draw_height) / 2

    pdf.setFillColorRGB(1, 1, 1)
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    pdf.drawImage(image, x, y, width=draw_width, height=draw_height, preserveAspectRatio=True, mask="auto")
    pdf.showPage()


def build_pdf() -> Path:
    slide_paths = iter_slide_paths()
    if not slide_paths:
        raise FileNotFoundError(f"Nenhum slide encontrado em {IMAGES_DIR}")

    pdf = canvas.Canvas(str(OUTPUT_PDF), pagesize=(PAGE_WIDTH, PAGE_HEIGHT))
    draw_cover(pdf, len(slide_paths))
    for slide_path in slide_paths:
        draw_slide(pdf, slide_path)
    pdf.save()
    return OUTPUT_PDF


if __name__ == "__main__":
    output = build_pdf()
    print(output)
