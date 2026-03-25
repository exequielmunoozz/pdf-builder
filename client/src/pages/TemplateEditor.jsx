import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function TemplateEditor() {
  const { id } = useParams()
  const [template, setTemplate] = useState(null)
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [activeTab, setActiveTab] = useState('fields') // fields | html | preview
  const [htmlContent, setHtmlContent] = useState('')
  const [savingHtml, setSavingHtml] = useState(false)
  const [htmlDirty, setHtmlDirty] = useState(false)
  const iframeRef = useRef(null)

  useEffect(() => {
    loadTemplate()
  }, [id])

  const loadTemplate = async () => {
    try {
      const data = await api.getTemplate(id)
      setTemplate(data)
      setFields(data.fields || [])
      setHtmlContent(data.html_content || '')
      setHtmlDirty(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDetectFields = async () => {
    try {
      const result = await api.detectFields(id)
      setFields(result.fields)
      setMessage(`Detectados ${result.detected} campos (${result.new_fields} nuevos)`)
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }
  }

  const handleSaveFields = async () => {
    setSaving(true)
    try {
      const saved = await api.updateFields(id, fields)
      setFields(saved)
      setMessage('Campos guardados correctamente')
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveHtml = async () => {
    setSavingHtml(true)
    try {
      const updated = await api.updateTemplate(id, { html_content: htmlContent })
      setTemplate(prev => ({ ...prev, html_content: htmlContent, updated_at: updated.updated_at }))
      setHtmlDirty(false)
      setMessage('HTML guardado correctamente')
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setSavingHtml(false)
    }
  }

  const updateField = (index, key, value) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, [key]: value } : f))
  }

  const removeField = (index) => {
    setFields(prev => prev.filter((_, i) => i !== index))
  }

  // Highlight placeholders in HTML for preview
  const getHighlightedHtml = () => {
    if (!template) return ''
    let html = htmlContent || template.html_content
    // Replace {{campo}} with highlighted version
    html = html.replace(
      /(\{{2,3})(#each\s+|#if\s+|\/each|\/if|else)?([^}]+?)(\}{2,3})/g,
      (match, open, helper, name, close) => {
        if (helper) {
          return `<span style="background:#7c3aed33;color:#a78bfa;padding:1px 4px;border-radius:3px;font-size:11px;">${match}</span>`
        }
        return `<span style="background:#fbbf2433;color:#fbbf24;padding:1px 4px;border-radius:3px;font-weight:bold;font-size:11px;" title="${name.trim()}">${match}</span>`
      }
    )
    return html
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Cargando...</div>
  }

  if (!template) {
    return <div className="text-center py-20 text-gray-500">Template no encontrado</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-500 hover:text-gray-300">&larr;</Link>
            <h2 className="text-2xl font-bold">{template.name}</h2>
            {template.category && (
              <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">{template.category}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 font-mono">POST /api/generate/{template.slug}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/generate/${template.slug}`}
            className="px-4 py-2 bg-lemon-600 hover:bg-lemon-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            🖨️ Generar PDF
          </Link>
        </div>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
          message.startsWith('Error') ? 'bg-red-900/30 text-red-300' : 'bg-lemon-900/30 text-lemon-300'
        }`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-900 p-1 rounded-lg w-fit">
        {[
          { key: 'fields', label: '🔧 Field Mapper', count: fields.length },
          { key: 'preview', label: '👁️ Preview HTML' },
          { key: 'html', label: '</> Código HTML' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              activeTab === tab.key
                ? 'bg-gray-800 text-white font-medium'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label} {tab.count != null && <span className="text-xs text-gray-500">({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Field Mapper */}
      {activeTab === 'fields' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={handleDetectFields}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
            >
              🔍 Auto-detectar campos
            </button>
            <button
              onClick={handleSaveFields}
              disabled={saving}
              className="px-4 py-2 bg-lemon-600 hover:bg-lemon-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? 'Guardando...' : '💾 Guardar campos'}
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-900 rounded-xl border border-gray-800">
              <p className="text-3xl mb-3">🔍</p>
              <p>No hay campos mapeados todavía.</p>
              <p className="text-sm mt-1">Hacé click en "Auto-detectar campos" para encontrar los placeholders del HTML.</p>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase">
                    <th className="px-4 py-3">Placeholder</th>
                    <th className="px-4 py-3">Label</th>
                    <th className="px-4 py-3">Data Path</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Req</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, i) => (
                    <tr key={field.id || i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2">
                        <code className="text-xs bg-gray-800 px-2 py-0.5 rounded text-yellow-400">
                          {`{{${field.placeholder}}}`}
                        </code>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={field.label || ''}
                          onChange={(e) => updateField(i, 'label', e.target.value)}
                          className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:border-lemon-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={field.data_path || ''}
                          onChange={(e) => updateField(i, 'data_path', e.target.value)}
                          className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm font-mono focus:outline-none focus:border-lemon-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={field.field_type || 'text'}
                          onChange={(e) => updateField(i, 'field_type', e.target.value)}
                          className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs focus:outline-none focus:border-lemon-500"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="image">Image URL</option>
                          <option value="html">HTML Raw</option>
                          <option value="list">List</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={field.required !== false}
                          onChange={(e) => updateField(i, 'required', e.target.checked)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => removeField(i)}
                          className="text-red-500 hover:text-red-400 text-sm"
                          title="Eliminar campo"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* HTML Preview with highlighted placeholders */}
      {activeTab === 'preview' && (
        <div className="bg-white rounded-xl overflow-hidden" style={{ height: '700px' }}>
          <iframe
            ref={iframeRef}
            srcDoc={getHighlightedHtml()}
            className="w-full h-full border-0"
            title="Template Preview"
          />
        </div>
      )}

      {/* Raw HTML Editor */}
      {activeTab === 'html' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveHtml}
              disabled={savingHtml || !htmlDirty}
              className="px-4 py-2 bg-lemon-600 hover:bg-lemon-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {savingHtml ? 'Guardando...' : '💾 Guardar HTML'}
            </button>
            <button
              onClick={async () => {
                if (htmlDirty) {
                  await handleSaveHtml()
                }
                await handleDetectFields()
              }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
            >
              🔍 Re-detectar campos
            </button>
            {htmlDirty && (
              <span className="text-xs text-yellow-400">● Cambios sin guardar</span>
            )}
            <button
              onClick={() => { setHtmlContent(template.html_content); setHtmlDirty(false) }}
              disabled={!htmlDirty}
              className="px-3 py-2 text-gray-400 hover:text-gray-200 disabled:opacity-30 text-sm transition-colors"
            >
              Descartar cambios
            </button>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex">
            {/* Line numbers */}
            <div
              className="select-none text-right pr-3 pl-3 pt-4 text-xs font-mono text-gray-600 bg-gray-950 border-r border-gray-800 overflow-hidden"
              style={{ minWidth: '48px', lineHeight: '1.5' }}
            >
              {htmlContent.split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              value={htmlContent}
              onChange={(e) => { setHtmlContent(e.target.value); setHtmlDirty(true) }}
              onKeyDown={(e) => {
                // Tab support
                if (e.key === 'Tab') {
                  e.preventDefault()
                  const start = e.target.selectionStart
                  const end = e.target.selectionEnd
                  const newValue = htmlContent.substring(0, start) + '  ' + htmlContent.substring(end)
                  setHtmlContent(newValue)
                  setHtmlDirty(true)
                  // Restore cursor
                  setTimeout(() => {
                    e.target.selectionStart = e.target.selectionEnd = start + 2
                  }, 0)
                }
              }}
              spellCheck={false}
              className="w-full h-[700px] p-4 bg-transparent text-xs text-gray-300 font-mono resize-none focus:outline-none"
              style={{ tabSize: 2, lineHeight: '1.5' }}
            />
          </div>
          <div className="text-xs text-gray-500 flex gap-4">
            <span>{htmlContent.split('\n').length} líneas</span>
            <span>{htmlContent.length.toLocaleString()} caracteres</span>
            <span>Tab = 2 espacios</span>
          </div>
        </div>
      )}
    </div>
  )
}
