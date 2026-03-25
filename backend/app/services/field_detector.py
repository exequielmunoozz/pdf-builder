"""
Detects Handlebars-style placeholders in HTML templates.
Supports: {{campo}}, {{#each lista}}, {{#if campo}}, {{{html_raw}}}
"""
import re


def detect_fields(html: str) -> list[dict]:
    fields = {}

    # Match {{campo}} and {{{campo}}} (triple for raw HTML)
    regex = re.compile(r'\{{2,3}\s*([^#/!>][^}]*?)\s*\}{2,3}')
    skip_keywords = {'else', 'this', '@index', '@key', '@first', '@last'}

    for match in regex.finditer(html):
        raw = match.group(1).strip()

        if raw in skip_keywords:
            continue
        if raw.startswith(('#', '/', '!', '>')):
            continue

        placeholder = raw
        if placeholder not in fields:
            fields[placeholder] = {
                'placeholder': placeholder,
                'label': humanize(placeholder),
                'data_path': placeholder,
                'field_type': guess_field_type(placeholder, match.group(0)),
                'required': True,
            }

    # Detect {{#each X}} blocks for list fields
    each_regex = re.compile(r'\{{2}#each\s+(\w+)\}{2}')
    for match in each_regex.finditer(html):
        list_name = match.group(1).strip()
        if list_name not in fields:
            fields[list_name] = {
                'placeholder': list_name,
                'label': humanize(list_name),
                'data_path': list_name,
                'field_type': 'list',
                'required': True,
            }
        else:
            fields[list_name]['field_type'] = 'list'

    return [
        {**f, 'sort_order': i}
        for i, f in enumerate(fields.values())
    ]


def humanize(s: str) -> str:
    # camelCase -> spaces
    result = re.sub(r'([A-Z])', r' \1', s)
    # separators -> spaces
    result = re.sub(r'[._-]', ' ', result)
    # capitalize each word
    result = ' '.join(w.capitalize() for w in result.split())
    return result.strip()


def guess_field_type(placeholder: str, raw_match: str) -> str:
    lower = placeholder.lower()
    if raw_match.startswith('{{{'):
        return 'html'
    if any(k in lower for k in ('date', 'fecha', 'birthdate')):
        return 'date'
    if any(k in lower for k in ('url', 'img', 'chart', 'src')):
        return 'image'
    if any(k in lower for k in ('monto', 'amount', 'total', 'ingreso', 'balance')):
        return 'number'
    return 'text'
