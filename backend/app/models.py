from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime


class Base(DeclarativeBase):
    pass


class PdfTemplate(Base):
    __tablename__ = "pdf_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    html_content = Column(Text, nullable=False)
    css_content = Column(Text)
    category = Column(String(100))
    page_config = Column(JSON, default={
        "format": "A4",
        "landscape": False,
        "margin": {"top": "0", "right": "0", "bottom": "0", "left": "0"}
    })
    created_by = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    fields = relationship("TemplateField", back_populates="template", cascade="all, delete-orphan")
    generated_pdfs = relationship("GeneratedPdf", back_populates="template")


class TemplateField(Base):
    __tablename__ = "template_fields"

    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("pdf_templates.id", ondelete="CASCADE"))
    placeholder = Column(String(255), nullable=False)
    label = Column(String(255))
    data_path = Column(String(255))
    field_type = Column(String(50), default="text")
    default_value = Column(Text)
    required = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    template = relationship("PdfTemplate", back_populates="fields")


class GeneratedPdf(Base):
    __tablename__ = "generated_pdfs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("pdf_templates.id"))
    reference_id = Column(String(100))
    input_data = Column(JSON)
    pdf_storage = Column(Text)
    file_size_kb = Column(Integer)
    generated_by = Column(String(255))
    generated_at = Column(DateTime, default=datetime.utcnow)

    template = relationship("PdfTemplate", back_populates="generated_pdfs")
