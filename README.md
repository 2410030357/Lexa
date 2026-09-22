<div align="center">

# LEXA
### Enterprise Semantic Document Intelligence Engine

**🏆 1st Place - SmartBridge Hack N Go with MongoDB 2026**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-lexa--one.vercel.app-7C3AED?style=for-the-badge&logo=vercel)](https://lexa-one.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-00B4A0?style=for-the-badge&logo=render)](https://lexa-backend-v0rv.onrender.com/health)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-00ED64?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/atlas)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

*Search by meaning. Not by keywords.*

</div>

---

## The Problem

Every organization stores thousands of documents. But when employees search for information, they get nothing — not because the document doesn't exist, but because traditional keyword search only matches characters, not meaning.

A doctor searches **"heart attack"** - the clinical document says **"myocardial infarction"**. Zero results.  
An employee searches **"work from home rules"** - the HR policy says **"remote work guidelines"**. Zero results.  
A finance analyst searches **"economic crash"** - the report says **"market downturn"**. Zero results.

This is the **vocabulary gap**. Lexa closes it permanently.

---

## What Lexa Does

Lexa is a semantic document intelligence platform that understands the **meaning** of your query and matches it against the **meaning** of your documents — regardless of the words used.

| Feature | Description |
|---|---|
| **Semantic Search** | Hybrid vector + lexical retrieval with RRF merge and AI reranking |
| **AI Executive Summary** | Groq LLaMA 3.1 generates structured intelligence from retrieved documents |
| **AI Chat** | Conversational RAG — every answer grounded in your actual documents |
| **Document Comparison** | AI analysis across two documents — similarities, differences, verdict |
| **Related Documents** | Semantic discovery using stored embeddings — zero re-embedding cost |
| **NL Database Query** | Ask MongoDB questions in plain English — real aggregation pipelines execute live |
| **Schema AI** | Describe your use case — AI generates production-grade MongoDB schema with indexes |
| **Anomaly Monitor** | Real-time security pattern detection using MongoDB aggregation pipelines |
| **Analytics Dashboard** | $facet-powered insights — 5 dimensions in one database call |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User (Browser)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              React + Vite Frontend (Vercel)                  │
│    Search · Chat · Documents · Analytics · Schema AI        │
│            DB Query · Monitor · Dark/Light Mode             │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────┐
│           Node.js + Express Backend (Render)                 │
│   Auth · Routing · Retrieval Pipeline · Analytics           │
│   Anomaly Detection · NL Query · Schema Generation          │
└──────────────┬──────────────────────────┬───────────────────┘
               │ HTTP                     │ MongoDB Driver
┌──────────────▼──────────┐  ┌───────────▼───────────────────┐
│  Python FastAPI          │  │     MongoDB Atlas              │
│  AI Microservice (Render)│  │                               │
│                          │  │  ● $vectorSearch (512-dim)    │
│  ● Voyage AI Embeddings  │  │  ● Atlas $search (Lucene)     │
│  ● Voyage AI Reranking   │  │  ● $facet Aggregations        │
│  ● Document Chunking     │  │  ● Scalar Quantization        │
│  ● Bulk Ingestion        │  │  ● Multi-tenant Isolation     │
└──────────────────────────┘  └───────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router, CSS Variables |
| Backend API | Node.js 22 + Express, JWT, Google OAuth 2.0 |
| AI Microservice | Python FastAPI, Uvicorn |
| Vector Database | MongoDB Atlas Vector Search (MongoDB 8.0) |
| Embedding Model | Voyage AI `voyage-3-lite` - 512 dimensions |
| Reranking | Voyage AI Rerank-2 (cross-encoder) |
| LLM | Groq LLaMA 3.1 8B Instant (JSON mode) |
| Deployment | Vercel (frontend) + Render (backend + AI service) |
| Auth | Google OAuth 2.0 + JWT |

---

## The Search Pipeline

When you submit a query, Lexa runs a four-stage retrieval pipeline:

```
Query Text
    │
    ▼
[Stage 1] Voyage AI Embedding
    │   Converts query to 512-dimensional vector
    │
    ▼
[Stage 2] Parallel Hybrid Search (Promise.all)
    ├── $vectorSearch  ──── cosine similarity, scalar-quantized index
    └── Atlas $search  ──── Lucene full-text, weighted fields
    │
    ▼
[Stage 3] Reciprocal Rank Fusion (k=60)
    │   Merges both result sets - documents in both lists rank higher
    │
    ▼
[Stage 4] Voyage AI Rerank-2
    │   Cross-encoder evaluates query-document pairs
    │   Most relevant document moves to position one
    │
    ▼
[Stage 5] Groq RAG (if enabled)
    │   Top 5 chunks → LLaMA 3.1 → structured JSON
    │   { intelligence, keyInsights, risks, trends, confidence }
    │
    ▼
Results + AI Summary
```

**Latency:** Sequential retrieval took ~700ms. Parallel retrieval with `Promise.all` reduced this to ~400ms — a 43% improvement.

---

## MongoDB Atlas - Deep Usage

This project uses MongoDB Atlas as its **entire infrastructure layer** - not just as a database.

### Vector Index with Scalar Quantization
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 512,
      "similarity": "cosine",
      "quantization": "scalar"
    },
    { "type": "filter", "path": "organizationId" },
    { "type": "filter", "path": "scope" },
    { "type": "filter", "path": "category" }
  ]
}
```
Scalar quantization compresses each embedding from **2048 bytes → 512 bytes** (4x reduction, <1% accuracy loss). Filter fields declared inside the index ensure multi-tenant isolation happens at the **ANN graph traversal level** - not as a post-filter.

### $facet Analytics - 5 Dimensions, 1 Query
```javascript
db.collection('queries').aggregate([{
  $facet: {
    totals:         [{ $group: { _id: null, total: { $sum: 1 }, avgLatency: { $avg: '$latencyMs' } } }],
    today:          [{ $match: { timestamp: { $gte: startOfDay } } }, { $count: 'n' }],
    topQueries:     [{ $group: { _id: '$query', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }],
    failedSearches: [{ $match: { resultCount: 0 } }, { $group: { _id: '$query', count: { $sum: 1 } } }],
    byHour:         [{ $group: { _id: { $hour: '$timestamp' }, count: { $sum: 1 } } }]
  }
}])
```
One round-trip. Five analytical results. No separate analytics database.

### Related Documents - Zero Re-embedding Cost
```javascript
// Uses the document's already-stored embedding as the query vector
const sourceDoc = await col.findOne({ title }, { projection: { embedding: 1 } })

col.aggregate([{
  $vectorSearch: {
    index: 'vector_index',
    path: 'embedding',
    queryVector: sourceDoc.embedding, 
    numCandidates: 50,
    limit: 5
  }
}])
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB Atlas cluster (free M0 works)
- Voyage AI API key
- Groq API key
- Google OAuth credentials

### 1. Clone
```bash
git clone https://github.com/kammari-ashritha/lexa.git
cd lexa
```

### 2. AI Service
```bash
cd ai-service
pip install -r requirements.txt

# .env
VOYAGE_API_KEY=your_voyage_key
MONGO_URI=your_atlas_uri

uvicorn main:app --reload --port 8000
```

### 3. Backend
```bash
cd backend
npm install

# .env
MONGO_URI=your_atlas_uri
AI_SERVICE_URL=http://localhost:8000
GROQ_API_KEY=your_groq_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_jwt_secret

npm run dev
```

### 4. Frontend
```bash
cd frontend/lexa
npm install

# .env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id

npm run dev
```

Open `http://localhost:5173`

### 5. Atlas Vector Index

Create this index on your `documents` collection in Atlas:
```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 512, "similarity": "cosine", "quantization": "scalar" },
    { "type": "filter", "path": "organizationId" },
    { "type": "filter", "path": "scope" },
    { "type": "filter", "path": "category" }
  ]
}
```



## Live Deployments

| Service | URL |
|---|---|
| Frontend | https://lexa-one.vercel.app |
| Backend API | https://lexa-backend-v0rv.onrender.com |
| AI Microservice | https://lexa-ai-service.onrender.com |
| Health Check | https://lexa-backend-v0rv.onrender.com/health |

---

## Built By

**Team Leagix** - KL University  
SmartBridge Hack N Go with MongoDB 2026 - **1st Place Winners**

---

<div align="center">

**Most teams built a search box. We built retrieval infrastructure.**

⭐ Star this repo if you found it useful

</div>
