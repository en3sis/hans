import cron from 'node-cron'

export const CronJob = async (frequency: string, callback: () => void) => {
  cron.schedule(frequency, () => callback)
}
