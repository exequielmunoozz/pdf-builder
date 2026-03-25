import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function History() {
  const [pdfs, setPdfs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const limit = 20

  useEffect(() => {
    loadPdfs()
  }, [page])

  const loadPdfs = async () => {
    setLoading(true)
    try {
      const result = await api.getPdfs({ limit, offset: page * limit })
      setPdfs(result.data)
      setTotal(result.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Historial de PDFs</h2>
          <p className="text-gray-500 text-sm mt-1">{total} PDFs generados</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Cargando...</div>
      ) : pdfs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">📋</p>
          <p>No hay PDFs generados todavía.</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Tamaño</th>
                  <th className="px-4 py-3">Generado por</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {pdfs.map(pdf => (
                  <tr key={pdf.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-sm font-mono text-gray-400">#{pdf.id}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-200">{pdf.template_name}</div>
                      <div className="text-xs text-gray-500 font-mono">{pdf.template_slug}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 font-mono">{pdf.reference_id || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{pdf.file_size_kb ? `${pdf.file_size_kb} KB` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{pdf.generated_by || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(pdf.generated_at).toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded text-sm"
              >
                ← Anterior
              </button>
              <span className="text-sm text-gray-500">
                Página {page + 1} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded text-sm"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
