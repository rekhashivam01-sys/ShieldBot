require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials
} = require('discord.js');

const { getGuildConfig } = require('./config/guildConfig');
const { runAutomod } = require('./automod/automod');
const { handleCommand } = require('./commands/handler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity('for rule breakers | *help', { type: 3 }); // Watching
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // 1. Run automod checks first (deletes bad messages before commands are parsed)
  const actioned = await runAutomod(message);
  if (actioned) return;

  // 2. Parse prefix commands
  const config = getGuildConfig(message.guild.id);
  const prefix = config.prefix;

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  try {
    await handleCommand(message, commandName, args);
  } catch (err) {
    console.error('Command error:', err);
    message.reply('⚠️ Something went wrong running that command.').catch(() => {});
  }
});

client.login(process.env.MTU0Mzk2NDkxMDE3NjY5ODQ1MQ.GjWUzs.F_jLJU3aD-9bwIQ-J3DEirL19c0-0IEix66Ipo);
