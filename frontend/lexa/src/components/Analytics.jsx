import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const IconSearch = ({ size = 13 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:size,height:size}}>
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconTrend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
)
const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}>
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)
const IconZap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}>
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)

export default function Analytics() {
  const [summary, setSummary] = useState(null)
  const [history, setHistory] = useState([])
  const [trend, setTrend]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/summary`),
      axios.get(`${API}/history`),
      axios.get(`${API}/trend`),
    ]).then(([s, h, t]) => {
      setSummary(s.data)
      setHistory(h.data.history || [])
      setTrend(t.data.trend || [])
    }).catch(() => toast.error('Failed to load analytics'))
    .finally(() => setLoading(false))
  }, [])

  const maxTrend = Math.max(...trend.map(t => t.count), 1)

  if (loading) return (
    <div style={{textAlign:'center',padding:'64px 0',color:'var(--text-muted)'}}>
      Loading analytics...
    </div>
  )

  const statCards = summary ? [
    { label: 'Total Searches', value: summary.totalSearches,           Icon: IconSearch, color: 'var(--purple-light)' },
    { label: 'Today',          value: summary.todaySearches,           Icon: IconTrend,  color: 'var(--green)'        },
    { label: 'Avg Results',    value: summary.avgResultsPerSearch,     Icon: IconChart,  color: 'var(--purple-light)' },
    { label: 'Avg Latency',    value: `${summary.avgLatencyMs}ms`,     Icon: IconZap,    color: 'var(--green)'        },
  ] : []

  return (
    <main className="lexa-main-wide">
      <div className="section-header">
        <div className="section-title">Search Analytics</div>
        <div className="section-sub">MongoDB aggregation-powered query intelligence</div>
      </div>

      {/* Stat cards */}
      <div className="analytics-grid">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card" style={{animationDelay:`${i*60}ms`}}>
            <div className="stat-card-header">
              <span style={{color:s.color}}><s.Icon /></span>
              <span className="stat-card-label">{s.label}</span>
            </div>
            <div className="stat-card-value" style={{color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="analytics-panels">

        {/* Bar chart */}
        {trend.length > 0 && (
          <div className="panel" style={{animationDelay:'0.2s'}}>
            <div className="panel-title">
              <span style={{color:'var(--green)'}}><IconTrend /></span>
              Searches — Last 7 Days
            </div>
            <div className="bar-chart">
              {trend.map((t, i) => (
                <div key={i} className="bar-col">
                  <div
                    className="bar-fill"
                    style={{ height: `${Math.max(4, (t.count / maxTrend) * 72)}px` }}
                  />
                  <span className="bar-label">{t._id.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top queries */}
        {summary?.topQueries?.length > 0 && (
          <div className="panel" style={{animationDelay:'0.25s'}}>
            <div className="panel-title">
              <span style={{color:'var(--purple-light)'}}><IconSearch size={14} /></span>
              Top Queries
            </div>
            <div className="query-list">
              {summary.topQueries.map((q, i) => (
                <div key={i} className="query-row">
                  <span className="query-num">{i + 1}</span>
                  <span className="query-text">{q.query}</span>
                  <span className="query-count">{q.count}×</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Query history */}
      {history.length > 0 && (
        <div className="panel history-panel" style={{animationDelay:'0.3s'}}>
          <div className="panel-title">
            <span style={{color:'var(--text-muted)'}}><IconClock /></span>
            Recent Searches
          </div>
          <div>
            {history.map((h, i) => (
              <div key={i} className="history-row">
                <div className="history-query">
                  <IconSearch size={12} />
                  {h.query}
                  {h.hadSummary && <span className="history-ai-badge">AI</span>}
                </div>
                <div className="history-meta">
                  <span>{h.resultCount} results</span>
                  <span>{h.latencyMs}ms</span>
                  <span>{new Date(h.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
