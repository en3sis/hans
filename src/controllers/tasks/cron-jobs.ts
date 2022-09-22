import { Client } from 'discord.js'
import cron from 'node-cron'
import { CRON_JOB_TIME, CRON_JOB_TIME_DEV } from '../../utils/constants'
import { redditPluginInit } from '../plugins/reddit.controller'

export const CronJobsTasks = async (Hans: Client) => {
  try {
    // await redditPluginInit(Hans)
    cron.schedule(
      process.env.ISDEV === 'true' ? CRON_JOB_TIME_DEV : CRON_JOB_TIME,
      async () => await redditPluginInit(Hans),
    )
  } catch (error) {
    console.error('❌ ERROR: CronJobsTasks(): ', error)
  }
}
