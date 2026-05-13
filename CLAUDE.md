# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Plugin configuration — how this codebase does it

All admin-facing plugin configuration lives in **one declarative system**. There are no per-plugin slash subcommands (`/plugins toggle`, `/plugins threads`, etc. were all removed). The single entry point is `/plugins`, which opens a v2-components panel.

### Where things live

| Concern | File |
|---|---|
| Plugin registry (label, icon, global enable, premium, defaults, cache) | `src/models/plugins.model.ts` — `PLUGIN_REGISTRY` |
| Per-plugin metadata TypeScript shapes | `src/types/plugins.ts` — `PluginMetadataMap` |
| Per-plugin panel schema (fields, list/object, customActions) | `src/services/plugin-panels/schemas.ts` — `PLUGIN_PANELS` |
| Plugin-specific side-effect buttons (e.g. "Post captcha message") | `src/services/plugin-panels/custom-actions.ts` |
| Stateful sub-flows that don't fit the schema (e.g. quest wizard) | sibling files in `src/services/plugin-panels/<name>-flow.ts`, routed via their own `<name>:` custom_id namespace from `src/events/interactionCreate.ts` |
| Settings read path (typed) | `getPluginConfig<K>(guildId, name)` in `src/controllers/bot/plugins.controller.ts` |
| Settings write path (handles cache + cron side-effects) | `onGuildPluginChanged(guildId, name)` — called from panel handlers and any direct DB writer |

### Adding or modifying a plugin

The default change is **three edits in three files**:

1. **`PLUGIN_REGISTRY`** — add/edit the entry: `label`, `icon`, `description`, `category`, `enabled` (global kill-switch), `premium`, `defaultEnabled` (per-guild default), `cacheable`.
2. **`PluginMetadataMap`** — declare the JSONB shape stored in `guilds_plugins.metadata`.
3. **`PLUGIN_PANELS`** — declare the admin UI: `fields` (object metadata) or `list` (array metadata). Optional `customActions` for plugin-specific buttons, optional `transform` for computed fields on save.

Field kinds available: `channel`, `role` (with `multi?`), `string`, `text`, `secret` (auto-encrypted + masked), `hour`, `weekdays`, `choice`. No new renderer/handler code needed for any of them.

To consume a plugin's settings from code (event handler, controller, etc.), always use `getPluginConfig(guildId, 'pluginName')` — never read `guilds_plugins` directly. The metadata is typed via `PluginMetadataMap[K]`.

To write outside the panel, write the row, then call `onGuildPluginChanged(guildId, pluginName)` so the cache and any cron jobs stay consistent.

### Globally disabling a plugin

Set `PLUGIN_REGISTRY[name].enabled = false`. The list view filters it out automatically and the toggle blocks per-guild enable. The DB row is upserted on the next bot start via `insertPlugins()` so the change actually reaches production.

### Slash command deployment — keep `slash` and `slash:dev` in sync

Both scripts read from **the same source folder**: `src/commands/`.

| Script | Scope | Propagation | Use when |
|---|---|---|---|
| `yarn slash:dev` | Dev guild (guild-scoped) | Instant | Iterating locally — run after any change in `src/commands/` or `PLUGIN_REGISTRY` that affects slash registration |
| `yarn slash` | Global | Up to 1 hour | Production deploy |

**Rule:** whenever you add, rename, or remove a command file in `src/commands/`, you must run `yarn slash:dev` before testing in the dev guild. The two scripts are not allowed to diverge — there is no separate "dev-only commands" folder; promotion is not a thing, the same files ship to both scopes.

#### Work-in-progress commands

To keep an unfinished command out of the global (production) deploy while still iterating on it in the dev guild, export `wip: true` from the command module:

```ts
module.exports = {
  ephemeral: true,
  wip: true,                                      // ← ships only to the dev guild
  data: new SlashCommandBuilder().setName(...)...,
  async execute(interaction) { ... },
}
```

- `yarn slash:dev` — includes WIP commands (dev guild gets the full set).
- `yarn slash` — skips them and logs `🚧  Skipped N WIP command(s): name1, name2`.

Remove the `wip` line when the command is ready to ship globally. There is no other way to gate a command — no separate folder, no env flag, no allow-list. One file, one boolean.

### Don't reinvent

Before adding a new mechanism, check: does the existing schema cover this? Is there a `customAction` (button) hook? Is there an existing sub-flow file? Adding per-plugin one-off code paths is a regression — the value of this system is that 12 plugins all use the same renderer, router, and persistence path. New behavior should fit one of the existing extension points (schema field kind, custom action, or sibling sub-flow file).

### One bad guild must not kill the bot

A plugin's runtime code runs across every guild that has it enabled. A single guild's malformed config (an incomplete-draft list item, a now-deleted channel, a revoked permission) **must not crash the bot or even kill other guilds' scheduling**.

Rules for code that processes per-guild config (cron registration, message-event handlers, background loops):

1. **Per-item try/catch.** When iterating a list of per-guild items, wrap each iteration in its own try/catch. Don't let one bad item abort the loop.
2. **Validate before constructing.** Check required fields exist before passing them to libraries that throw on undefined (e.g. `new CronJob(expression)` will throw if `expression` is undefined). Treat missing/invalid items as drafts and silently skip them — they're a normal state when an admin walks away mid-edit.
3. **Notify, don't crash.** For genuinely unexpected errors (not "draft skipped"), call `reportErrorToMonitoring({ embeds: {...} })` so the issue surfaces in the webhook channel. Best-effort — wrap it in `.catch(() => {})` so the monitoring call itself can never escalate.
4. **No top-level throws from background tasks.** The bot process must keep running. If a single guild's setup fails, log + monitor; never let the exception bubble to the event loop.

Example shape:
```ts
schedules.forEach((s, idx) => {
  if (!isValid(s)) return                    // incomplete draft — skip silently
  try {
    new CronJob(s.expression, …).start()
  } catch (err) {
    console.error(`❌ guild ${guildId} schedule ${idx}:`, err)
    reportErrorToMonitoring({ embeds: { … } }).catch(() => {})
  }
})
```
