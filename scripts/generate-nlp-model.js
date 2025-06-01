const { HansNLP } = require('../build/libs/nlp.js')
const fs = require('fs')

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