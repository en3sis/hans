#!/usr/bin/env node
import { SlashCommandBuilder } from '@discordjs/builders'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getBotConfiguration, insertConfiguration } from '../controllers/bot/config.controller'

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
  const commands: SlashCommandBuilder[] = []

  // Fetch command files
  const commandsPath = path.join(__dirname, `../commands${folderPath}`)
  const commandsFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))

  for (const file of commandsFiles) {
    const filePath = path.join(commandsPath, file)
    const commandModule = await import(filePath)
    const command = commandModule.default || commandModule
    commands.push(command.data.toJSON())
  }

  return commands
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
        folderName: config.botDevFolder,
        id: config.botGuildId,
      }).then((response) =>
        console.log(`🏗  DEV: guildCommands(${config.botDevFolder}) => `, response),
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
