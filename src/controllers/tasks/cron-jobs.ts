import * as cron from 'cron'
import { initStadupsSchedules } from '../plugins/standup.controller'

export const scheduledTasks: Record<string, cron.CronJob> = {}

export const scheduleCronJobs = async () => {
  try {
    await initStadupsSchedules()
  } catch (error) {
    console.error('❌ ERROR: scheduleCronJobs(): ', error)
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
