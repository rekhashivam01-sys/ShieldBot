const { getGuildConfig } = require('../config/guildConfig');

// In-memory spam tracker: Map<guildId, Map<userId, timestamps[]>>
const spamTracker = new Map();

const INVITE_REGEX = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-zA-Z0-9-]+/i;
const LINK_REGEX = /(https?:\/\/[^\s]+)/i;

function getUserTimestamps(guildId, userId) {
  if (!spamTracker.has(guildId)) spamTracker.set(guildId, new Map());
  const guildMap = spamTracker.get(guildId);
  if (!guildMap.has(userId)) guildMap.set(userId, []);
  return guildMap.get(userId);
}

function isSpam(message, config) {
  const { spamMessageLimit, spamIntervalMs } = config.automod;
  const timestamps = getUserTimestamps(message.guild.id, message.author.id);
  const now = Date.now();

  // Drop timestamps outside the interval window
  const recent = timestamps.filter(t => now - t < spamIntervalMs);
  recent.push(now);
  spamTracker.get(message.guild.id).set(message.author.id, recent);

  return recent.length > spamMessageLimit;
}

function isMentionSpam(message, config) {
  const mentionCount = message.mentions.users.size + message.mentions.roles.size;
  return mentionCount > config.automod.maxMentions;
}

function isCapsSpam(message, config) {
  const content = message.content;
  if (content.length < config.automod.capsMinLength) return false;
  const letters = content.replace(/[^a-zA-Z]/g, '');
  if (letters.length < config.automod.capsMinLength) return false;
  const upper = letters.replace(/[^A-Z]/g, '');
  const percent = (upper.length / letters.length) * 100;
  return percent >= config.automod.capsPercentThreshold;
}

async function logAction(message, reason) {
  const config = getGuildConfig(message.guild.id);
  if (!config.logChannelId) return;
  const channel = message.guild.channels.cache.get(config.logChannelId);
  if (!channel) return;
  channel.send({
    embeds: [
      {
        title: '🛡️ Automod Action',
        color: 0xff5555,
        fields: [
          { name: 'User', value: `${message.author.tag} (${message.author.id})` },
          { name: 'Channel', value: `${message.channel}` },
          { name: 'Reason', value: reason }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  }).catch(() => {});
}

/**
 * Runs all automod checks against a message.
 * Returns true if the message was actioned (deleted), false otherwise.
 */
async function runAutomod(message) {
  if (!message.guild || message.author.bot) return false;

  const config = getGuildConfig(message.guild.id);
  if (!config.automod.enabled) return false;

  // Never automod members with Manage Messages permission (mods/admins)
  if (message.member?.permissions.has('ManageMessages')) return false;

  let reason = null;

  if (config.automod.antiInvite && INVITE_REGEX.test(message.content)) {
    reason = 'Posted a Discord invite link';
  } else if (config.automod.antiLink && LINK_REGEX.test(message.content)) {
    reason = 'Posted a link';
  } else if (config.automod.antiMentionSpam && isMentionSpam(message, config)) {
    reason = 'Mass mention / mention spam';
  } else if (config.automod.antiCaps && isCapsSpam(message, config)) {
    reason = 'Excessive caps';
  } else if (config.automod.antiSpam && isSpam(message, config)) {
    reason = 'Message spam';
  }

  if (reason) {
    try {
      await message.delete();
    } catch (e) {
      // Missing permissions or already deleted
    }
    try {
      await message.channel.send({
        content: `⚠️ ${message.author}, your message was removed: **${reason}**`
      }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
    } catch (e) {}

    await logAction(message, reason);
    return true;
  }

  return false;
}

module.exports = { runAutomod };
