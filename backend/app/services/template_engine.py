"""
Template rendering engine.
Uses Jinja2 but accepts Handlebars syntax (auto-converts before rendering).
"""
import re
from datetime import datetime
from jinja2 import Environment, BaseLoader, TemplateSyntaxError, Undefined


def _convert_handlebars_to_jinja2(html: str) -> str:
    """Convert Handlebars-specific syntax to Jinja2 equivalents."""
    # {{{var}}} (triple braces = raw/unescaped) -> {{var|safe}}
    html = re.sub(r'\{\{\{(\s*\w[\w.]*\s*)\}\}\}', r'{{\1|safe}}', html)

    # {{#each list}} -> {% for item in list %}
    html = re.sub(r'\{\{#each\s+(\w+)\}\}', r'{% for \1_item in \1 %}', html)
    # {{/each}} -> {% endfor %}
    html = re.sub(r'\{\{/each\}\}', r'{% endfor %}', html)

    # {{#if var}} -> {% if var %}
    html = re.sub(r'\{\{#if\s+(\w[\w.]*)\}\}', r'{% if \1 %}', html)
    # {{/if}} -> {% endif %}
    html = re.sub(r'\{\{/if\}\}', r'{% endif %}', html)
    # {{else}} -> {% else %}
    html = re.sub(r'\{\{else\}\}', r'{% else %}', html)

    # {{formatDate var}} -> {{var|format_date}}
    html = re.sub(r'\{\{formatDate\s+(\w[\w.]*)\}\}', r'{{\1|format_date}}', html)
    # {{formatNumber var}} -> {{var|format_number}}
    html = re.sub(r'\{\{formatNumber\s+(\w[\w.]*)\}\}', r'{{\1|format_number}}', html)
    # {{formatCurrency var currency}} -> {{var|format_currency}}
    html = re.sub(r'\{\{formatCurrency\s+(\w[\w.]*)\s*\w*\}\}', r'{{\1|format_currency}}', html)

    # {{now 'date'}} -> {{now_date()}}
    html = re.sub(r"\{\{now\s+'date'\}\}", r'{{now_date()}}', html)
    html = re.sub(r"\{\{now\s+'year'\}\}", r'{{now_year()}}', html)

    # In #each blocks, replace {{this.field}} or {{field}} that refers to the loop item
    # This is handled by the data preprocessing (flatten each item vars)

    return html


def _create_jinja_env() -> Environment:
    env = Environment(
        loader=BaseLoader(),
        autoescape=False,  # HTML templates manage their own escaping
        undefined=_SilentUndefined,
    )

    # Custom filters
    env.filters['format_date'] = _filter_format_date
    env.filters['format_number'] = _filter_format_number
    env.filters['format_currency'] = _filter_format_currency
    env.filters['safe'] = lambda x: x  # Already unescaped since autoescape=False

    # Global functions
    env.globals['now_date'] = lambda: datetime.now().strftime('%d/%m/%Y')
    env.globals['now_year'] = lambda: datetime.now().year

    return env


class _SilentUndefined(Undefined):
    """Returns empty string for undefined variables instead of raising."""

    def __str__(self):
        return ''

    def __iter__(self):
        return iter([])

    def __bool__(self):
        return False

    def __getattr__(self, name):
        return _SilentUndefined()

    def __getitem__(self, name):
        return _SilentUndefined()


def _filter_format_date(value):
    if not value:
        return ''
    try:
        if isinstance(value, str):
            d = datetime.fromisoformat(value.replace('Z', '+00:00'))
        else:
            d = value
        return d.strftime('%d/%m/%Y')
    except Exception:
        return str(value)


def _filter_format_number(value):
    if value is None:
        return ''
    try:
        num = float(value)
        # Format with dots as thousands separator, comma as decimal (es-AR style)
        if num == int(num):
            return f'{int(num):,}'.replace(',', '.')
        return f'{num:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    except (ValueError, TypeError):
        return str(value)


def _filter_format_currency(value, currency='ARS'):
    if value is None:
        return ''
    try:
        num = float(value)
        formatted = f'{num:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
        return f'${formatted}'
    except (ValueError, TypeError):
        return str(value)


_env = _create_jinja_env()


def render_template(html_content: str, data: dict) -> str:
    """Render an HTML template with data. Accepts Handlebars or Jinja2 syntax."""
    jinja_html = _convert_handlebars_to_jinja2(html_content)

    # Preprocess data: for #each loops, the converter creates {list}_item variables
    # But Jinja2 handles for loops natively with the variable name from {% for X in Y %}
    # So we just pass the data as-is

    template = _env.from_string(jinja_html)
    return template.render(**data)


def validate_template(html_content: str) -> dict:
    """Check if a template compiles without errors."""
    try:
        jinja_html = _convert_handlebars_to_jinja2(html_content)
        _env.parse(jinja_html)
        return {'valid': True}
    except TemplateSyntaxError as e:
        return {'valid': False, 'error': str(e)}
