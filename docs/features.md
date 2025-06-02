# Hans Features & Plugins Reference

Hans offers a wide range of commands and plugins, all built with `SlashCommandBuilder` for seamless Discord integration.

---

## 🧠 Natural Language Processing (NLP)

Hans can understand and process natural language messages, not just slash commands! This means you can mention Hans and type requests in plain English, and Hans will map your message to the correct command automatically.

**How it works:**

- Mention Hans in a message (e.g., `@hans what's the weather in Tokyo?`).
- Hans uses its NLP engine to classify your intent and extract parameters (like city names, Twitch usernames, or message counts).
- If the intent is recognized with high confidence, Hans runs the appropriate command with the extracted parameters.
- If the intent is unclear or confidence is low, Hans will fall back to ChatGPT to answer your question.

**Supported NLP Commands:**

- `weather` — Ask about the weather in any city ("What's the weather in Madrid?").
- `twitch` — Get Twitch streamer info ("Show me ninja's Twitch profile").
- `moderation` — Purge/delete messages ("Delete 5 messages" or "Remove 10 messages from John").
- `ask` — General questions or topics ("Explain quantum physics").

> Hans will always try to extract the right parameters (like city, username, or number of messages) from your message, even if you phrase it differently.

---

## 🔒 Security

- All data stored in our database is encrypted using `aes-256-cbc` for maximum security.

---

## 🧩 Plugins

Plugins extend Hans' functionality. By default, only the owner (admin) can use them, but you can grant access to other roles (e.g., Moderators) via `Server Settings -> Integrations -> Hans` and selecting the desired command.

Manage plugins with the `/plugins` command, which includes several subcommands for enabling/disabling and configuring plugins per server.

### `/plugins toggle`

Enable or disable a plugin for your server.

**Arguments:**

- `plugin_name`: Name of the plugin to toggle.
- `plugin_toggle`: `true` to enable, `false` to disable.

### `/plugins threads`

Automatically create threads in a selected channel.

**Arguments:**

- `thread_channel`: Channel to use for automatic threads.
- `toggle`: (Optional) Disable/enable the feature (enabled by default).
- `thread_title`: (Optional) Custom title for each thread.
- `thread_automessage`: (Optional) Auto-response message in each thread.

### `/plugins server_activity`

Get notifications for members joining or leaving the server.

**Arguments:**

- `server_activity_channel`: Channel for join/leave notifications.

### `/plugins verify`

Send a verification message with a button. Users must complete a captcha to get a role.

**Arguments:**

- `role`: Role to assign after successful verification.

### `/plugins chatgpt`

Integrate ChatGPT for AI-powered conversations. Limited to 100 uses per day per guild (resets at 00:00). You can use your own OpenAI key/organization.

**Arguments:**

- `api_key`: Your OpenAI API Key | 🔒
- `organization_id`: Your OpenAI Organization ID | 🔒

### `/plugins standup`

Schedule daily standup reminders in a channel, mentioning a role, and auto-create a thread for responses.

**Arguments:**

- `channel`: Channel for the reminder message.
- `hour`: Time (24h format, e.g., 11 or 14).
- `message`: (Optional) Custom message for the thread title.
- `role`: (Optional) Role to mention.

---

## 🛡 Moderation Commands

### `/moderation purge {n}`

Delete up to 100 recent messages (not older than 15 days, per Discord API limits).

**Arguments:**

- `n`: Number of messages to purge.

---

## 🎲 Fun & Random Commands

### `/mock`

Transform input text into the SpongeBob meme format.

### `/about @user`

Display information about a user's profile.

---

## 🧰 Utility & Productivity Commands

### `/weather`

Get the current weather for a specified city.

### `/timezone`

Set and compare time zones for server members. Useful for global coordination and planning.

### `/events`

Generate quick links to add upcoming Guild Events to Google or Outlook calendars.

### `/ask`

Interact with the latest ChatGPT model (subject to daily limits).

---

## 🤖 Bot-Related Commands

### `/invite`

Get Hans' invite link and additional details.

### `/support`

Get links to the support server and GitHub repository for issues and feature requests.

---

## 🚧 Coming Soon

### `sentimentAnalysis`

Analyze message sentiment using the `sentiment` library. Useful for large communities to flag negative messages for moderators.

### `/tools summarize`

Summarize long text to a maximum of 100 words.

### `/tools message` (WIP)

Summarize a long Discord message to a maximum of 100 words.
