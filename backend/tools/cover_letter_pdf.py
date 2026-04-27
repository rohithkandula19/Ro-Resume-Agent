"""Render a cover letter string as a clean PDF."""

import io
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer


def build_cover_letter_pdf(text: str, company: str = "") -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER,
        leftMargin=1.0 * inch, rightMargin=1.0 * inch,
        topMargin=1.0 * inch, bottomMargin=1.0 * inch,
        title=f"Cover Letter{' - ' + company if company else ''}",
    )
    body = ParagraphStyle(
        "body", fontName="Helvetica", fontSize=11, leading=15, alignment=TA_LEFT, spaceAfter=10,
    )
    story = []
    for para in (text or "").split("\n\n"):
        para = para.strip()
        if not para:
            continue
        escaped = (para.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>"))
        story.append(Paragraph(escaped, body))
        story.append(Spacer(1, 4))
    doc.build(story)
    return buf.getvalue()
