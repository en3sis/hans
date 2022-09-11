import { mongoClient } from '../../lib/mongodb-driver'
import { IBot } from '../../types'

/**
 * Adds the bot configuration, this is for admins only.
 * here you can set things like main discord guild
 */
export const insertConfiguration = async () => {
  try {
    const config: IBot = {
      name: 'Hans',
      website: '',
      guildId: `${process.env.BOT_GUILD_ID}`,
      commandsDevGuild: {
        folderName: '/bots-playground',
      },
      activities: {
        type: 4,
        name: 'you',
      },
      permaInvite: 'https://discord.gg/2tK7PhkZ',
      botStartAlertChannel: ``, // This requires a github API key set in your env variables
    }

    const doc = await mongoClient.db('hans').collection('config').updateOne(
      {
        name: 'Hans',
      },
      {
        $setOnInsert: config,
      },
      { upsert: true }
    )

    doc.modifiedCount > 0 ?? console.log(`📥  Initial configuration inserted`)
  } catch (error) {
    console.log('❌ ERROR: insertConfiguration(): ', error)
  }
}
