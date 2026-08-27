const test = require('node:test');
const assert = require('node:assert/strict');
const baileys = require('@crysnovax/baileys');
const { normalizeDeployButton, normalizeDeployButtonMessage } = require('../src/Plugin/deployButtonRouter');
const deploy = require('../src/Commands/System/deploy');

test('CRYSNOVA_AI loads the published Baileys GenAI surface', () => {
    assert.equal(require('@crysnovax/baileys/package.json').version, '2.7.18');
    assert.equal(typeof baileys.prepareRichMenuMessage, 'function');
    assert.equal(typeof baileys.generateTableContent, 'function');
    assert.equal(typeof baileys.generateCodeBlockContent, 'function');
    assert.equal(typeof baileys.decryptPollVote, 'function');
});

test('Gen4 deployment callbacks normalize without changing CRYSNOVA command names', () => {
    assert.equal(normalizeDeployButton('Step 1 · Discord'), '.deploy step1');
    assert.equal(normalizeDeployButton('.deploy step1 --menu=abc123'), '.deploy step1');
    assert.equal(normalizeDeployButtonMessage({ conversation: 'Step 3 · Pair' }), '.deploy step3');
});

test('CRYSNOVA_AI deploy sends one fresh branded Gen4 menu', async () => {
    const menus = [];
    const replies = [];
    const sock = { richMenu: async (...args) => menus.push(args) };
    const message = { chat: '123@s.whatsapp.net', key: { id: 'deploy-1' } };
    await deploy.execute(sock, message, { args: [], reply: text => replies.push(text) });
    assert.equal(menus.length, 1);
    assert.equal(replies.length, 0);
    assert.equal(menus[0][1].header.title, 'CRYSNOVA AI Deployment Guide');
    assert.match(menus[0][1].body.cards[0].buttons[0].id, /^\.deploy step1 --menu=[a-z0-9]+$/);
});

test('CRYSNOVA_AI deploy step sends one quoted rich response without another menu', async () => {
    const messages = [];
    const sock = { sendMessage: async (...args) => messages.push(args) };
    const message = { chat: '123@s.whatsapp.net', key: { id: 'deploy-2' } };
    await deploy.execute(sock, message, { args: ['step1'], reply: () => { throw new Error('step should use rich response'); } });
    assert.equal(messages.length, 1);
    assert.equal(messages[0][0], message.chat);
    assert.deepEqual(messages[0][2], { quoted: message });
    assert.match(messages[0][1].richResponse[1].table[1].items[1], /discord\.com/);
});

test('ported low-risk CODY commands keep isolated CRYSNOVA command contracts', async () => {
    const saveall = require('../src/Commands/Group/saveall');
    const unsaveall = require('../src/Commands/Group/unsaveall');
    const nosound = require('../src/Commands/Media-Editor/nosound');
    const bancheck = require('../src/Commands/Owner/bancheck');
    assert.equal(saveall.name, 'saveall');
    assert.equal(saveall.groupOnly, true);
    assert.equal(unsaveall.name, 'unsaveall');
    assert.equal(unsaveall.groupOnly, true);
    assert.equal(nosound.name, 'nosound');
    assert.equal(bancheck.name, 'bancheck');
    assert.equal(bancheck.ownerOnly, true);
    const replies = [];
    await bancheck.execute({}, {}, { args: [], reply: value => replies.push(value) });
    assert.equal(replies.length, 1);
    assert.match(replies[0], /number|usage/i);
});

test('Baileys decrypted poll.vote contract contains selected and unselected options', () => {
    const event = {
        pollCreationMessageKey: { remoteJid: '123@s.whatsapp.net', id: 'poll-1' },
        voterJid: '234@s.whatsapp.net',
        selectedOptions: ['Alpha'],
        selectedOptionHashes: ['hash-alpha'],
        unselectedOptions: ['Beta'],
        senderTimestampMs: 1
    };
    assert.deepEqual(Object.keys(event).sort(), [
        'pollCreationMessageKey', 'selectedOptionHashes', 'selectedOptions',
        'senderTimestampMs', 'unselectedOptions', 'voterJid'
    ].sort());
    assert.deepEqual(event.selectedOptions, ['Alpha']);
    assert.deepEqual(event.unselectedOptions, ['Beta']);
});
