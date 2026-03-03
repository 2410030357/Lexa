const express = require('express')
const router  = express.Router()
const axios   = require('axios')
const dotenv  = require('dotenv')
dotenv.config()

const AI_URL     = process.env.AI_SERVICE_URL || 'http://localhost:8000'
const GEMINI_KEY = process.env.GEMINI_API_KEY

// Use gemini-2.0-flash (confirmed available from ListModels)
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`

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

    if (!GEMINI_KEY) {
      console.error('GEMINI_API_KEY not set!')
      return res.status(500).json({ error: 'Gemini API key not configured' })
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

    // Build conversation
    const contents = []
    history.slice(-10).forEach(msg => {
      contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })
    })
    contents.push({ role: 'user', parts: [{ text: message }] })

    // Call Gemini 2.0 Flash
    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1024 }
      },
      { timeout: 30000 }
    )

    const aiText = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!aiText) throw new Error('No response from Gemini')

    const latencyMs = Date.now() - startTime

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