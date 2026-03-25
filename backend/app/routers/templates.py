from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import json

from ..database import get_db
from ..schemas import TemplateCreate, TemplateUpdate, TemplateResponse, TemplateListItem
from ..services.template_engine import validate_template

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("")
async def list_templates(category: str = None, db: AsyncSession = Depends(get_db)):
    query = "SELECT id, name, slug, description, category, created_by, created_at, updated_at FROM pdf_templates"
    params = {}

    if category:
        query += " WHERE category = :category"
        params['category'] = category

    query += " ORDER BY updated_at DESC"

    result = await db.execute(text(query), params)
    rows = result.mappings().all()
    return [dict(r) for r in rows]


@router.get("/{template_id}")
async def get_template(template_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM pdf_templates WHERE id = :id"),
        {'id': template_id}
    )
    template = result.mappings().fetchone()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    fields_result = await db.execute(
        text("SELECT * FROM template_fields WHERE template_id = :id ORDER BY sort_order"),
        {'id': template_id}
    )
    fields = [dict(r) for r in fields_result.mappings().all()]

    return {**dict(template), 'fields': fields}


@router.post("", status_code=201)
async def create_template(body: TemplateCreate, db: AsyncSession = Depends(get_db)):
    if not body.name or not body.slug or not body.html_content:
        raise HTTPException(status_code=400, detail="name, slug, and html_content are required")

    validation = validate_template(body.html_content)
    if not validation['valid']:
        raise HTTPException(status_code=400, detail=f"Invalid template: {validation['error']}")

    page_config = body.page_config or {
        'format': 'A4', 'landscape': False,
        'margin': {'top': '0', 'right': '0', 'bottom': '0', 'left': '0'}
    }

    try:
        result = await db.execute(
            text("""
                INSERT INTO pdf_templates (name, slug, description, html_content, css_content, category, page_config, created_by)
                VALUES (:name, :slug, :desc, :html, :css, :cat, :page_config, :created_by)
                RETURNING *
            """),
            {
                'name': body.name,
                'slug': body.slug,
                'desc': body.description,
                'html': body.html_content,
                'css': body.css_content,
                'cat': body.category,
                'page_config': json.dumps(page_config),
                'created_by': body.created_by,
            }
        )
        row = result.mappings().fetchone()
        await db.commit()
        return dict(row)
    except Exception as e:
        if '23505' in str(e) or 'unique' in str(e).lower():
            raise HTTPException(status_code=409, detail="A template with this slug already exists")
        raise


@router.put("/{template_id}")
async def update_template(template_id: int, body: TemplateUpdate, db: AsyncSession = Depends(get_db)):
    if body.html_content:
        validation = validate_template(body.html_content)
        if not validation['valid']:
            raise HTTPException(status_code=400, detail=f"Invalid template: {validation['error']}")

    result = await db.execute(
        text("""
            UPDATE pdf_templates
            SET name = COALESCE(:name, name),
                slug = COALESCE(:slug, slug),
                description = COALESCE(:desc, description),
                html_content = COALESCE(:html, html_content),
                css_content = COALESCE(:css, css_content),
                category = COALESCE(:cat, category),
                page_config = COALESCE(:page_config, page_config),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            RETURNING *
        """),
        {
            'name': body.name,
            'slug': body.slug,
            'desc': body.description,
            'html': body.html_content,
            'css': body.css_content,
            'cat': body.category,
            'page_config': json.dumps(body.page_config) if body.page_config else None,
            'id': template_id,
        }
    )
    row = result.mappings().fetchone()
    await db.commit()

    if not row:
        raise HTTPException(status_code=404, detail="Template not found")

    return dict(row)


@router.delete("/{template_id}")
async def delete_template(template_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("DELETE FROM pdf_templates WHERE id = :id RETURNING id"),
        {'id': template_id}
    )
    row = result.fetchone()
    await db.commit()

    if not row:
        raise HTTPException(status_code=404, detail="Template not found")

    return {'deleted': True, 'id': row[0]}
