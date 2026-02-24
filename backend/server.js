const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const mongoClient = new MongoClient(process.env.MONGO_URI, {
  tls: true,
  serverSelectionTimeoutMS: 10000,
});

async function initDB() {
  try {
    await mongoClient.connect();
    console.log('✅ MongoDB Atlas Connected');
    app.locals.mongoClient = mongoClient;
    app.locals.db = mongoClient.db('lexa_db');
  } catch (err) {
    console.error('❌ MongoDB Connection Failed:', err.message);
    process.exit(1);
  }
}

app.use('/api/search',    require('./routes/search'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/analytics', require('./routes/analytics'));

app.get('/test-analytics', (req, res) => {
  res.json({ test: 'analytics route working' });
});

app.get('/', (req, res) => {
  res.json({ service: 'Lexa Backend API', version: '2.0.0', status: 'ready' });
});

initDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Lexa Backend running on http://localhost:${PORT}`);
  });
});
