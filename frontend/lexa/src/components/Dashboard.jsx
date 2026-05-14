import { useState, useEffect, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import SearchBar from './SearchBar'
import ResultCard from './ResultCard'
import UploadModal from './UploadModal'
import Analytics from './Analytics'
import DemoPanel from './DemoPanel'
import ChatTab from './ChatTab'
import NLQueryPanel    from './NLQueryPanel'
import SchemaAssistant from './SchemaAssistant'
import AnomalyMonitor  from './AnomalyMonitor'

function useTheme() {
  const [isLight, setIsLight] = useState(() => document.body.classList.contains('light-mode'))
  useEffect(() => {
    const obs = new MutationObserver(() => setIsLight(document.body.classList.contains('light-mode')))
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return isLight
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const DocIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
)

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)

export default function Dashboard({ tab = 'search' }) {
  const isLight = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [results, setResults]       = useState([])
  const [summary, setSummary]       = useState(null)
  const [loading, setLoading]       = useState(false)
  const [meta, setMeta]             = useState(null)
  const [stats, setStats]           = useState(null)
  const [activeTab, setActiveTab]   = useState(tab)
  const [showUpload, setShowUpload] = useState(false)
  const [searched, setSearched]     = useState(false)
  const [showDemo, setShowDemo]     = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isDark, setIsDark]         = useState(true)

  // Sync tab from route prop
  useEffect(() => { setActiveTab(tab) }, [tab])
  useEffect(() => { fetchStats() }, [])

  // Persist theme across sessions
  useEffect(() => {
    const saved = localStorage.getItem('lexa-theme')
    if (saved === 'light') {
      setIsDark(false)
      document.body.classList.add('light-mode')
    }
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.body.classList.remove('light-mode')
      localStorage.setItem('lexa-theme', 'dark')
    } else {
      document.body.classList.add('light-mode')
      localStorage.setItem('lexa-theme', 'light')
    }
  }

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/documents/stats`)
      setStats(res.data)
    } catch(e) {}
  }

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) return
    setLoading(true); setSearched(true); setResults([])
    setSummary(null); setMeta(null); setShowDemo(false)
    try {
      const res = await axios.post(`${API}/search`, { query: q, limit: 10, useRAG: true })
      setResults(res.data.results || [])
      setSummary(res.data.summary)
      setMeta(res.data.meta)
      setActiveTab('search')
      navigate('/search')
    } catch(err) {
      toast.error('Search failed. Make sure both services are running.')
    } finally { setLoading(false) }
  }, [navigate])

  const navTabStyle = (id) => ({
    padding: '8px 18px',
    borderRadius: 8,
    fontWeight: activeTab === id ? 700 : 500,
    fontSize: 14,
    color: activeTab === id ? '#FFFFFF' : (isLight ? '#3D3658' : 'var(--text-faint)'),
    background: activeTab === id
      ? 'linear-gradient(135deg,#7C3AED,#6D28D9)'
      : (isLight ? 'transparent' : 'transparent'),
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textDecoration: 'none',
    display: 'inline-block',
    boxShadow: activeTab === id ? '0 2px 10px rgba(109,40,217,0.35)' : 'none',
  })

  const tabs = [
  { id: 'search',    label: 'Search',    path: '/search' },
  { id: 'chat',      label: 'AI Chat',   path: '/ai-chat' },
  { id: 'documents', label: 'Documents', path: '/documents' },
  { id: 'analytics', label: 'Analytics', path: '/analytics' },
  { id: 'nlquery',   label: 'DB Query',  path: '/db-query' },
  { id: 'schema',    label: 'Schema AI', path: '/schema' },
  { id: 'monitor',   label: 'Monitor',   path: '/monitor' },
]

  return (
    <>
      {/* HEADER */}
      <header className="lexa-header">
        <div className="lexa-logo">
          <img
            src="/lexa-logo.png"
            alt="LEXA"
            style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
          />
          <div>
            <div className="logo-name">LEXA</div>
            <div className="logo-tagline">Semantic Intelligence Engine</div>
          </div>
        </div>

        <nav className="lexa-nav">
          {tabs.map(({ id, label, path }) => (
            <NavLink
              key={id}
              to={path}
              onClick={() => setActiveTab(id)}
              style={navTabStyle(id)}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          {/* Theme toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Upload button */}
          <button className="btn-upload" onClick={() => setShowUpload(true)}>
            Upload Doc
          </button>

          {/* User avatar */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(m => !m)}
              style={{
                background: 'none', border: '2px solid rgba(124,58,237,0.4)',
                borderRadius: '50%', padding: 0, cursor: 'pointer',
                width: 36, height: 36, overflow: 'hidden'
              }}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  background: 'linear-gradient(135deg,#7C3AED,#A855F7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#FFFFFF', fontWeight: 700, fontSize: 14
                }}>
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </button>

            {showUserMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '110%',
                background: 'var(--bg-dropdown)',
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: 12, padding: '8px',
                minWidth: 200, zIndex: 100,
                boxShadow: '0 16px 48px rgba(0,0,0,0.3)'
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 6 }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{user?.name}</div>
                  <div style={{ color: 'var(--text-hint)', fontSize: 11, marginTop: 2 }}>{user?.email}</div>
                  {user?.role === 'admin' && (
                    <span style={{
                      background: 'rgba(0,237,100,0.15)', color: '#00ED64',
                      fontSize: 10, padding: '2px 8px', borderRadius: 20,
                      display: 'inline-block', marginTop: 4, fontWeight: 600
                    }}>ADMIN</span>
                  )}
                </div>
                <button
                  onClick={() => { logout(); setShowUserMenu(false) }}
                  style={{
                    width: '100%', background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, padding: '8px 12px',
                    color: '#EF4444', fontSize: 13, cursor: 'pointer',
                    textAlign: 'left', fontWeight: 500
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SEARCH TAB */}
      {activeTab === 'search' && (
        <main className="lexa-main">
          {!searched && (
            <div className="hero">
              <div className="hero-pill">HYBRID VECTOR + LEXICAL + RERANKING · MONGODB ATLAS</div>
              <h1 className="hero-title">
                <span className="line-green">Search by Meaning,</span><br />
                <span className="line-white">Not Just Words.</span>
              </h1>
              <p className="hero-sub">
                Welcome back, {user?.name?.split(' ')[0]}! Search your documents by meaning —
                Lexa understands intent, not just keywords.
              </p>
              {stats && (
                <div className="stats-row">
                  <div className="stat-item">
                    <div className="stat-value">{stats.totalDocuments || 0}</div>
                    <div className="stat-label">Documents</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{stats.totalChunks || 0}</div>
                    <div className="stat-label">Vectors Indexed</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{stats.categoriesCount || 0}</div>
                    <div className="stat-label">Categories</div>
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowDemo(d => !d)}
                style={{
                  marginTop: 24,
                  background: showDemo
                    ? 'linear-gradient(135deg,#7C3AED,#6D28D9)'
                    : (isLight ? '#EDE9FF' : 'rgba(124,58,237,0.15)'),
                  border: isLight ? '1px solid #C4BBDF' : '1px solid rgba(124,58,237,0.4)',
                  borderRadius: 12, padding: '10px 24px',
                  color: showDemo ? '#FFFFFF' : (isLight ? '#4C1D95' : '#C4B5FD'),
                  fontWeight: 600, fontSize: 14,
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: showDemo ? '0 4px 14px rgba(109,40,217,0.35)' : 'none',
                }}
              >
                {showDemo ? 'Hide Demo' : 'See Live Demo: Semantic vs Keyword'}
              </button>
            </div>
          )}

          {showDemo && !searched && (
            <div style={{ maxWidth: 900, margin: '0 auto 24px', padding: '0 24px' }}>
              <DemoPanel onSearch={(q) => { handleSearch(q); setSearched(true) }} />
            </div>
          )}

          <SearchBar onSearch={handleSearch} loading={loading} />

          {loading && (
            <div className="loading-center">
              <div className="loading-ring-wrap">
                <div className="loading-ring-ping" />
                <div className="loading-ring-bg" />
                <div className="loading-ring-spin" />
                <div className="loading-icon">L</div>
              </div>
              <div className="loading-title">Lexa is thinking...</div>
              <div className="loading-sub">Running hybrid search + reranking + AI synthesis</div>
            </div>
          )}

          {meta && !loading && (
            <div className="search-meta">
              <span className="meta-count">{meta.total} results</span>
              <span className="meta-dot">·</span>
              <span>{meta.latencyMs}ms</span>
              <span className="meta-dot">·</span>
              <span className="meta-mode">{meta.searchMode}</span>
              <span className="meta-dot">·</span>
              <span>{meta.vectorHits} vector · {meta.textHits} lexical</span>
              {meta.rerankUsed && (
                <><span className="meta-dot">·</span>
                <span style={{ color: '#00ED64', fontWeight: 600 }}>Reranked</span></>
              )}
            </div>
          )}

          {summary && !loading && (
            <div className="ai-summary">
              <div className="ai-icon-wrap">L</div>
              <div style={{ flex: 1 }}>
                <div className="ai-label">AI Executive Summary · Powered by Groq LLaMA</div>
                {typeof summary === 'object' ? (
                  <div>
                    {summary.intelligence && (
                      <div style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, marginBottom: 14, lineHeight: 1.6 }}>
                        {summary.intelligence}
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {summary.keyInsights?.length > 0 && (
                        <div style={{ background: 'rgba(0,237,100,0.06)', border: '1px solid rgba(0,237,100,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                          <div style={{ color: '#00ED64', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>KEY INSIGHTS</div>
                          {summary.keyInsights.map((ins, i) => (
                            <div key={i} style={{ color: 'var(--text-soft)', fontSize: 12, marginBottom: 4, display: 'flex', gap: 6 }}>
                              <span style={{ color: '#00ED64' }}>+</span> {ins}
                            </div>
                          ))}
                        </div>
                      )}
                      {summary.risks?.length > 0 && (
                        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                          <div style={{ color: '#EF4444', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>RISKS</div>
                          {summary.risks.map((r, i) => (
                            <div key={i} style={{ color: 'var(--text-soft)', fontSize: 12, marginBottom: 4, display: 'flex', gap: 6 }}>
                              <span style={{ color: '#EF4444' }}>!</span> {r}
                            </div>
                          ))}
                        </div>
                      )}
                      {summary.trends?.length > 0 && (
                        <div style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                          <div style={{ color: '#A855F7', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>TRENDS</div>
                          {summary.trends.map((t, i) => (
                            <div key={i} style={{ color: 'var(--text-soft)', fontSize: 12, marginBottom: 4, display: 'flex', gap: 6 }}>
                              <span style={{ color: '#A855F7' }}>~</span> {t}
                            </div>
                          ))}
                        </div>
                      )}
                      {summary.confidence && (
                        <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                          <div style={{ color: '#FBBF24', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>CONFIDENCE</div>
                          <div style={{ color: '#FBBF24', fontSize: 28, fontWeight: 800 }}>{summary.confidence}%</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="ai-text">{summary}</div>
                )}
              </div>
            </div>
          )}

          {results.length > 0 && !loading && (
            <div className="results-list">
              {results.map((r, i) => <ResultCard key={r._id || i} result={r} index={i} />)}
            </div>
          )}

          {searched && !loading && results.length === 0 && (
            <div className="empty-state">
              <div style={{
                width: 48, height: 48, margin: '0 auto 16px',
                background: 'rgba(124,58,237,0.15)',
                borderRadius: 12, display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <SearchIcon />
              </div>
              <div className="empty-title">No results found</div>
              <div className="empty-sub">Try different keywords, or upload relevant documents first.</div>
            </div>
          )}
        </main>
      )}

      {activeTab === 'chat'      && <ChatTab />}
      {activeTab === 'documents' && <DocumentsTab stats={stats} onRefresh={fetchStats} />}
      {activeTab === 'analytics' && <Analytics />}
      {activeTab === 'nlquery' && <NLQueryPanel />}
      {activeTab === 'schema'  && <SchemaAssistant />}
      {activeTab === 'monitor' && <AnomalyMonitor />}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); fetchStats(); toast.success('Document uploaded!') }}
        />
      )}
    </>
  )
}

function DocumentsTab({ stats, onRefresh }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => { fetchDocs() }, [])

  const fetchDocs = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API}/documents`)
      setDocuments(res.data.documents || [])
    } catch { toast.error('Failed to load documents') }
    finally { setLoading(false) }
  }

  const deleteDoc = async (title) => {
    if (!window.confirm(`Delete "${title}"?`)) return
    try {
      await axios.delete(`${API}/documents/${encodeURIComponent(title)}`)
      toast.success('Document deleted')
      fetchDocs(); onRefresh()
    } catch { toast.error('Delete failed') }
  }

  return (
    <main className="lexa-main">
      <div className="section-header">
        <div className="section-title">Document Library</div>
        <div className="section-sub">
          {stats?.totalDocuments || 0} documents · {stats?.totalChunks || 0} semantic chunks indexed
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-dim)' }}>Loading...</div>
      ) : documents.length === 0 ? (
        <div className="empty-state">
          <div style={{
            width: 48, height: 48, margin: '0 auto 16px',
            background: 'rgba(124,58,237,0.15)',
            borderRadius: 12, display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#A855F7'
          }}>
            <DocIcon />
          </div>
          <div className="empty-title">No documents yet</div>
          <div className="empty-sub">Click "Upload Doc" to add your first document.</div>
        </div>
      ) : (
        <div className="doc-grid">
          {documents.map((doc, i) => (
            <div key={i} className="doc-card">
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'rgba(124,58,237,0.15)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#A855F7', flexShrink: 0
              }}>
                <DocIcon />
              </div>
              <div className="doc-info">
                <div className="doc-title">{doc._id}</div>
                <div className="doc-preview">{doc.preview}</div>
                <div className="doc-meta-row">
                  {doc.category && <span className="pill-cat">{doc.category}</span>}
                  <span className="doc-stat">{doc.chunks} chunks</span>
                  <span className="doc-sep">·</span>
                  <span className="doc-stat">{(doc.totalWords || 0).toLocaleString()} words</span>
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