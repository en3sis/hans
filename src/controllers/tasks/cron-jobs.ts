import { Client } from 'discord.js'

export const CronJobsTasks = async (Hans: Client) => {
  try {
    // await redditPluginInit(Hans)
    // cron.schedule(
    //   process.env.ISDEV === 'true' ? CRON_JOB_TIME_DEV : CRON_JOB_TIME,
    //   async () => await redditPluginInit(Hans),
    // )
  } catch (error) {
    console.error('❌ ERROR: CronJobsTasks(): ', error)
  }
}
