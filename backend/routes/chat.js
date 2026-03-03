const express = require('express')
const router  = express.Router()
const axios   = require('axios')
const dotenv  = require('dotenv')
dotenv.config()

const AI_URL     = process.env.AI_SERVICE_URL || 'http://localhost:8000'
const GEMINI_KEY = process.env.GEMINI_API_KEY

// Try gemini-2.0-flash first, fallback to 1.5-flash
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-pro'
]

function getGeminiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`
}

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

    const results = await db.collection('documents').aggregate([
      {
        $vectorSearch: {
          index:         'vector_index',
          path:          'embedding',
          queryVector:   embedding,
          numCandidates: 50,
          limit:         5
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

async function callGemini(systemPrompt, contents) {
  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  }

  // Try each model until one works
  for (const model of GEMINI_MODELS) {
    try {
      const res = await axios.post(getGeminiUrl(model), payload, { timeout: 30000 })
      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) {
        console.log(`Gemini responded with model: ${model}`)
        return text
      }
    } catch (e) {
      console.log(`Model ${model} failed: ${e.response?.status} ${e.message}`)
      if (e.response?.status === 400) throw e // Bad request — stop trying
      // 404 = model not found, try next
      continue
    }
  }
  throw new Error('All Gemini models failed')
}

router.post('/', async (req, res) => {
  const startTime = Date.now()
  try {
    const db = req.app.locals.db
    const { message, history = [] } = req.body

    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' })

    if (!GEMINI_KEY) {
      console.error('GEMINI_API_KEY is not set in environment variables!')
      return res.status(500).json({ error: 'Gemini API key not configured on server' })
    }

    console.log(`Chat request: "${message.slice(0, 50)}" | Key starts with: ${GEMINI_KEY.slice(0, 10)}...`)

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

    const systemPrompt = `You are Lexa AI, a helpful and friendly assistant for Lexa — a semantic search engine powered by MongoDB Atlas and Voyage AI.

Your personality:
- Warm, professional, and conversational
- For greetings and small talk: respond naturally and briefly
- For document questions: provide detailed, accurate answers using the provided context
- Always stay helpful and engaging

${docContext ? `You have access to the following documents from the user's knowledge base:\n\n${docContext}\n\nCite sources like [Source 1], [Source 2] etc. If documents don't contain relevant info, answer from general knowledge and mention it.` : 'Answer conversationally. For document questions, suggest the user upload relevant documents.'}`

    // Build conversation contents
    const contents = []
    const recentHistory = history.slice(-10)
    for (const msg of recentHistory) {
      contents.push({
        role:  msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })
    }
    contents.push({ role: 'user', parts: [{ text: message }] })

    // Call Gemini with automatic model fallback
    const aiText    = await callGemini(systemPrompt, contents)
    const latencyMs = Date.now() - startTime

    // Log
    try {
      await db.collection('chat_history').insertOne({
        userMessage: message,
        aiResponse:  aiText.slice(0, 500),
        sources:     docResults.length,
        latencyMs,
        timestamp:   new Date()
      })
    } catch (e) {}

    res.json({
      response:      aiText,
      sources:       docResults.map((doc, i) => ({
        id: i + 1, title: doc.title, category: doc.category,
        score: Math.round((doc.score || 0) * 100)
      })),
      latencyMs,
      usedDocuments: docResults.length > 0
    })

  } catch (err) {
    console.error('Chat error:', err.response?.data || err.message)
    res.status(500).json({
      error: 'Chat failed. Make sure GEMINI_API_KEY is set in Render environment variables.'
    })
  }
})

module.exports = router