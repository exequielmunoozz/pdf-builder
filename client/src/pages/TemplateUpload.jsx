import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function TemplateUpload() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'compliance',
    html_content: '',
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleNameChange = (name) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    setForm(prev => ({ ...prev, name, slug }))
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm(prev => ({ ...prev, html_content: ev.target.result }))
    }
    reader.readAsText(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const template = await api.createTemplate(form)
      // Auto-detect fields
      await api.detectFields(template.id)
      navigate(`/templates/${template.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-6">Nuevo Template</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="AML Alert Resolution"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-lemon-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Slug (URL)</label>
            <div className="flex items-center">
              <span className="text-gray-600 text-sm mr-1">/api/generate/</span>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="aml-alert-resolution"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-mono focus:outline-none focus:border-lemon-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Categoría</label>
            <select
              value={form.category}
              onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-lemon-500"
            >
              <option value="compliance">Compliance</option>
              <option value="disputes">Disputes</option>
              <option value="operations">Operations</option>
              <option value="general">General</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Template para resolución de alertas AML"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-lemon-500"
            />
          </div>
        </div>

        {/* HTML Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Template HTML</label>

          <div className="mb-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors text-sm">
              📁 Subir archivo HTML
              <input type="file" accept=".html,.htm" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <textarea
            required
            value={form.html_content}
            onChange={(e) => setForm(prev => ({ ...prev, html_content: e.target.value }))}
            placeholder="Pegá tu HTML acá o subí un archivo..."
            rows={16}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-mono focus:outline-none focus:border-lemon-500 resize-y"
          />

          <p className="text-xs text-gray-600 mt-1">
            Usá <code className="text-lemon-400">{'{{campo}}'}</code> para placeholders,{' '}
            <code className="text-lemon-400">{'{{#each lista}}'}</code> para listas,{' '}
            <code className="text-lemon-400">{'{{{html_raw}}}'}</code> para HTML sin escapar.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-lemon-600 hover:bg-lemon-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Creando...' : 'Crear Template'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
