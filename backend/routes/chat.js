const express = require('express')
const router  = express.Router()
const axios   = require('axios')
const dotenv  = require('dotenv')
dotenv.config()

const AI_URL     = process.env.AI_SERVICE_URL || 'http://localhost:8000'
const GEMINI_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`

// ── Detect if message needs document search ──────────────────────
function needsDocumentSearch(message) {
  const greetings = ['hi', 'hello', 'hey', 'howdy', 'hiya', 'sup', 'what\'s up', 'how are you', 'good morning', 'good afternoon', 'good evening', 'thanks', 'thank you', 'bye', 'goodbye', 'ok', 'okay', 'yes', 'no', 'cool', 'nice', 'great', 'awesome']
  const lower = message.toLowerCase().trim()
  // If it's a short greeting or small talk, skip document search
  if (greetings.some(g => lower === g || lower.startsWith(g + '!') || lower.startsWith(g + '.'))) {
    return false
  }
  // If very short (under 4 words) and no question mark, likely small talk
  const wordCount = lower.split(/\s+/).length
  if (wordCount <= 3 && !lower.includes('?')) return false
  return true
}

// ── Search documents for context ─────────────────────────────────
async function searchDocuments(db, query) {
  try {
    const embedRes = await axios.post(`${AI_URL}/embed`, { text: query }, { timeout: 30000 })
    const embedding = embedRes.data.embedding

    const results = await db.collection('documents').aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: embedding,
          numCandidates: 50,
          limit: 5
        }
      },
      {
        $project: {
          title: 1, content: 1, category: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ]).toArray()

    return results.filter(r => r.score > 0.3)
  } catch (e) {
    console.log('Document search skipped:', e.message)
    return []
  }
}

// ── Build Gemini prompt ───────────────────────────────────────────
function buildPrompt(message, history, docContext) {
  const systemPrompt = `You are Lexa AI, a helpful and friendly conversational assistant built for Lexa — a semantic search engine powered by MongoDB Atlas and Voyage AI.

Your personality:
- Warm, professional, and conversational
- For greetings and small talk: respond naturally and briefly like a friendly assistant
- For document questions: provide detailed, accurate answers using the provided context
- Always stay helpful and engaging

${docContext ? `You have access to the following documents from the user's knowledge base:

${docContext}

When answering questions about these documents, cite sources like [Source 1], [Source 2] etc.
If the documents don't contain relevant information, answer from your general knowledge but mention it.` : 'Answer conversationally. For document-specific questions, let the user know they can upload documents to get accurate answers.'}`

  // Build conversation history for Gemini
  const contents = []

  // Add history (last 10 messages for context)
  const recentHistory = history.slice(-10)
  for (const msg of recentHistory) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })
  }

  // Add current message
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  })

  return { systemPrompt, contents }
}

// ── POST /api/chat ────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const startTime = Date.now()
  try {
    const db = req.app.locals.db
    const { message, history = [] } = req.body

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' })
    }

    if (!GEMINI_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' })
    }

    // ── Decide whether to search documents ──────────────────────
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

    // ── Build and send to Gemini ────────────────────────────────
    const { systemPrompt, contents } = buildPrompt(message, history, docContext)

    const geminiRes = await axios.post(GEMINI_URL, {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    }, { timeout: 30000 })

    const aiText = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!aiText) throw new Error('No response from Gemini')

    const latencyMs = Date.now() - startTime

    // ── Log to history ──────────────────────────────────────────
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
      response: aiText,
      sources:  docResults.map((doc, i) => ({
        id:       i + 1,
        title:    doc.title,
        category: doc.category,
        score:    Math.round((doc.score || 0) * 100)
      })),
      latencyMs,
      usedDocuments: docResults.length > 0
    })

  } catch (err) {
    console.error('Chat error:', err.message)

    if (err.response?.status === 400) {
      return res.status(400).json({ error: 'Invalid request to AI service' })
    }
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'AI service unavailable' })
    }

    res.status(500).json({ error: err.message || 'Chat failed' })
  }
})

module.exports = router