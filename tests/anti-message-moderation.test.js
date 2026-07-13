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

function createSocket({ admin = false } = {}) {
    const sent = [];
    const removed = [];
    return {
        sent,
        removed,
        groupMetadata: async () => ({
            participants: [{
                id: '15550001:8@s.whatsapp.net',
                admin: admin ? 'admin' : null
            }]
        }),
        sendMessage: async (jid, content) => sent.push({ jid, content }),
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
    assert.deepEqual(socket.sent[0].content, { delete: message.key });
    assert.equal(socket.removed.length, 0);
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

    assert.deepEqual(socket.sent[0].content, { delete: message.key });
    assert.equal(socket.removed.length, 1);
});
