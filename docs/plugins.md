# Plugin Configuration

One declarative system, two audiences.

## For server admins

Run **`/plugins`** (Administrator-only, ephemeral). Everything happens in the panel — there are no per-plugin slash commands.

1. **List view.** Every plugin appears with ✅ / ⛔ status, 💎 premium badge, description, and an **Open** button.
2. **Plugin panel.** Click Open on a plugin:
   - **Channel / role / hour / weekday / choice** fields — pick directly on the panel; the value saves immediately.
   - **Text / API-key** fields — click **Edit** to enter them in a modal.
   - **Enable / Disable** toggles the plugin (with global kill-switch respected).
   - **Reset** asks for confirmation before clearing all metadata and disabling.
   - **← Back** returns to the list view.
   - Some plugins have **custom actions** (e.g. "Post captcha button here" on the verify panel) — one-click operations on the current channel.
3. **List-style plugins** (Threads, Standup) show one row per configured item with an **Open** button. The drilldown lets you edit a specific item's fields, or **Remove** it. **Add** creates a new draft item and drops you into the drilldown to fill it in.
4. **Secrets** (ChatGPT API key) are stored encrypted and shown masked (`sk-…abcd`). They cannot be revealed; replace by re-entering.
5. Every panel action is logged to `command_usage` with `source='panel'` for audit/prioritisation analytics.

## For developers

The panel UI for every plugin is generated from a single declarative schema. Adding or extending plugin settings is one or two file edits.

### Add a new plugin in 3 steps

**1. Register it** in [`src/models/plugins.model.ts`](../src/models/plugins.model.ts) — `PLUGIN_REGISTRY`:

```ts
welcome: {
  description: 'Greets new members.',
  category: 'server',
  enabled: true,          // global kill-switch
  premium: false,
  defaultEnabled: false,  // value of guilds_plugins.enabled on first install
  cacheable: true,        // false if metadata is mutated on every read
},
```

**2. Type its metadata** in `PluginMetadataMap` ([`src/types/plugins.ts`](../src/types/plugins.ts)).

**3. Declare its panel** in [`src/services/plugin-panels/schemas.ts`](../src/services/plugin-panels/schemas.ts):

```ts
welcome: {
  title: 'Welcome message',
  fields: [
    { key: 'channelId', label: 'Channel', required: true,
      kind: { type: 'channel', channelTypes: [ChannelType.GuildText] } },
    { key: 'message',   label: 'Message', required: true,
      kind: { type: 'text', max: 2000 } },
  ],
},
```

That's it. Renderer, modal, validation, inline selects, persistence, cache invalidation, plugin-side-effects (cron rebind, etc.) and routing are derived. No new controller, no new slash command, no DB migration.

### Schema shapes

| Shape | Use |
|---|---|
| `{}` | toggle-only (no metadata, just enable/disable) |
| `{ fields: [...] }` | single config blob — `metadata` is one object |
| `{ list: { idKey, fields, summary, addLabel? } }` | array — `metadata` is `Record<string, unknown>[]`, items merged by `idKey` |

Optional on either shape: `customActions` (per-plugin buttons) and `transform` (computed metadata fields).

### Field kinds

| Kind | UI surface | Storage |
|---|---|---|
| `channel` | inline `ChannelSelectMenu` (`channelTypes?`) | channel ID string |
| `role` | inline `RoleSelectMenu` (`multi?`) | role ID string, or array if `multi: true` |
| `hour` | inline string select 00–23 | number 0–23 |
| `weekdays` | inline multi-select Mon–Sun | string array (`'mon' \| 'tue' \| ...`) |
| `choice` | inline string select (`multi?`) | string or string array |
| `string` | modal short text (`max`, `min`, `pattern`) | string |
| `text` | modal paragraph (`max`, `min`) | string |
| `secret` | modal short text → encrypted via `encrypt()`, masked on display | encrypted string |

Common per-field options: `key`, `label`, `description`, `required`.

### Custom actions

For one-off operations that aren't a stored field — e.g. "post the captcha button to this channel":

1. Add to the schema: `customActions: [{ id: 'postButton', label: '...', style: 'primary' }]`.
2. Register a handler in [`src/services/plugin-panels/custom-actions.ts`](../src/services/plugin-panels/custom-actions.ts) under the key `<plugin>.<id>`:

```ts
'welcome.testFire': async ({ interaction, guildId }) => {
  // perform the side effect
  return { message: 'Test welcome posted.' }
},
```

### Transforms

For derived/computed values. Standup uses this to build a cron expression from `hour` + `days`:

```ts
transform: (item) => {
  if (typeof item.hour === 'number' && Array.isArray(item.days)) {
    return { ...item, expression: buildCron(item.hour, item.days) }
  }
  return item
}
```

`transform` runs on every save (object or list item) right before persistence.

### Plugin-specific side effects (cron, etc.)

Don't write to `guildsPlugins` directly — go through the panel, or if you must do it from code, call `onGuildPluginChanged(guildId, name)` after the write. The hook handles cache invalidation and re-registers per-plugin tasks (standup cron is the current consumer).

### Custom ID convention

`pn:<action>:<plugin>[:<arg>]` — max 100 chars, validated at build time. Actions: `home`, `open`, `item`, `tog`, `clr`, `cfm`, `edit`, `add`, `del`, `sel`, `save`, `act`. You don't write these by hand; `buildCustomId()` produces them and `parseCustomId()` dispatches.

### After a code change

```
yarn build && yarn slash:dev    # registers commands to your dev guild instantly
```

No DB migration is needed when adding a plugin — `backfillAllGuildPlugins()` runs on `ready` and inserts the new `guilds_plugins` row for every existing guild with the registry's `defaultEnabled` value.

### Files

```
src/services/plugin-panels/
  types.ts            schema types & constants
  schemas.ts          ← edit this to add/change a plugin's settings UI
  custom-actions.ts   ← edit this to add plugin-specific side effects
  router.ts           custom_id encode/parse
  render.ts           generic v2 components renderer (list / panel / drilldown / confirm)
  modals.ts           modal builder from schema (uses v2 LabelBuilder)
  handlers.ts         persistence + dispatch + audit logging
  index.ts            openPanel(), routePanelInteraction(), isPanelCustomId()
```

### What was removed

The legacy `/plugins toggle | chatgpt | threads | verify | server_activity | standup` subcommands and their controller functions (`pluginChatGPTSettings`, `pluginThreadsSettings`, `toggleGuildPlugin`, `guildActivitySetChannel`, `verifyGuildPluginSettings`, `standupPluginController`) are gone. The panel is the only admin-facing surface; the user-facing captcha button (`open_verify_modal`) remains for end-users to click.
