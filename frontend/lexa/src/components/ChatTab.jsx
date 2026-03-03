import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const SUGGESTIONS = [
  'What documents do I have?',
  'Summarize my uploaded content',
  'What are the key risks mentioned?',
  'Find information about machine learning'
]

export default function ChatTab() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Hi! I am Lexa AI. I can answer questions about your uploaded documents or just have a conversation. How can I help you?',
    sources: []
  }])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    const updatedMessages = [...messages, { role: 'user', content: msg, sources: [] }]
    setMessages(updatedMessages)
    setLoading(true)
    try {
      const history = updatedMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))
      const res = await axios.post(`${API}/chat`, { message: msg, history })
      setMessages(prev => [...prev, {
        role: 'assistant', content: res.data.response,
        sources: res.data.sources || [], latencyMs: res.data.latencyMs
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err.response?.data?.error || 'Something went wrong. Please try again.',
        sources: [], isError: true
      }])
    } finally { setLoading(false); inputRef.current?.focus() }
  }

  const clearChat = () => setMessages([{
    role: 'assistant', content: 'Chat cleared. How can I help you?', sources: []
  }])

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 24px 120px', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h2 style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 22, margin: 0 }}>Lexa AI Chat</h2>
          <p style={{ color: '#7C6FA0', fontSize: 13, margin: '4px 0 0' }}>Conversational RAG powered by MongoDB Atlas + Gemini</p>
        </div>
        <button onClick={clearChat} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>Clear Chat</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#00B4A0,#00ED64)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#001E2B', fontWeight: 800, fontSize: 12, marginRight: 10, marginTop: 4 }}>L</div>
            )}
            <div style={{ maxWidth: '72%' }}>
              {msg.role === 'assistant' && <div style={{ color: '#00ED64', fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: '0.06em' }}>LEXA AI</div>}
              <div style={{
                background: msg.role === 'user' ? 'linear-gradient(135deg,#7C3AED,#A855F7)' : msg.isError ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                border: msg.role === 'user' ? 'none' : msg.isError ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                padding: '12px 16px', color: '#FFFFFF', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap'
              }}>{msg.content}</div>
              {msg.sources?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ color: '#7C6FA0', fontSize: 11, marginBottom: 6 }}>Sources used:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {msg.sources.map((src, si) => (
                      <span key={si} style={{ background: 'rgba(0,237,100,0.1)', border: '1px solid rgba(0,237,100,0.2)', borderRadius: 20, padding: '3px 10px', color: '#00ED64', fontSize: 11 }}>
                        [{src.id}] {src.title} ({src.score}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {msg.latencyMs && <div style={{ color: '#4B4565', fontSize: 10, marginTop: 6 }}>{msg.latencyMs}ms</div>}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#00B4A0,#00ED64)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#001E2B', fontWeight: 800, fontSize: 12 }}>L</div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px 18px 18px 18px', padding: '14px 18px', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#A855F7', animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
              <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:0.4} 30%{transform:translateY(-6px);opacity:1} }`}</style>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && !loading && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, marginBottom: 16 }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)} style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20, padding: '6px 14px', color: '#C4B5FD', fontSize: 12, cursor: 'pointer' }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px 24px', background: 'linear-gradient(transparent, #050010 30%)', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 860, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Ask anything... or just say hi!"
            rows={1}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 14, padding: '12px 16px', color: '#FFFFFF', fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', maxHeight: 120, overflowY: 'auto' }}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ background: loading || !input.trim() ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg,#7C3AED,#A855F7)', border: 'none', borderRadius: 12, padding: '12px 24px', color: '#FFFFFF', fontWeight: 700, fontSize: 14, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer' }}>
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </main>
  )
}