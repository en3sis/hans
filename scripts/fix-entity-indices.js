import fs from 'fs'
import path from 'path'

const files = [
  path.join(__dirname, '../src/data/set1.json'),
  path.join(__dirname, '../src/data/set2.json'),
]

files.forEach((file) => {
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'))

  let changed = false

  for (const [intent, content] of Object.entries<any>(data)) {
    content.intents.forEach((utteranceObj, idx) => {
      utteranceObj.entities.forEach((entity) => {
        const { sourceText } = entity
        const utterance = utteranceObj.utterance
        const foundAt = utterance.indexOf(sourceText)
        if (foundAt !== -1) {
          if (entity.start !== foundAt || entity.end !== foundAt + sourceText.length) {
            entity.start = foundAt
            entity.end = foundAt + sourceText.length
            changed = true
          }
        } else {
          console.warn(
            `WARNING: Could not find "${sourceText}" in utterance "${utterance}" (intent: ${intent}, idx: ${idx})`,
          )
        }
      })
    })
  }

  if (changed) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
    console.log(`Patched entity indices in ${file}`)
  } else {
    console.log(`No changes needed for ${file}`)
  }
})
