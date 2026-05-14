const express = require('express')
const router  = express.Router()

router.get('/summary', async (req, res) => {
  try {
    const db = req.app.locals.db
    const [result] = await db.collection('queries').aggregate([{
      $facet: {
        totals: [{ $group: { _id: null, totalSearches: { $sum: 1 }, avgLatencyMs: { $avg: '$latencyMs' }, avgResults: { $avg: '$resultCount' } } }],
        today:  [{ $match: { timestamp: { $gte: new Date(new Date().setHours(0,0,0,0)) } } }, { $group: { _id: null, count: { $sum: 1 } } }],
        topQueries: [{ $group: { _id: '$query', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }, { $project: { _id: 0, query: '$_id', count: 1 } }],
        failedSearches: [{ $match: { resultCount: 0 } }, { $group: { _id: '$query', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }, { $project: { _id: 0, query: '$_id', count: 1 } }],
        byHour: [{ $group: { _id: { $hour: '$timestamp' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $project: { _id: 0, hour: '$_id', count: 1 } }]
      }
    }]).toArray()
    res.json({
      totalSearches: result.totals[0]?.totalSearches || 0,
      todaySearches: result.today[0]?.count || 0,
      avgLatencyMs: Math.round(result.totals[0]?.avgLatencyMs || 0),
      avgResultsPerSearch: +(result.totals[0]?.avgResults || 0).toFixed(1),
      topQueries: result.topQueries,
      failedSearches: result.failedSearches,
      byHour: result.byHour
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/trend', async (req, res) => {
  try {
    const db = req.app.locals.db
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const trend = await db.collection('queries').aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 }, avgLatency: { $avg: '$latencyMs' }, failedCount: { $sum: { $cond: [{ $eq: ['$resultCount', 0] }, 1, 0] } } } },
      { $sort: { _id: 1 } }
    ]).toArray()
    res.json({ trend })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/history', async (req, res) => {
  try {
    const history = await req.app.locals.db.collection('queries')
      .find({}, { projection: { query: 1, resultCount: 1, latencyMs: 1, timestamp: 1, hadSummary: 1 } })
      .sort({ timestamp: -1 }).limit(20).toArray()
    res.json({ history })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/insights', async (req, res) => {
  try {
    const db = req.app.locals.db
    const [result] = await db.collection('documents').aggregate([{
      $facet: {
        byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        totalChunks: [{ $count: 'n' }],
        totalDocs: [{ $group: { _id: '$title' } }, { $count: 'n' }],
        recentUploads: [{ $sort: { createdAt: -1 } }, { $limit: 5 }, { $project: { title: 1, category: 1, createdAt: 1, _id: 0 } }]
      }
    }]).toArray()
    res.json({ byCategory: result.byCategory, totalChunks: result.totalChunks[0]?.n || 0, totalDocs: result.totalDocs[0]?.n || 0, recentUploads: result.recentUploads })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/live', async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 4000)
    const db = req.app.locals.db
    const [newDocs, newSearches] = await Promise.all([
      db.collection('documents').find({ createdAt: { $gt: since } }, { projection: { title: 1, category: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(5).toArray(),
      db.collection('queries').find({ timestamp: { $gt: since } }, { projection: { query: 1, resultCount: 1, latencyMs: 1, timestamp: 1 } }).sort({ timestamp: -1 }).limit(5).toArray()
    ])
    const events = [
      ...newDocs.map(d => ({ type: 'document_indexed', title: d.title, category: d.category, timestamp: d.createdAt })),
      ...newSearches.map(q => ({ type: 'search_activity', query: q.query, resultCount: q.resultCount, latencyMs: q.latencyMs, timestamp: q.timestamp }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    res.json({ events, serverTime: new Date() })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router