import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const DEMOS = [
  {
    id: 1,
    label: 'Medical Terminology',
    category: 'Medical',
    userQuery: 'heart attack symptoms',
    description: 'User types casual language — Lexa finds clinical documents',
    highlight: 'Different words, same meaning — only semantic search finds it'
  },
  {
    id: 2,
    label: 'HR Policy',
    category: 'HR',
    userQuery: 'work from home rules',
    description: 'Employee searches informally — Lexa finds formal policy document',
    highlight: 'No keyword overlap at all — pure vector similarity match'
  },
  {
    id: 3,
    label: 'Finance',
    category: 'Finance',
    userQuery: 'economic recession',
    description: 'Analyst searches concept — finds crisis documents automatically',
    highlight: 'Concept-level matching across financial terminology'
  },
  {
    id: 4,
    label: 'Technology',
    category: 'Technology',
    userQuery: 'machines that learn',
    description: 'Non-technical user finds technical AI documents',
    highlight: 'Plain English query to technical document — semantic bridge'
  }
]

// Category color map
const CAT_COLOR = {
  Medical:    '#00ED64',
  HR:         '#A855F7',
  Finance:    '#FBBF24',
  Technology: '#3B82F6'
}

export default function DemoPanel({ onSearch }) {
  const [activeDemo, setActiveDemo] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [results, setResults]       = useState(null)

  const runDemo = async (demo) => {
    setActiveDemo(demo.id)
    setLoading(true)
    setResults(null)
    try {
      const res = await axios.post(`${API}/search`, {
        query: demo.userQuery, limit: 3, useRAG: false
      })
      setResults({ demo, data: res.data })
    } catch (e) {
      setResults({ demo, error: 'Search failed — make sure services are running' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(124,58,237,0.2)',
      borderRadius: 16, padding: '28px 32px', marginBottom: 24
    }}>
      {/* Header — no hyphens, no emojis */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            background: 'linear-gradient(135deg,#7C3AED,#A855F7)',
            borderRadius: 8, padding: '6px 12px',
            color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.04em'
          }}>LIVE</div>
          <div>
            <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 16 }}>
              Live Demo: Semantic vs Keyword Search
            </div>
            <div style={{ color: '#7C6FA0', fontSize: 12, marginTop: 2 }}>
              Click any example to see why Lexa finds what traditional search misses
            </div>
          </div>
        </div>
      </div>

      {/* Demo buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 24 }}>
        {DEMOS.map(demo => (
          <button
            key={demo.id}
            onClick={() => runDemo(demo)}
            style={{
              background: activeDemo === demo.id
                ? 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(168,85,247,0.2))'
                : 'rgba(255,255,255,0.03)',
              border: activeDemo === demo.id
                ? '1px solid rgba(168,85,247,0.6)'
                : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '14px 16px',
              textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {/* Category tag */}
            <div style={{
              display: 'inline-block',
              background: `${CAT_COLOR[demo.category]}18`,
              color: CAT_COLOR[demo.category],
              fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 20,
              marginBottom: 6, letterSpacing: '0.06em'
            }}>
              {demo.category.toUpperCase()}
            </div>
            <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
              {demo.label}
            </div>
            <div style={{
              fontFamily: 'monospace', color: '#00ED64', fontSize: 12,
              background: 'rgba(0,237,100,0.08)', padding: '3px 8px',
              borderRadius: 6, display: 'inline-block', marginBottom: 6
            }}>
              "{demo.userQuery}"
            </div>
            <div style={{ color: '#7C6FA0', fontSize: 11, lineHeight: 1.4 }}>
              {demo.description}
            </div>
          </button>
        ))}
      </div>

      {/* Loading — spinner, no emoji */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '32px', color: '#A855F7' }}>
          <div style={{
            width: 32, height: 32, border: '3px solid rgba(168,85,247,0.2)',
            borderTopColor: '#A855F7', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
          }} />
          <div style={{ fontSize: 14 }}>Running semantic search...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div style={{
          background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 20,
          border: '1px solid rgba(0,237,100,0.15)'
        }}>
          {results.error ? (
            <div style={{ color: '#EF4444', fontSize: 13 }}>
              <span style={{ marginRight: 6 }}>!</span>{results.error}
            </div>
          ) : (
            <>
              {/* What happened */}
              <div style={{
                background: 'rgba(0,237,100,0.08)', border: '1px solid rgba(0,237,100,0.2)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 16
              }}>
                <div style={{ color: '#00ED64', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
                  WHAT JUST HAPPENED
                </div>
                <div style={{ color: '#E2D9F3', fontSize: 13, lineHeight: 1.5 }}>
                  You searched{' '}
                  <span style={{ color: '#00ED64', fontWeight: 600, fontFamily: 'monospace' }}>
                    "{results.demo.userQuery}"
                  </span>{' '}
                  — Lexa found{' '}
                  <strong style={{ color: '#FFFFFF' }}>{results.data.meta?.total || 0} documents</strong>{' '}
                  in{' '}
                  <strong style={{ color: '#A855F7' }}>{results.data.meta?.latencyMs}ms</strong>{' '}
                  using <strong style={{ color: '#00ED64' }}>hybrid search</strong>.
                </div>
                <div style={{ color: '#C4B5FD', fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
                  {results.demo.highlight}
                </div>
              </div>

              {/* Comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, padding: '10px 14px'
                }}>
                  <div style={{ color: '#EF4444', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                    Traditional Keyword Search
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: 12 }}>
                    Searching for exact words: "{results.demo.userQuery}"<br />
                    <strong style={{ color: '#EF4444' }}>0 results found</strong> — document uses different terminology
                  </div>
                </div>
                <div style={{
                  background: 'rgba(0,237,100,0.08)', border: '1px solid rgba(0,237,100,0.2)',
                  borderRadius: 8, padding: '10px 14px'
                }}>
                  <div style={{ color: '#00ED64', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                    Lexa Hybrid Semantic Search
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: 12 }}>
                    Understanding meaning + keywords<br />
                    <strong style={{ color: '#00ED64' }}>
                      {results.data.meta?.total} results found
                    </strong> — matched by concept
                  </div>
                </div>
              </div>

              {/* Top result */}
              {results.data.results?.[0] && (
                <div>
                  <div style={{ color: '#7C6FA0', fontSize: 11, marginBottom: 8, fontWeight: 600 }}>
                    TOP RESULT
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    borderRadius: 8, padding: '12px 14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{
                        width: 20, height: 20, background: 'rgba(124,58,237,0.2)',
                        borderRadius: 4, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 10, color: '#A855F7'
                      }}>D</div>
                      <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 13 }}>
                        {results.data.results[0].title}
                      </div>
                    </div>
                    <div style={{ color: '#C4B5FD', fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>
                      {results.data.results[0].content?.slice(0, 150)}...
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ color: '#7C6FA0', fontSize: 10, width: 50 }}>Vector</span>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.round((results.data.results[0].vectorScore || 0) * 100)}%`,
                            height: '100%', background: '#00ED64', borderRadius: 2
                          }} />
                        </div>
                        <span style={{ color: '#00ED64', fontSize: 10, width: 30 }}>
                          {Math.round((results.data.results[0].vectorScore || 0) * 100)}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#7C6FA0', fontSize: 10, width: 50 }}>Lexical</span>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.round((results.data.results[0].lexicalScore || 0) * 100)}%`,
                            height: '100%', background: '#A855F7', borderRadius: 2
                          }} />
                        </div>
                        <span style={{ color: '#A855F7', fontSize: 10, width: 30 }}>
                          {Math.round((results.data.results[0].lexicalScore || 0) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => onSearch(results.demo.userQuery)}
                style={{
                  marginTop: 14, width: '100%',
                  background: 'linear-gradient(135deg,#7C3AED,#A855F7)',
                  border: 'none', borderRadius: 10,
                  color: '#FFFFFF', fontWeight: 600, fontSize: 13,
                  padding: '10px', cursor: 'pointer'
                }}
              >
                Open Full Search Results
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}