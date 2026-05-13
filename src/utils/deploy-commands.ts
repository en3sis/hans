#!/usr/bin/env node
import { SlashCommandBuilder } from '@discordjs/builders'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { getBotConfiguration, insertConfiguration } from '../controllers/bot/config.controller'

dotenv.config({ path: process.cwd() + '/.env' })

// Register commands. `includeWip` controls whether commands tagged `wip: true`
// in their module export are deployed — true for the dev guild, false for prod.
const registryCommands = async (guild: {
  folderName: string
  id: string | null
  includeWip: boolean
}) => {
  console.log('📥  Registering commands...')
  const { folderName, id, includeWip } = guild
  const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN!)
  const { commands, skipped } = await fetchCommands({ folderPath: folderName, includeWip })

  if (skipped.length > 0) {
    console.log(`🚧  Skipped ${skipped.length} WIP command(s): ${skipped.join(', ')}`)
  }

  const response = id
    ? await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, id), {
        body: commands,
      })
    : await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
        body: commands,
      })

  if (!response) throw new Error(`Failed to register commands for ${folderName}`)
  return `✅ Registered ${commands.length} command(s) for ${folderName}${
    process.env.ISDEV ? `: ${JSON.stringify(response)}` : ''
  }`
}

/**
 * Load command files. When `includeWip` is false, command modules that export
 * `wip: true` are skipped — used by the production deploy to keep unfinished
 * commands out of the global command set while still letting them ship to the
 * dev guild.
 */
const fetchCommands = async ({
  folderPath,
  includeWip,
}: {
  folderPath: string
  includeWip: boolean
}): Promise<{ commands: SlashCommandBuilder[]; skipped: string[] }> => {
  const commands: SlashCommandBuilder[] = []
  const skipped: string[] = []

  const commandsFiles = fs
    .readdirSync(path.join(path.resolve(__dirname), `../commands${folderPath}`))
    .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))

  for (const file of commandsFiles) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const command = require(`${(path.resolve(__dirname), `../commands${folderPath}/${file}`)}`)
    if (!includeWip && command.wip === true) {
      skipped.push(command.data?.name ?? file)
      continue
    }
    commands.push(command.data.toJSON())
  }

  return { commands, skipped }
}


;(async () => {
  // Registry slash commands global & per guild
  try {
    console.log('📨 Creates document if not found')
    await insertConfiguration()

    console.log('⏳ Loading configuration for commands...')

    const config = await getBotConfiguration()
    if (!config) return console.log('Row with the configuration for Hans not found')

    // Same source folder (`src/commands/`) for both scripts so the dev guild
    // and production always see the identical command set. Only the scope
    // differs: dev → guild-scoped (instant), prod → global (~1h propagation).
    // Commands exporting `wip: true` ship only to the dev guild.
    if (process.env.ISDEV === 'true') {
      if (!config.bot_guild_id) {
        throw new Error('configs.bot_guild_id is unset — required for dev slash deploy')
      }
      await registryCommands({
        folderName: '/',
        id: config.bot_guild_id,
        includeWip: true,
      }).then((response) => console.log('🏗  DEV: ', response))
    } else {
      await registryCommands({
        folderName: '/',
        id: null,
        includeWip: false,
      }).then((response) => console.log('🏗  PROD: ', response))
    }
  } catch (error) {
    console.log('error: ', error)
  } finally {
    process.exit()
  }
})()
