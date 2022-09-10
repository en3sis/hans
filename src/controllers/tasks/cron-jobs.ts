import { Client } from 'discord.js'
import cron from 'node-cron'
import { redditPluginInit } from '../plugins/reddit.controller'

export const CronJobsTasks = async (Hans: Client) => {
  try {
    cron.schedule('*/5 * * * *', async () => await redditPluginInit(Hans))
    // cron.schedule('* * * * *', async () => console.log('Hello'))
  } catch (error) {
    console.error('❌ ERROR: CronJobsTasks(): ', error)
  }
}