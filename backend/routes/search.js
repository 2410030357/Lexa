const express = require('express');
const router = express.Router();
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function getEmbedding(text) {
  const res = await axios.post(`${AI_URL}/embed`, { text }, { timeout: 60000 });
  return res.data.embedding;
}

async function getGeminiSummary(query, results) {
  if (!GEMINI_KEY || results.length === 0) return null;
  try {
    const context = results
      .slice(0, 4)
      .map((r, i) => `[${i + 1}] ${r.title}: ${r.content}`)
      .join('\n\n');

    const prompt = `You are Lexa, an intelligent semantic search assistant.
User searched for: "${query}"
Top retrieved document chunks:
${context}
Write a concise 2-3 sentence executive summary that directly answers the user's query. Be specific and actionable. Do not say "based on the documents".`;

    // Use working models only
    const models = ['gemini-2.0-flash-001', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
    
    for (const model of models) {
      try {
        console.log(`🤖 Trying ${model}...`);
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
          { contents: [{ parts: [{ text: prompt }] }] },
          { timeout: 30000 }
        );
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log(`✅ Summary generated with ${model}`);
          return text;
        }
      } catch (e) {
        console.log(`❌ ${model} failed:`, e.response?.data?.error?.message || e.message);
      }
    }
    return null;
  } catch (err) {
    console.error('Gemini error:', err.message);
    return null;
  }
}

router.post('/', async (req, res) => {
  const startTime = Date.now();
  try {
    const db = req.app.locals.db;
    const documents = db.collection('documents');
    const history = db.collection('query_history');
    const { query, limit = 10, category = null, useRAG = true } = req.body;

    if (!query || !query.trim()) return res.status(400).json({ error: 'Query is required' });

    // Step 1: Embedding
    let embedding;
    try {
      embedding = await getEmbedding(query);
    } catch (err) {
      return res.status(503).json({ error: 'AI service unavailable. Try again in 30 seconds.' });
    }

    // Step 2: Vector Search
    const vectorPipeline = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: embedding,
          numCandidates: 200,
          limit: parseInt(limit) * 2,
          ...(category && { filter: { category: { $eq: category } } })
        }
      },
      {
        $project: {
          _id: 1, title: 1, content: 1, category: 1, tags: 1,
          chunk_index: 1, total_chunks: 1, word_count: 1,
          vectorScore: { $meta: 'vectorSearchScore' }
        }
      }
    ];
    const vectorResults = await documents.aggregate(vectorPipeline).toArray();
    console.log(`🔍 Vector: ${vectorResults.length} results`);

    // Step 3: Full-Text Search
    let textResults = [];
    try {
      const textPipeline = [
        {
          $search: {
            index: 'text_index',
            compound: {
              should: [
                { text: { query, path: 'title', score: { boost: { value: 3 } } } },
                { text: { query, path: 'content', fuzzy: { maxEdits: 1 } } }
              ]
            }
          }
        },
        { $limit: parseInt(limit) * 2 },
        {
          $project: {
            _id: 1, title: 1, content: 1, category: 1, tags: 1,
            chunk_index: 1, total_chunks: 1, word_count: 1,
            textScore: { $meta: 'searchScore' }
          }
        }
      ];
      textResults = await documents.aggregate(textPipeline).toArray();
      console.log(`📝 Lexical: ${textResults.length} results`);
    } catch (e) {
      console.log('ℹ️ Text index not available, vector only');
    }

    // Step 4: RRF fusion
    const RRF_K = 60;
    const scoreMap = {};

    // Get max text score for normalization
    const maxTextScore = Math.max(...textResults.map(d => d.textScore || 0), 1);

    vectorResults.forEach((doc, rank) => {
      const id = doc._id.toString();
      if (!scoreMap[id]) scoreMap[id] = { doc, rrfScore: 0, vectorScore: 0, lexicalScore: 0 };
      scoreMap[id].rrfScore += 1 / (RRF_K + rank + 1);
      // vectorScore from Atlas is 0-1, keep as-is for display
      scoreMap[id].vectorScore = doc.vectorScore || 0;
    });

    textResults.forEach((doc, rank) => {
      const id = doc._id.toString();
      if (!scoreMap[id]) scoreMap[id] = { doc, rrfScore: 0, vectorScore: 0, lexicalScore: 0 };
      scoreMap[id].rrfScore += 1 / (RRF_K + rank + 1);
      // Normalize textScore to 0-1 range
      scoreMap[id].lexicalScore = (doc.textScore || 0) / maxTextScore;
    });

    const hybridResults = Object.values(scoreMap)
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, parseInt(limit))
      .map(item => ({
        ...item.doc,
        _id: item.doc._id.toString(),
        score: item.rrfScore,           // ← named 'score' for ResultCard
        vectorScore: item.vectorScore,   // ← 0 to 1
        lexicalScore: item.lexicalScore, // ← 0 to 1, named 'lexicalScore' for ResultCard
      }));

    // Step 5: Gemini RAG
    let summary = null;
    if (useRAG && hybridResults.length > 0) {
      summary = await getGeminiSummary(query, hybridResults);
    }

    // Step 6: History
    const latencyMs = Date.now() - startTime;
    try {
      await history.insertOne({
        query: query.trim(), resultCount: hybridResults.length,
        hadSummary: !!summary, latencyMs, category: category || null, timestamp: new Date()
      });
    } catch(e) {}

    res.json({
      query, summary, results: hybridResults,
      meta: {
        total: hybridResults.length, latencyMs,
        vectorHits: vectorResults.length, textHits: textResults.length,
        searchMode: textResults.length > 0 ? 'HYBRID' : 'VECTOR-ONLY'
      }
    });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/suggest', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const history = db.collection('query_history');
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ suggestions: [] });
    const results = await history.aggregate([
      { $match: { query: { $regex: q, $options: 'i' } } },
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]).toArray();
    res.json({ suggestions: results.map(r => r._id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;