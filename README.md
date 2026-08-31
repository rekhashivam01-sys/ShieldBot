# 🛡️ Protection Bot

A Discord moderation/automod bot using **prefix commands** (default prefix: `*`).

## Features

- **Automod**: anti-invite, anti-link, anti-spam (message flood), anti-mention-spam, anti-caps
- **Moderation**: warn, warnings, kick, ban, purge
- **Per-server settings** stored in `config/guilds.json` (custom prefix, log channel, toggles)
- Moderators (Manage Messages permission) are exempt from automod

## Setup

1. **Create a bot application**
   - Go to https://discord.com/developers/applications → New Application
   - Bot tab → Add Bot → copy the **Token**
   - Under "Privileged Gateway Intents", enable **Message Content Intent** and **Server Members Intent**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Copy `.env.example` to `.env`
   - Paste your bot token into DISCORD_TOKEN

4. **Invite the bot to your server**
   - In the Developer Portal, go to OAuth2 → URL Generator
   - Scopes: `bot`
   - Permissions: Administrator (simplest), or at minimum: Manage Messages, Kick Members, Ban Members, Moderate Members, Read/Send Messages
   - Open the generated URL and add the bot to your server

5. **Run the bot**
   ```bash
   npm start
   ```

## Commands (default prefix `*`)

| Command | Description |
|---|---|
| `*automod enable` | Turns automod ON for the server |
| `*automod disable` | Turns automod OFF |
| `*automod status` | Shows current automod settings |
| `*automod set <feature> <on\|off>` | Toggle a specific feature: `antilink`, `antiinvite`, `antispam`, `mentionspam`, `caps` |
| `*setprefix <newPrefix>` | Change the command prefix |
| `*setlogchannel #channel` | Set channel for automod action logs |
| `*warn @user <reason>` | Warn a member (saved persistently) |
| `*warnings [@user]` | View a member's warnings |
| `*kick @user <reason>` | Kick a member |
| `*ban @user <reason>` | Ban a member |
| `*purge <1-100>` | Bulk delete messages |
| `*help` | Show command list |

## How automod works

Every message is checked (unless the author has Manage Messages permission). If it matches
an enabled rule (Discord invite link, generic link, too many mentions, message flood, or excessive caps),
the bot deletes it, posts a short warning that self-deletes after 5 seconds, and logs the action
to your configured log channel.

## Project structure

```
protection-bot/
├── index.js                 # Bot entry point, event listeners
├── config/
│   └── guildConfig.js       # Per-server settings (JSON-backed)
├── automod/
│   └── automod.js           # Detection + enforcement logic
├── commands/
│   └── handler.js           # Prefix command implementations
├── package.json
└── .env.example
```

## Notes

- Data is stored in `config/guilds.json`, created automatically on first run. For production use
  at scale, consider swapping this for a real database (SQLite/MongoDB/PostgreSQL).
- Spam tracking is kept in memory and resets if the bot restarts.
