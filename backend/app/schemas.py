from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


# --- Templates ---
class TemplateCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    html_content: str
    css_content: Optional[str] = None
    category: Optional[str] = None
    page_config: Optional[dict] = None
    created_by: Optional[str] = None


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    html_content: Optional[str] = None
    css_content: Optional[str] = None
    category: Optional[str] = None
    page_config: Optional[dict] = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    html_content: str
    css_content: Optional[str]
    category: Optional[str]
    page_config: Optional[dict]
    created_by: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class TemplateListItem(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    category: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# --- Fields ---
class FieldCreate(BaseModel):
    placeholder: str
    label: Optional[str] = None
    data_path: Optional[str] = None
    field_type: str = "text"
    default_value: Optional[str] = None
    required: bool = True
    sort_order: int = 0


class FieldResponse(BaseModel):
    id: int
    template_id: int
    placeholder: str
    label: Optional[str]
    data_path: Optional[str]
    field_type: str
    default_value: Optional[str]
    required: bool
    sort_order: int

    class Config:
        from_attributes = True


# --- Generate ---
class GenerateRequest(BaseModel):
    data: dict = {}
    reference_id: Optional[str] = None
    generated_by: Optional[str] = None


# --- Generated PDFs ---
class GeneratedPdfResponse(BaseModel):
    id: int
    template_id: int
    reference_id: Optional[str]
    input_data: Optional[dict]
    file_size_kb: Optional[int]
    generated_by: Optional[str]
    generated_at: Optional[datetime]
    template_name: Optional[str] = None

    class Config:
        from_attributes = True
