const { HansNLP } = require('../build/libs/nlp.js')
const fs = require('fs')
const path = require('path')

// Ensure build/data/merged-training-data.json exists before model generation
const srcDataPath = path.join(__dirname, '../src/data/merged-training-data.json')
const destDataDir = path.join(__dirname, '../build/data')
const destDataPath = path.join(destDataDir, 'merged-training-data.json')

if (!fs.existsSync(destDataPath)) {
  if (!fs.existsSync(destDataDir)) {
    fs.mkdirSync(destDataDir, { recursive: true })
  }
  if (fs.existsSync(srcDataPath)) {
    fs.copyFileSync(srcDataPath, destDataPath)
    console.log('[NLP BUILD] Copied merged-training-data.json to build/data/')
  } else {
    console.error('[NLP BUILD] ERROR: src/data/merged-training-data.json not found!')
    process.exit(1)
  }
}

async function generateModel() {
  console.log('🤖 [BUILD] Starting NLP model generation...')
  
  const nlp = new HansNLP()
  
  try {
    await nlp.forceRetrain()
    console.log('✅ [BUILD] NLP model generated successfully!')
    console.log(`📂 [BUILD] Model saved to: ${nlp.getModelPath()}`)
    
    if (fs.existsSync(nlp.getModelPath())) {
      const stats = fs.statSync(nlp.getModelPath())
      console.log(`📊 [BUILD] Model file size: ${(stats.size / 1024).toFixed(2)} KB`)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ [BUILD] Failed to generate NLP model:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  generateModel()
} 