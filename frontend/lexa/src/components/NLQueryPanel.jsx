// frontend/lexa/src/components/NLQueryPanel.jsx
// Feature 2: Natural Language Interface for MongoDB Database

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

const SAMPLE_QUESTIONS = [
  'How many documents do I have in each category?',
  'What are my top 5 most searched queries?',
  'How many searches returned 0 results this week?',
  'What is my average search latency?',
  'Which queries failed the most times?',
  'How many documents were uploaded today?',
]

export default function NLQueryPanel() {
  const isLight = useTheme()
  const [question, setQuestion] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [history,  setHistory]  = useState([])

  const t = {
    bg:      isLight ? '#F7F6FB'           : 'rgba(255,255,255,0.02)',
    bdr:     isLight ? '1px solid #DDD8EF' : '1px solid rgba(124,58,237,0.2)',
    card:    isLight ? '#FFFFFF'           : 'rgba(255,255,255,0.03)',
    cardBdr: isLight ? '1px solid #DDD8EF' : '1px solid rgba(255,255,255,0.08)',
    text:    isLight ? '#0F172A'           : '#FFFFFF',
    sub:     isLight ? '#475569'           : '#7C6FA0',
    inputBg: isLight ? '#FFFFFF'           : 'rgba(255,255,255,0.05)',
    inputBdr:isLight ? '1px solid #B8B0D8' : '1px solid rgba(124,58,237,0.3)',
    codeBg:  isLight ? '#F1F0FF'           : '#0a0d10',
    codeBdr: isLight ? '1px solid #DDD8EF' : '1px solid #1e2a38',
    codeClr: isLight ? '#4C1D95'           : '#a8d8a8',
  }

  const ask = async (q = question) => {
    if (!q.trim() || loading) return
    setLoading(true); setResult(null)
    try {
      const res = await axios.post(`${API}/nlquery`, { question: q })
      setResult(res.data)
      setHistory(prev => [{ question: q, answer: res.data.answer }, ...prev].slice(0, 10))
      setQuestion('')
    } catch (err) {
      setResult({ error: err.response?.data?.error || 'Query failed' })
    } finally { setLoading(false) }
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ color: t.text, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Natural Language Database Query</div>
        <div style={{ color: t.sub, fontSize: 13 }}>Ask questions about your database in plain English - AI converts them to MongoDB aggregations and executes them</div>
      </div>

      {/* Input */}
      <div style={{ background:t.bg, border:t.bdr, borderRadius:14, padding:20, marginBottom:20 }}>
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          <input
            type="text" value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask()}
            placeholder='Ask anything about your database... "How many HR documents do I have?"'
            style={{ flex:1, background:t.inputBg, border:t.inputBdr, borderRadius:8, padding:'11px 16px', color:t.text, fontSize:14, outline:'none', fontFamily:'inherit' }}
          />
          <button onClick={() => ask()} disabled={loading || !question.trim()} style={{
            background: loading || !question.trim() ? (isLight ? '#DDD8EF' : 'rgba(124,58,237,0.3)') : 'linear-gradient(135deg,#7C3AED,#6D28D9)',
            border:'none', borderRadius:8, padding:'11px 22px',
            color: loading || !question.trim() ? (isLight ? '#9490A8' : 'rgba(255,255,255,0.4)') : '#FFFFFF',
            fontWeight:700, fontSize:14, cursor: loading || !question.trim() ? 'not-allowed' : 'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
            boxShadow: loading || !question.trim() ? 'none' : '0 4px 14px rgba(109,40,217,0.35)'
          }}>
            {loading ? 'Querying...' : 'Ask Database'}
          </button>
        </div>

        {/* Sample questions */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {SAMPLE_QUESTIONS.map(q => (
            <button key={q} onClick={() => ask(q)} style={{
              background: isLight ? '#EDE9FF' : 'rgba(124,58,237,0.1)',
              border: isLight ? '1px solid #C4BBDF' : '1px solid rgba(124,58,237,0.25)',
              color: isLight ? '#4C1D95' : '#C4B5FD',
              borderRadius:20, padding:'5px 12px', fontSize:11, cursor:'pointer', fontFamily:'inherit'
            }}>{q}</button>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && !result.error && (
        <div style={{ marginBottom:20 }}>
          {/* Natural language answer */}
          <div style={{ background: isLight ? '#F0FDF4' : 'rgba(0,200,80,0.06)', border: isLight ? '1px solid #86EFAC' : '1px solid rgba(0,200,80,0.2)', borderRadius:12, padding:18, marginBottom:14 }}>
            <div style={{ color: isLight ? '#15803D' : '#00ED64', fontSize:11, fontWeight:700, letterSpacing:'0.06em', marginBottom:8 }}>ANSWER</div>
            <div style={{ color:t.text, fontSize:15, fontWeight:500, lineHeight:1.6 }}>{result.answer}</div>
            {result.explanation && <div style={{ color:t.sub, fontSize:12, marginTop:8, fontStyle:'italic' }}>{result.explanation}</div>}
          </div>

          {/* Generated pipeline */}
          {result.pipeline && (
            <div style={{ background:t.codeBg, border:t.codeBdr, borderRadius:10, padding:16, marginBottom:14 }}>
              <div style={{ color: isLight ? '#7C3AED' : '#A855F7', fontSize:10, fontWeight:700, letterSpacing:'0.1em', marginBottom:8 }}>
                GENERATED MONGODB PIPELINE — {result.collection} collection
              </div>
              <pre style={{ color:t.codeClr, fontSize:12, fontFamily:'monospace', lineHeight:1.7, overflowX:'auto', margin:0, whiteSpace:'pre-wrap' }}>
                {JSON.stringify(result.pipeline, null, 2)}
              </pre>
            </div>
          )}

          {/* Raw results table */}
          {result.results?.length > 0 && (
            <div style={{ background:t.bg, border:t.bdr, borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'10px 16px', borderBottom:t.bdr, color:t.sub, fontSize:11, fontWeight:700, letterSpacing:'0.06em' }}>
                RAW RESULTS ({result.results.length} rows)
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>
                      {Object.keys(result.results[0]).filter(k => k !== '_id').map(key => (
                        <th key={key} style={{ padding:'8px 14px', textAlign:'left', color:t.sub, fontSize:11, fontWeight:600, borderBottom:t.bdr, whiteSpace:'nowrap' }}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {Object.entries(row).filter(([k]) => k !== '_id').map(([key, val]) => (
                          <td key={key} style={{ padding:'9px 14px', color:t.text, fontSize:13, borderBottom: i < result.results.length - 1 ? (isLight ? '1px solid #F0EDF8' : '1px solid rgba(255,255,255,0.04)') : 'none' }}>
                            {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {result?.error && (
        <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:10, padding:14, color:'#DC2626', fontSize:14 }}>
          {result.error}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ background:t.bg, border:t.bdr, borderRadius:12, padding:16 }}>
          <div style={{ color:t.sub, fontSize:11, fontWeight:700, letterSpacing:'0.06em', marginBottom:12 }}>RECENT QUERIES</div>
          {history.map((h, i) => (
            <div key={i} onClick={() => ask(h.question)} style={{ padding:'10px 12px', background:t.card, border:t.cardBdr, borderRadius:8, marginBottom:8, cursor:'pointer' }}>
              <div style={{ color:t.text, fontSize:13, fontWeight:500, marginBottom:3 }}>{h.question}</div>
              <div style={{ color:t.sub, fontSize:12 }}>{h.answer?.slice(0, 100)}...</div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}