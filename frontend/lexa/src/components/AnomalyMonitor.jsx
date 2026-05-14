// frontend/lexa/src/components/AnomalyMonitor.jsx
// Feature 5: MongoDB Log Anomaly & Security Monitor

import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function useTheme() {
  const [isLight, setIsLight] = useState(() => document.body.classList.contains('light-mode'))
  useEffect(() => {
    const obs = new MutationObserver(() => setIsLight(document.body.classList.contains('light-mode')))
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return isLight
}

export default function AnomalyMonitor() {
  const isLight = useTheme()
  const [report,    setReport]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/anomaly/report`)
      setReport(res.data)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Anomaly fetch failed:', err.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchReport() }, [])

  const t = {
    bg:      isLight ? '#F7F6FB'           : 'rgba(255,255,255,0.02)',
    bdr:     isLight ? '1px solid #DDD8EF' : '1px solid rgba(124,58,237,0.2)',
    card:    isLight ? '#FFFFFF'           : 'rgba(255,255,255,0.03)',
    cardBdr: isLight ? '1px solid #DDD8EF' : '1px solid rgba(255,255,255,0.08)',
    text:    isLight ? '#0F172A'           : '#FFFFFF',
    sub:     isLight ? '#475569'           : '#7C6FA0',
  }

  const severityStyle = (s) => ({
    HIGH:   { bg: isLight ? '#FEF2F2' : 'rgba(220,38,38,0.08)',  bdr: isLight ? '#FECACA' : 'rgba(220,38,38,0.25)',  badge: '#DC2626', text: isLight ? '#991B1B' : '#FCA5A5' },
    MEDIUM: { bg: isLight ? '#FFFBEB' : 'rgba(217,119,6,0.08)',  bdr: isLight ? '#FDE68A' : 'rgba(217,119,6,0.25)',  badge: '#D97706', text: isLight ? '#92400E' : '#FCD34D' },
    LOW:    { bg: isLight ? '#EDE9FF' : 'rgba(109,40,217,0.06)', bdr: isLight ? '#C4BBDF' : 'rgba(109,40,217,0.2)', badge: '#7C3AED', text: isLight ? '#4C1D95' : '#C4B5FD' },
  })[s] || {}

  const statusColor = report?.status === 'HEALTHY' ? (isLight ? '#15803D' : '#00ED64')
    : report?.status === 'WARNING' ? (isLight ? '#92400E' : '#FCD34D') : '#DC2626'
  const statusBg = report?.status === 'HEALTHY'
    ? (isLight ? '#F0FDF4' : 'rgba(0,200,80,0.06)')
    : report?.status === 'WARNING'
    ? (isLight ? '#FFFBEB' : 'rgba(217,119,6,0.06)')
    : (isLight ? '#FEF2F2' : 'rgba(220,38,38,0.06)')

  if (loading) return (
    <main style={{ maxWidth:900, margin:'0 auto', padding:'24px' }}>
      <div style={{ textAlign:'center', padding:'64px 0', color: isLight ? '#6D28D9' : '#C4B5FD' }}>Analyzing MongoDB logs...</div>
    </main>
  )

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 80px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <div style={{ color:t.text, fontSize:22, fontWeight:700, marginBottom:4 }}>Log Anomaly & Security Monitor</div>
          <div style={{ color:t.sub, fontSize:13 }}>Real-time detection of unusual query patterns, failures, and security signals using MongoDB aggregation pipelines</div>
        </div>
        <button onClick={fetchReport} style={{
          background: isLight ? '#EDE9FF' : 'rgba(124,58,237,0.15)',
          border: isLight ? '1px solid #C4BBDF' : '1px solid rgba(124,58,237,0.3)',
          color: isLight ? '#4C1D95' : '#C4B5FD',
          borderRadius:8, padding:'8px 16px', fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600
        }}>Refresh</button>
      </div>

      {report && (
        <>
          {/* Status + score */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14, marginBottom:20 }}>
            <div style={{ background:statusBg, border:`1px solid ${statusColor}30`, borderRadius:12, padding:'18px 20px', gridColumn:'span 1' }}>
              <div style={{ color:t.sub, fontSize:11, fontWeight:600, marginBottom:8 }}>SYSTEM STATUS</div>
              <div style={{ color:statusColor, fontSize:26, fontWeight:800 }}>{report.status}</div>
              <div style={{ color:t.sub, fontSize:11, marginTop:4 }}>Security score: {report.securityScore}/100</div>
            </div>
            {[
              { label:'Queries (Last Hour)', value: report.stats?.queriesLastHour },
              { label:'Avg Latency',         value: `${report.stats?.avgLatencyMs}ms` },
              { label:'Repeated Failures',   value: report.stats?.repeatedFailures },
            ].map((s, i) => (
              <div key={i} style={{ background:t.bg, border:t.bdr, borderRadius:12, padding:'18px 20px' }}>
                <div style={{ color:t.sub, fontSize:11, fontWeight:600, marginBottom:8 }}>{s.label}</div>
                <div style={{ color:t.text, fontSize:24, fontWeight:700 }}>{s.value ?? 0}</div>
              </div>
            ))}
          </div>

          {/* Anomalies */}
          <div style={{ marginBottom:20 }}>
            <div style={{ color:t.sub, fontSize:11, fontWeight:700, letterSpacing:'0.06em', marginBottom:12 }}>
              DETECTED ANOMALIES {report.anomalies?.length > 0 ? `(${report.anomalies.length})` : '(NONE)'}
            </div>
            {report.anomalies?.length === 0 ? (
              <div style={{ background: isLight ? '#F0FDF4' : 'rgba(0,200,80,0.06)', border: isLight ? '1px solid #86EFAC' : '1px solid rgba(0,200,80,0.2)', borderRadius:12, padding:18, color: isLight ? '#15803D' : '#00ED64', fontSize:14, fontWeight:500 }}>
                No anomalies detected. All query patterns are within normal range.
              </div>
            ) : (
              report.anomalies.map((anomaly, i) => {
                const s = severityStyle(anomaly.severity)
                return (
                  <div key={i} style={{ background:s.bg, border:`1px solid ${s.bdr}`, borderRadius:12, padding:16, marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <span style={{ background:s.badge, color:'#FFFFFF', fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:20 }}>{anomaly.severity}</span>
                      <span style={{ color:t.text, fontSize:12, fontWeight:700, fontFamily:'monospace' }}>{anomaly.type}</span>
                    </div>
                    <div style={{ color:s.text, fontSize:13, lineHeight:1.6 }}>{anomaly.message}</div>
                    {anomaly.affectedQueries && (
                      <div style={{ marginTop:8 }}>
                        {anomaly.affectedQueries.map((q, j) => (
                          <div key={j} style={{ fontSize:11, color:t.sub, fontFamily:'monospace', marginTop:3 }}>
                            "{q.query}" — {q.latencyMs}ms
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Hourly volume chart */}
          {report.hourlyVolume?.length > 0 && (
            <div style={{ background:t.bg, border:t.bdr, borderRadius:12, padding:20, marginBottom:20 }}>
              <div style={{ color:t.sub, fontSize:11, fontWeight:700, letterSpacing:'0.06em', marginBottom:16 }}>QUERY VOLUME BY HOUR (LAST 24H)</div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:72 }}>
                {Array.from({ length:24 }, (_, h) => {
                  const data = report.hourlyVolume.find(v => v._id === h)
                  const count = data?.count || 0
                  const max   = Math.max(...report.hourlyVolume.map(v => v.count), 1)
                  const isOdd = [0,1,2,3,4,5].includes(h)
                  return (
                    <div key={h} title={`Hour ${h}: ${count} queries`} style={{
                      flex:1, background: isOdd && count > 0 ? '#D97706' : '#7C3AED',
                      borderRadius:'3px 3px 0 0', opacity: count === 0 ? 0.15 : 1,
                      height:`${Math.max(4, (count / max) * 72)}px`, transition:'height 0.3s'
                    }} />
                  )
                })}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, color:t.sub, fontSize:9 }}>
                <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
              </div>
              <div style={{ display:'flex', gap:16, marginTop:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:10, height:10, background:'#D97706', borderRadius:2 }} />
                  <span style={{ color:t.sub, fontSize:11 }}>Off-hours (midnight–5am)</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:10, height:10, background:'#7C3AED', borderRadius:2 }} />
                  <span style={{ color:t.sub, fontSize:11 }}>Normal hours</span>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <div style={{ background:t.bg, border:t.bdr, borderRadius:12, padding:18 }}>
              <div style={{ color:t.sub, fontSize:11, fontWeight:700, letterSpacing:'0.06em', marginBottom:12 }}>RECOMMENDATIONS</div>
              {report.recommendations.map((r, i) => (
                <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <span style={{ color:'#7C3AED', fontSize:14 }}>→</span>
                  <span style={{ color:t.sub, fontSize:13 }}>{r}</span>
                </div>
              ))}
            </div>
          )}

          {lastRefresh && (
            <div style={{ color:t.sub, fontSize:11, textAlign:'right', marginTop:12 }}>
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </>
      )}
    </main>
  )
}