const { PermissionsBitField } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../config/guildConfig');

function requireAdmin(message) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    message.reply('❌ You need the **Administrator** permission to use this command.');
    return false;
  }
  return true;
}

function requireModerator(message) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
    message.reply('❌ You need the **Moderate Members** permission to use this command.');
    return false;
  }
  return true;
}

async function handleCommand(message, commandName, args) {
  const guildId = message.guild.id;

  switch (commandName) {
    // ---------- *automod enable | disable | status | set ----------
    case 'automod': {
      const sub = args[0]?.toLowerCase();

      if (sub === 'enable') {
        if (!requireAdmin(message)) return;
        updateGuildConfig(guildId, { automod: { enabled: true } });
        return message.reply('✅ Automod has been **enabled** for this server.');
      }

      if (sub === 'disable') {
        if (!requireAdmin(message)) return;
        updateGuildConfig(guildId, { automod: { enabled: false } });
        return message.reply('🛑 Automod has been **disabled** for this server.');
      }

      if (sub === 'status') {
        const config = getGuildConfig(guildId);
        const a = config.automod;
        return message.reply({
          embeds: [{
            title: '🛡️ Automod Status',
            color: a.enabled ? 0x57f287 : 0xed4245,
            fields: [
              { name: 'Enabled', value: a.enabled ? 'Yes' : 'No', inline: true },
              { name: 'Anti-Invite', value: a.antiInvite ? 'On' : 'Off', inline: true },
              { name: 'Anti-Link', value: a.antiLink ? 'On' : 'Off', inline: true },
              { name: 'Anti-Spam', value: a.antiSpam ? 'On' : 'Off', inline: true },
              { name: 'Anti-Mention-Spam', value: a.antiMentionSpam ? 'On' : 'Off', inline: true },
              { name: 'Anti-Caps', value: a.antiCaps ? 'On' : 'Off', inline: true },
              { name: 'Max Mentions', value: `${a.maxMentions}`, inline: true },
              { name: 'Spam Limit', value: `${a.spamMessageLimit} msgs / ${a.spamIntervalMs}ms`, inline: true }
            ]
          }]
        });
      }

      // *automod set <feature> <on|off>
      if (sub === 'set') {
        if (!requireAdmin(message)) return;
        const feature = args[1]?.toLowerCase();
        const value = args[2]?.toLowerCase();

        const featureMap = {
          antilink: 'antiLink',
          antiinvite: 'antiInvite',
          antispam: 'antiSpam',
          mentionspam: 'antiMentionSpam',
          caps: 'antiCaps'
        };

        if (!featureMap[feature] || !['on', 'off'].includes(value)) {
          return message.reply(
            '❌ Usage: `*automod set <antilink|antiinvite|antispam|mentionspam|caps> <on|off>`'
          );
        }

        updateGuildConfig(guildId, {
          automod: { [featureMap[feature]]: value === 'on' }
        });
        return message.reply(`✅ **${feature}** is now **${value}**.`);
      }

      return message.reply(
        '❌ Usage: `*automod <enable|disable|status|set>`'
      );
    }

    // ---------- *setprefix <newPrefix> ----------
    case 'setprefix': {
      if (!requireAdmin(message)) return;
      const newPrefix = args[0];
      if (!newPrefix || newPrefix.length > 5) {
        return message.reply('❌ Usage: `*setprefix <newPrefix>` (max 5 characters)');
      }
      updateGuildConfig(guildId, { prefix: newPrefix });
      return message.reply(`✅ Prefix updated to \`${newPrefix}\``);
    }

    // ---------- *setlogchannel #channel ----------
    case 'setlogchannel': {
      if (!requireAdmin(message)) return;
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply('❌ Usage: `*setlogchannel #channel`');
      updateGuildConfig(guildId, { logChannelId: channel.id });
      return message.reply(`✅ Automod logs will be sent to ${channel}.`);
    }

    // ---------- *warn @user reason ----------
    case 'warn': {
      if (!requireModerator(message)) return;
      const target = message.mentions.members.first();
      if (!target) return message.reply('❌ Usage: `*warn @user <reason>`');
      const reason = args.slice(1).join(' ') || 'No reason provided';

      const config = getGuildConfig(guildId);
      const warnings = config.warnings[target.id] || [];
      warnings.push({
        reason,
        moderatorId: message.author.id,
        timestamp: Date.now()
      });
      updateGuildConfig(guildId, { warnings: { [target.id]: warnings } });

      message.reply(`⚠️ ${target} has been warned. Reason: **${reason}** (Total warnings: ${warnings.length})`);
      target.send(`⚠️ You were warned in **${message.guild.name}**: ${reason}`).catch(() => {});
      return;
    }

    // ---------- *warnings @user ----------
    case 'warnings': {
      const target = message.mentions.members.first() || message.member;
      const config = getGuildConfig(guildId);
      const warnings = config.warnings[target.id] || [];
      if (warnings.length === 0) {
        return message.reply(`${target} has no warnings.`);
      }
      const list = warnings
        .map((w, i) => `**${i + 1}.** ${w.reason} — <@${w.moderatorId}> (<t:${Math.floor(w.timestamp / 1000)}:R>)`)
        .join('\n');
      return message.reply({ embeds: [{ title: `Warnings for ${target.user.tag}`, description: list, color: 0xfee75c }] });
    }

    // ---------- *kick @user reason ----------
    case 'kick': {
      if (!requireModerator(message)) return;
      const target = message.mentions.members.first();
      if (!target) return message.reply('❌ Usage: `*kick @user <reason>`');
      if (!target.kickable) return message.reply('❌ I cannot kick this member (role hierarchy).');
      const reason = args.slice(1).join(' ') || 'No reason provided';
      await target.kick(reason);
      return message.reply(`👢 Kicked ${target.user.tag}. Reason: ${reason}`);
    }

    // ---------- *ban @user reason ----------
    case 'ban': {
      if (!requireModerator(message)) return;
      const target = message.mentions.members.first();
      if (!target) return message.reply('❌ Usage: `*ban @user <reason>`');
      if (!target.bannable) return message.reply('❌ I cannot ban this member (role hierarchy).');
      const reason = args.slice(1).join(' ') || 'No reason provided';
      await target.ban({ reason });
      return message.reply(`🔨 Banned ${target.user.tag}. Reason: ${reason}`);
    }

    // ---------- *purge <amount> ----------
    case 'purge': {
      if (!requireModerator(message)) return;
      const amount = parseInt(args[0], 10);
      if (!amount || amount < 1 || amount > 100) {
        return message.reply('❌ Usage: `*purge <1-100>`');
      }
      const deleted = await message.channel.bulkDelete(amount + 1, true).catch(() => null);
      if (!deleted) return message.reply('❌ Could not delete messages (they may be older than 14 days).');
      const notice = await message.channel.send(`🧹 Deleted ${deleted.size - 1} messages.`);
      setTimeout(() => notice.delete().catch(() => {}), 4000);
      return;
    }

    // ---------- *help ----------
    case 'help': {
      const config = getGuildConfig(guildId);
      return message.reply({
        embeds: [{
          title: '🛡️ Protection Bot — Commands',
          color: 0x5865f2,
          description: `Current prefix: \`${config.prefix}\``,
          fields: [
            { name: `${config.prefix}automod enable / disable / status`, value: 'Toggle or check automod' },
            { name: `${config.prefix}automod set <feature> <on|off>`, value: 'antilink, antiinvite, antispam, mentionspam, caps' },
            { name: `${config.prefix}setprefix <prefix>`, value: 'Change the command prefix' },
            { name: `${config.prefix}setlogchannel #channel`, value: 'Set the automod log channel' },
            { name: `${config.prefix}warn @user <reason>`, value: 'Warn a member' },
            { name: `${config.prefix}warnings [@user]`, value: 'View warnings' },
            { name: `${config.prefix}kick / ban @user <reason>`, value: 'Moderation actions' },
            { name: `${config.prefix}purge <amount>`, value: 'Bulk delete messages' }
          ]
        }]
      });
    }

    default:
      return; // Unknown command, ignore silently
  }
}

module.exports = { handleCommand };
