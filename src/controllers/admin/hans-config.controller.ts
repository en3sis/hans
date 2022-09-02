import { mongoClient } from '../../lib/mongodb-driver'

/**
 * Adds the bot configuration, this is for admins only.
 * here you can set things like main discord guild
 */
export const insertConfiguration = async () => {
  try {
    const doc = await mongoClient
      .db('hans')
      .collection('config')
      .updateOne(
        {
          name: 'Hans',
        },
        {
          $setOnInsert: {
            name: 'Hans',
            website: '',
            guildId: `${process.env.BOT_GUILD_ID}`,
            commandsDevGuild: {
              folderName: '/bots-playground',
            },
            botStartAlertChannel: ``, // This requires a github API
          },
        },
        { upsert: true }
      )

    doc.modifiedCount > 0 ?? console.log(`📥  Initial configuration inserted`)
  } catch (error) {
    console.log('ERROR: insertConfiguration(): ', error)
  }
}
