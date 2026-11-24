import * as cron from 'cron'
import { initStadupsSchedules } from '../plugins/standup.controller'
import { log } from '../../utils/log'

export const scheduledTasks: Record<string, cron.CronJob> = {}

export const scheduleCronJobs = async () => {
  try {
    await initStadupsSchedules()
  } catch (error) {
    log.error('❌ ERROR: scheduleCronJobs(): ', error)
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
