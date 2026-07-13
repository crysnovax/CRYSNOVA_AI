const assert = require('node:assert/strict');
const test = require('node:test');
const { resolveCommandTarget, resolvePhoneJid } = require('../src/Plugin/identityUtils');

function socketWithMapping() {
    return {
        signalRepository: {
            lidMapping: {
                getPNForLID: async jid => jid === '98765@lid' ? '15551234567@s.whatsapp.net' : null
            }
        }
    };
}

test('prefers real phone JIDs over LIDs', async () => {
    const result = await resolvePhoneJid(socketWithMapping(), ['98765@lid', '15550001111@s.whatsapp.net']);
    assert.equal(result, '15550001111@s.whatsapp.net');
});

test('resolves a quoted LID to a real phone JID', async () => {
    const result = await resolveCommandTarget(socketWithMapping(), {
        quoted: { sender: '98765@lid' },
        msg: { contextInfo: { participant: '98765@lid' } }
    });
    assert.equal(result, '15551234567@s.whatsapp.net');
});

test('accepts a clean phone-number argument', async () => {
    const result = await resolveCommandTarget({}, {}, '+1 (555) 123-4567');
    assert.equal(result, '15551234567@s.whatsapp.net');
});
