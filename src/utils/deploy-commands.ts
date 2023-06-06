#!/usr/bin/env node
import { SlashCommandBuilder } from '@discordjs/builders'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { getBotConfiguration, insertConfiguration } from '../controllers/bot/config.controller'

dotenv.config({ path: process.cwd() + '/.env' })

// Register commands
const registryCommands = async (guild: { folderName: string; id: string | null }) => {
  // Instance REST client

  console.log('📥  Registering commands...')
  return new Promise(async (resolve, reject) => {
    try {
      const { folderName, id } = guild

      const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN!)

      // List of commands from files
      const commands = await fetchCommands({ folderPath: folderName })

      // If guildId is not provided, register commands globally
      const response = id
        ? await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, id), {
            body: commands,
          })
        : await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
            body: commands,
          })

      if (response) {
        resolve(
          `✅ Successfully registered commands for ${folderName}, response: ${
            !!process.env.ISDEV ? JSON.stringify(response) : ''
          }`,
        )
      } else {
        reject(`❌ Failed to register commands for ${folderName}`)
      }
    } catch (error) {
      reject(error)
      return `❌ Failed to register commands, ${error}`
    }
  })
}

const fetchCommands = async ({
  folderPath,
}: {
  folderPath: string
}): Promise<SlashCommandBuilder[]> => {
  return new Promise((resolve, reject) => {
    try {
      // Slash commands definitions
      const commands: SlashCommandBuilder[] = []

      // Fetch command files
      const commandsFiles = fs
        .readdirSync(path.join(path.resolve(__dirname), `../commands${folderPath}`))
        .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))

      for (const file of commandsFiles) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const command = require(`${(path.resolve(__dirname), `../commands${folderPath}/${file}`)}`)
        commands.push(command.data.toJSON())
      }

      return resolve(commands)
    } catch (error) {
      reject(error.message)
      console.log('❌ ERROR: fetchCommands(): ', error)
    }
  })
}

;(async () => {
  // Registry slash commands global & per guild
  try {
    console.log('📨 Creates document if not found')
    await insertConfiguration()

    console.log('⏳ Loading configuration for commands...')

    const config = await getBotConfiguration()
    if (!config) return console.log('Row with the configuration for Hans not found')

    if (process.env.ISDEV === 'true') {
      // Deploys to your development guild, those commands will be deployed instantly
      await registryCommands({
        folderName: config.bot_dev_folder,
        id: config.bot_guild_id,
      }).then((response) =>
        console.log(`🏗  DEV: guildCommands(${config.bot_dev_folder}) => `, response),
      )
    } else {
      // Deploys globally, those commands will take some time to be deployed.
      await registryCommands({
        folderName: '/',
        id: null,
      }).then((response) => console.log(`🏗  PROD: guildCommands() => `, response))
    }
  } catch (error) {
    console.log('error: ', error)
  } finally {
    process.exit()
  }
})()
