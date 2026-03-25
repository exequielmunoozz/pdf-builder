-- PDF Templates
CREATE TABLE IF NOT EXISTS pdf_templates (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  description   TEXT,
  html_content  TEXT NOT NULL,
  css_content   TEXT,
  category      VARCHAR(100),
  page_config   JSONB DEFAULT '{"format":"A4","landscape":false,"margin":{"top":"0","right":"0","bottom":"0","left":"0"}}',
  created_by    VARCHAR(255),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Template Fields (mapping de placeholders)
CREATE TABLE IF NOT EXISTS template_fields (
  id            SERIAL PRIMARY KEY,
  template_id   INTEGER REFERENCES pdf_templates(id) ON DELETE CASCADE,
  placeholder   VARCHAR(255) NOT NULL,
  label         VARCHAR(255),
  data_path     VARCHAR(255),
  field_type    VARCHAR(50) DEFAULT 'text',
  default_value TEXT,
  required      BOOLEAN DEFAULT true,
  sort_order    INTEGER DEFAULT 0
);

-- Generated PDFs (historial)
CREATE TABLE IF NOT EXISTS generated_pdfs (
  id            SERIAL PRIMARY KEY,
  template_id   INTEGER REFERENCES pdf_templates(id),
  reference_id  VARCHAR(100),
  input_data    JSONB,
  pdf_storage   TEXT,
  file_size_kb  INTEGER,
  generated_by  VARCHAR(255),
  generated_at  TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_slug ON pdf_templates(slug);
CREATE INDEX IF NOT EXISTS idx_templates_category ON pdf_templates(category);
CREATE INDEX IF NOT EXISTS idx_fields_template ON template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_pdfs_template ON generated_pdfs(template_id);
CREATE INDEX IF NOT EXISTS idx_pdfs_reference ON generated_pdfs(reference_id);
