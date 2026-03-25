const API_BASE = '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'Request failed');
  }

  // If response is PDF, return blob
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    return res.blob();
  }

  return res.json();
}

export const api = {
  // Templates
  getTemplates: (category) =>
    request(`/templates${category ? `?category=${category}` : ''}`),

  getTemplate: (id) =>
    request(`/templates/${id}`),

  createTemplate: (data) =>
    request('/templates', { method: 'POST', body: data }),

  updateTemplate: (id, data) =>
    request(`/templates/${id}`, { method: 'PUT', body: data }),

  deleteTemplate: (id) =>
    request(`/templates/${id}`, { method: 'DELETE' }),

  // Fields
  detectFields: (id) =>
    request(`/templates/${id}/detect-fields`, { method: 'POST' }),

  getFields: (id) =>
    request(`/templates/${id}/fields`),

  updateFields: (id, fields) =>
    request(`/templates/${id}/fields`, { method: 'PUT', body: { fields } }),

  // Generate
  generatePdf: (slug, data) =>
    request(`/generate/${slug}`, { method: 'POST', body: { data } }),

  previewPdf: (slug, data) =>
    request(`/generate/${slug}/preview`, { method: 'POST', body: { data } }),

  previewHtml: async (slug, data) => {
    const res = await fetch(`${API_BASE}/generate/${slug}/html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return res.text();
  },

  // PDFs history
  getPdfs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/pdfs${qs ? `?${qs}` : ''}`);
  },

  getPdf: (id) =>
    request(`/pdfs/${id}`),
};
