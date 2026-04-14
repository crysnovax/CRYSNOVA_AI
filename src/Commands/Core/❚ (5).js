const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { getVar } = require('../../Plugin/configManager');
const { downloadContentFromMessage } = require('@crysnovax/baileys');
const config = require('../../../settings/config');

// 🔐 Apex Gateway configuration with token authentication
const GATEWAY_URL = process.env.GATEWAY_URL || config.api?.gateway || 'https://api.crysnovax.link';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || config.api?.gatewayToken || '';

const MARKER = '\u200E';

const DATA_DIR = path.join(process.cwd(), 'database');
const TOGGLE_FILE = path.join(DATA_DIR, 'chatbot_toggle.json');
const MEMORY_FILE = path.join(DATA_DIR, 'chatbot_memory.json');
const MODE_FILE = path.join(DATA_DIR, 'chatbot_mode.json');
const TRAIN_FILE = path.join(DATA_DIR, 'chatbot_train.json');
const TRAIN_CHAT_FILE = path.join(DATA_DIR, 'chatbot_train_chat.json');
const PERSONALITY_FILE = path.join(DATA_DIR, 'chatbot_personality.json');
const PERSONALITY_CHAT_FILE = path.join(DATA_DIR, 'chatbot_personality_chat.json');
const GLOBAL_PRIV_FILE = path.join(DATA_DIR, 'chatbot_global_priv.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadJson(file, defaults = {}) {
    try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {}
    return defaults;
}
function saveJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

// ─── GETTERS ────────────────────────────────────────────────────
function isEnabled(jid) {
    const data = loadJson(TOGGLE_FILE, {});
    return data[jid] === true;
}
function getMode(jid) {
    const data = loadJson(MODE_FILE, {});
    return data[jid] || 'all';
}
function getTraining(jid) {
    const chatData = loadJson(TRAIN_CHAT_FILE, {});
    if (chatData[jid]) return chatData[jid];
    const globalData = loadJson(TRAIN_FILE, {});
    return globalData['global'] || null;
}
function getTrainingGlobal() {
    const data = loadJson(TRAIN_FILE, {});
    return data['global'] || null;
}
function getPersonality(jid) {
    const chatData = loadJson(PERSONALITY_CHAT_FILE, {});
    if (chatData[jid]) return chatData[jid];
    const globalData = loadJson(PERSONALITY_FILE, {});
    return globalData.text || getDefaultPersonality();
}
function getDefaultPersonality() {
    return `You are CRYSNOVA AI, a helpful WhatsApp assistant created by crysnovax. Keep replies short and natural.`;
}
function isGlobalPrivateEnabled() {
    const data = loadJson(GLOBAL_PRIV_FILE, { enabled: false });
    return data.enabled === true;
}

// ─── SETTERS ────────────────────────────────────────────────────
function setEnabled(jid, enabled) {
    const data = loadJson(TOGGLE_FILE, {});
    data[jid] = enabled;
    saveJson(TOGGLE_FILE, data);
}
function setMode(jid, mode) {
    if (mode !== 'all' && mode !== 'tag') return;
    const data = loadJson(MODE_FILE, {});
    data[jid] = mode;
    saveJson(MODE_FILE, data);
}
function setTraining(jid, prompt, isGlobal = false) {
    if (isGlobal) {
        const data = loadJson(TRAIN_FILE, {});
        if (prompt) data['global'] = prompt;
        else delete data['global'];
        saveJson(TRAIN_FILE, data);
    } else {
        const data = loadJson(TRAIN_CHAT_FILE, {});
        if (prompt) data[jid] = prompt;
        else delete data[jid];
        saveJson(TRAIN_CHAT_FILE, data);
    }
}
function setPersonality(text, jid = null) {
    if (jid) {
        const data = loadJson(PERSONALITY_CHAT_FILE, {});
        if (text) data[jid] = text;
        else delete data[jid];
        saveJson(PERSONALITY_CHAT_FILE, data);
    } else {
        saveJson(PERSONALITY_FILE, { text: text || '' });
    }
}
function setGlobalPrivateEnabled(enabled) {
    saveJson(GLOBAL_PRIV_FILE, { enabled: !!enabled });
}

// ─── MEMORY ─────────────────────────────────────────────────────
let memoryData = loadJson(MEMORY_FILE, {});
const MAX_MEMORY = 10;
function getHistory(jid) {
    if (!memoryData[jid]) memoryData[jid] = [];
    return memoryData[jid];
}
function addToHistory(jid, role, content) {
    let hist = getHistory(jid);
    hist.push({ role, content });
    if (hist.length > MAX_MEMORY) hist.shift();
    memoryData[jid] = hist;
    saveJson(MEMORY_FILE, memoryData);
}
function clearHistory(jid) {
    delete memoryData[jid];
    saveJson(MEMORY_FILE, memoryData);
}

// ─── PENDING IMAGE CONFIRMATION ──────────────────────────────────
const pendingImageAnalysis = new Map();

// ─── GATEWAY CALLS (with token authentication) ───────────────────
async function transcribeAudio(audioBuffer) {
    try {
        const form = new FormData();
        form.append('file', audioBuffer, { filename: 'audio.ogg', contentType: 'audio/ogg' });
        const res = await axios.post(`${GATEWAY_URL}/transcribe?token=${encodeURIComponent(GATEWAY_TOKEN)}`, form, {
            headers: form.getHeaders(),
            timeout: 60000,
        });
        return res.data?.text || '';
    } catch (err) {
        console.error('[Transcribe]', err.message);
        return '';
    }
}

async function describeImage(imageBuffer, customPrompt = 'Describe this image in detail.') {
    try {
        const form = new FormData();
        form.append('file', imageBuffer, { filename: 'image.jpg' });
        form.append('prompt', customPrompt);
        const res = await axios.post(`${GATEWAY_URL}/vision?token=${encodeURIComponent(GATEWAY_TOKEN)}`, form, {
            headers: form.getHeaders(),
            timeout: 60000,
        });
        return res.data?.description || '';
    } catch (err) {
        console.error('[Vision]', err.message);
        return '';
    }
}

async function generateImage(category, prompt) {
    try {
        const res = await axios.post(`${GATEWAY_URL}/generate-image?token=${encodeURIComponent(GATEWAY_TOKEN)}`, {
            category,
            prompt,
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
        });
        return res.data.url;
    } catch (err) {
        console.error('[Image Gen]', err.message);
        throw err;
    }
}

// ─── AI TEXT (via Gateway /chat) ─────────────────────────────────
function buildPrompt(userMessage, history, jid) {
    let context = '';
    for (const msg of history) {
        context += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    }
    const training = getTraining(jid);
    const personality = getPersonality(jid);
    let instruction = personality;

    instruction += `\n\nYou can generate images to enhance your answers. If the user's request would be better answered with a visual, or they explicitly ask for an image/picture/photo, output a special command exactly like this on its own line:\n[IMAGE:category:detailed prompt]\nCategories: horror, realistic, scifi\nExample: [IMAGE:realistic:a serene mountain lake at sunset]\nOnly use this when an image genuinely adds value. Otherwise, reply normally.`;

    if (training) instruction += `\n\nAdditional instructions for this chat: ${training}`;

    return `${instruction}\n\nConversation history:\n${context || '(No previous messages)'}\n\nUser: ${userMessage}\nAssistant:`;
}

async function askGPT(userMessage, jid) {
    const history = getHistory(jid);
    const prompt = buildPrompt(userMessage, history, jid);
    
    try {
        const res = await axios.post(`${GATEWAY_URL}/chat?token=${encodeURIComponent(GATEWAY_TOKEN)}`, {
            prompt: prompt,
            model: 'gpt-4.5'
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
        });
        
        let reply = res.data?.response || res.data?.text || res.data?.message || '';
        if (!reply) reply = '⟁⃝⚠︎ No response from AI.';
        
        addToHistory(jid, 'user', userMessage);
        addToHistory(jid, 'assistant', reply);
        return reply;
    } catch (err) {
        console.error('[Chatbot GPT]', err.message);
        return '⟁⃝⚠︎ AI service unavailable.';
    }
}

// ─── MENTION DETECTION (Tag Mode) ──────────────────────────────
function isOwnerMentioned(m, mek, ownerJid, botPnJid, botLid) {
    const rawMsg = mek?.message || {};
    const ctxInfo = rawMsg.extendedTextMessage?.contextInfo ||
                    rawMsg.imageMessage?.contextInfo ||
                    rawMsg.videoMessage?.contextInfo ||
                    rawMsg.documentMessage?.contextInfo || {};
    const allMentions = [
        ...(ctxInfo.mentionedJid || []),
        ...(m.mentionedJid || []),
        ...(m.msg?.contextInfo?.mentionedJid || []),
    ];
    const uniqueMentions = [...new Set(allMentions)].filter(Boolean);
    const norm = (j) => (j || '').replace(/:\d+@/, '@').toLowerCase().trim();

    for (const jid of uniqueMentions) {
        const normalized = norm(jid);
        if (normalized === norm(ownerJid) || normalized === norm(botPnJid)) return true;
        if (botLid && normalized === norm(botLid)) return true;
    }
    const quotedParticipant = ctxInfo.participant || ctxInfo.remoteJid || '';
    if (quotedParticipant && norm(quotedParticipant) === norm(ownerJid)) return true;
    return false;
}

// ─── DOWNLOAD AUDIO ──────────────────────────────────────────────
async function downloadAudio(message) {
    const audioMsg = message?.audioMessage || message?.message?.audioMessage;
    if (!audioMsg) throw new Error('No audio message');

    const stream = await downloadContentFromMessage(audioMsg, 'audio');
    let buffer = Buffer.alloc(0);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

// ─── DOWNLOAD IMAGE ───────────────────────────────────────────
async function downloadImage(m) {
    if (typeof m.download !== 'function') throw new Error('m.download not available');
    return await m.download();
}

// ─── MAIN HANDLER ───────────────────────────────────────────────
async function handleIncomingMessage(sock, m, mek) {
    const jid = m.chat;
    const isGroup = m.isGroup;

    // ✅ Check if chatbot is enabled FIRST
    let enabled = isEnabled(jid);
    if (!isGroup && isGlobalPrivateEnabled()) enabled = true;
    if (!enabled) return; // 🚫 Chatbot is off — ignore everything

    const mode = getMode(jid);
    if (mode === 'tag') {
        const ownerNumber = (process.env.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
        if (!ownerNumber) return;
        const ownerJid = `${ownerNumber}@s.whatsapp.net`;
        const botPnJid = (sock.user?.id || '').replace(/:\d+@/, '@s.whatsapp.net');
        const botLid = sock.user?.lid || '';
        if (!isOwnerMentioned(m, mek, ownerJid, botPnJid, botLid)) return;
    }

    // Check for pending image confirmation
    const pending = pendingImageAnalysis.get(jid);
    if (pending) {
        const text = (m.text || m.body || '').toString().toLowerCase().trim();
        const confirmWords = ['yes', 'analyze', 'describe', 'ok', 'go', 'sure', 'do it', 'read it', 'what is this', 'analyze it'];
        if (confirmWords.some(word => text.includes(word))) {
            pendingImageAnalysis.delete(jid);
            try {
                await sock.sendPresenceUpdate('composing', jid).catch(() => {});
                const description = await describeImage(pending.buffer, pending.caption || 'Describe this image in detail.');
                if (description) {
                    const trimmed = description.trim();
                    if (trimmed.length >= 2) {
                        await processUserText(sock, m, mek, jid, isGroup, trimmed);
                    }
                } else {
                    await sock.sendMessage(jid, { text: '`⁠☞⁠ ͡⁠°⁠ ͜⁠ʖ⁠ ͡⁠°⁠⁠☞ Cannot do that now`' }, { quoted: m });
                }
            } catch (err) {
                console.error('[Image Analysis]', err);
                await sock.sendMessage(jid, { text: '`⎙ bussy`' }, { quoted: m });
            }
            return;
        } else {
            pendingImageAnalysis.delete(jid);
        }
    }

    let userText = '';

    // 1️⃣ Text message
    if (m.text || m.body) {
        userText = (m.text || m.body).toString();
    }
    // 2️⃣ Voice note
    else if (m.message?.audioMessage || mek?.message?.audioMessage) {
        try {
            await sock.sendPresenceUpdate('composing', jid).catch(() => {});
            const audioBuffer = await downloadAudio(mek);
            const transcribed = await transcribeAudio(audioBuffer);
            if (transcribed) {
                userText = transcribed;
            } else {
                await sock.sendMessage(jid, { text: '`ಠ_ಠ chat please`' }, { quoted: m });
                return;
            }
        } catch (err) {
            console.error('[Voice]', err);
            return;
        }
    }
    // 3️⃣ Image
    else if (m.message?.imageMessage || mek?.message?.imageMessage) {
        const imageMsg = m.message?.imageMessage || mek?.message?.imageMessage;
        const caption = (imageMsg?.caption || '').trim();
        if (caption && !caption.startsWith('.')) {
            userText = caption;
        } else {
            try {
                const imageBuffer = await downloadImage(m);
                pendingImageAnalysis.set(jid, { buffer: imageBuffer, caption: '' });
                await sock.sendMessage(jid, {
                    text: `🖼️ *Image detected. ಥ⁠‿⁠ಥ*\n\nDo you want me to analyze this image? (yes / analyze / describe / ok)`
                }, { quoted: m });
                return;
            } catch (err) {
                console.error('[Image Download]', err);
                return;
            }
        }
    }
    else {
        return;
    }

    const trimmed = userText.trim();
    if (!trimmed) return;
    if (trimmed.includes(MARKER)) return;

    const prefix = getVar('PREFIX', '.');
    if (trimmed.startsWith(prefix)) return;

    await processUserText(sock, m, mek, jid, isGroup, trimmed);
}

// ─── Process user text (AI response) ─────────────────────────────
async function processUserText(sock, m, mek, jid, isGroup, trimmed) {
    if (trimmed.length < 2) return;

    try {
        await sock.sendPresenceUpdate('composing', jid).catch(() => {});
        const aiResponse = await askGPT(trimmed, jid);

        const imageMatch = aiResponse.match(/\[IMAGE:(\w+):(.*?)\]/i);
        if (imageMatch) {
            const category = imageMatch[1].toLowerCase();
            const imagePrompt = imageMatch[2].trim();
            if (['horror', 'realistic', 'scifi'].includes(category) && imagePrompt) {
                const imageUrl = await generateImage(category, imagePrompt);
                await sock.sendMessage(jid, {
                    image: { url: imageUrl },
                    caption: `🎨 *CRYSN⚉VA AI (${category.toUpperCase()})*\n📝 ${imagePrompt}`
                }, { quoted: m });
                addToHistory(jid, 'assistant', `[Generated a ${category} image: ${imagePrompt}]`);
                return;
            }
        }

        if (aiResponse) {
            await sock.sendMessage(jid, { text: aiResponse }, { quoted: m });
        }
    } catch (err) {
        console.error('[Chatbot]', err.message);
    }
}

// ─── EXPORTS ────────────────────────────────────────────────────
module.exports = {
    handleIncomingMessage,
    isEnabled,
    setEnabled,
    getMode,
    setMode,
    clearHistory,
    getTraining,
    setTraining,
    getTrainingGlobal,
    getPersonality,
    setPersonality,
    getDefaultPersonality,
    generateImage,
    isGlobalPrivateEnabled,
    setGlobalPrivateEnabled,
    getHistory,
};

//console.log('[Chatbot] Gateway URL:', GATEWAY_URL || 'NOT SET');
//console.log('[Chatbot] Token configured:', GATEWAY_TOKEN ? 'YES' : 'NO');