/**
 * Declarative plugin-panel schema.
 *
 * Each plugin declares its configuration as a list of fields with a `kind`.
 * The renderer turns the schema into a v2 components panel; the router
 * dispatches button/select/modal events back to handlers that write to
 * `guilds_plugins.metadata`. To add or extend a plugin's settings UI, edit
 * the schema entry — no per-plugin renderer or handler code required.
 */
import { ChannelType } from 'discord.js'
import type { PluginName } from '../../models/plugins.model'

/** A field kind is the unit of UI primitive shown to the admin. */
export type FieldKind =
  | { type: 'channel'; channelTypes?: ChannelType[]; placeholder?: string }
  | { type: 'role'; multi?: boolean; placeholder?: string }
  | { type: 'string'; max?: number; min?: number; placeholder?: string; pattern?: string }
  | { type: 'text'; max?: number; min?: number; placeholder?: string }
  | { type: 'secret'; max?: number; placeholder?: string }
  | { type: 'hour' }
  | { type: 'weekdays' }
  | { type: 'choice'; options: ChoiceOption[]; multi?: boolean; placeholder?: string }

export interface ChoiceOption {
  label: string
  value: string
  description?: string
}

export interface PanelField {
  /** JSON path in metadata. Must be a flat key (e.g. 'channelId'); no dots. */
  key: string
  label: string
  description?: string
  required?: boolean
  kind: FieldKind
}

/**
 * Custom panel-level action button (e.g. "Post verify message here").
 * Dispatched via `pn:act:<plugin>:<id>` to a handler registered in
 * `customActionHandlers.ts`.
 */
export interface CustomAction {
  id: string
  label: string
  style?: 'primary' | 'secondary' | 'success' | 'danger'
  description?: string
}

/**
 * Per-plugin panel definition.
 *
 * Two shapes:
 *  - `fields`: object metadata (single configuration blob).
 *  - `list`: array metadata (multiple items, each with `idKey` discriminator).
 *
 * Mutually exclusive. A plugin with neither is toggle-only.
 */
export interface PluginPanelSchema {
  title?: string
  fields?: PanelField[]
  list?: {
    /** Field whose value uniquely identifies an item (e.g. 'channelId'). */
    idKey: string
    fields: PanelField[]
    /** Render one line per item in the panel. */
    summary: (item: Record<string, unknown>) => string
    addLabel?: string
  }
  /**
   * Plugin-specific buttons rendered above the standard footer. Use for
   * one-off operations that aren't covered by fields (e.g. posting a
   * verification button to the current channel).
   */
  customActions?: CustomAction[]
  /**
   * Transform an item's metadata before persistence. Used to derive
   * computed fields (e.g. standup builds a cron expression from
   * `hour` + `days`). Runs on each save.
   */
  transform?: (item: Record<string, unknown>) => Record<string, unknown>
}

export type PluginPanelRegistry = Partial<Record<PluginName, PluginPanelSchema>>

/** Action verbs in custom_id routing (kept short — 100-char budget per id). */
export type PanelAction =
  | 'home'   // back to list view
  | 'open'   // open plugin panel
  | 'item'   // open list-item drilldown
  | 'tog'    // toggle enabled
  | 'clr'    // reset (request confirm)
  | 'cfm'    // confirm a destructive action (action:plugin[:idx])
  | 'edit'   // open edit modal
  | 'add'    // open add-item modal (list plugins)
  | 'del'    // remove list item
  | 'sel'    // inline select changed
  | 'save'   // modal submitted
  | 'act'    // custom plugin action

export interface ParsedCustomId {
  action: PanelAction
  plugin?: PluginName
  /** Trailing args: field key, item index, etc. */
  args: string[]
}

export const CUSTOM_ID_PREFIX = 'pn'

/** Day-of-week values used by the `weekdays` field kind. */
export const WEEKDAYS: ChoiceOption[] = [
  { label: 'Monday', value: 'mon' },
  { label: 'Tuesday', value: 'tue' },
  { label: 'Wednesday', value: 'wed' },
  { label: 'Thursday', value: 'thu' },
  { label: 'Friday', value: 'fri' },
  { label: 'Saturday', value: 'sat' },
  { label: 'Sunday', value: 'sun' },
]

/** 0..23 hours, used by the `hour` field kind. */
export const HOURS: ChoiceOption[] = Array.from({ length: 24 }, (_, h) => ({
  label: `${h.toString().padStart(2, '0')}:00`,
  value: String(h),
}))
