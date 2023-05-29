import { CommandInteraction } from 'discord.js'
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai'
import supabase from '../../libs/supabase'
import { GenericObjectT } from '../../types/objects'
import { DEFAULT_COLOR } from '../../utils/colors'
import { CHATGPT_COMMANDS_USAGE_DAILY } from '../../utils/constants'
import { decrypt } from '../../utils/crypto'
import { ROLE_MENTION_REGEX } from '../../utils/regex'
import { GuildPlugin } from '../bot/guilds.controller'

export const gpt3Controller = async (prompt: string, apiKey: string, organization: string) => {
  try {
    const { response, token } = await sendPrompt({
      input: `${prompt}`,
      version: '003',
      max_tokens: 150,
      apiKey,
      organization,
    })

    return {
      response: response.replace('AI:', ''),
      token,
    }
  } catch (error) {
    console.log('❌ gpt3Controller(): ', error)
    return error
  }
}

interface IOpenAIRequestSettings {
  model?: 'ada' | 'davinci'
  version?: '003' | '001'
  input: string
  max_tokens?: number
  temperature?: number
  presence_penalty?: number
  frequency_penalty?: number
  apiKey: string
  organization: string
}

const history = [] as ChatCompletionRequestMessage[]
/**
 * OpenAI API request
 * @param IOpenAIRequestSettings
 * @returns Promise<string>
 */
export const sendPrompt = async ({
  model,
  version = '001',
  input,
  max_tokens = 100,
  temperature = 0.3,
  presence_penalty = 0,
  frequency_penalty = 0.5,
  apiKey,
  organization,
}: IOpenAIRequestSettings) => {
  try {
    const OPEN_AI_CLIENT = new OpenAIApi(
      new Configuration({
        apiKey: apiKey,
        organization: organization,
      }),
    )

    let response: {
      response: string
      token: number
    }

    if (model) {
      const completion = await OPEN_AI_CLIENT.createCompletion({
        model: model ? `text-${model}-${version}` : 'gpt-3.5-turbo',
        prompt: `${input.split(', ').join('\n')}`,
        temperature: temperature,
        max_tokens: max_tokens,
        top_p: 0.3,
        presence_penalty,
        frequency_penalty,
      })

      response = {
        response: completion.data.choices[0].text,
        token: completion.data.usage.total_tokens,
      }
    } else {
      const completion = await OPEN_AI_CLIENT.createChatCompletion({
        model: 'gpt-3.5-turbo',
        n: 1,
        messages: [
          {
            role: 'system',
            content: `You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible, sometimes you can be sarcastic. Current date: ${new Date().toLocaleDateString()}`,
          },
          ...history,
          { role: 'user', content: input.split(', ').join('\n') },
        ],
      })

      history.slice(0, 1)
      history.push({ role: 'assistant', content: input.split(', ').join('\n') })

      response = {
        response: completion.data.choices[0].message.content.replace(ROLE_MENTION_REGEX, '$1'),
        token: completion.data.usage.total_tokens,
      }
    }

    return response
  } catch (error) {
    console.log('❌ OpenAiAPI(): ', error)
    return error
  }
}

export const chatGptCommandHandler = async (
  interaction: CommandInteraction,
  guild: GuildPlugin & { premium: boolean },
  guildPlugin: GenericObjectT | any,
  usage?: number,
) => {
  try {
    const prompt = interaction.options.get('prompt')!.value as string

    const API_KEY =
      guild.premium || usage > 0 ? process.env.OPENAI_API_KEY : decrypt(guildPlugin.api_key)

    const ORGANIZATION =
      guild.premium || usage > 0 ? process.env.OPENAI_ORGANIZATION_ID : decrypt(guildPlugin.org)

    const answer = await gpt3Controller(prompt, API_KEY, ORGANIZATION)

    if (!answer?.response || answer?.response === '' || answer?.response === undefined)
      return await interaction.editReply('💢 Something went wrong, please try again later.')

    await interaction.editReply({
      embeds: [
        {
          author: {
            name: `${interaction.user.username} asked:`,
            icon_url: interaction.user.avatarURL(),
          },
          description: `${prompt}`,
          color: 0x5865f2,
        },
        {
          author: {
            name: `${interaction.client.user.username} answered: `,
            icon_url: interaction.client.user.avatarURL(),
          },
          description: `${answer?.response}`,
          footer: {
            text: `Tokens: ${answer?.token} | Price: $${((answer?.token / 1000) * 0.002).toFixed(
              6,
            )} ${!guild.premium && `${usage} commands left`}`,
          },
          color: DEFAULT_COLOR,
        },
      ],
    })
  } catch (error) {
    console.error('❌ chatGptCommandHandler(): ', error)
    return error
  }
}

export const chatGptUsage = async (
  guildPlugin: any,
  guild_id: string,
): Promise<GuildPlugin | any> => {
  try {
    const { data: currentSettings } = await supabase
      .from('guilds-plugins')
      .select('*')
      .eq('name', 'chatGtp')
      .eq('owner', guild_id)
      .single()

    const _metadata = JSON.parse(JSON.stringify(currentSettings?.metadata)) || {}

    if (guildPlugin === null) {
      const { data } = await supabase
        .from('guilds-plugins')
        .update({ metadata: { ..._metadata, usage: CHATGPT_COMMANDS_USAGE_DAILY } })
        .eq('owner', guild_id)
        .eq('name', 'chatGtp')
        .select()

      return data
    } else {
      const { data } = await supabase
        .from('guilds-plugins')
        .update({ metadata: { ..._metadata, usage: guildPlugin.usage - 1 } })
        .eq('owner', guild_id)
        .eq('name', 'chatGtp')
        .select()

      return data
    }
  } catch (error) {
    console.error('❌ chatGptUsage(): ', error)
    return error
  }
}
