import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function Dashboard() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.getTemplates().then(setTemplates).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(filter.toLowerCase()) ||
    t.category?.toLowerCase().includes(filter.toLowerCase())
  )

  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))]

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Cargando templates...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Templates</h2>
          <p className="text-gray-500 text-sm mt-1">{templates.length} templates disponibles</p>
        </div>
        <Link
          to="/upload"
          className="px-4 py-2 bg-lemon-600 hover:bg-lemon-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo Template
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre o categoría..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-lemon-500"
        />
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !filter ? 'bg-lemon-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === cat ? 'bg-lemon-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">📄</p>
          <p>No hay templates todavía.</p>
          <Link to="/upload" className="text-lemon-400 hover:underline text-sm">Crear el primero</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(template => (
            <Link
              key={template.id}
              to={`/templates/${template.id}`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-lemon-600/50 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-200 group-hover:text-lemon-400 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 font-mono">/{template.slug}</p>
                </div>
                {template.category && (
                  <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                    {template.category}
                  </span>
                )}
              </div>
              {template.description && (
                <p className="text-sm text-gray-500 mt-3 line-clamp-2">{template.description}</p>
              )}
              <div className="flex items-center gap-4 mt-4 text-xs text-gray-600">
                <span>Creado: {new Date(template.created_at).toLocaleDateString('es-AR')}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
