"""
Seeds HTML template files from the /templates/ directory into the database.
"""
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from .field_detector import detect_fields


async def seed_templates(session: AsyncSession, templates_dir: str):
    if not os.path.isdir(templates_dir):
        print(f'No templates directory found at {templates_dir}, skipping seed')
        return

    files = [f for f in os.listdir(templates_dir) if f.endswith('.html')]

    for file in sorted(files):
        slug = file.replace('.html', '')
        name = ' '.join(w.capitalize() for w in slug.split('-'))

        # Check if already exists
        result = await session.execute(
            text('SELECT id FROM pdf_templates WHERE slug = :slug'),
            {'slug': slug}
        )
        existing = result.fetchone()

        if existing:
            print(f'⏭️  Template "{slug}" already exists, skipping')
            continue

        html_content = open(os.path.join(templates_dir, file), 'r').read()

        # Insert template
        result = await session.execute(
            text("""
                INSERT INTO pdf_templates (name, slug, description, html_content, category)
                VALUES (:name, :slug, :desc, :html, :cat)
                RETURNING id
            """),
            {
                'name': name,
                'slug': slug,
                'desc': f'Template auto-imported from {file}',
                'html': html_content,
                'cat': 'compliance',
            }
        )
        template_id = result.fetchone()[0]

        # Auto-detect and insert fields
        fields = detect_fields(html_content)
        for field in fields:
            await session.execute(
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

        await session.commit()
        print(f'✅ Seeded template "{name}" with {len(fields)} fields')
