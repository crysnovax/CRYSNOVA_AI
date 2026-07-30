const fs = require('fs');
const path = require('path');

const memory = require('./plogme_memory');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'plogme.json');

// Creator and allowed list (initial values will be loaded from data file; kept here for reference)
const DEFAULT = {
  creator: '2348077134210@s.whatsapp.net',
  allowed: [
    '2348077134210@s.whatsapp.net',
    '2349122083563@s.whatsapp.net',
    '2348077528901@s.whatsapp.net'
  ],
  active: true,
  pendingPatch: null,
  memory: {
    autoSave: true,
    retentionDays: 365
  }
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function normalizeJid(jid) {
  if (!jid || typeof jid !== 'string') return jid;
  // normalize forms like: 12345:678@s.whatsapp.net -> 12345@s.whatsapp.net
  return jid.replace(/:\d+@/, '@');
}

function loadData() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT, null, 2));
    return DEFAULT;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = Object.assign({}, DEFAULT, JSON.parse(raw));
    // normalize creator and allowed list
    parsed.creator = normalizeJid(parsed.creator);
    parsed.allowed = Array.isArray(parsed.allowed) ? parsed.allowed.map(normalizeJid) : [];
    return parsed;
  } catch (e) {
    console.error('plogme: failed to load data, using defaults', e);
    return DEFAULT;
  }
}

function saveData(d) {
  ensureDataDir();
  // ensure normalization when saving
  const toSave = Object.assign({}, d);
  toSave.creator = normalizeJid(toSave.creator);
  toSave.allowed = Array.isArray(toSave.allowed) ? toSave.allowed.map(normalizeJid) : [];
  fs.writeFileSync(DATA_FILE, JSON.stringify(toSave, null, 2));
}

function hasInvisibleMarker(text) {
  // Matches common zero-width and invisible characters (U+200B..U+200F, U+FEFF, etc.)
  return /[\u200B\u200C\u200D\u200E\u200F\uFEFF]/.test(text || '');
}

function parseJidOrMention(token, message, sock) {
  if (!token) return null;
  token = token.trim();
  if (token.includes('@')) return normalizeJid(token);
  // if mention like @user, try to map to mentionedJid from message
  if (message && Array.isArray(message.mentionedJid) && message.mentionedJid.length) {
    return normalizeJid(message.mentionedJid[0]);
  }
  return null;
}

module.exports = {
  name: 'plogme',
  category: 'core',
  description: 'Developer assistant (creator-only control, can add/remove allowed users; check/fix files; persistent memory)',
  async execute(sock, m, { reply, sendMessage }) {

    const data = loadData();
    const text = (m?.body || m?.text || '').trim();
    const args = text.split(/\s+/).slice(1);
    const sub = (args[0] || '').toLowerCase();

    // Respect invisible marker rule: never respond if message contains invisible/zero-width characters
    if (hasInvisibleMarker(text)) {
      return; // silently ignore to avoid spam/exploit
    }

    // Trigger conditions: direct command, mention @plogme, or the word 'plogme'
    const isCommand = text.startsWith('.plogme') || text.startsWith('plogme') || /\bplogme\b/i.test(text) || /@plogme\b/i.test(text);
    const isMentionAny = /@\S+/.test(text); // additional allowance for "any @" mentions

    if (!isCommand && !isMentionAny) return;

    const rawSender = m?.sender || (m?.key && m.key.participant) || '';
    const sender = normalizeJid(rawSender);
    const isCreator = sender === normalizeJid(data.creator);
    const isAllowed = (Array.isArray(data.allowed) && data.allowed.includes(sender)) || isCreator;

    // If controlling subcommands, require allowed user
    if (['on','off','add','remove','apply'].includes(sub)) {
      if (!isAllowed) return reply('_✘ You are not authorized to manage plogme._');
    }

    // Helper to record memory (if enabled)
    const maybeRecordMemory = async (type, note) => {
      try {
        const cfg = data.memory || {};
        if (cfg.autoSave) {
          await memory.save({ timestamp: Date.now(), chat: m.chat, sender, role: type, text: note });
        }
      } catch (e) { console.error('[PLOGME MEMORY ERR]', e?.message); }
    };

    // Subcommands
    switch (sub) {
      case '':
      case 'help':
      case 'usage': {
        const usage = [
          'plogme — developer assistant (creator-only control)',
          'Usage:',
          '.plogme              — show this help',
          '.plogme on|off       — activate/deactivate assistant',
          '.plogme add <jid|@mention>    — add allowed user (creator only)',
          '.plogme remove <jid|@mention> — remove allowed user (creator only)',
          '.plogme check <path> — show preview of file at <path>',
          '.plogme fix <path>   — produce suggested patch (does NOT apply automatically)',
          '.plogme apply <path> <base64-content> — apply previously-sent patch (creator only)',
          '.plogme memory add <text> — add a memory note',
          '.plogme memory list [limit] — list recent memory entries',
          '.plogme memory search <query> — basic keyword search',
          '.plogme memory clear [all] — clear memory (creator only if all)',
          '',
          'Triggering:',
          '- Mention @plogme or include the word "plogme" to request assistance.',
          '- Messages that contain invisible markers are ignored (anti-spam).'
        ].join('\n');
        return reply(usage);
      }

      case 'on': {
        data.active = true;
        saveData(data);
        return reply('_✔ plogme activated_');
      }

      case 'off': {
        data.active = false;
        saveData(data);
        return reply('_✔ plogme deactivated_');
      }

      case 'add': {
        const targetToken = args[1];
        const jid = parseJidOrMention(targetToken, m, sock);
        if (!jid) return reply('_✘ Provide a valid JID or mention to add._');
        const normalized = normalizeJid(jid);
        if (!data.allowed.includes(normalized)) {
          data.allowed.push(normalized);
          saveData(data);
        }
        return reply(`_✔ Added ${normalized} to allowed users._`);
      }

      case 'remove': {
        const targetToken = args[1];
        const jid = parseJidOrMention(targetToken, m, sock);
        if (!jid) return reply('_✘ Provide a valid JID or mention to remove._');
        const normalized = normalizeJid(jid);
        data.allowed = data.allowed.filter(x => x !== normalized);
        saveData(data);
        return reply(`_✔ Removed ${normalized} from allowed users._`);
      }

      case 'memory': {
        // .plogme memory <sub>
        const memSub = (args[1] || '').toLowerCase();
        if (memSub === 'add') {
          const note = args.slice(2).join(' ').trim();
          if (!note) return reply('_✘ Provide text to save to memory._');
          await memory.save({ timestamp: Date.now(), chat: m.chat, sender, role: 'note', text: note });
          return reply('_✔ Memory saved._');
        }
        if (memSub === 'list') {
          const limit = parseInt(args[2]) || 10;
          const items = await memory.list({ chat: m.chat, limit });
          if (!items.length) return reply('_No memory items found._');
          const out = items.map(it => `- [${new Date(it.timestamp).toISOString()}] ${it.sender}: ${it.text.slice(0,200)}`).join('\n');
          return reply(`_Memory (last ${items.length}):_\n` + out);
        }
        if (memSub === 'search') {
          const q = args.slice(2).join(' ').trim();
          if (!q) return reply('_✘ Provide a search query._');
          const items = await memory.search({ query: q, limit: 20 });
          if (!items.length) return reply('_No matches found._');
          const out = items.map(it => `- [${new Date(it.timestamp).toISOString()}] ${it.sender}: ${it.text.slice(0,200)}`).join('\n');
          return reply(`_Memory search results:_\n` + out);
        }
        if (memSub === 'clear') {
          // clear for chat or all
          if (args[2] === 'all') {
            if (!isCreator) return reply('_✘ Only the creator can clear all memory._');
            await memory.clear({ all: true });
            return reply('_✔ Cleared all memory._');
          }
          await memory.clear({ chat: m.chat });
          return reply('_✔ Cleared memory for this chat._');
        }
        return reply('_Usage: .plogme memory add|list|search|clear ..._');
      }

      case 'check': {
        const targetPath = args[1];
        if (!targetPath) return reply('_✘ Provide a file path to check._');
        try {
          const repoRoot = path.join(__dirname, '..', '..', '..'); // best-effort repo root
          const abs = path.resolve(repoRoot, targetPath);
          if (!fs.existsSync(abs)) return reply('_✘ File not found._');
          const content = fs.readFileSync(abs, 'utf8');
          const preview = content.slice(0, 4000);
          await maybeRecordMemory('check', `checked ${targetPath}`);
          return reply(`_Preview of ${targetPath}_:\n\n` + '```' + '\n' + preview + (content.length > 4000 ? '\n\n[truncated]' : '') + '\n' + '```');
        } catch (e) {
          return reply('_✘ Error reading file: ' + String(e.message) + '_');
        }
      }

      case 'fix': {
        const targetPath = args[1];
        if (!targetPath) return reply('_✘ Provide a file path to fix._');
        // Placeholder: produce a suggested patch via external API or local heuristic.
        // For safety, we DO NOT auto-apply. Creator must run "plogme apply <path> <base64-content>" to apply.
        const suggestion = `/* plogme suggestion for ${targetPath} */\n// TODO: attach AI-generated patch via API and then use "plogme apply ${targetPath} <base64-content>" to apply.`;
        data.pendingPatch = { path: targetPath, suggestion };
        saveData(data);
        await maybeRecordMemory('fix', `suggestion prepared for ${targetPath}`);
        return reply(`_✔ Suggestion prepared for ${targetPath}._\nUse ".plogme apply ${targetPath} <base64-content>" (creator only) to apply.`);
      }

      case 'apply': {
        // Creator-only apply of patch content encoded as base64
        if (!isCreator) return reply('_✘ Only the creator can apply patches._');
        const targetPath = args[1];
        const b64 = args[2];
        if (!targetPath || !b64) return reply('_✘ Usage: .plogme apply <path> <base64-content>_');
        try {
          const repoRoot = path.join(__dirname, '..', '..', '..');
          const abs = path.resolve(repoRoot, targetPath);
          const content = Buffer.from(b64, 'base64').toString('utf8');
          fs.writeFileSync(abs, content, 'utf8');
          data.pendingPatch = null;
          saveData(data);
          await maybeRecordMemory('apply', `applied patch to ${targetPath}`);
          return reply(`_✔ Applied patch to ${targetPath} (local file updated)._`);
        } catch (e) {
          return reply('_✘ Error applying patch: ' + String(e.message) + '_');
        }
      }

      default: {
        // If message is not one of the above but mentions plogme, respond with a stubbing assistant reply.
        if (!data.active) return; // assistant disabled
        if (!isAllowed) return; // only allowed users get assistant responses
        // For real AI integration, plogme will call the same PREXZY or model endpoints used by the Core chatbot.
        // Here we produce a simple placeholder reply and record the request in memory.
        await maybeRecordMemory('request', text.slice(0, 1000));
        return reply('_plogme is online — I can check files, suggest fixes, or prepare patches. Use ".plogme usage" for commands._');
      }
    }
  }
};
