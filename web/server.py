#!/usr/bin/env python3
"""Fountain Writer — API Server (PDF, export)"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Fountain Writer API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ExportRequest(BaseModel):
    text: str
    title: str = "Roteiro"
    page_size: str = "A4"


@app.post("/api/pdf")
def export_pdf(req: ExportRequest):
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4, LETTER
        from reportlab.lib.units import inch
    except ImportError:
        return Response("reportlab not installed", status_code=500)

    from app.models.fountain import get_line_type, LineType
    import textwrap
    import io

    page_size = A4 if req.page_size == "A4" else LETTER
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=page_size)
    pw, ph = page_size
    top_m = ph - inch
    bot_m = inch
    left_m = 1.5 * inch

    tobj = cv.beginText(left_m, top_m)
    tobj.setFont("Courier", 12)
    prev = LineType.ACTION

    for line in req.text.split("\n"):
        ltype = get_line_type(line, prev)
        clean = line.strip()
        indent, wrap_w = 0, 60

        if ltype == LineType.CHARACTER:
            indent, wrap_w = 22, 40
        elif ltype == LineType.DIALOGUE:
            indent, wrap_w = 12, 35
        elif ltype == LineType.PARENTHETICAL:
            indent, wrap_w = 16, 30
        elif ltype == LineType.TRANSITION:
            indent, wrap_w = 45, 15
        elif ltype == LineType.CENTER:
            clean = clean.replace(">", "").replace("<", "").strip()
            indent = 25

        wrapped = textwrap.wrap(clean, width=wrap_w) if clean else [""]
        for wl in (wrapped or [""]):
            if tobj.getY() < bot_m:
                cv.drawText(tobj)
                cv.showPage()
                tobj = cv.beginText(left_m, top_m)
                tobj.setFont("Courier", 12)
            tobj.textLine(" " * indent + wl)
        prev = ltype

    cv.drawText(tobj)
    cv.save()
    buf.seek(0)
    return Response(buf.read(), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={req.title}.pdf"})


@app.post("/api/html")
def export_html(req: ExportRequest):
    from app.core.exporter import export_html as html_export
    result = html_export(req.text, req.title)
    return Response(result, media_type="text/html",
                    headers={"Content-Disposition": f"attachment; filename={req.title}.html"})


@app.get("/api/health")
def health():
    return {"status": "ok"}
