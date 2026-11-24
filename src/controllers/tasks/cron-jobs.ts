import * as cron from 'cron'
import { resetChatGptUsage } from '../plugins/chat-gpt.controller'
import { initStadupsSchedules } from '../plugins/standup.controller'
import { log } from '../../utils/log'

export const scheduledTasks: Record<string, cron.CronJob> = {}

export const scheduleCronJobs = async () => {
  try {
    await initStadupsSchedules()
  } catch (error) {
    log.error('❌ ERROR: scheduleCronJobs(): ', error)
  }

  try {
    scheduledTasks['chatgpt-usage-reset']?.stop()
    scheduledTasks['chatgpt-usage-reset'] = new cron.CronJob('0 0 * * *', resetChatGptUsage)
    scheduledTasks['chatgpt-usage-reset'].start()
  } catch (error) {
    log.error('❌ ERROR: scheduleCronJobs(chatgpt-usage-reset): ', error)
  }
}

export const stopSpecificCronJob = (id: string) => {
  Object.keys(scheduledTasks).forEach((key) => {
    if (key.startsWith(id)) {
      scheduledTasks[key].stop()
      delete scheduledTasks[key]
    }
  })
}
