import { Client, Message } from 'discord.js'

export const inviteBot = (client: Client) => {
  try {
    return {
      embeds: [
        {
          title: '🤖 Invite Hans to your server',
          description: `Thanks for your interest in inviting Hans to your own server!`,
          fields: [
            {
              name: '🔗 Invite link',
              value: ` https://discord.com/api/oauth2/authorize?client_id=${process.env
                .DISCORD_CLIENT_ID!}&permissions=0&scope=bot%20applications.commands`,
            },
            {
              name: '✅ Trusted by',
              value: `${client.guilds.cache.size} Servers`,
            },
          ],
          footer: {
            text: 'Made with absolute 💙 and some TypeScript',
          },
          color: 0x5865f2,
        },
      ],
    }
  } catch (error) {
    console.log('ERROR: utils > inviteBot() ', error)
  }
}

export const RenameBot = async (message: Message) => {
  return await message.guild.members.cache.get(process.env.DISCORD_CLIENT_ID).setNickname('')
}
