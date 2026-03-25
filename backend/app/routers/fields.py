from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List

from ..database import get_db
from ..schemas import FieldCreate
from ..services.field_detector import detect_fields

router = APIRouter(prefix="/api/templates", tags=["fields"])


@router.post("/{template_id}/detect-fields")
async def detect_template_fields(template_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT html_content FROM pdf_templates WHERE id = :id"),
        {'id': template_id}
    )
    template = result.fetchone()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    detected_fields = detect_fields(template[0])

    # Get existing fields
    existing_result = await db.execute(
        text("SELECT placeholder FROM template_fields WHERE template_id = :id"),
        {'id': template_id}
    )
    existing_set = {r[0] for r in existing_result.fetchall()}

    # Insert only new fields
    new_fields = [f for f in detected_fields if f['placeholder'] not in existing_set]

    for field in new_fields:
        await db.execute(
            text("""
                INSERT INTO template_fields
                (template_id, placeholder, label, data_path, field_type, required, sort_order)
                VALUES (:tid, :placeholder, :label, :data_path, :field_type, :required, :sort_order)
            """),
            {
                'tid': template_id,
                'placeholder': field['placeholder'],
                'label': field['label'],
                'data_path': field['data_path'],
                'field_type': field['field_type'],
                'required': field['required'],
                'sort_order': field['sort_order'],
            }
        )

    await db.commit()

    # Return all fields
    all_result = await db.execute(
        text("SELECT * FROM template_fields WHERE template_id = :id ORDER BY sort_order"),
        {'id': template_id}
    )

    return {
        'detected': len(detected_fields),
        'new_fields': len(new_fields),
        'fields': [dict(r) for r in all_result.mappings().all()],
    }


@router.put("/{template_id}/fields")
async def batch_update_fields(template_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    fields = body.get('fields', [])
    if not isinstance(fields, list):
        raise HTTPException(status_code=400, detail="fields must be an array")

    # Delete existing
    await db.execute(
        text("DELETE FROM template_fields WHERE template_id = :id"),
        {'id': template_id}
    )

    # Insert new
    for i, f in enumerate(fields):
        await db.execute(
            text("""
                INSERT INTO template_fields
                (template_id, placeholder, label, data_path, field_type, default_value, required, sort_order)
                VALUES (:tid, :placeholder, :label, :data_path, :field_type, :default_value, :required, :sort_order)
            """),
            {
                'tid': template_id,
                'placeholder': f['placeholder'],
                'label': f.get('label'),
                'data_path': f.get('data_path'),
                'field_type': f.get('field_type', 'text'),
                'default_value': f.get('default_value'),
                'required': f.get('required', True),
                'sort_order': f.get('sort_order', i),
            }
        )

    await db.commit()

    result = await db.execute(
        text("SELECT * FROM template_fields WHERE template_id = :id ORDER BY sort_order"),
        {'id': template_id}
    )

    return [dict(r) for r in result.mappings().all()]


@router.get("/{template_id}/fields")
async def get_fields(template_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM template_fields WHERE template_id = :id ORDER BY sort_order"),
        {'id': template_id}
    )
    return [dict(r) for r in result.mappings().all()]
