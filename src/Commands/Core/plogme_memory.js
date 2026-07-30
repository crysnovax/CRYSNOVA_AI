const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const MEM_FILE = path.join(DATA_DIR, 'plogme_memory.jsonl');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function save(entry) {
  ensureDataDir();
  const item = Object.assign({}, entry);
  if (!item.id) item.id = crypto.randomBytes(8).toString('hex');
  if (!item.timestamp) item.timestamp = Date.now();
  // append as JSONL
  fs.appendFileSync(MEM_FILE, JSON.stringify(item) + '\n', 'utf8');
  return item;
}

async function list({ chat, limit = 20 } = {}) {
  ensureDataDir();
  if (!fs.existsSync(MEM_FILE)) return [];
  const lines = fs.readFileSync(MEM_FILE, 'utf8').split('\n').filter(Boolean);
  let items = lines.map(l => { try { return JSON.parse(l); } catch(e) { return null; } }).filter(Boolean);
  if (chat) items = items.filter(it => it.chat === chat);
  items.sort((a,b) => b.timestamp - a.timestamp);
  return items.slice(0, limit);
}

async function search({ query, limit = 20 } = {}) {
  ensureDataDir();
  if (!fs.existsSync(MEM_FILE)) return [];
  const q = (query || '').toLowerCase();
  if (!q) return [];
  const lines = fs.readFileSync(MEM_FILE, 'utf8').split('\n').filter(Boolean);
  const items = lines.map(l => { try { return JSON.parse(l); } catch(e) { return null; } }).filter(Boolean);
  const matches = items.filter(it => (it.text || '').toLowerCase().includes(q));
  matches.sort((a,b) => b.timestamp - a.timestamp);
  return matches.slice(0, limit);
}

async function clear({ chat, all = false } = {}) {
  ensureDataDir();
  if (!fs.existsSync(MEM_FILE)) return;
  if (all) {
    fs.unlinkSync(MEM_FILE);
    return;
  }
  const lines = fs.readFileSync(MEM_FILE, 'utf8').split('\n').filter(Boolean);
  const items = lines.map(l => { try { return JSON.parse(l); } catch(e) { return null; } }).filter(Boolean);
  const keep = items.filter(it => it.chat !== chat);
  const out = keep.map(i => JSON.stringify(i)).join('\n') + (keep.length ? '\n' : '');
  fs.writeFileSync(MEM_FILE, out, 'utf8');
}

module.exports = {
  save,
  list,
  search,
  clear
};
