import json
import math
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from ..database import get_db
from ..schemas import GenerateRequest
from ..services.template_engine import render_template
from ..services.pdf_generator import generate_pdf

router = APIRouter(prefix="/api/generate", tags=["generate"])


@router.post("/{slug}")
async def generate(slug: str, body: GenerateRequest, db: AsyncSession = Depends(get_db)):
    data = body.data
    if not data:
        raise HTTPException(status_code=400, detail='Request body must include "data" object with template fields')

    result = await db.execute(
        text("SELECT * FROM pdf_templates WHERE slug = :slug"),
        {'slug': slug}
    )
    template = result.mappings().fetchone()

    if not template:
        raise HTTPException(status_code=404, detail=f'Template "{slug}" not found')

    page_config = template['page_config'] or {}
    if isinstance(page_config, str):
        page_config = json.loads(page_config)

    rendered_html = render_template(template['html_content'], data)
    pdf_bytes = await generate_pdf(rendered_html, page_config)

    # Save to history
    ref_id = body.reference_id or data.get('user_id') or data.get('alert_id')
    save_result = await db.execute(
        text("""
            INSERT INTO generated_pdfs (template_id, reference_id, input_data, file_size_kb, generated_by)
            VALUES (:tid, :ref, :input_data, :size, :by)
            RETURNING id
        """),
        {
            'tid': template['id'],
            'ref': str(ref_id) if ref_id else None,
            'input_data': json.dumps(data),
            'size': math.ceil(len(pdf_bytes) / 1024),
            'by': body.generated_by,
        }
    )
    saved = save_result.fetchone()
    await db.commit()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            'Content-Disposition': f'attachment; filename="{slug}_{saved[0]}.pdf"',
            'X-PDF-ID': str(saved[0]),
        }
    )


@router.post("/{slug}/preview")
async def preview(slug: str, body: GenerateRequest, db: AsyncSession = Depends(get_db)):
    data = body.data
    if not data:
        raise HTTPException(status_code=400, detail='Request body must include "data" object')

    result = await db.execute(
        text("SELECT * FROM pdf_templates WHERE slug = :slug"),
        {'slug': slug}
    )
    template = result.mappings().fetchone()

    if not template:
        raise HTTPException(status_code=404, detail=f'Template "{slug}" not found')

    page_config = template['page_config'] or {}
    if isinstance(page_config, str):
        page_config = json.loads(page_config)

    rendered_html = render_template(template['html_content'], data)
    pdf_bytes = await generate_pdf(rendered_html, page_config)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={'Content-Disposition': 'inline'}
    )


@router.post("/{slug}/html")
async def preview_html(slug: str, body: dict = {}, db: AsyncSession = Depends(get_db)):
    data = body.get('data', {})

    result = await db.execute(
        text("SELECT * FROM pdf_templates WHERE slug = :slug"),
        {'slug': slug}
    )
    template = result.mappings().fetchone()

    if not template:
        raise HTTPException(status_code=404, detail=f'Template "{slug}" not found')

    rendered_html = render_template(template['html_content'], data)
    return HTMLResponse(content=rendered_html)
