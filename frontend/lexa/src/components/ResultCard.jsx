import { useState } from 'react'

export default function ResultCard({ result, index }) {
  const [expanded, setExpanded] = useState(false)

  const vectorScore  = Math.round((result.vectorScore  || 0) * 100)
  const lexicalScore = Math.round((result.lexicalScore || 0) * 100)
  const rrfScore     = Math.round((result.score        || 0) * 100)

  return (
    <div
      className={`result-card stagger-${Math.min(index+1,6)}`}
      onClick={() => setExpanded(e => !e)}
      style={{cursor:'pointer'}}
    >
      <div className="result-inner">
        <div className="result-rank">
          <div className="rank-num">{index + 1}</div>
          <div className="rank-pct" style={{color: rrfScore > 60 ? '#00ED64' : '#A855F7'}}>
            {rrfScore}%
          </div>
        </div>

        <div className="result-content">
          <div className="result-header">
            <div className="result-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13,color:'#A78BFA',flexShrink:0}}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              {result.title}
              {result.chunk_index !== undefined && (
                <span className="chunk-label">· chunk {result.chunk_index + 1}</span>
              )}
            </div>
            <div className="pills-row">
              {result.category && <span className="pill-cat">{result.category}</span>}
              {result.tags?.[0] && <span className="pill-tag">{result.tags[0]}</span>}
            </div>
          </div>

          <div className="result-text">
            {expanded
              ? result.content
              : (result.content?.slice(0, 220) + (result.content?.length > 220 ? '...' : ''))}
          </div>

          <div className="score-bars">
            <div className="score-row">
              <span className="score-label">Vector</span>
              <div className="score-track">
                <div className="score-fill green" style={{width:`${vectorScore}%`}} />
              </div>
              <span className="score-val green">{vectorScore}%</span>
            </div>
            <div className="score-row">
              <span className="score-label">Lexical</span>
              <div className="score-track">
                <div className="score-fill purple" style={{width:`${lexicalScore}%`}} />
              </div>
              <span className="score-val purple">{lexicalScore}%</span>
            </div>
          </div>
        </div>

        <button className="result-expand-btn" onClick={e => { e.stopPropagation(); setExpanded(x => !x) }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16,transform: expanded?'rotate(180deg)':'none', transition:'transform 0.2s'}}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
