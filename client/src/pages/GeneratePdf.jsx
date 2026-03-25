import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'

const SAMPLE_DATA = {
  'aml-alert-resolution': {
    alert_id: "60584",
    nombre_completo: "Juan Carlos Pérez",
    user_id: "1020309",
    cuil: "20-12345678-9",
    dni: "12345678",
    edad: "32",
    birthdate: "1993-05-15",
    nationality: "Argentina",
    operation_country: "ARG",
    direccion: "Av. Corrientes 1234, CABA, Buenos Aires, CP 1043",
    email: "juan.perez@email.com",
    phone: "+5491155556666",
    actividad: "Empleado en relación de dependencia",
    nse: "C2",
    ingreso_promedio: "850000",
    base_risk_level: "MEDIUM",
    civil_status: "Soltero",
    estado_usuario: "Activo",
    lemontag: "juanperez",
    level: "LEVEL_3",
    alta_de_user: "2023-01-15",
    base_p2p: "NO",
    pesos_en_cuenta: "125000.50",
    dispositivos_lastyear: "2",
    cant_users_relacionadas: "0",
    fecha_alerta: "2025-08-20",
    periodo_analizado: "29/02/25 - 29/08/25",
    inusualidad: "Operatoria inusual - Volumen elevado respecto al perfil",
    monto_operado: "15000.00",
    historial_alertas: [
      { alert_id: "60580", monto_operado: "12000.00", periodo_analizado: "01/01/25 - 01/07/25" },
      { alert_id: "60582", monto_operado: "8500.00", periodo_analizado: "15/01/25 - 15/07/25" },
      { alert_id: "60584", monto_operado: "15000.00", periodo_analizado: "29/02/25 - 29/08/25" },
    ],
    chart_url1_querys1: "",
    chart_url1_querys2: "",
    chart_url2_querys2: "",
    chart_url3_querys2: "",
    chart_url4_querys2: "",
    max_monto_diario: "$2,500,000",
    total_op_mensual: "$8,750,000",
    total_operado: "$45,200,000",
    chart_url1_querys3: "",
    chart_url2_querys3: "",
    chart_url3_querys3: "",
    chart_url4_querys3: "",
    tabla_dispositivos_html: '<div class="table-container"><div class="table-title">Dispositivos</div><table><thead><tr><th>Device</th><th>Last Access</th></tr></thead><tbody><tr><td>iPhone 14</td><td>2025-08-29</td></tr></tbody></table></div>',
  }
}

export default function GeneratePdf() {
  const { slug: paramSlug } = useParams()
  const [templates, setTemplates] = useState([])
  const [selectedSlug, setSelectedSlug] = useState(paramSlug || '')
  const [jsonData, setJsonData] = useState('')
  const [loading, setLoading] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getTemplates().then(setTemplates).catch(console.error)
  }, [])

  useEffect(() => {
    if (paramSlug) setSelectedSlug(paramSlug)
  }, [paramSlug])

  const loadSampleData = () => {
    const sample = SAMPLE_DATA[selectedSlug]
    if (sample) {
      setJsonData(JSON.stringify(sample, null, 2))
    } else {
      // Generate empty sample from template fields
      const tpl = templates.find(t => t.slug === selectedSlug)
      if (tpl) {
        api.getTemplate(tpl.id).then(data => {
          const fields = data.fields || []
          const sample = {}
          fields.forEach(f => {
            if (f.field_type === 'list') {
              sample[f.placeholder] = [{ example: 'value' }]
            } else if (f.field_type === 'number') {
              sample[f.placeholder] = '0'
            } else {
              sample[f.placeholder] = ''
            }
          })
          setJsonData(JSON.stringify(sample, null, 2))
        })
      }
    }
  }

  const handleGenerate = async (preview = false) => {
    setError(null)
    setPdfUrl(null)
    setLoading(true)

    try {
      let data
      try {
        data = JSON.parse(jsonData)
      } catch {
        throw new Error('JSON inválido. Verificá el formato.')
      }

      const blob = preview
        ? await api.previewPdf(selectedSlug, data)
        : await api.generatePdf(selectedSlug, data)

      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `${selectedSlug}_${Date.now()}.pdf`
    a.click()
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Generar PDF</h2>

      <div className="grid grid-cols-2 gap-6" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Left: Input */}
        <div className="flex flex-col space-y-4">
          {/* Template selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Template</label>
            <div className="flex gap-2">
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-lemon-500"
              >
                <option value="">Seleccionar template...</option>
                {templates.map(t => (
                  <option key={t.slug} value={t.slug}>{t.name} ({t.slug})</option>
                ))}
              </select>
              <button
                onClick={loadSampleData}
                disabled={!selectedSlug}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-lg text-sm transition-colors"
                title="Cargar datos de ejemplo"
              >
                📋 Ejemplo
              </button>
            </div>
          </div>

          {/* JSON input */}
          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-medium text-gray-400 mb-1">Datos (JSON)</label>
            <textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder='{"nombre_completo": "Juan Pérez", "user_id": "123456", ...}'
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-mono focus:outline-none focus:border-lemon-500 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerate(true)}
              disabled={loading || !selectedSlug || !jsonData}
              className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? '⏳ Generando...' : '👁️ Preview'}
            </button>
            <button
              onClick={() => handleGenerate(false)}
              disabled={loading || !selectedSlug || !jsonData}
              className="flex-1 px-4 py-2.5 bg-lemon-600 hover:bg-lemon-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? '⏳ Generando...' : '🖨️ Generar y Guardar'}
            </button>
          </div>
        </div>

        {/* Right: PDF Preview */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-400">Vista previa</label>
            {pdfUrl && (
              <button
                onClick={handleDownload}
                className="text-sm text-lemon-400 hover:text-lemon-300"
              >
                ⬇️ Descargar PDF
              </button>
            )}
          </div>
          <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600">
                <div className="text-center">
                  <p className="text-4xl mb-3">📄</p>
                  <p className="text-sm">El PDF aparecerá acá</p>
                  <p className="text-xs mt-1 text-gray-700">Seleccioná un template, cargá los datos y hacé click en Preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
