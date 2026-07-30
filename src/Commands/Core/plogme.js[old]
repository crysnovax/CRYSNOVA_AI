const fs = require('fs');
const path = require('path');

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
  pendingPatch: null
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadData() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT, null, 2));
    return DEFAULT;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return Object.assign({}, DEFAULT, JSON.parse(raw));
  } catch (e) {
    console.error('plogme: failed to load data, using defaults', e);
    return DEFAULT;
  }
}

function saveData(d) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

function hasInvisibleMarker(text) {
  // Matches common zero-width and invisible characters (U+200B..U+200F, U+FEFF, etc.)
  return /[\u200B\u200C\u200D\u200E\u200F\uFEFF]/.test(text || '');
}

function parseJidOrMention(token, message, sock) {
  // Accept explicit JID or mention like @username (try to map to jid if available)
  if (!token) return null;
  if (token.includes('@')) return token;
  // if mention like @user, attempt to extract numeric jid from message context (best-effort)
  const mentionMatch = token.match(/^@?(.+)$/);
  if (mentionMatch) {
    // If message contains mentions, prefer to use m.mentionedJid (populated by framework)
    if (message && message.mentionedJid && message.mentionedJid.length) return message.mentionedJid[0];
    // fallback — user can provide full JID
    return null;
  }
  return null;
}

module.exports = {
  name: 'plogme',
  category: 'core',
  description: 'Developer assistant (creator-only control, can add/remove allowed users; check/fix files)',
  async execute(sock, m, { reply, sendMessage }) {

    const data = loadData();
    const text = (m?.body || '').trim();
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

    const sender = m?.sender || (m?.key && m.key.participant) || '';
    const isCreator = sender === data.creator;
    const isAllowed = data.allowed.includes(sender) || isCreator;

    // If controlling subcommands, require allowed user
    if (['on','off','add','remove','apply'].includes(sub)) {
      if (!isAllowed) return reply('_✘ You are not authorized to manage plogme._');
    }

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
        if (!data.allowed.includes(jid)) {
          data.allowed.push(jid);
          saveData(data);
        }
        return reply(`_✔ Added ${jid} to allowed users._`);
      }

      case 'remove': {
        const targetToken = args[1];
        const jid = parseJidOrMention(targetToken, m, sock);
        if (!jid) return reply('_✘ Provide a valid JID or mention to remove._');
        data.allowed = data.allowed.filter(x => x !== jid);
        saveData(data);
        return reply(`_✔ Removed ${jid} from allowed users._`);
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
        return reply(`_✔ Suggestion prepared for ${targetPath}._\nUse ".plogme apply ${targetPath} <base64-content>" (creator only) to apply.`);
      }

      case 'apply': {
        // Creator-only apply of patch content encoded as base64
        const sender = m?.sender || (m?.key && m.key.participant) || '';
        const isCreator = sender === data.creator;
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
        // Here we produce a simple placeholder reply.
        return reply('_plogme is online — I can check files, suggest fixes, or prepare patches. Use ".plogme usage" for commands._');
      }
    }
  }
};
