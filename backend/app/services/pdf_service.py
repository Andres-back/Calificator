"""Generación de PDFs para reportes y exportaciones."""
from __future__ import annotations

from io import BytesIO
from typing import Any

from fpdf import FPDF

from app.core.logging import get_logger

logger = get_logger(__name__)


class XCalificatorPDF(FPDF):
    def header(self) -> None:
        self.set_font("Helvetica", "B", 12)
        self.cell(0, 10, "XCalificator", align="C")
        self.ln(5)

    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 10, f"Página {self.page_no()}", align="C")


def generate_report_pdf(data: dict[str, Any], title: str) -> bytes:
    """Genera un PDF simple de reporte y devuelve bytes."""
    pdf = XCalificatorPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, title, ln=True, align="C")
    pdf.ln(5)

    pdf.set_font("Helvetica", size=10)
    for key, value in data.items():
        line = f"{key}: {value}"
        pdf.multi_cell(0, 8, line)

    return bytes(pdf.output())


def generate_boletin_pdf(
    nombre_estudiante: str,
    materia_name: str,
    calificaciones: list[dict[str, Any]],
) -> bytes:
    """Genera el boletín de un estudiante en PDF."""
    pdf = XCalificatorPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, f"Boletín - {nombre_estudiante}", ln=True, align="C")
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, f"Materia: {materia_name}", ln=True)
    pdf.ln(4)

    # Table header
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(90, 8, "Evaluación", border=1)
    pdf.cell(35, 8, "Nota", border=1)
    pdf.cell(55, 8, "Estado", border=1)
    pdf.ln()

    pdf.set_font("Helvetica", size=9)
    for row in calificaciones:
        nombre = str(row.get("nombre", ""))[:45]
        nota = str(row.get("nota_confirmada") or row.get("nota_sugerida") or "-")
        estado = str(row.get("estado", ""))
        pdf.cell(90, 7, nombre, border=1)
        pdf.cell(35, 7, nota, border=1, align="C")
        pdf.cell(55, 7, estado, border=1)
        pdf.ln()

    return bytes(pdf.output())
