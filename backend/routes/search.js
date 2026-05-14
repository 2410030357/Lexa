const express  = require('express')
const router   = express.Router()
const axios    = require('axios')

const AI  = process.env.AI_SERVICE_URL || 'http://localhost:8000'
const GRQ = process.env.GROQ_API_KEY

router.post('/', async (req, res) => {
  const t0 = Date.now()
  const { query, limit = 10, useRAG = true, organizationId = 'demo', filters = {} } = req.body
  if (!query?.trim()) return res.status(400).json({ error: 'Query is required' })

  const db  = req.app.locals.db
  const col = db.collection('documents')

  try {
    const embedRes = await axios.post(`${AI}/embed`, { text: query }, { timeout: 15000 })
    const queryVector = embedRes.data?.embedding
    if (!queryVector?.length) return res.status(503).json({ error: 'Embedding service unavailable' })

    const preFilter = {
      $or: [
        { organizationId, scope: 'organization' },
        { scope: 'global' }
      ],
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.tags?.length ? { tags: { $in: filters.tags } } : {})
    }

    const [vectorResults, lexicalResults] = await Promise.all([
      col.aggregate([
        { $vectorSearch: { index: 'vector_index', path: 'embedding', queryVector, numCandidates: Math.min(limit * 20, 200), limit: limit * 4, filter: preFilter } },
        { $addFields: { vectorScore: { $meta: 'vectorSearchScore' } } },
        { $project: { embedding: 0 } }
      ]).toArray(),

      col.aggregate([
        { $search: { index: 'text_index', text: { query, path: ['title', 'content', 'tags'], fuzzy: { maxEdits: 1 } } } },
        { $match: preFilter },
        { $limit: limit * 4 },
        { $addFields: { lexicalScore: { $meta: 'searchScore' } } },
        { $project: { embedding: 0 } }
      ]).toArray().catch(() => [])
    ])

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
      .map(({ doc, rrfScore, vectorScore, lexicalScore }) => ({ ...doc, score: rrfScore, vectorScore, lexicalScore }))

    let results = merged
    if (merged.length > 1) {
      try {
        const rrRes = await axios.post(`${AI}/rerank`, {
          query,
          documents: merged.map(r => ({ id: r._id.toString(), text: `${r.title} ${r.content}`.slice(0, 512) }))
        }, { timeout: 15000 })
        if (rrRes.data?.results) {
          const sm = {}
          rrRes.data.results.forEach(r => { sm[r.id] = r.relevance_score })
          results = merged.map(r => ({ ...r, score: sm[r._id.toString()] ?? r.score })).sort((a, b) => b.score - a.score).slice(0, limit)
        }
      } catch { results = merged.slice(0, limit) }
    }

    const latencyMs = Date.now() - t0
    db.collection('queries').insertOne({ query, organizationId, resultCount: results.length, latencyMs, hadSummary: useRAG && results.length > 0, searchMode: 'hybrid-rrf-rerank', vectorHits: vectorResults.length, textHits: lexicalResults.length, timestamp: new Date() }).catch(() => {})

    let summary = null
    if (useRAG && results.length > 0 && GRQ) summary = await structuredSummary(query, results.slice(0, 5))

    res.json({ results, summary, meta: { total: results.length, latencyMs, searchMode: 'hybrid-rrf-rerank', vectorHits: vectorResults.length, textHits: lexicalResults.length, rerankUsed: true } })
  } catch (err) {
    console.error('Search error:', err.message)
    res.status(500).json({ error: 'Search failed', detail: err.message })
  }
})

router.post('/compare', async (req, res) => {
  const { docTitleA, docTitleB, question } = req.body
  if (!docTitleA || !docTitleB) return res.status(400).json({ error: 'Provide docTitleA and docTitleB' })
  const col = req.app.locals.db.collection('documents')
  try {
    const [docA, docB] = await Promise.all([
      col.findOne({ title: { $regex: docTitleA, $options: 'i' } }, { projection: { content: 1, title: 1, category: 1 } }),
      col.findOne({ title: { $regex: docTitleB, $options: 'i' } }, { projection: { content: 1, title: 1, category: 1 } })
    ])
    if (!docA || !docB) return res.status(404).json({ error: 'One or both documents not found' })
    const q = question || 'What are the key differences and similarities?'
    const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant', max_tokens: 900, response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: `Compare these two documents and answer: "${q}"\n\nDoc A — ${docA.title}:\n${docA.content?.slice(0,1400)}\n\nDoc B — ${docB.title}:\n${docB.content?.slice(0,1400)}\n\nJSON only: {"similarities":["s1"],"differences":["d1"],"recommendation":"one sentence","verdict":"A is better | B is better | Both serve different purposes","confidence":85}` }]
    }, { headers: { Authorization: `Bearer ${GRQ}`, 'Content-Type': 'application/json' } })
    res.json({ docA: { title: docA.title, category: docA.category }, docB: { title: docB.title, category: docB.category }, question: q, analysis: JSON.parse(groqRes.data.choices[0]?.message?.content || '{}') })
  } catch (err) { res.status(500).json({ error: 'Comparison failed', detail: err.message }) }
})

router.get('/suggest', async (req, res) => {
  const { q } = req.query
  if (!q || q.length < 2) return res.json({ suggestions: [] })
  try {
    const results = await req.app.locals.db.collection('queries').aggregate([
      { $match: { query: { $regex: q, $options: 'i' } } },
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 6 }
    ]).toArray()
    res.json({ suggestions: results.map(r => r._id) })
  } catch { res.json({ suggestions: [] }) }
})

async function structuredSummary(query, docs) {
  try {
    const context = docs.map((d, i) => `[${i+1}] ${d.title}: ${d.content?.slice(0,500)}`).join('\n\n')
    const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant', max_tokens: 700, response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: `Answer ONLY from these documents: "${query}"\n\n${context}\n\nJSON only: {"intelligence":"2-3 sentence answer","keyInsights":["i1","i2","i3"],"risks":["r1","r2"],"trends":["t1","t2"],"confidence":85}` }]
    }, { headers: { Authorization: `Bearer ${GRQ}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return JSON.parse(groqRes.data.choices[0]?.message?.content || '{}')
  } catch { return null }
}

module.exports = router