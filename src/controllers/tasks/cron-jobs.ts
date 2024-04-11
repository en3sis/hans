import { initStadupsSchedules } from '../plugins/standup.controller'

// INFO: Stores the scheduled task so we can stop it later.
export const scheduledTasks = {}

/**  Schedule cron jobs. */
export const scheduleCronJobs = async () => {
  try {
    // INFO: Standup Plugin
    await initStadupsSchedules()
  } catch (error) {
    console.error('❌ ERROR: scheduleCronJobs(): ', error)
  }
}

/**
 * Stops a specific cron job.
 * @param {string} id - The id of the cron job.
 * */
export const stopSpecificCronJob = (id: string) => {
  if (scheduledTasks[id]) {
    scheduledTasks[id].stop()
    delete scheduledTasks[id]
  }
}
