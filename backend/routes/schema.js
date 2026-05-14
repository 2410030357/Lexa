const express = require('express')
const router  = express.Router()
const axios   = require('axios')

const GRQ = process.env.GROQ_API_KEY

router.post('/design', async (req, res) => {
  const { useCase, requirements } = req.body
  if (!useCase?.trim()) return res.status(400).json({ error: 'Use case description is required' })
  try {
    const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant', max_tokens: 2000, response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: `Senior MongoDB architect. Design production-grade schema.\n\nUse Case: ${useCase}\nRequirements: ${requirements || 'None'}\n\nJSON only:\n{"collections":[{"name":"name","purpose":"what it stores","schema":{"field":{"type":"String|Number|Date|Boolean|ObjectId|Array|Object","required":true,"description":"what it stores","example":"example"}},"indexes":[{"fields":{"field":1},"options":{},"reason":"why needed"}],"relationships":["relates to X via field"]}],"vectorSearchIndex":{"recommended":true,"collection":"name","field":"embedding","dimensions":512,"similarity":"cosine","reason":"why vector search helps"},"designDecisions":["decision 1"],"antiPatterns":["avoid this"],"estimatedDocumentSize":"~2KB","scalabilityNotes":"how it scales"}` }]
    }, { headers: { Authorization: `Bearer ${GRQ}`, 'Content-Type': 'application/json' }, timeout: 30000 })
    const schema = JSON.parse(groqRes.data.choices[0]?.message?.content || '{}')
    res.json({ schema, useCase, generatedAt: new Date() })
  } catch (err) { res.status(500).json({ error: 'Schema generation failed', detail: err.message }) }
})

router.post('/validate', async (req, res) => {
  const { schema, useCase } = req.body
  if (!schema) return res.status(400).json({ error: 'Schema is required' })
  try {
    const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant', max_tokens: 1200, response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: `MongoDB architect reviewing schema.\n\nUse Case: ${useCase || 'Not specified'}\nSchema:\n${typeof schema === 'string' ? schema : JSON.stringify(schema, null, 2)}\n\nJSON only:\n{"score":85,"issues":[{"severity":"critical|warning|suggestion","field":"field name","problem":"what is wrong","fix":"exact fix"}],"missingIndexes":[{"fields":{"field":1},"reason":"why needed"}],"vectorSearchOpportunity":"yes or no and why","overallAssessment":"2-3 sentence honest review"}` }]
    }, { headers: { Authorization: `Bearer ${GRQ}`, 'Content-Type': 'application/json' }, timeout: 25000 })
    res.json({ review: JSON.parse(groqRes.data.choices[0]?.message?.content || '{}') })
  } catch (err) { res.status(500).json({ error: 'Validation failed', detail: err.message }) }
})

module.exports = router