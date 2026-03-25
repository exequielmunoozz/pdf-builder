import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import TemplateUpload from './pages/TemplateUpload'
import TemplateEditor from './pages/TemplateEditor'
import GeneratePdf from './pages/GeneratePdf'
import History from './pages/History'

const navItems = [
  { path: '/', label: 'Templates', icon: '📄' },
  { path: '/upload', label: 'Nuevo Template', icon: '➕' },
  { path: '/generate', label: 'Generar PDF', icon: '🖨️' },
  { path: '/history', label: 'Historial', icon: '📋' },
]

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-lemon-400 flex items-center gap-2">
            🍋 PDF Builder
          </h1>
          <p className="text-xs text-gray-500 mt-1">Lemon Internal Tools</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ path, label, icon }) => {
            const isActive = location.pathname === path ||
              (path !== '/' && location.pathname.startsWith(path))
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-lemon-900/50 text-lemon-400 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                <span>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
          v1.0.0 — Lemon Workbench
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<TemplateUpload />} />
            <Route path="/templates/:id" element={<TemplateEditor />} />
            <Route path="/generate" element={<GeneratePdf />} />
            <Route path="/generate/:slug" element={<GeneratePdf />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
