import { db } from '../libs/drizzle'
import { configs } from '../db/schema'
import { setPresence } from '../controllers/bot/config.controller'

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

let lastActivityName: string | null = null
let lastActivityType: number | null = null
let pollInterval: NodeJS.Timeout | null = null

/**
 * Polls the configs table for presence changes and updates the bot's Discord status.
 * Replaces Supabase realtime with a simple polling mechanism.
 */
export const configsRealtime = () => {
  const pollForChanges = async () => {
    try {
      const result = await db.select().from(configs).limit(1)
      const config = result[0]

      if (!config) return

      const { activityName, activityType } = config

      // Only update if values changed
      if (activityName !== lastActivityName || activityType !== lastActivityType) {
        lastActivityName = activityName
        lastActivityType = activityType
        await setPresence(activityType, activityName)
        console.log(`🔄 Presence updated: ${activityType} - ${activityName}`)
      }
    } catch (error) {
      console.error('❌ configsRealtime poll error:', error)
    }
  }

  // Initial poll
  pollForChanges()

  // Start polling interval
  pollInterval = setInterval(pollForChanges, POLL_INTERVAL_MS)

  console.log(`🔄 Presence polling started (every ${POLL_INTERVAL_MS / 1000 / 60} minutes)`)
}

export const stopConfigsRealtime = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
    console.log('🔄 Presence polling stopped')
  }
}
