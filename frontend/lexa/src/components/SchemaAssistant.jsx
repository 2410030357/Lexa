// frontend/lexa/src/components/SchemaAssistant.jsx
// Feature 3: AI-Powered Schema Design Assistant for MongoDB

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

const EXAMPLES = [
  'E-commerce platform with products, orders, users, and reviews',
  'Hospital patient management with appointments, records, and prescriptions',
  'Social media app with posts, comments, follows, and notifications',
  'HR system with employees, departments, payroll, and performance reviews',
]

export default function SchemaAssistant() {
  const isLight = useTheme()
  const [mode,        setMode]        = useState('design') // 'design' | 'validate'
  const [useCase,     setUseCase]     = useState('')
  const [requirements,setRequirements]= useState('')
  const [existingSchema,setExistingSchema] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState(null)
  const [activeCol,   setActiveCol]   = useState(0)

  const t = {
    bg:      isLight ? '#F7F6FB'           : 'rgba(255,255,255,0.02)',
    bdr:     isLight ? '1px solid #DDD8EF' : '1px solid rgba(124,58,237,0.2)',
    card:    isLight ? '#FFFFFF'           : 'rgba(255,255,255,0.03)',
    cardBdr: isLight ? '1px solid #DDD8EF' : '1px solid rgba(255,255,255,0.08)',
    text:    isLight ? '#0F172A'           : '#FFFFFF',
    sub:     isLight ? '#475569'           : '#7C6FA0',
    inputBg: isLight ? '#FFFFFF'           : 'rgba(255,255,255,0.05)',
    inputBdr:isLight ? '1px solid #B8B0D8' : '1px solid rgba(124,58,237,0.3)',
    inputClr:isLight ? '#0F172A'           : '#E2D9F3',
    codeBg:  isLight ? '#F1F0FF'           : '#0a0d10',
    codeBdr: isLight ? '1px solid #DDD8EF' : '1px solid #1e2a38',
    codeClr: isLight ? '#4C1D95'           : '#a8d8a8',
  }

  const input = (value, onChange, placeholder, rows = 1) => (
    rows > 1 ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width:'100%', background:t.inputBg, border:t.inputBdr, borderRadius:8, padding:'10px 14px', color:t.inputClr, fontSize:14, outline:'none', fontFamily:'inherit', resize:'vertical', boxSizing:'border-box' }} />
    ) : (
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', background:t.inputBg, border:t.inputBdr, borderRadius:8, padding:'10px 14px', color:t.inputClr, fontSize:14, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
    )
  )

  const handleDesign = async () => {
    if (!useCase.trim()) return
    setLoading(true); setResult(null)
    try {
      const res = await axios.post(`${API}/schema/design`, { useCase, requirements })
      setResult({ type: 'design', data: res.data })
      setActiveCol(0)
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error || 'Generation failed' })
    } finally { setLoading(false) }
  }

  const handleValidate = async () => {
    if (!existingSchema.trim()) return
    setLoading(true); setResult(null)
    try {
      const res = await axios.post(`${API}/schema/validate`, { schema: existingSchema, useCase })
      setResult({ type: 'validate', data: res.data })
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error || 'Validation failed' })
    } finally { setLoading(false) }
  }

  const severityColor = (s) => s === 'critical' ? '#DC2626' : s === 'warning' ? '#D97706' : '#6D28D9'
  const severityBg    = (s) => s === 'critical'
    ? (isLight ? '#FEF2F2' : 'rgba(220,38,38,0.08)')
    : s === 'warning'
    ? (isLight ? '#FFFBEB' : 'rgba(217,119,6,0.08)')
    : (isLight ? '#EDE9FF' : 'rgba(109,40,217,0.08)')

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ color: t.text, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>MongoDB Schema Designer</div>
        <div style={{ color: t.sub, fontSize: 13 }}>Describe your use case - AI generates production-grade MongoDB schema with indexes</div>
      </div>

      {/* Mode tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:24, background: isLight ? '#EDE9FF' : 'rgba(255,255,255,0.04)', borderRadius:10, padding:4, width:'fit-content' }}>
        {['design', 'validate'].map(m => (
          <button key={m} onClick={() => { setMode(m); setResult(null) }} style={{
            padding:'8px 20px', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', transition:'all 0.2s',
            background: mode === m ? 'linear-gradient(135deg,#7C3AED,#6D28D9)' : 'transparent',
            color: mode === m ? '#FFFFFF' : t.sub,
            boxShadow: mode === m ? '0 2px 8px rgba(109,40,217,0.3)' : 'none'
          }}>
            {m === 'design' ? 'Design Schema' : 'Review Existing'}
          </button>
        ))}
      </div>

      {/* Input panel */}
      <div style={{ background:t.bg, border:t.bdr, borderRadius:14, padding:24, marginBottom:24 }}>
        {mode === 'design' ? (
          <>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:t.sub, fontSize:12, fontWeight:600, marginBottom:6 }}>DESCRIBE YOUR USE CASE *</div>
              {input(useCase, setUseCase, 'e.g. Hospital patient management system with appointments, medical records, and billing')}
            </div>

            {/* Example pills */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => setUseCase(ex)} style={{
                  background: isLight ? '#EDE9FF' : 'rgba(124,58,237,0.1)',
                  border: isLight ? '1px solid #C4BBDF' : '1px solid rgba(124,58,237,0.25)',
                  color: isLight ? '#4C1D95' : '#C4B5FD',
                  borderRadius:20, padding:'4px 12px', fontSize:11, cursor:'pointer', fontFamily:'inherit'
                }}>{ex.slice(0, 40)}...</button>
              ))}
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ color:t.sub, fontSize:12, fontWeight:600, marginBottom:6 }}>ADDITIONAL REQUIREMENTS (optional)</div>
              {input(requirements, setRequirements, 'e.g. Multi-tenant, HIPAA compliant, needs vector search for symptom matching', 3)}
            </div>

            <button onClick={handleDesign} disabled={loading || !useCase.trim()} style={{
              background: loading || !useCase.trim() ? (isLight ? '#DDD8EF' : 'rgba(124,58,237,0.3)') : 'linear-gradient(135deg,#7C3AED,#6D28D9)',
              border:'none', borderRadius:10, padding:'11px 28px',
              color: loading || !useCase.trim() ? (isLight ? '#9490A8' : 'rgba(255,255,255,0.4)') : '#FFFFFF',
              fontWeight:700, fontSize:14, cursor: loading || !useCase.trim() ? 'not-allowed' : 'pointer', fontFamily:'inherit',
              boxShadow: loading || !useCase.trim() ? 'none' : '0 4px 14px rgba(109,40,217,0.35)'
            }}>
              {loading ? 'Generating Schema...' : 'Generate MongoDB Schema'}
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:t.sub, fontSize:12, fontWeight:600, marginBottom:6 }}>USE CASE (optional)</div>
              {input(useCase, setUseCase, 'What is this schema for?')}
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ color:t.sub, fontSize:12, fontWeight:600, marginBottom:6 }}>PASTE YOUR EXISTING SCHEMA *</div>
              {input(existingSchema, setExistingSchema, 'Paste your MongoDB schema as JSON...', 8)}
            </div>
            <button onClick={handleValidate} disabled={loading || !existingSchema.trim()} style={{
              background: loading || !existingSchema.trim() ? (isLight ? '#DDD8EF' : 'rgba(124,58,237,0.3)') : 'linear-gradient(135deg,#7C3AED,#6D28D9)',
              border:'none', borderRadius:10, padding:'11px 28px',
              color: loading || !existingSchema.trim() ? (isLight ? '#9490A8' : 'rgba(255,255,255,0.4)') : '#FFFFFF',
              fontWeight:700, fontSize:14, cursor: loading || !existingSchema.trim() ? 'not-allowed' : 'pointer', fontFamily:'inherit',
              boxShadow: loading || !existingSchema.trim() ? 'none' : '0 4px 14px rgba(109,40,217,0.35)'
            }}>
              {loading ? 'Reviewing...' : 'Review & Score Schema'}
            </button>
          </>
        )}
      </div>

      {/* Error */}
      {result?.type === 'error' && (
        <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:10, padding:16, color:'#DC2626', fontSize:14 }}>
          {result.message}
        </div>
      )}

      {/* DESIGN RESULT */}
      {result?.type === 'design' && result.data?.schema && (
        <div>
          {/* Collection tabs */}
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            {result.data.schema.collections?.map((col, i) => (
              <button key={i} onClick={() => setActiveCol(i)} style={{
                padding:'7px 16px', borderRadius:8, border: activeCol === i ? 'none' : `1px solid ${isLight ? '#DDD8EF' : 'rgba(255,255,255,0.1)'}`,
                background: activeCol === i ? 'linear-gradient(135deg,#7C3AED,#6D28D9)' : t.card,
                color: activeCol === i ? '#FFFFFF' : t.sub, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit'
              }}>{col.name}</button>
            ))}
          </div>

          {/* Active collection detail */}
          {result.data.schema.collections?.[activeCol] && (() => {
            const col = result.data.schema.collections[activeCol]
            return (
              <div style={{ background:t.bg, border:t.bdr, borderRadius:14, padding:24, marginBottom:16 }}>
                <div style={{ color:'#7C3AED', fontSize:11, fontWeight:700, letterSpacing:'0.06em', marginBottom:4 }}>COLLECTION</div>
                <div style={{ color:t.text, fontSize:20, fontWeight:700, marginBottom:4 }}>{col.name}</div>
                <div style={{ color:t.sub, fontSize:13, marginBottom:20 }}>{col.purpose}</div>

                {/* Schema fields */}
                <div style={{ color:t.sub, fontSize:11, fontWeight:700, letterSpacing:'0.06em', marginBottom:10 }}>FIELDS</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20 }}>
                  {Object.entries(col.schema || {}).map(([field, def]) => (
                    <div key={field} style={{ display:'grid', gridTemplateColumns:'160px 100px 1fr', gap:12, alignItems:'start', padding:'10px 14px', background:t.card, border:t.cardBdr, borderRadius:8 }}>
                      <div style={{ color:'#7C3AED', fontSize:13, fontWeight:600, fontFamily:'monospace' }}>{field}</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        <span style={{ background: isLight ? '#EDE9FF' : 'rgba(124,58,237,0.15)', color: isLight ? '#4C1D95' : '#C4B5FD', fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:600, width:'fit-content' }}>{def.type}</span>
                        {def.required && <span style={{ background: isLight ? '#FEF2F2' : 'rgba(220,38,38,0.1)', color:'#DC2626', fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:600, width:'fit-content' }}>required</span>}
                      </div>
                      <div>
                        <div style={{ color:t.sub, fontSize:12 }}>{def.description}</div>
                        {def.example && <div style={{ color:t.text, fontSize:11, fontFamily:'monospace', marginTop:3, opacity:0.6 }}>e.g. {String(def.example)}</div>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Indexes */}
                {col.indexes?.length > 0 && (
                  <>
                    <div style={{ color:t.sub, fontSize:11, fontWeight:700, letterSpacing:'0.06em', marginBottom:10 }}>RECOMMENDED INDEXES</div>
                    {col.indexes.map((idx, i) => (
                      <div key={i} style={{ background:t.codeBg, border:t.codeBdr, borderRadius:8, padding:'10px 14px', marginBottom:8 }}>
                        <div style={{ color:t.codeClr, fontSize:12, fontFamily:'monospace', marginBottom:4 }}>
                          {JSON.stringify(idx.fields)}
                          {idx.options ? ' ' + JSON.stringify(idx.options) : ''}
                        </div>
                        <div style={{ color:t.sub, fontSize:11 }}>{idx.reason}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )
          })()}

          {/* Vector search recommendation */}
          {result.data.schema.vectorSearchIndex?.recommended && (
            <div style={{ background: isLight ? '#F0FDF4' : 'rgba(0,200,80,0.06)', border: isLight ? '1px solid #86EFAC' : '1px solid rgba(0,200,80,0.2)', borderRadius:12, padding:16, marginBottom:16 }}>
              <div style={{ color: isLight ? '#15803D' : '#00ED64', fontWeight:700, fontSize:12, marginBottom:8 }}>VECTOR SEARCH OPPORTUNITY</div>
              <div style={{ color:t.text, fontSize:13, marginBottom:4 }}>
                Add Atlas Vector Search on <code style={{ background: isLight ? '#EDE9FF' : 'rgba(124,58,237,0.15)', padding:'1px 6px', borderRadius:4 }}>{result.data.schema.vectorSearchIndex.field}</code> field
                ({result.data.schema.vectorSearchIndex.dimensions} dimensions, {result.data.schema.vectorSearchIndex.similarity} similarity)
              </div>
              <div style={{ color:t.sub, fontSize:12 }}>{result.data.schema.vectorSearchIndex.reason}</div>
            </div>
          )}

          {/* Design decisions */}
          {result.data.schema.designDecisions?.length > 0 && (
            <div style={{ background:t.bg, border:t.bdr, borderRadius:12, padding:18, marginBottom:16 }}>
              <div style={{ color:'#7C3AED', fontWeight:700, fontSize:12, letterSpacing:'0.06em', marginBottom:12 }}>DESIGN DECISIONS</div>
              {result.data.schema.designDecisions.map((d, i) => (
                <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <span style={{ color:'#7C3AED', fontSize:13 }}>+</span>
                  <span style={{ color:t.sub, fontSize:13 }}>{d}</span>
                </div>
              ))}
            </div>
          )}

          {/* Anti-patterns */}
          {result.data.schema.antiPatterns?.length > 0 && (
            <div style={{ background: isLight ? '#FFF1F2' : 'rgba(220,38,38,0.04)', border: isLight ? '1px solid #FECACA' : '1px solid rgba(220,38,38,0.15)', borderRadius:12, padding:18 }}>
              <div style={{ color:'#DC2626', fontWeight:700, fontSize:12, letterSpacing:'0.06em', marginBottom:12 }}>AVOID THESE ANTI-PATTERNS</div>
              {result.data.schema.antiPatterns.map((d, i) => (
                <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <span style={{ color:'#DC2626', fontSize:13 }}>!</span>
                  <span style={{ color:t.sub, fontSize:13 }}>{d}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VALIDATE RESULT */}
      {result?.type === 'validate' && result.data?.review && (
        <div>
          {/* Score */}
          <div style={{ display:'flex', gap:16, marginBottom:20, flexWrap:'wrap' }}>
            <div style={{ background:t.bg, border:t.bdr, borderRadius:12, padding:'20px 28px', textAlign:'center', minWidth:120 }}>
              <div style={{ color: result.data.review.score >= 80 ? '#15803D' : result.data.review.score >= 60 ? '#D97706' : '#DC2626', fontSize:36, fontWeight:800 }}>{result.data.review.score}</div>
              <div style={{ color:t.sub, fontSize:11, fontWeight:600 }}>SCHEMA SCORE</div>
            </div>
            <div style={{ flex:1, background:t.bg, border:t.bdr, borderRadius:12, padding:16 }}>
              <div style={{ color:t.sub, fontSize:11, fontWeight:700, letterSpacing:'0.06em', marginBottom:6 }}>OVERALL ASSESSMENT</div>
              <div style={{ color:t.text, fontSize:13, lineHeight:1.6 }}>{result.data.review.overallAssessment}</div>
            </div>
          </div>

          {/* Issues */}
          {result.data.review.issues?.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ color:t.sub, fontSize:11, fontWeight:700, letterSpacing:'0.06em', marginBottom:10 }}>ISSUES FOUND</div>
              {result.data.review.issues.map((issue, i) => (
                <div key={i} style={{ background:severityBg(issue.severity), border:`1px solid ${severityColor(issue.severity)}30`, borderRadius:10, padding:14, marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ background:severityColor(issue.severity), color:'#FFFFFF', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, textTransform:'uppercase' }}>{issue.severity}</span>
                    <span style={{ color:t.text, fontSize:13, fontWeight:600 }}>{issue.field}</span>
                  </div>
                  <div style={{ color:t.sub, fontSize:12, marginBottom:4 }}>{issue.problem}</div>
                  <div style={{ color: isLight ? '#15803D' : '#00ED64', fontSize:12, fontWeight:500 }}>Fix: {issue.fix}</div>
                </div>
              ))}
            </div>
          )}

          {/* Missing indexes */}
          {result.data.review.missingIndexes?.length > 0 && (
            <div style={{ background:t.bg, border:t.bdr, borderRadius:12, padding:16 }}>
              <div style={{ color:t.sub, fontSize:11, fontWeight:700, letterSpacing:'0.06em', marginBottom:10 }}>MISSING INDEXES</div>
              {result.data.review.missingIndexes.map((idx, i) => (
                <div key={i} style={{ padding:'8px 12px', background:t.card, border:t.cardBdr, borderRadius:8, marginBottom:6 }}>
                  <div style={{ color:isLight ? '#4C1D95' : '#C4B5FD', fontSize:12, fontFamily:'monospace', marginBottom:2 }}>{JSON.stringify(idx.fields)}</div>
                  <div style={{ color:t.sub, fontSize:11 }}>{idx.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}