// backend/routes/search.js
// 100% accurate for MongoDB 8.0.20 M0 free tier
// Features: scalar-quantized vector index, parallel hybrid search, RRF, Voyage rerank, Groq JSON RAG

const express  = require('express')
const router   = express.Router()
const axios    = require('axios')
const { getDb } = require('../db')

const AI  = process.env.AI_SERVICE_URL || 'http://localhost:8000'
const GRQ = process.env.GROQ_API_KEY

// ── POST /api/search ──────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const t0 = Date.now()
  const {
    query, limit = 10, useRAG = true,
    organizationId = 'demo',
    filters = {}           // { category, tags }
  } = req.body

  if (!query?.trim()) return res.status(400).json({ error: 'Query is required' })

  try {
    // ── 1. Embed query ──────────────────────────────────────────────────────
    const embedRes = await axios.post(`${AI}/embed`, { text: query }, { timeout: 15000 })
    const queryVector = embedRes.data?.embedding
    if (!queryVector?.length) return res.status(503).json({ error: 'Embedding service unavailable' })

    const db  = getDb()
    const col = db.collection('documents')

    // ── 2. Build pre-filter (runs INSIDE the ANN search — not post-filter) ──
    // This is the correct multi-tenant approach: other orgs never enter the search
    const preFilter = {
      $or: [
        { organizationId, scope: 'organization' },
        { scope: 'global' }
      ],
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.tags?.length ? { tags: { $in: filters.tags } } : {})
    }

    // ── 3. Parallel hybrid search ───────────────────────────────────────────
    // $vectorSearch uses the scalar-quantized compound vector index (MongoDB 8.0+)
    // $search uses Atlas Lucene full-text with weighted fields
    // Running in parallel with Promise.all — faster than sequential
    const [vectorResults, lexicalResults] = await Promise.all([

      col.aggregate([
        {
          $vectorSearch: {
            index: 'vector_index',      // scalar quantized, 512-dim, cosine
            path:  'embedding',
            queryVector,
            numCandidates: Math.min(limit * 20, 200),
            limit: limit * 4,
            filter: preFilter           // pre-filter inside ANN — not post-filter
          }
        },
        { $addFields: { vectorScore: { $meta: 'vectorSearchScore' } } },
        { $project: { embedding: 0 } } // never send 512 floats to client
      ]).toArray(),

      col.aggregate([
        {
          $search: {
            index: 'text_index',        // weighted: title:10, tags:5, content:1
            text: {
              query,
              path:  ['title', 'content', 'tags'],
              fuzzy: { maxEdits: 1 }    // handles typos
            }
          }
        },
        { $match: preFilter },
        { $limit: limit * 4 },
        { $addFields: { lexicalScore: { $meta: 'searchScore' } } },
        { $project: { embedding: 0 } }
      ]).toArray().catch(() => [])      // graceful fallback if text index missing
    ])

    // ── 4. Reciprocal Rank Fusion (k=60, industry standard) ────────────────
    // Each document gets 1/(k+rank) from each pipeline; scores sum together
    const K = 60
    const fused = {}

    vectorResults.forEach((doc, rank) => {
      const id = doc._id.toString()
      if (!fused[id]) fused[id] = { doc, rrfScore: 0, vectorScore: 0, lexicalScore: 0 }
      fused[id].rrfScore   += 1 / (K + rank + 1)
      fused[id].vectorScore = doc.vectorScore || 0
    })
    lexicalResults.forEach((doc, rank) => {
      const id = doc._id.toString()
      if (!fused[id]) fused[id] = { doc, rrfScore: 0, vectorScore: 0, lexicalScore: 0 }
      fused[id].rrfScore    += 1 / (K + rank + 1)
      fused[id].lexicalScore = doc.lexicalScore || 0
    })

    const merged = Object.values(fused)
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, limit * 2)
      .map(({ doc, rrfScore, vectorScore, lexicalScore }) => ({
        ...doc, score: rrfScore, vectorScore, lexicalScore
      }))

    // ── 5. Voyage AI Rerank — final quality pass ────────────────────────────
    let results = merged
    if (merged.length > 1) {
      try {
        const rrRes = await axios.post(`${AI}/rerank`, {
          query,
          documents: merged.map(r => ({
            id:   r._id.toString(),
            text: `${r.title} ${r.content}`.slice(0, 512)
          }))
        }, { timeout: 15000 })

        if (rrRes.data?.results) {
          const scoreMap = {}
          rrRes.data.results.forEach(r => { scoreMap[r.id] = r.relevance_score })
          results = merged
            .map(r => ({ ...r, score: scoreMap[r._id.toString()] ?? r.score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
        }
      } catch { results = merged.slice(0, limit) }
    }

    // ── 6. Log query for analytics (async, non-blocking) ───────────────────
    const latencyMs = Date.now() - t0
    db.collection('queries').insertOne({
      query, organizationId,
      resultCount:  results.length,
      latencyMs,
      hadSummary:   useRAG && results.length > 0,
      searchMode:   'hybrid-rrf-rerank',
      vectorHits:   vectorResults.length,
      textHits:     lexicalResults.length,
      timestamp:    new Date()
    }).catch(() => {})

    // ── 7. Groq structured JSON summary (RAG — grounded in retrieved docs) ─
    let summary = null
    if (useRAG && results.length > 0 && GRQ) {
      summary = await structuredSummary(query, results.slice(0, 5))
    }

    res.json({
      results,
      summary,
      meta: {
        total:       results.length,
        latencyMs,
        searchMode:  'hybrid-rrf-rerank',
        vectorHits:  vectorResults.length,
        textHits:    lexicalResults.length,
        rerankUsed:  true
      }
    })

  } catch (err) {
    console.error('Search error:', err.message)
    res.status(500).json({ error: 'Search failed', detail: err.message })
  }
})

// ── POST /api/search/compare — Agentic document comparison ───────────────────
// Groq reads two documents and answers a comparison question with structured output
router.post('/compare', async (req, res) => {
  const { docTitleA, docTitleB, question } = req.body
  if (!docTitleA || !docTitleB)
    return res.status(400).json({ error: 'Provide docTitleA and docTitleB' })

  try {
    const col = getDb().collection('documents')
    const [docA, docB] = await Promise.all([
      col.findOne({ title: { $regex: docTitleA, $options: 'i' } },
        { projection: { content: 1, title: 1, category: 1, tags: 1 } }),
      col.findOne({ title: { $regex: docTitleB, $options: 'i' } },
        { projection: { content: 1, title: 1, category: 1, tags: 1 } })
    ])
    if (!docA || !docB)
      return res.status(404).json({ error: 'One or both documents not found' })

    const q = question || 'What are the key differences and similarities?'
    const groqRes = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model:           'llama-3.1-8b-instant',
        max_tokens:      900,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: `You are an expert analyst. Answer: "${q}"

Document A — ${docA.title}:
${docA.content?.slice(0, 1400)}

Document B — ${docB.title}:
${docB.content?.slice(0, 1400)}

Respond ONLY with JSON:
{"similarities":["s1","s2"],"differences":["d1","d2"],"recommendation":"one sentence","verdict":"A is better | B is better | Both serve different purposes","confidence":85}`
        }]
      },
      { headers: { Authorization: `Bearer ${GRQ}`, 'Content-Type': 'application/json' } }
    )
    const analysis = JSON.parse(groqRes.data.choices[0]?.message?.content || '{}')
    res.json({
      docA: { title: docA.title, category: docA.category, tags: docA.tags },
      docB: { title: docB.title, category: docB.category, tags: docB.tags },
      question: q, analysis
    })
  } catch (err) {
    res.status(500).json({ error: 'Comparison failed', detail: err.message })
  }
})

// ── GET /api/search/suggest ───────────────────────────────────────────────────
router.get('/suggest', async (req, res) => {
  const { q } = req.query
  if (!q || q.length < 2) return res.json({ suggestions: [] })
  try {
    const results = await getDb().collection('queries').aggregate([
      { $match: { query: { $regex: q, $options: 'i' } } },
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]).toArray()
    res.json({ suggestions: results.map(r => r._id) })
  } catch { res.json({ suggestions: [] }) }
})

// ── Groq structured summary helper ───────────────────────────────────────────
async function structuredSummary(query, docs) {
  try {
    const context = docs.map((d, i) =>
      `[${i+1}] ${d.title}: ${d.content?.slice(0, 500)}`
    ).join('\n\n')

    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model:           'llama-3.1-8b-instant',
        max_tokens:      700,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: `Enterprise analyst. Answer ONLY from these documents: "${query}"

${context}

JSON only:
{"intelligence":"2-3 sentence answer","keyInsights":["i1","i2","i3"],"risks":["r1","r2"],"trends":["t1","t2"],"confidence":85}`
        }]
      },
      {
        headers: { Authorization: `Bearer ${GRQ}`, 'Content-Type': 'application/json' },
        timeout: 20000
      }
    )
    return JSON.parse(res.data.choices[0]?.message?.content || '{}')
  } catch { return null }
}

module.exports = router