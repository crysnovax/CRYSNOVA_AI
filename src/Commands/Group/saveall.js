// saveall.js — save every number in the group.
// Builds a real .vcf contact file with ALL members and sends it as a document,
// so the user can import everyone's number in one tap. Alias: export.
// @crysnovax—FIX09-08-26
// FIX09-08-26: members now resolve their phone numbers through the store /
// lidMapping, so @lid participant jids are no longer silently dropped
// (that's what caused "✘ Could not build contact list for this group").
const fs = require('fs');
const path = require('path');

// Resolve a participant to its real phone number (digits only) regardless of
// whether the metadata gives us an @s.whatsapp.net jid or an @lid jid.
// Primary path is the shared identityUtils resolver (lidMapping + group
// metadata phoneNumber) — the same one the rest of the bot uses.
// (@crysnovax—FIX12-08-26)
async function resolvePhone(sock, group, p, store) {
    const clean = String(p?.id || p?.jid || '').replace(/:\d+@/, '@');
    const num = clean.split('@')[0].replace(/\D/g, '');
    if (clean.endsWith('@s.whatsapp.net')) return num;

    if (clean.endsWith('@lid')) {
        // 0) shared resolver first — lidMapping + group metadata phone fields
        try {
            const { resolvePhoneJidWithMetadata } = require('../../Plugin/identityUtils');
            const resolved = await resolvePhoneJidWithMetadata(sock, group, [clean]);
            if (resolved) {
                const phone = resolved.split('@')[0].replace(/\D/g, '');
                if (phone) return phone;
            }
        } catch {}
        // 1) the participant object may already carry the phone
        if (p?.phoneNumber) {
            const direct = String(p.phoneNumber).replace(/\D/g, '');
            if (direct) return direct;
        }
        // 2) store contact lookup (Map or plain object)
        try {
            const contacts = store?.contacts;
            const get = (k) => (contacts instanceof Map ? contacts.get(k) : contacts?.[k]);
            let c = get(clean) || get(num);
            if (c?.phoneNumber) {
                const phone = String(c.phoneNumber).replace(/\D/g, '');
                if (phone) return phone;
            }
            const all = contacts instanceof Map
                ? [...contacts.values()]
                : Object.values(contacts || {});
            const found = all.find(x =>
                x?.lid === clean || x?.id === clean ||
                String(x?.id || '').split('@')[0] === num
            );
            if (found?.phoneNumber) {
                const phone = String(found.phoneNumber).replace(/\D/g, '');
                if (phone) return phone;
            }
        } catch {}
        // 3) Baileys LID → phone mapping (this fork keeps it on signalRepository)
        try {
            const mapper = sock?.signalRepository?.lidMapping;
            if (mapper?.getPNForLID) {
                const raw = mapper.getPNForLID(clean);
                const pn = raw && typeof raw.then === 'function' ? await raw : raw;
                if (pn) {
                    const phone = String(pn).replace(/\D/g, '');
                    if (phone) return phone;
                }
            }
        } catch {}
        return null; // unresolvable — skip rather than save a fake number
    }
    return null;
}

module.exports = {
    name: 'saveall',
    alias: ['export', 'exportvcf', 'savecontacts', 'vcfall'],
    desc: 'Save every number in the group as contacts (.vcf file)',
    category: 'Group',
    groupOnly: true,
    usage: '.saveall | .export',
    reactions: { start: '📇', success: '💾' },

    execute: async (sock, m, { reply, store }) => {
        try {
            if (!m.isGroup) return reply('`⟁⃝GROUP ONLY!℘`');

            const meta = await sock.groupMetadata(m.chat);
            const participants = meta.participants || [];
            if (!participants.length) return reply('_✘ No members found in this group_');

            const groupName = meta.subject || 'Group';

            // Contact display name when available — otherwise the PHONE
            // NUMBER, never the LID. (@crysnovax—FIX12-08-26)
            const getName = (jid, phone) => {
                const clean = String(jid || '').replace(/:\d+@/, '@');
                try {
                    const contacts = store?.contacts;
                    const c = contacts instanceof Map ? contacts.get(clean) : contacts?.[clean];
                    const nm = c?.name || c?.notify || c?.verifiedName;
                    if (nm && String(nm).trim()) return String(nm).trim();
                } catch {}
                return phone || clean.split('@')[0];
            };

            let vcf = '';
            let count = 0;
            for (const p of participants) {
                const clean = String(p?.id || p?.jid || '').replace(/:\d+@/, '@');
                if (!clean.includes('@')) continue;

                const phone = await resolvePhone(sock, m.chat, p, store);
                if (!phone || phone.length < 7) continue;

                const name = getName(clean, phone);
                vcf +=
                    'BEGIN:VCARD\n' +
                    'VERSION:3.0\n' +
                    `FN:${name}\n` +
                    `TEL;TYPE=CELL:+${phone}\n` +
                    'END:VCARD\n';
                count++;
            }

            if (!vcf || !count) return reply('_✘ Could not build contact list for this group_');

            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const filePath = path.join(tempDir, `contacts_${Date.now()}.vcf`);
            fs.writeFileSync(filePath, vcf, 'utf8');

            await sock.sendMessage(m.chat, {
                document: fs.readFileSync(filePath),
                fileName: `${groupName.replace(/[^\w\- ]+/g, '').trim() || 'Group'}_contacts.vcf`,
                mimetype: 'text/vcard',
                caption:
                    `╭─❍ *SAVE ALL* 𓉤\n│\n` +
                    `│ 💾 ${count} contact(s) from\n` +
                    `│ 𓄄 ${groupName}\n│\n` +
                    `│ _Import the .vcf to save every\n` +
                    `│  number in one tap._\n` +
                    `╰──────────────────`
            }, { quoted: m });

            fs.unlinkSync(filePath);

        } catch (err) {
            console.error('[SAVEALL ERROR]', err.message);
            reply(`_✘ Failed to export contacts: ${err?.message || err}_`);
        }
    }
};
