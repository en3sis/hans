/**
 * Custom_id encoding and parsing.
 *
 * Format: `pn:<action>[:<plugin>[:<arg>[:<arg>...]]]`
 * Discord allows up to 100 chars; our longest is well under it
 * (`pn:save:serverMembersActivity:abc` ≈ 35 chars).
 */
import { isPluginName, PluginName } from '../../models/plugins.model'
import { CUSTOM_ID_PREFIX, PanelAction, ParsedCustomId } from './types'

const KNOWN_ACTIONS: ReadonlySet<PanelAction> = new Set([
  'home',
  'open',
  'item',
  'tog',
  'clr',
  'cfm',
  'edit',
  'add',
  'del',
  'sel',
  'save',
  'act',
])

export const buildCustomId = (
  action: PanelAction,
  plugin?: PluginName | null,
  ...args: Array<string | number>
): string => {
  const parts: string[] = [CUSTOM_ID_PREFIX, action]
  if (plugin) parts.push(plugin)
  for (const a of args) parts.push(String(a))
  const id = parts.join(':')
  if (id.length > 100) {
    throw new Error(`custom_id exceeds 100 chars: ${id}`)
  }
  return id
}

export const parseCustomId = (raw: string): ParsedCustomId | null => {
  if (!raw.startsWith(`${CUSTOM_ID_PREFIX}:`)) return null
  const parts = raw.split(':')
  const action = parts[1] as PanelAction
  if (!KNOWN_ACTIONS.has(action)) return null

  const plugin = parts[2]
  if (plugin && !isPluginName(plugin)) {
    return { action, args: parts.slice(2) }
  }
  return {
    action,
    plugin: plugin as PluginName | undefined,
    args: parts.slice(3),
  }
}

export const isPanelCustomId = (raw: string): boolean =>
  raw.startsWith(`${CUSTOM_ID_PREFIX}:`)
