const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const originalCwd = process.cwd();
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'crysnova-anti-'));
process.chdir(temporaryDirectory);

const groupStatus = require(path.join(originalCwd, 'src/Commands/Admin/antigroupstatus.js'));
const antiForward = require(path.join(originalCwd, 'src/Commands/Admin/antiforward.js'));

function writeDatabase(name, value) {
    const databaseDirectory = path.join(temporaryDirectory, 'database');
    fs.mkdirSync(databaseDirectory, { recursive: true });
    fs.writeFileSync(path.join(databaseDirectory, name), JSON.stringify(value));
}

function createMessage(overrides = {}) {
    return {
        isGroup: true,
        chat: '123@g.us',
        sender: '15550001@s.whatsapp.net',
        key: { id: 'message-id', remoteJid: '123@g.us', fromMe: false },
        ...overrides
    };
}

function createSocket({ admin = false, botAdmin = true, deleteFails = false, deleteFailures = 0 } = {}) {
    const sent = [];
    const removed = [];
    const deletedStatuses = [];
    let remainingDeleteFailures = deleteFailures;
    return {
        sent,
        removed,
        deletedStatuses,
        user: { id: '15559999@s.whatsapp.net' },
        signalRepository: {
            lidMapping: {
                getPNForLID: async jid => jid === '999999@lid' ? '15550001@s.whatsapp.net' : null,
                getLIDForPN: async jid => jid === '15550001@s.whatsapp.net' ? '999999@lid' : null,
            }
        },
        groupMetadata: async () => ({
            participants: [
                {
                    id: '999999@lid',
                    phoneNumber: '15550001@s.whatsapp.net',
                    admin: admin ? 'admin' : null
                },
                { id: '15559999@s.whatsapp.net', admin: botAdmin ? 'admin' : null }
            ]
        }),
        deleteGroupStatus: async (jid, key) => {
            deletedStatuses.push({ jid, key, method: 'helper' });
            if (deleteFails || remainingDeleteFailures-- > 0) throw new Error('forbidden');
        },
        sendMessage: async (jid, content, options) => {
            if (content.delete) {
                deletedStatuses.push({ jid, key: content.delete, method: 'standard' });
                if (deleteFails || remainingDeleteFailures-- > 0) throw new Error('forbidden');
            }
            sent.push({ jid, content, options });
        },
        groupParticipantsUpdate: async (jid, users, action) => removed.push({ jid, users, action })
    };
}

test.after(() => {
    process.chdir(originalCwd);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test('detects both real group-status wrappers and nested status markers', () => {
    assert.equal(groupStatus.isGroupStatusMessage({ groupStatusMessage: { message: {} } }), true);
    assert.equal(groupStatus.isGroupStatusMessage({ groupStatusMessageV2: { message: {} } }), true);
    assert.equal(groupStatus.isGroupStatusMessage({
        ephemeralMessage: { message: { imageMessage: { contextInfo: { isGroupStatus: true } } } }
    }), true);
    assert.equal(groupStatus.isGroupStatusMessage({ groupStatusMentionMessage: { message: {} } }), false);
});

test('detects forwarding metadata across message and supported wrapper types', () => {
    assert.equal(antiForward.isForwardedMessage({
        extendedTextMessage: { contextInfo: { isForwarded: true } }
    }), true);
    assert.equal(antiForward.isForwardedMessage({
        viewOnceMessageV2: { message: { imageMessage: { contextInfo: { forwardingScore: 2 } } } }
    }), true);
    assert.equal(antiForward.isForwardedMessage({
        groupStatusMessageV2: { message: { videoMessage: { contextInfo: { isForwarded: true } } } }
    }), true);
});

test('does not treat quoted or unrelated context as forwarded', () => {
    assert.equal(antiForward.isForwardedMessage({
        extendedTextMessage: { contextInfo: { quotedMessage: { conversation: 'hello' } } }
    }), false);
    assert.equal(antiForward.isForwardedMessage({
        imageMessage: { contextInfo: { isGroupStatus: true, forwardingScore: 0 } }
    }), false);
});

test('delete action removes a matching group-status message', async () => {
    writeDatabase('antigroupstatus.json', {
        '123@g.us': { enabled: true, action: 'delete' }
    });
    const socket = createSocket();
    const message = createMessage();

    const handled = await groupStatus.handleAntiGroupStatus(socket, message, {
        message: { groupStatusMessageV2: { message: { conversation: 'status' } } }
    });

    assert.equal(handled, true);
    assert.equal(socket.deletedStatuses[0].jid, message.chat);
    assert.equal(socket.deletedStatuses[0].key.id, message.key.id);
    assert.equal(socket.deletedStatuses[0].key.participant, message.sender);
    assert.equal(socket.sent[0].content.mentions[0], message.sender);
    assert.equal(socket.sent[0].options.quoted.message.groupStatusMessageV2 !== undefined, true);
    assert.equal(socket.removed.length, 0);
});

test('passes the complete original LID status key to the Baileys 2.6.9 helper', async () => {
    writeDatabase('antigroupstatus.json', { '123@g.us': { enabled: true, action: 'delete' } });
    const socket = createSocket();
    const message = createMessage({
        sender: '999999@lid',
        key: {
            id: 'lid-status',
            remoteJid: '123@g.us',
            fromMe: false,
            participant: '999999@lid',
            participantAlt: '15550001@s.whatsapp.net'
        }
    });

    const handled = await groupStatus.handleAntiGroupStatus(socket, message, {
        key: message.key,
        message: { groupStatusMessageV2: { message: { conversation: 'status' } } }
    });

    assert.equal(handled, true);
    assert.deepEqual(socket.deletedStatuses[0].key, message.key);
});

test('falls back from the fork helper to the standard Baileys revoke path', async () => {
    const socket = createSocket({ deleteFailures: 1 });
    const message = createMessage();
    const deletedKey = await groupStatus.deleteGroupStatus(socket, message, {
        key: { ...message.key, participant: message.sender }
    }, {
        senderJid: message.sender,
        senderRecord: { id: '999999@lid', phoneNumber: message.sender }
    });

    assert.equal(deletedKey.participant, message.sender);
    assert.equal(socket.deletedStatuses[0].method, 'helper');
    assert.equal(socket.deletedStatuses[1].method, 'standard');
});

test('tries the complete raw revoke key first and deduplicates identity fallbacks', () => {
    const rawKey = {
        id: 'status-key',
        remoteJid: '123@g.us',
        participant: '999999@lid',
        participantAlt: '15550001@s.whatsapp.net'
    };
    const keys = groupStatus.buildDeleteKeys('123@g.us', rawKey.id, [
        '15550001@s.whatsapp.net',
        '999999@lid',
        '15550001@s.whatsapp.net'
    ], rawKey);

    assert.deepEqual(keys[0], rawKey);
    assert.equal(keys[1].participant, '15550001@s.whatsapp.net');
    assert.equal(keys[2].participant, '999999@lid');
    assert.equal(keys.length, 3);
});

test('disabled, from-me, and admin messages are exempt', async () => {
    const payload = { message: { extendedTextMessage: { contextInfo: { isForwarded: true } } } };

    writeDatabase('antiforward.json', { '123@g.us': { enabled: false, action: 'kick' } });
    const disabledSocket = createSocket();
    assert.equal(await antiForward.handleAntiForward(disabledSocket, createMessage(), payload), false);
    assert.equal(disabledSocket.sent.length, 0);

    writeDatabase('antiforward.json', { '123@g.us': { enabled: true, action: 'kick' } });
    const ownSocket = createSocket();
    assert.equal(await antiForward.handleAntiForward(ownSocket, createMessage({ key: { fromMe: true } }), payload), false);
    assert.equal(ownSocket.sent.length, 0);

    const adminSocket = createSocket({ admin: true });
    assert.equal(await antiForward.handleAntiForward(adminSocket, createMessage(), payload), false);
    assert.equal(adminSocket.sent.length, 0);
});

test('does not claim deletion when group-status deletion fails', async () => {
    writeDatabase('antigroupstatus.json', { '123@g.us': { enabled: true, action: 'delete' } });
    const socket = createSocket({ deleteFails: true });
    const message = createMessage();
    const handled = await groupStatus.handleAntiGroupStatus(socket, message, {
        key: message.key,
        message: { groupStatusMessageV2: { message: { conversation: 'status' } } }
    });

    assert.equal(handled, false);
    assert.match(socket.sent[0].content.text, /WhatsApp rejected the delete request/i);
    assert.doesNotMatch(socket.sent[0].content.text, /was deleted/i);
});

test('requires bot admin permission before destructive moderation', async () => {
    writeDatabase('antiforward.json', { '123@g.us': { enabled: true, action: 'delete' } });
    const socket = createSocket({ botAdmin: false });
    const payload = { message: { extendedTextMessage: { contextInfo: { isForwarded: true } } } };
    assert.equal(await antiForward.handleAntiForward(socket, createMessage(), payload), false);
    assert.match(socket.sent[0].content.text, /not a group admin/i);
});

test('warn action removes a member on the third violation and clears warnings', async () => {
    writeDatabase('antiforward.json', { '123@g.us': { enabled: true, action: 'warn' } });
    const payload = { message: { videoMessage: { contextInfo: { forwardingScore: 1 } } } };
    const socket = createSocket();

    await antiForward.handleAntiForward(socket, createMessage(), payload);
    await antiForward.handleAntiForward(socket, createMessage(), payload);
    await antiForward.handleAntiForward(socket, createMessage(), payload);

    assert.equal(socket.removed.length, 1);
    assert.deepEqual(socket.removed[0], {
        jid: '123@g.us',
        users: ['15550001@s.whatsapp.net'],
        action: 'remove'
    });
    const warnings = JSON.parse(fs.readFileSync(path.join(temporaryDirectory, 'database', 'antiforward_warns.json')));
    assert.deepEqual(warnings, {});
});

test('kick action deletes first and immediately removes the sender', async () => {
    writeDatabase('antigroupstatus.json', { '123@g.us': { enabled: true, action: 'kick' } });
    const socket = createSocket();
    const message = createMessage();

    await groupStatus.handleAntiGroupStatus(socket, message, {
        message: { groupStatusMessage: { message: { conversation: 'status' } } }
    });

    assert.equal(socket.deletedStatuses[0].jid, message.chat);
    assert.equal(socket.deletedStatuses[0].key.id, message.key.id);
    assert.equal(socket.deletedStatuses[0].key.participant, message.sender);
    assert.equal(socket.removed.length, 1);
});
