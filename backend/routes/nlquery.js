const express = require('express')
const router  = express.Router()
const axios   = require('axios')

const GRQ = process.env.GROQ_API_KEY

router.post('/', async (req, res) => {
  const { question, organizationId = 'demo' } = req.body
  if (!question?.trim()) return res.status(400).json({ error: 'Question is required' })

  const db = req.app.locals.db
  try {
    const [docStats, queryCount] = await Promise.all([
      db.collection('documents').aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]).toArray(),
      db.collection('queries').countDocuments()
    ])

    const dbContext = `Collections: documents (title, content, category, tags, organizationId, scope, word_count, createdAt, chunk_index), queries (query, resultCount, latencyMs, searchMode, timestamp, organizationId). Categories: ${docStats.map(d => `${d._id}(${d.count})`).join(', ')}. Total searches: ${queryCount}. organizationId: "${organizationId}"`

    const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant', max_tokens: 800, response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: `MongoDB expert. Convert to aggregation pipeline.\n\n${dbContext}\n\nQuestion: "${question}"\n\nRules: only use listed fields, filter by organizationId, limit 20.\n\nJSON: {"collection":"documents or queries","pipeline":[...stages...],"explanation":"plain english","resultType":"count|list|stat"}` }]
    }, { headers: { Authorization: `Bearer ${GRQ}`, 'Content-Type': 'application/json' }, timeout: 20000 })

    const parsed = JSON.parse(groqRes.data.choices[0]?.message?.content || '{}')
    if (!parsed.pipeline || !parsed.collection) {
      return res.json({ question, answer: "I couldn't generate a valid query. Try: 'How many documents do I have?' or 'What are my top 5 searched queries?'", results: [], explanation: null })
    }

    const results = await db.collection(parsed.collection).aggregate(parsed.pipeline).toArray()

    const summaryRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant', max_tokens: 200,
      messages: [{ role: 'user', content: `Question: "${question}"\nResults: ${JSON.stringify(results.slice(0, 10))}\n\nAnswer in 1-2 clear sentences with specific numbers.` }]
    }, { headers: { Authorization: `Bearer ${GRQ}`, 'Content-Type': 'application/json' }, timeout: 15000 })

    res.json({ question, answer: summaryRes.data.choices[0]?.message?.content || 'Done.', explanation: parsed.explanation, results: results.slice(0, 20), pipeline: parsed.pipeline, collection: parsed.collection, resultType: parsed.resultType })
  } catch (err) { res.status(500).json({ error: 'Query failed', detail: err.message }) }
})

module.exports = router