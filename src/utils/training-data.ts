import fs from 'fs'
import path from 'path'

interface Entity {
  start: number
  end: number
  entity: string
  sourceText: string
}

interface Utterance {
  utterance: string
  entities: Entity[]
}

interface Intent {
  intents: Utterance[]
  answers: string[]
}

interface TrainingData {
  [key: string]: Intent
}

export function loadTrainingData(): TrainingData {
  const mergedData: TrainingData = {}
  const dataFiles = [path.join(__dirname, '../data/merged-training-data.json')]

  // Always ensure the dataset is present in build/data if missing or outdated
  try {
    const srcPath = path.join(__dirname, '../data/merged-training-data.json')
    const destDir = path.join(process.cwd(), 'build/data')
    const destPath = path.join(destDir, 'merged-training-data.json')
    let shouldCopy = false
    if (fs.existsSync(srcPath)) {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
      }
      if (!fs.existsSync(destPath)) {
        shouldCopy = true
      } else {
        // Copy if source is newer than destination
        const srcStat = fs.statSync(srcPath)
        const destStat = fs.statSync(destPath)
        if (srcStat.mtimeMs > destStat.mtimeMs) {
          shouldCopy = true
        }
      }
      if (shouldCopy) {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  } catch (err) {
    console.error('Failed to ensure merged-training-data.json in build/data:', err)
  }

  for (const filePath of dataFiles) {
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const data: TrainingData = JSON.parse(fileContent)

        // Merge intents and answers
        for (const [intent, content] of Object.entries(data)) {
          if (!mergedData[intent]) {
            mergedData[intent] = { intents: [], answers: [] }
          }

          // Add unique utterances
          content.intents.forEach((utterance) => {
            if (
              !mergedData[intent].intents.some(
                (existing) => existing.utterance === utterance.utterance,
              )
            ) {
              mergedData[intent].intents.push(utterance)
            }
          })

          // Add unique answers
          content.answers.forEach((answer) => {
            if (!mergedData[intent].answers.includes(answer)) {
              mergedData[intent].answers.push(answer)
            }
          })
        }
      }
    } catch (error) {
      console.error(`Error loading training data from ${filePath}:`, error)
    }
  }

  // Validate the merged data
  validateTrainingData(mergedData)

  return mergedData
}

function validateTrainingData(data: TrainingData) {
  for (const [intent, content] of Object.entries(data)) {
    // Ensure each intent has at least one utterance and one answer
    if (!content.intents.length) {
      throw new Error(`Intent "${intent}" has no utterances`)
    }
    if (!content.answers.length) {
      throw new Error(`Intent "${intent}" has no answers`)
    }

    // Validate entities in utterances
    content.intents.forEach((utterance, idx) => {
      utterance.entities.forEach((entity) => {
        // Validate entity boundaries
        if (entity.start < 0 || entity.end > utterance.utterance.length) {
          throw new Error(
            `Invalid entity boundaries in intent "${intent}", utterance ${idx}: ` +
              `${entity.start}-${entity.end} (utterance length: ${utterance.utterance.length})`,
          )
        }

        // Validate entity text matches
        const actualText = utterance.utterance.substring(entity.start, entity.end)
        if (actualText !== entity.sourceText) {
          throw new Error(
            `Entity text mismatch in intent "${intent}", utterance ${idx}: ` +
              `expected "${entity.sourceText}", got "${actualText}"`,
          )
        }
      })
    })
  }
}

export function getTrainingStats(data: TrainingData) {
  const stats = {
    totalIntents: Object.keys(data).length,
    totalUtterances: 0,
    totalAnswers: 0,
    totalEntities: 0,
    utterancesPerIntent: {} as Record<string, number>,
    entitiesPerIntent: {} as Record<string, number>,
  }

  for (const [intent, content] of Object.entries(data)) {
    stats.totalUtterances += content.intents.length
    stats.totalAnswers += content.answers.length
    stats.utterancesPerIntent[intent] = content.intents.length

    let intentEntities = 0
    content.intents.forEach((utterance) => {
      intentEntities += utterance.entities.length
    })
    stats.entitiesPerIntent[intent] = intentEntities
    stats.totalEntities += intentEntities
  }

  return stats
}
