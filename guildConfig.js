const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'guilds.json');

// Default settings applied to every new server
const DEFAULTS = {
  prefix: process.env.DEFAULT_PREFIX || '*',
  automod: {
    enabled: false,
    antiLink: false,
    antiInvite: true,
    antiSpam: true,
    antiMentionSpam: true,
    antiCaps: false,
    maxMentions: 5,
    spamMessageLimit: 5,   // messages
    spamIntervalMs: 7000,  // within this many ms
    capsPercentThreshold: 70,
    capsMinLength: 10
  },
  logChannelId: null,
  mutedRoleId: null,
  warnings: {} // { userId: [ { reason, moderatorId, timestamp } ] }
};

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  try {
    return JSON.parse(raw || '{}');
  } catch (e) {
    console.error('Failed to parse guilds.json, resetting.', e);
    return {};
  }
}

function saveDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override || {})) {
    if (
      typeof override[key] === 'object' &&
      override[key] !== null &&
      !Array.isArray(override[key])
    ) {
      result[key] = deepMerge(base[key] || {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

function getGuildConfig(guildId) {
  const db = loadDb();
  const existing = db[guildId] || {};
  const merged = deepMerge(DEFAULTS, existing);
  return merged;
}

function saveGuildConfig(guildId, config) {
  const db = loadDb();
  db[guildId] = config;
  saveDb(db);
}

function updateGuildConfig(guildId, patch) {
  const current = getGuildConfig(guildId);
  const updated = deepMerge(current, patch);
  saveGuildConfig(guildId, updated);
  return updated;
}

module.exports = {
  getGuildConfig,
  saveGuildConfig,
  updateGuildConfig,
  DEFAULTS
};
