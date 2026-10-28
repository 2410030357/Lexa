const express = require('express')
const router  = express.Router()
const axios   = require('axios')
const dotenv  = require('dotenv')
dotenv.config()

const AI_URL   = process.env.AI_SERVICE_URL || 'http://localhost:8000'
const GROQ_KEY = process.env.GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL    = 'llama-3.1-8b-instant'

function needsDocumentSearch(message) {
  const greetings = ['hi','hello','hey','howdy','hiya','sup','thanks','thank you','bye','goodbye','ok','okay','yes','no','cool','nice','great','awesome']
  const lower = message.toLowerCase().trim()
  if (greetings.some(g => lower === g || lower.startsWith(g + '!') || lower.startsWith(g + '.'))) return false
  if (lower.split(/\s+/).length <= 3 && !lower.includes('?')) return false
  return true
}

async function searchDocuments(db, query) {
  try {
    const embedRes  = await axios.post(`${AI_URL}/embed`, { text: query }, { timeout: 30000 })
    const embedding = embedRes.data.embedding
    const results   = await db.collection('documents').aggregate([
      {
        $vectorSearch: {
          index: 'vector_index', path: 'embedding',
          queryVector: embedding, numCandidates: 50, limit: 5
        }
      },
      { $project: { title: 1, content: 1, category: 1, score: { $meta: 'vectorSearchScore' } } }
    ]).toArray()
    return results.filter(r => r.score > 0.3)
  } catch (e) {
    console.log('Document search skipped:', e.message)
    return []
  }
}

router.post('/', async (req, res) => {
  const startTime = Date.now()
  try {
    const db = req.app.locals.db
    const { message, history = [] } = req.body

    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' })

    if (!GROQ_KEY) {
      console.error('GROQ_API_KEY not set!')
      return res.status(500).json({ error: 'Groq API key not configured' })
    }

    // Search documents if needed
    const shouldSearch = needsDocumentSearch(message)
    let docResults = []
    let docContext = null
    if (shouldSearch) {
      docResults = await searchDocuments(db, message)
      if (docResults.length > 0) {
        docContext = docResults.map((doc, i) =>
          `[Source ${i + 1}] ${doc.title}\n${doc.content.slice(0, 600)}`
        ).join('\n\n')
      }
    }

    const systemPrompt = `You are Lexa AI, a helpful assistant for Lexa — a semantic search engine powered by MongoDB Atlas and Voyage AI.
- For greetings: respond naturally and briefly
- For document questions: provide detailed answers using the context below
- Always be warm and professional
${docContext
  ? `\nDocuments from user's knowledge base:\n\n${docContext}\n\nCite sources as [Source 1], [Source 2] etc.`
  : '\nNo documents found. Answer from general knowledge or suggest uploading relevant documents.'
}`

    // Build messages for Groq (OpenAI format)
    const messages = [{ role: 'system', content: systemPrompt }]
    history.slice(-10).forEach(msg => {
      messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content })
    })
    messages.push({ role: 'user', content: message })

    // Call Groq
    const groqRes = await axios.post(GROQ_URL, {
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens:  1024
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type':  'application/json'
      },
      timeout: 30000
    })

    const aiText = groqRes.data?.choices?.[0]?.message?.content
    if (!aiText) throw new Error('No response from Groq')

    const latencyMs = Date.now() - startTime
    console.log(`Chat OK: ${latencyMs}ms | model: ${MODEL}`)

    try {
      await db.collection('chat_history').insertOne({
        userMessage: message, aiResponse: aiText.slice(0, 500),
        sources: docResults.length, latencyMs, timestamp: new Date()
      })
    } catch (e) {}

    res.json({
      response: aiText,
      sources: docResults.map((doc, i) => ({
        id: i + 1, title: doc.title, category: doc.category,
        score: Math.round((doc.score || 0) * 100)
      })),
      latencyMs,
      usedDocuments: docResults.length > 0
    })

  } catch (err) {
    console.error('Chat error:', err.response?.data || err.message)
    res.status(500).json({ error: err.response?.data?.error?.message || err.message || 'Chat failed' })
  }
})

module.exports = router
