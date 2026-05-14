const express = require('express')
const router  = express.Router()
const axios   = require('axios')

const AI = process.env.AI_SERVICE_URL || 'http://localhost:8000'

router.get('/stats', async (req, res) => {
  try {
    const db = req.app.locals.db
    const [result] = await db.collection('documents').aggregate([{
      $facet: {
        totalChunks:    [{ $count: 'n' }],
        uniqueDocs:     [{ $group: { _id: '$title' } }, { $count: 'n' }],
        categories:     [{ $group: { _id: '$category' } }, { $count: 'n' }],
        byCategory:     [{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]
      }
    }]).toArray()
    res.json({ totalDocuments: result.uniqueDocs[0]?.n || 0, totalChunks: result.totalChunks[0]?.n || 0, categoriesCount: result.categories[0]?.n || 0, byCategory: result.byCategory })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/related/:title', async (req, res) => {
  try {
    const db  = req.app.locals.db
    const col = db.collection('documents')
    const sourceDoc = await col.findOne({ title: { $regex: req.params.title, $options: 'i' } }, { projection: { embedding: 1, title: 1, organizationId: 1, scope: 1, category: 1 } })
    if (!sourceDoc?.embedding) return res.status(404).json({ error: 'Document not found or not yet embedded' })
    const related = await col.aggregate([
      { $vectorSearch: { index: 'vector_index', path: 'embedding', queryVector: sourceDoc.embedding, numCandidates: 50, limit: 6, filter: { $or: [{ organizationId: sourceDoc.organizationId, scope: 'organization' }, { scope: 'global' }] } } },
      { $match: { title: { $ne: sourceDoc.title } } },
      { $limit: 5 },
      { $addFields: { similarityScore: { $meta: 'vectorSearchScore' } } },
      { $project: { embedding: 0, title: 1, category: 1, tags: 1, content: { $substr: ['$content', 0, 150] }, similarityScore: 1 } }
    ]).toArray()
    res.json({ source: { title: sourceDoc.title, category: sourceDoc.category }, related, total: related.length })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/', async (req, res) => {
  try {
    const docs = await req.app.locals.db.collection('documents').aggregate([
      { $group: { _id: '$title', chunks: { $sum: 1 }, category: { $first: '$category' }, tags: { $first: '$tags' }, totalWords: { $sum: '$word_count' }, preview: { $first: { $substr: ['$content', 0, 120] } }, createdAt: { $first: '$createdAt' } } },
      { $sort: { createdAt: -1 } }
    ]).toArray()
    res.json({ documents: docs })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:title', async (req, res) => {
  try {
    const result = await req.app.locals.db.collection('documents').deleteMany({ title: decodeURIComponent(req.params.title) })
    res.json({ deleted: result.deletedCount })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/ingest', async (req, res) => {
  const { title, content, category = 'General', tags = [], organizationId = 'demo', scope = 'organization' } = req.body
  if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: 'title and content are required' })
  try {
    const ingestRes = await axios.post(`${AI}/ingest`, { title: title.trim(), content: content.trim(), category, tags, organizationId, scope }, { timeout: 120000 })
    res.json(ingestRes.data)
  } catch (err) { res.status(500).json({ error: err.response?.data?.error || err.message }) }
})

router.post('/bulk', async (req, res) => {
  const { files, category = 'General', organizationId = 'demo' } = req.body
  if (!files?.length) return res.status(400).json({ error: 'No files provided' })
  try {
    const jobRes = await axios.post(`${AI}/bulk_ingest`, { files, category, organizationId }, { timeout: 300000 })
    res.json(jobRes.data)
  } catch (err) { res.status(500).json({ error: err.response?.data?.error || err.message }) }
})

router.get('/job/:jobId', async (req, res) => {
  try {
    const jobRes = await axios.get(`${AI}/job/${req.params.jobId}`, { timeout: 10000 })
    res.json(jobRes.data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router