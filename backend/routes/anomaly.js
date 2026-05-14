const express = require('express')
const router  = express.Router()

router.get('/report', async (req, res) => {
  try {
    const db  = req.app.locals.db
    const now = new Date()
    const oneHourAgo = new Date(now - 60 * 60 * 1000)
    const oneDayAgo  = new Date(now - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    const [recentActivity, failureSpikes, latencyData, unusualHours, repeatedFailures, hourlyVolume] = await Promise.all([
      db.collection('queries').aggregate([{ $facet: {
        lastHour: [{ $match: { timestamp: { $gte: oneHourAgo } } }, { $count: 'n' }],
        lastDay:  [{ $match: { timestamp: { $gte: oneDayAgo  } } }, { $count: 'n' }]
      }}]).toArray(),

      db.collection('queries').aggregate([
        { $match: { timestamp: { $gte: oneDayAgo } } },
        { $group: { _id: { $hour: '$timestamp' }, total: { $sum: 1 }, failures: { $sum: { $cond: [{ $eq: ['$resultCount', 0] }, 1, 0] } } } },
        { $addFields: { failureRate: { $divide: ['$failures', '$total'] } } },
        { $match: { failureRate: { $gt: 0.4 }, total: { $gte: 3 } } },
        { $sort: { failureRate: -1 } }
      ]).toArray(),

      db.collection('queries').aggregate([
        { $match: { timestamp: { $gte: oneDayAgo } } },
        { $group: { _id: null, avg: { $avg: '$latencyMs' } } }
      ]).toArray(),

      db.collection('queries').aggregate([
        { $match: { timestamp: { $gte: oneWeekAgo } } },
        { $addFields: { hour: { $hour: '$timestamp' } } },
        { $match: { hour: { $in: [0, 1, 2, 3, 4, 5] } } },
        { $group: { _id: '$query', count: { $sum: 1 }, lastSeen: { $max: '$timestamp' } } },
        { $sort: { count: -1 } }, { $limit: 10 }
      ]).toArray(),

      db.collection('queries').aggregate([
        { $match: { resultCount: 0, timestamp: { $gte: oneWeekAgo } } },
        { $group: { _id: '$query', failCount: { $sum: 1 }, lastAttempt: { $max: '$timestamp' } } },
        { $match: { failCount: { $gte: 2 } } },
        { $sort: { failCount: -1 } }, { $limit: 10 }
      ]).toArray(),

      db.collection('queries').aggregate([
        { $match: { timestamp: { $gte: oneDayAgo } } },
        { $group: { _id: { $hour: '$timestamp' }, count: { $sum: 1 }, avgLatency: { $avg: '$latencyMs' } } },
        { $sort: { _id: 1 } }
      ]).toArray()
    ])

    const lastHourCount = recentActivity[0]?.lastHour[0]?.n || 0
    const lastDayCount  = recentActivity[0]?.lastDay[0]?.n  || 0
    const avgPerHour    = lastDayCount / 24
    const hourlySpike   = avgPerHour > 0 ? lastHourCount / avgPerHour : 0
    const avgLatency    = latencyData[0]?.avg || 0

    const anomalies = []

    if (hourlySpike > 3) anomalies.push({ type: 'VOLUME_SPIKE', severity: 'HIGH', message: `Query volume spike: ${lastHourCount} searches in last hour vs avg ${Math.round(avgPerHour)}/hr (${Math.round(hourlySpike)}x normal)`, timestamp: now })

    failureSpikes.forEach(s => anomalies.push({ type: 'HIGH_FAILURE_RATE', severity: 'MEDIUM', message: `High failure rate at hour ${s._id}: ${Math.round(s.failureRate * 100)}% of ${s.total} queries returned 0 results`, timestamp: now }))

    if (unusualHours.length > 3) anomalies.push({ type: 'OFF_HOURS_ACTIVITY', severity: 'LOW', message: `${unusualHours.length} distinct queries detected between midnight and 5am`, queries: unusualHours.slice(0, 5).map(q => q._id), timestamp: now })

    repeatedFailures.forEach(f => anomalies.push({ type: 'REPEATED_FAILED_QUERY', severity: f.failCount >= 5 ? 'HIGH' : 'LOW', message: `Query "${f._id}" failed ${f.failCount} times with 0 results — possible missing document coverage`, lastAttempt: f.lastAttempt, timestamp: now }))

    const securityScore = Math.max(0, 100
      - anomalies.filter(a => a.severity === 'HIGH').length   * 25
      - anomalies.filter(a => a.severity === 'MEDIUM').length * 10
      - anomalies.filter(a => a.severity === 'LOW').length    * 5
    )

    res.json({
      generatedAt: now,
      securityScore,
      status: securityScore >= 80 ? 'HEALTHY' : securityScore >= 60 ? 'WARNING' : 'CRITICAL',
      anomalies,
      stats: { queriesLastHour: lastHourCount, queriesLastDay: lastDayCount, avgQueriesPerHour: Math.round(avgPerHour), hourlySpike: +hourlySpike.toFixed(2), avgLatencyMs: Math.round(avgLatency), repeatedFailures: repeatedFailures.length, offHoursQueries: unusualHours.length },
      hourlyVolume,
      recommendations: anomalies.length === 0
        ? ['No anomalies detected. System operating normally.']
        : [...repeatedFailures.map(f => `Upload documents covering: "${f._id}" to improve search coverage`), anomalies.some(a => a.type === 'VOLUME_SPIKE') ? 'Monitor for unusual access patterns' : null].filter(Boolean)
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router