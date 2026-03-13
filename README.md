# Lexa: Semantic Intelligence Engine

**Live Application:** https://lexa-one.vercel.app

Lexa is a full-stack semantic search engine built for the MongoDB Atlas Hackathon. It goes beyond traditional keyword search by understanding the meaning and intent behind queries, not just the words themselves. Users can upload documents, search them semantically, and have AI-powered conversations grounded in their own data.

---

## What It Does

Traditional search fails when the user's words do not exactly match the document's words. Lexa solves this by converting both queries and documents into high-dimensional vector embeddings that capture semantic meaning. A search for "heart attack symptoms" correctly retrieves a document titled "Myocardial Infarction and Cardiac Arrest" even though no words overlap.

The system combines three retrieval signals: vector similarity search, BM25 full-text search, and cross-encoder reranking. These are fused using Reciprocal Rank Fusion before a final AI summary is generated from the top results.

---

## Architecture

```
Frontend (React + Vite)  ->  Backend (Node.js + Express)  ->  AI Service (Python + FastAPI)
        |                           |                                  |
    Vercel                       Render                             Render
        |                           |                                  |
        +-------------------- MongoDB Atlas --------------------------+
                              Vector Search + Atlas Search (BM25)
```

The frontend handles search UI, document upload, analytics, and conversational chat. Built with React 18, Vite, and Tailwind CSS. Deployed on Vercel with React Router v6.

The backend orchestrates search logic, authentication, and document management. Built with Node.js and Express. Deployed on Render.

The AI service handles all embedding and reranking via Voyage AI. Built with Python and FastAPI. Deployed on Render.

MongoDB Atlas stores document chunks with their vector embeddings and provides both Vector Search and Atlas Search indices on the same cluster.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6, Tailwind CSS |
| Backend | Node.js, Express, JWT |
| AI Service | Python, FastAPI, Voyage AI |
| Embeddings | Voyage AI voyage-3-lite (512 dimensions) |
| Reranking | Voyage AI rerank-2 cross-encoder |
| Vector Database | MongoDB Atlas Vector Search |
| Text Search | MongoDB Atlas Search (BM25) |
| AI Chat + Summaries | Groq API with LLaMA 3.1 8B |
| Auth | Google OAuth 2.0 + JWT |
| Deployment | Vercel (frontend), Render (backend and AI service) |

---

## Search Pipeline

1. User query arrives at the backend
2. Voyage AI voyage-3-lite embeds the query into a 512-dimensional vector
3. MongoDB Atlas Vector Search performs approximate nearest neighbor search using cosine similarity
4. MongoDB Atlas Search runs BM25 full-text search in parallel
5. Both result sets are merged using Reciprocal Rank Fusion (K=60)
6. Top results are reranked using Voyage AI rerank-2
7. Final score: 50% vector + 30% lexical + 20% rerank signal
8. Groq LLaMA generates a structured executive summary from the top results

---

## Document Ingestion

1. User uploads a document with title, category, and tags
2. Backend chunks the text into 500-word segments with 50-word overlap
3. All chunks are batch-embedded via Voyage AI
4. Each chunk is stored in MongoDB with its embedding, metadata, scope, and organization ID
5. MD5 checksum prevents duplicate ingestion

---

## Data Isolation Architecture

Documents are scoped at both ingestion and query time:

- Public users search sample documents (scope: "sample")
- Authenticated users search their organization's documents (filtered by organizationId)
- Filters are applied inside the MongoDB Atlas vector query, not post-retrieval
- Cross-organization access is blocked via JWT middleware on every route

---

## Features

**Semantic Search** understands intent and concept-level meaning. Works even when the query and document share no common words.

**Hybrid Retrieval** combines dense vector search with sparse BM25 lexical search to cover both semantic and keyword matching scenarios.

**AI Executive Summary** generates structured insights with key findings, risks, trends, and a confidence score from the retrieved document set.

**Conversational AI Chat** lets users ask natural language questions about their documents. Retrieves relevant context from MongoDB and grounds every response in actual document content.

**Document Management** supports uploading text and markdown files, viewing all indexed documents with chunk counts and word counts, and deleting documents.

**Analytics Dashboard** shows query history, latency trends, most searched terms, and corpus statistics.

**Google OAuth** for authentication with organization-level data isolation.

---

## Local Setup

Prerequisites: Node.js 18+, Python 3.10+, MongoDB Atlas cluster, Voyage AI API key, Groq API key

```bash
git clone https://github.com/YOUR_USERNAME/lexa.git
cd lexa
```

AI Service setup:
```bash
cd ai-service
pip install -r requirements.txt
```

Create `ai-service/.env`:
```
VOYAGE_API_KEY=your_voyage_api_key
MONGO_URI=your_mongodb_uri
```

```bash
python main.py
```

Backend setup:
```bash
cd backend
npm install
```

Create `backend/.env`:
```
MONGO_URI=your_mongodb_uri
JWT_SECRET=any_random_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
AI_SERVICE_URL=http://localhost:8000
GROQ_API_KEY=your_groq_api_key
```

```bash
npm run dev
```

Frontend setup:
```bash
cd frontend/lexa
npm install
```

Create `frontend/lexa/.env`:
```
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

```bash
npm run dev
```

Seed sample documents:
```bash
cd backend
node scripts/seedSampleDocs.js
```

MongoDB Atlas Vector Search Index (vector_index):
```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 512, "similarity": "cosine" },
    { "type": "filter", "path": "scope" },
    { "type": "filter", "path": "organizationId" }
  ]
}
```

Create a default Atlas Search index (text_index) with dynamic mapping on the documents collection for BM25 search.

---

## Production Environment Variables

lexa-backend on Render:
```
MONGO_URI
JWT_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
AI_SERVICE_URL=https://lexa-ai-service.onrender.com
GROQ_API_KEY
```

lexa-ai-service on Render:
```
VOYAGE_API_KEY
MONGO_URI
```

---

## Project Structure

```
lexa/
  ai-service/
    main.py                FastAPI: /embed, /embed-batch, /rerank
    requirements.txt
  backend/
    server.js              Express entry point
    routes/
      search.js            Hybrid search with RRF fusion
      documents.js         Ingestion and document management
      chat.js              Conversational RAG with Groq
      auth.js              Google OAuth and JWT
      analytics.js         Query history and statistics
    middleware/
      orgIsolation.js      Scope and organization enforcement
    utils/
      gemini.js            Structured summary generation (Groq)
    scripts/
      seedSampleDocs.js    Seeds public demo document set
  frontend/lexa/
    src/
      App.jsx              React Router v6 route definitions
      components/
        Dashboard.jsx      Main layout and search interface
        ChatTab.jsx        Conversational AI chat
        DemoPanel.jsx      Interactive semantic vs keyword demo
        UploadModal.jsx    Document upload form
        Analytics.jsx      Analytics and statistics view
      context/
        AuthContext.jsx    Auth state and session management
    vercel.json            SPA rewrite rules
```

---

## Why Voyage AI

Voyage AI was acquired by MongoDB in 2024. Using voyage-3-lite for embeddings and rerank-2 for cross-encoder reranking makes Lexa a native MongoDB ecosystem solution. The models are designed specifically for retrieval-augmented generation workloads and consistently outperform general-purpose embedding models on domain-specific search tasks.

---

## Links

Live Application: https://lexa-one.vercel.app
Backend API: https://lexa-backend-v0rv.onrender.com
AI Service: https://lexa-ai-service.onrender.com
