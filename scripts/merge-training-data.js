import { promises as fs } from 'fs'
import path from 'path'

function intentKey(intent) {
  const entitiesKey = intent.entities
    .map((e) => `${e.start}:${e.end}:${e.entity}:${e.sourceText}`)
    .sort()
    .join('|')

  return `${intent.utterance}::${entitiesKey}`
}

async function main() {
  const dataDir = path.join(__dirname, '../data')
  const set1 = JSON.parse(
    await fs.readFile(path.join(dataDir, 'set1.json'), 'utf8'),
  )
  const set2 = JSON.parse(
    await fs.readFile(path.join(dataDir, 'set2.json'), 'utf8'),
  )

  const merged = {}
  const allIntents = new Set([...Object.keys(set1), ...Object.keys(set2)])

  for (const intentName of allIntents) {
    const group1 = set1[intentName] || { intents: [], answers: [] }
    const group2 = set2[intentName] || { intents: [], answers: [] }
    const seen = new Set()
    const mergedIntents = []

    for (const intent of [...group1.intents, ...group2.intents]) {
      const key = intentKey(intent)
      if (!seen.has(key)) {
        seen.add(key)
        mergedIntents.push(intent)
      }
    }

    const mergedAnswers = Array.from(
      new Set([...(group1.answers || []), ...(group2.answers || [])]),
    )

    merged[intentName] = {
      intents: mergedIntents,
      answers: mergedAnswers,
    }
  }

  await fs.writeFile(
    path.join(dataDir, 'merged-training-data.json'),
    JSON.stringify(merged, null, 2),
    'utf8',
  )

  console.log('Merged training data written to merged-training-data.json')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
}) 