from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from ..database import get_db

router = APIRouter(prefix="/api/pdfs", tags=["pdfs"])


@router.get("")
async def list_pdfs(
    template_id: int = None,
    reference_id: str = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    query = """
        SELECT gp.*, pt.name as template_name, pt.slug as template_slug
        FROM generated_pdfs gp
        JOIN pdf_templates pt ON gp.template_id = pt.id
        WHERE 1=1
    """
    params = {}

    if template_id:
        query += " AND gp.template_id = :template_id"
        params['template_id'] = template_id

    if reference_id:
        query += " AND gp.reference_id = :reference_id"
        params['reference_id'] = reference_id

    query += " ORDER BY gp.generated_at DESC LIMIT :limit OFFSET :offset"
    params['limit'] = limit
    params['offset'] = offset

    result = await db.execute(text(query), params)
    rows = [dict(r) for r in result.mappings().all()]

    # Count total
    count_query = "SELECT COUNT(*) as cnt FROM generated_pdfs WHERE 1=1"
    count_params = {}
    if template_id:
        count_query += " AND template_id = :template_id"
        count_params['template_id'] = template_id
    if reference_id:
        count_query += " AND reference_id = :reference_id"
        count_params['reference_id'] = reference_id

    count_result = await db.execute(text(count_query), count_params)
    total = count_result.scalar()

    return {
        'data': rows,
        'total': total,
        'limit': limit,
        'offset': offset,
    }


@router.get("/{pdf_id}")
async def get_pdf(pdf_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT gp.*, pt.name as template_name, pt.slug as template_slug
            FROM generated_pdfs gp
            JOIN pdf_templates pt ON gp.template_id = pt.id
            WHERE gp.id = :id
        """),
        {'id': pdf_id}
    )
    row = result.mappings().fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="PDF not found")

    return dict(row)


@router.post("/{pdf_id}/regenerate")
async def regenerate_pdf(pdf_id: int, db: AsyncSession = Depends(get_db)):
    """Regenerate a PDF using its saved input data."""
    result = await db.execute(
        text("""
            SELECT gp.*, pt.slug
            FROM generated_pdfs gp
            JOIN pdf_templates pt ON gp.template_id = pt.id
            WHERE gp.id = :id
        """),
        {'id': pdf_id}
    )
    row = result.mappings().fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="PDF not found")

    # Import and call generate
    from .generate import generate
    from ..schemas import GenerateRequest
    import json

    input_data = row['input_data']
    if isinstance(input_data, str):
        input_data = json.loads(input_data)

    req = GenerateRequest(
        data=input_data,
        reference_id=row['reference_id'],
        generated_by=row.get('generated_by'),
    )

    return await generate(slug=row['slug'], body=req, db=db)
