import { Client, GuildMember, MessageReaction } from 'discord.js'

module.exports = {
  name: 'messageReactionRemove',
  once: false,
  enabled: false,
  async execute(Hans: Client, reaction: MessageReaction, member: GuildMember) {
    if (reaction.partial) {
      // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
      try {
        await reaction.fetch()
      } catch (error) {
        console.error('Something went wrong when fetching the message:', error)
        // Return as `reaction.message.author` may be undefined/null
        return
      }
    }

    // TODO @en3sis: Implement the messageReactionAdd event
    console.log('💢', {
      reaction,
      foo: reaction.emoji.id,
      member,
    })
  },
}
