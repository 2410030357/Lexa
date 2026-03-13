// scripts/seedSampleDocs.js
// Fixed: adds 22s delay between docs to respect Voyage AI 3 RPM free tier limit

const mongoose = require('mongoose')
const axios    = require('axios')
require('dotenv').config()

const MONGO_URI   = process.env.MONGO_URI
const AI_SERVICE  = process.env.AI_SERVICE_URL || 'http://localhost:8000'

const DOCS = [
  {
    title: 'Machine Learning Fundamentals',
    category: 'Technology',
    tags: ['machine learning', 'AI', 'algorithms'],
    content: `Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves. The process begins with observations or data, such as examples, direct experience, or instruction, so that computers can look for patterns in data and make better decisions in the future. The primary aim is to allow computers to learn automatically without human intervention or assistance and adjust actions accordingly. Machine learning algorithms include supervised learning, unsupervised learning, and reinforcement learning. Supervised learning uses labeled training data to learn the mapping function from input variables to output variables. Unsupervised learning finds hidden patterns or intrinsic structures in input data without labeled responses. Reinforcement learning trains algorithms using a system of reward and punishment. Deep learning, a subfield of machine learning, uses neural networks with many layers to model complex patterns in data.`
  },
  {
    title: 'Remote Work Policy Guidelines',
    category: 'HR',
    tags: ['remote work', 'work from home', 'policy', 'HR'],
    content: `This document outlines the company's work from home and telecommuting policy for all employees. Remote work arrangements allow employees to work outside of the traditional office environment. Employees working remotely are expected to maintain the same level of productivity and professionalism as they would in the office. Core working hours are 9 AM to 3 PM in the employee's local timezone, during which employees must be available for meetings and collaboration. All remote workers must have a reliable internet connection with minimum speed of 25 Mbps. Company equipment must be used for all work-related tasks and must be kept secure at all times. Employees must use the company VPN when accessing internal systems. Regular check-ins with managers are required — at minimum a weekly one-on-one meeting. Expenses for home office setup, including ergonomic equipment, may be reimbursed up to $500 annually with manager approval. Remote work privileges may be revoked if performance standards are not maintained.`
  },
  {
    title: 'Cardiovascular Disease Prevention',
    category: 'Medical',
    tags: ['heart health', 'cardiovascular', 'prevention', 'medical'],
    content: `Cardiovascular disease remains the leading cause of death globally, accounting for approximately 17.9 million deaths each year. Prevention strategies focus on modifiable risk factors including high blood pressure, high cholesterol, smoking, obesity, physical inactivity, and diabetes. Myocardial infarction, commonly known as a heart attack, occurs when blood flow to a part of the heart is blocked for a long enough time that part of the heart muscle is damaged or dies. Symptoms include chest pain or discomfort, shortness of breath, pain in the arms or shoulder, and nausea. Regular physical activity of at least 150 minutes of moderate-intensity exercise per week significantly reduces cardiovascular risk. A heart-healthy diet rich in fruits, vegetables, whole grains, and lean proteins while limiting saturated fats, sodium, and added sugars is essential. Blood pressure should be maintained below 120/80 mmHg. Cholesterol levels, particularly LDL cholesterol, should be monitored and controlled. Smoking cessation immediately reduces cardiovascular risk. Regular medical screenings help detect risk factors early.`
  },
  {
    title: 'Financial Risk Management',
    category: 'Finance',
    tags: ['finance', 'risk', 'investment', 'economics'],
    content: `Financial risk management is the practice of protecting economic value in a firm by using financial instruments to manage exposure to risk. Economic recessions and market downturns require robust risk management frameworks. Key types of financial risk include market risk, credit risk, liquidity risk, and operational risk. Market risk refers to the possibility of losses due to factors affecting the overall performance of financial markets. Credit risk is the potential that a borrower will fail to meet obligations in accordance with agreed terms. Liquidity risk is the risk that a company will not be able to meet its short-term financial obligations. Diversification is a fundamental risk management strategy that spreads investments across various financial instruments, industries, and geographic regions to reduce exposure to any single asset or risk. Hedging using derivatives such as futures, options, and swaps can offset potential losses. Value at Risk (VaR) is a statistical technique used to measure the level of financial risk within a portfolio over a specific time frame. Stress testing evaluates how a portfolio performs under extreme market conditions.`
  },
  {
    title: 'Data Privacy Regulations Overview',
    category: 'Legal',
    tags: ['privacy', 'GDPR', 'data protection', 'compliance'],
    content: `Data privacy regulations govern how organizations collect, store, process, and share personal information. The General Data Protection Regulation (GDPR) is a comprehensive data protection law that took effect in the European Union in May 2018. It applies to all organizations that process personal data of EU residents, regardless of where the organization is based. Key principles include lawfulness, fairness and transparency, purpose limitation, data minimization, accuracy, storage limitation, integrity and confidentiality. Organizations must obtain explicit consent before collecting personal data and must provide clear privacy notices. Data subjects have rights including the right to access, rectification, erasure (right to be forgotten), portability, and objection. Organizations must report data breaches to supervisory authorities within 72 hours of becoming aware. The California Consumer Privacy Act (CCPA) provides similar protections for California residents. Non-compliance can result in significant fines — up to 4% of global annual turnover under GDPR.`
  },
  {
    title: 'Artificial Intelligence Ethics and Governance',
    category: 'Technology',
    tags: ['AI ethics', 'governance', 'responsible AI', 'bias'],
    content: `Artificial intelligence ethics addresses the moral questions and societal impacts of AI systems. As AI becomes increasingly integrated into critical decisions affecting employment, healthcare, criminal justice, and financial services, ensuring these systems are fair, transparent, and accountable is paramount. Algorithmic bias occurs when AI systems reflect and amplify existing societal biases present in training data. Fairness in AI requires that systems do not discriminate against individuals based on protected characteristics such as race, gender, age, or disability. Transparency means that AI decision-making processes should be explainable and understandable to affected parties. The right to explanation is increasingly recognized in regulations like GDPR. Accountability frameworks establish clear responsibility for AI system outcomes. Human oversight mechanisms ensure that AI systems can be monitored, corrected, and shut down when necessary. Privacy-preserving techniques such as federated learning and differential privacy allow AI models to learn from data without exposing sensitive information. International organizations including UNESCO and the OECD have published AI ethics guidelines.`
  },
  {
    title: 'Climate Change and Environmental Impact',
    category: 'Research',
    tags: ['climate change', 'environment', 'sustainability', 'carbon'],
    content: `Climate change refers to long-term shifts in temperatures and weather patterns primarily driven by human activities since the 1800s, particularly the burning of fossil fuels. The Intergovernmental Panel on Climate Change (IPCC) has documented that global average temperatures have increased by approximately 1.1 degrees Celsius above pre-industrial levels. This warming is causing widespread disruption to ecosystems, weather patterns, and sea levels. Greenhouse gases including carbon dioxide, methane, and nitrous oxide trap heat in the atmosphere. The Paris Agreement, adopted in 2015, aims to limit global warming to well below 2 degrees Celsius above pre-industrial levels. Renewable energy sources including solar, wind, and hydroelectric power are critical for reducing carbon emissions. Carbon capture and storage technologies can remove CO2 directly from the atmosphere. Deforestation accounts for approximately 10-15% of global greenhouse gas emissions. Sustainable agriculture practices can reduce emissions while maintaining food security. Individual actions including reducing energy consumption, sustainable transportation, and plant-based diets contribute to mitigation efforts.`
  },
  {
    title: 'Blockchain Technology Applications',
    category: 'Technology',
    tags: ['blockchain', 'cryptocurrency', 'decentralization', 'smart contracts'],
    content: `Blockchain is a distributed ledger technology that maintains a continuously growing list of records called blocks, linked and secured using cryptography. Each block contains a cryptographic hash of the previous block, a timestamp, and transaction data. Once recorded, the data in any given block cannot be altered retroactively without alteration of all subsequent blocks. This makes blockchain resistant to modification and fraud. Bitcoin, introduced in 2009, was the first major application of blockchain technology for peer-to-peer digital currency transactions without a central authority. Ethereum expanded blockchain capabilities by introducing smart contracts — self-executing contracts with terms directly written into code. Supply chain management benefits from blockchain through enhanced traceability and transparency of goods from origin to consumer. Healthcare applications include secure sharing of patient records across providers while maintaining privacy. Decentralized Finance (DeFi) uses blockchain to recreate traditional financial instruments without central intermediaries. Non-Fungible Tokens (NFTs) use blockchain to certify unique ownership of digital assets. Enterprise blockchain solutions are being adopted by major corporations for various business processes.`
  },
  {
    title: 'Employee Performance Management',
    category: 'HR',
    tags: ['performance review', 'HR', 'employee development', 'KPIs'],
    content: `Performance management is a continuous process of identifying, measuring, and developing the performance of individuals and teams to align with organizational goals. Effective performance management systems include goal setting, ongoing feedback, performance reviews, and development planning. SMART goals — Specific, Measurable, Achievable, Relevant, and Time-bound — provide clear direction and enable objective performance assessment. Key Performance Indicators (KPIs) are quantifiable measures that evaluate success in meeting objectives. Regular one-on-one meetings between managers and employees facilitate ongoing feedback and coaching. Annual or semi-annual formal performance reviews document achievements, areas for improvement, and career development goals. 360-degree feedback collects input from peers, subordinates, and supervisors to provide comprehensive performance insights. Performance improvement plans (PIPs) provide structured support for employees not meeting expectations. Recognition and rewards programs reinforce positive performance and motivate employees. Linking compensation decisions to performance outcomes incentivizes high performance while ensuring fairness.`
  },
  {
    title: 'Cybersecurity Best Practices',
    category: 'Technology',
    tags: ['cybersecurity', 'security', 'data protection', 'hacking'],
    content: `Cybersecurity encompasses the practices, technologies, and processes designed to protect networks, devices, programs, and data from attack, damage, or unauthorized access. The threat landscape continues to evolve with increasingly sophisticated attacks including phishing, ransomware, advanced persistent threats, and supply chain attacks. Zero-trust security models operate on the principle of never trust, always verify — requiring strict identity verification for every person and device attempting to access resources. Multi-factor authentication (MFA) significantly reduces the risk of unauthorized access by requiring multiple forms of verification. Regular software updates and patch management address known vulnerabilities before they can be exploited. Data encryption protects sensitive information both in transit and at rest. Employee security awareness training is critical as human error remains a leading cause of security breaches. Incident response plans ensure organizations can quickly detect, contain, and recover from security incidents. Regular security audits and penetration testing identify vulnerabilities before attackers can exploit them. The principle of least privilege limits user access rights to only what is necessary for their job functions.`
  }
]

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function embedWithRetry(content, attempt = 1) {
  try {
    const res = await axios.post(`${AI_SERVICE}/embed`, { text: content }, { timeout: 30000 })
    const embedding = res.data?.embedding
    if (!embedding || !embedding[0]) {
      throw new Error('Empty embedding returned — likely rate limited')
    }
    return embedding
  } catch (err) {
    if (attempt <= 3) {
      const wait = attempt * 25000 // 25s, 50s, 75s
      console.log(`    Retry ${attempt}/3 in ${wait/1000}s... (${err.message.slice(0,60)})`)
      await sleep(wait)
      return embedWithRetry(content, attempt + 1)
    }
    throw err
  }
}

async function seed() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')

  const db = mongoose.connection.db
  const col = db.collection('documents')

  // Remove existing seed docs to avoid duplicates
  const existingTitles = DOCS.map(d => d.title)
  await col.deleteMany({ title: { $in: existingTitles } })
  console.log(`Seeding ${DOCS.length} sample documents...\n`)
  console.log('Note: 22s delay between docs due to Voyage AI 3 RPM free tier limit')
  console.log('This will take approximately', Math.ceil(DOCS.length * 22 / 60), 'minutes\n')

  let success = 0
  let failed  = 0

  for (let i = 0; i < DOCS.length; i++) {
    const doc = DOCS[i]
    try {
      if (i > 0) {
        process.stdout.write(`  Waiting 22s before next doc...`)
        await sleep(22000)
        process.stdout.write(` done\n`)
      }

      process.stdout.write(`  [${i+1}/${DOCS.length}] Embedding "${doc.title}"...`)
      const embedding = await embedWithRetry(doc.content)
      process.stdout.write(` done\n`)

      await col.insertOne({
        title: doc.title,
        content: doc.content,
        category: doc.category,
        tags: doc.tags,
        scope: 'global',
        organizationId: 'demo',
        embedding: embedding,
        chunk_index: 0,
        word_count: doc.content.split(/\s+/).length,
        createdAt: new Date()
      })

      console.log(`  Inserted: ${doc.title} (512 dims)`)
      success++
    } catch (err) {
      console.error(`  FAILED: ${doc.title} — ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone! ${success} inserted, ${failed} failed.`)
  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})