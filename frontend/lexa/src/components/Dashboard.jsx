
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import SearchBar from './SearchBar'
import ResultCard from './ResultCard'
import UploadModal from './UploadModal'
import Analytics from './Analytics'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── SVG ICONS (inline, no icon library needed) ──────────────
const IconZap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconFile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)
const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)
const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
)
const IconCpu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
    <rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/>
    <line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/>
    <line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/>
    <line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/>
    <line x1="1" y1="14" x2="4" y2="14"/>
  </svg>
)
const IconDB = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
)
const IconGlobe = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
)

export default function Dashboard() {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [summary, setSummary]     = useState(null)
  const [loading, setLoading]     = useState(false)
  const [meta, setMeta]           = useState(null)
  const [stats, setStats]         = useState(null)
  const [activeTab, setActiveTab] = useState('search')
  const [showUpload, setShowUpload] = useState(false)
  const [searched, setSearched]   = useState(false)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/documents/stats`)
      setStats(res.data)
    } catch {}
  }

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    setResults([])
    setSummary(null)
    setMeta(null)
    try {
      const res = await axios.post(`${API}/search`, { query: q, limit: 10, useRAG: true })
      setResults(res.data.results || [])
      setSummary(res.data.summary)
      setMeta(res.data.meta)
    } catch {
      toast.error('Search failed. Make sure both services are running.')
    } finally {
      setLoading(false)
    }
  }, [])

  const tabs = [
    { id: 'search',    label: 'Search',    Icon: IconSearch },
    { id: 'documents', label: 'Documents', Icon: IconFile   },
    { id: 'analytics', label: 'Analytics', Icon: IconChart  },
  ]

  return (
    <>
      {/* ══════════════ HEADER ══════════════ */}
      <header className="lexa-header">
        {/* Logo */}
        <div className="lexa-logo">
          <div className="logo-icon">L</div>
          <div className="logo-text">
            <div className="logo-name">LEXA</div>
            <div className="logo-tagline">Semantic Intelligence Engine</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="lexa-nav">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`nav-tab${activeTab === id ? ' active' : ''}`}
            >
              <Icon /> {label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="header-actions">
          <div className="atlas-badge">
            <span className="atlas-dot" />
            MongoDB Atlas
          </div>
          <button className="btn-upload" onClick={() => setShowUpload(true)}>
            <IconUpload /> Upload Doc
          </button>
        </div>
      </header>

      {/* ══════════════ SEARCH TAB ══════════════ */}
      {activeTab === 'search' && (
        <main className="lexa-main">

          {/* Hero */}
          {!searched && (
            <div className="hero">
              <div className="hero-pill">
                <IconCpu /> HYBRID VECTOR + LEXICAL · MONGODB ATLAS
              </div>
              <h1 className="hero-title">
                <span className="line-green">Search by Meaning,</span>
                <br />
                <span className="line-white">Not Just Words.</span>
              </h1>
              <p className="hero-sub">
                Lexa understands human intent. Search for "economic downturn" and
                find documents about "recession" and "market volatility" — automatically.
              </p>

              {stats && (
                <div className="stats-row">
                  {[
                    { label: 'Documents',      value: stats.totalDocuments, Icon: IconFile  },
                    { label: 'Vectors Indexed', value: stats.totalChunks,   Icon: IconDB    },
                    { label: 'Categories',     value: stats.categoriesCount, Icon: IconGlobe },
                  ].map(s => (
                    <div className="stat-item" key={s.label}>
                      <div className="stat-value">{s.value}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search Bar */}
          <SearchBar onSearch={handleSearch} loading={loading} />

          {/* Loading */}
          {loading && (
            <div className="loading-center">
              <div className="loading-ring-wrap">
                <div className="loading-ring-ping" />
                <div className="loading-ring-bg" />
                <div className="loading-ring-spin" />
                <div className="loading-icon"><IconZap /></div>
              </div>
              <div className="loading-title">Lexa is thinking...</div>
              <div className="loading-sub">Running hybrid semantic search + RAG synthesis</div>
            </div>
          )}

          {/* Meta row */}
          {meta && !loading && (
            <div className="search-meta">
              <span className="meta-count">{meta.total} results</span>
              <span className="meta-dot">·</span>
              <span>{meta.latencyMs}ms</span>
              <span className="meta-dot">·</span>
              <span className="meta-mode">{meta.searchMode}</span>
              <span className="meta-dot">·</span>
              <span>{meta.vectorHits} vector · {meta.textHits} lexical</span>
            </div>
          )}

          {/* AI Summary */}
          {summary && !loading && (
            <div className="ai-summary">
              <div className="ai-icon-wrap"><IconZap /></div>
              <div>
                <div className="ai-label">AI Executive Summary · Gemini</div>
                <div className="ai-text">{summary}</div>
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && !loading && (
            <div className="results-list">
              {results.map((r, i) => (
                <ResultCard key={r._id || i} result={r} index={i} />
              ))}
            </div>
          )}

          {/* No results */}
          {searched && !loading && results.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><IconSearch /></div>
              <div className="empty-title">No results found</div>
              <div className="empty-sub">Try different keywords, or upload relevant documents first.</div>
            </div>
          )}
        </main>
      )}

      {/* ══════════════ DOCUMENTS TAB ══════════════ */}
      {activeTab === 'documents' && (
        <DocumentsTab stats={stats} onRefresh={fetchStats} />
      )}

      {/* ══════════════ ANALYTICS TAB ══════════════ */}
      {activeTab === 'analytics' && <Analytics />}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); fetchStats() }}
        />
      )}
    </>
  )
}

/* ── DOCUMENTS TAB ─────────────────────────────────────────── */
function DocumentsTab({ stats, onRefresh }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading]     = useState(true)

  const IconFile2 = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )

  useEffect(() => { fetchDocs() }, [])

  const fetchDocs = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents`)
      setDocuments(res.data.documents || [])
    } catch { toast.error('Failed to load documents') }
    finally { setLoading(false) }
  }

  const deleteDoc = async (title) => {
    if (!window.confirm(`Delete "${title}"?`)) return
    try {
      await axios.delete(`http://localhost:5000/api/documents/${encodeURIComponent(title)}`)
      toast.success('Document deleted')
      fetchDocs(); onRefresh()
    } catch { toast.error('Delete failed') }
  }

  return (
    <main className="lexa-main">
      <div className="section-header">
        <div className="section-title">Document Library</div>
        <div className="section-sub">
          {stats?.totalDocuments || 0} documents &nbsp;·&nbsp; {stats?.totalChunks || 0} semantic chunks indexed
        </div>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:'64px 0',color:'var(--text-muted)'}}>Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><IconFile2 /></div>
          <div className="empty-title">No documents yet</div>
          <div className="empty-sub">Upload a document to get started.</div>
        </div>
      ) : (
        <div className="doc-grid">
          {documents.map((doc, i) => (
            <div key={i} className="doc-card" style={{animationDelay:`${i*50}ms`}}>
              <div className="doc-icon"><IconFile2 /></div>
              <div className="doc-info">
                <div className="doc-title">{doc._id}</div>
                <div className="doc-preview">{doc.preview}</div>
                <div className="doc-meta-row">
                  {doc.category && <span className="pill-cat">{doc.category}</span>}
                  <span className="doc-stat">{doc.chunks} chunks</span>
                  <span className="doc-sep">·</span>
                  <span className="doc-stat">{(doc.totalWords||0).toLocaleString()} words</span>
                </div>
              </div>
              <button className="btn-delete" onClick={() => deleteDoc(doc._id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
