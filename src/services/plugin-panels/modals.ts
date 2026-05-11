import {
  LabelBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import { PluginName } from '../../models/plugins.model'
import { buildCustomId } from './router'
import { getPanelSchema } from './schemas'
import { PanelField } from './types'

const MAX_MODAL_ROWS = 5

const isModalKind = (type: PanelField['kind']['type']): boolean =>
  type === 'string' || type === 'text' || type === 'secret'

const styleFor = (type: PanelField['kind']['type']): TextInputStyle =>
  type === 'text' ? TextInputStyle.Paragraph : TextInputStyle.Short

/**
 * Build a modal containing the modal-eligible fields for a plugin. Used by
 * both edit and add flows; `idx` is appended to the submit custom_id for
 * list-style plugins so the handler knows which item to update.
 */
export const buildPluginModal = (
  name: PluginName,
  options: { idx?: number; prefill?: Record<string, unknown> } = {},
): ModalBuilder | null => {
  const schema = getPanelSchema(name)
  const fields = schema.list ? schema.list.fields : (schema.fields ?? [])
  const modalFields = fields.filter((f) => isModalKind(f.kind.type))
  if (modalFields.length === 0) return null
  if (modalFields.length > MAX_MODAL_ROWS) {
    throw new Error(
      `Plugin ${name} has ${modalFields.length} modal fields; Discord allows ${MAX_MODAL_ROWS} per modal.`,
    )
  }

  const customId =
    options.idx !== undefined ? buildCustomId('save', name, options.idx) : buildCustomId('save', name)

  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle((schema.title ?? name).slice(0, 45))

  const labels: LabelBuilder[] = []
  for (const f of modalFields) {
    const input = new TextInputBuilder()
      .setCustomId(f.key)
      .setStyle(styleFor(f.kind.type))
      .setRequired(!!f.required)

    const placeholder =
      (f.kind.type === 'string' || f.kind.type === 'text' || f.kind.type === 'secret') && f.kind.placeholder
        ? f.kind.placeholder
        : undefined
    if (placeholder) input.setPlaceholder(placeholder.slice(0, 100))

    if (f.kind.type === 'string' || f.kind.type === 'text' || f.kind.type === 'secret') {
      if (f.kind.max) input.setMaxLength(Math.min(f.kind.max, 4000))
      if (f.kind.type !== 'secret' && f.kind.min) input.setMinLength(f.kind.min)
    }

    // Pre-fill from current metadata when editing — but never for secrets
    // (they're stored encrypted and unreadable here).
    const prefill = options.prefill?.[f.key]
    if (f.kind.type !== 'secret' && prefill !== undefined && prefill !== null) {
      input.setValue(String(prefill).slice(0, 4000))
    }

    const label = new LabelBuilder().setLabel(f.label.slice(0, 45)).setTextInputComponent(input)
    if (f.description) label.setDescription(f.description.slice(0, 100))
    labels.push(label)
  }

  modal.addLabelComponents(...labels)
  return modal
}

/** Extract submitted values, applying validation declared in the schema. */
export const extractModalValues = (
  name: PluginName,
  interaction: ModalSubmitInteraction,
): { values: Record<string, string>; errors: string[] } => {
  const schema = getPanelSchema(name)
  const fields = schema.list ? schema.list.fields : (schema.fields ?? [])
  const modalFields = fields.filter((f) => isModalKind(f.kind.type))

  const values: Record<string, string> = {}
  const errors: string[] = []

  for (const f of modalFields) {
    let raw: string
    try {
      raw = interaction.fields.getTextInputValue(f.key).trim()
    } catch {
      raw = ''
    }
    if (!raw) {
      if (f.required) errors.push(`**${f.label}** is required.`)
      continue
    }

    if (f.kind.type === 'string' && f.kind.pattern) {
      const re = new RegExp(f.kind.pattern)
      if (!re.test(raw)) errors.push(`**${f.label}** does not match required format.`)
    }

    values[f.key] = raw
  }
  return { values, errors }
}
