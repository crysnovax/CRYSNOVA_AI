const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const originalCwd = process.cwd();
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'crysnova-privileged-'));
process.chdir(temporaryDirectory);
process.env.SUDO_NUMBERS = '15550001111';
process.env.DUAL_NUMBERS = '15550002222';

const mention = require(path.join(originalCwd, 'src/Commands/Owner/mention.js'));
const afk = require(path.join(originalCwd, 'src/Commands/Owner/afk.js'));
const bio = require(path.join(originalCwd, 'src/Commands/Owner/sb.js'));
const report = require(path.join(originalCwd, 'src/Commands/Owner/report.js'));
const guard = require(path.join(originalCwd, 'src/Plugin/promotionGuard.js'));

function mappingSocket() {
    const pairs = {
        'sudo@lid': '15550001111@s.whatsapp.net',
        'dual@lid': '15550002222@s.whatsapp.net',
        'target@lid': '15550003333@s.whatsapp.net',
    };
    return {
        user: { id: '15559999999@s.whatsapp.net', lid: 'bot@lid' },
        signalRepository: { lidMapping: {
            getPNForLID: async jid => pairs[jid] || null,
            getLIDForPN: async jid => Object.keys(pairs).find(key => pairs[key] === jid) || null,
        } },
    };
}

test.after(() => {
    process.chdir(originalCwd);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test('mention matching covers sudo and dual LID identities', async () => {
    const sock = mappingSocket();
    assert.equal(await mention.isPrivilegedMentioned(sock, {
        key: { fromMe: false },
        mentionedJid: ['sudo@lid'],
        msg: { contextInfo: {} },
    }, {}), true);
    assert.equal(await mention.isPrivilegedMentioned(sock, {
        key: { fromMe: false },
        mentionedJid: ['dual@lid'],
        msg: { contextInfo: {} },
    }, {}), true);
    assert.equal(await mention.isPrivilegedMentioned(sock, {
        key: { fromMe: true },
        mentionedJid: ['dual@lid'],
        msg: { contextInfo: {} },
    }, {}), false);
});

test('mention matching ignores replies without an explicit tag', async () => {
    const sock = mappingSocket();
    assert.equal(await mention.isPrivilegedMentioned(sock, {
        key: { fromMe: false },
        quoted: { sender: 'sudo@lid' },
        msg: {
            contextInfo: {
                participant: 'sudo@lid',
                participantAlt: '15550001111@s.whatsapp.net',
            },
        },
    }, {}), false);
});

test('AFK stores and disables independent sudo and dual records', async () => {
    const sock = mappingSocket();
    const replies = [];
    await afk.execute(sock, { sender: 'sudo@lid', chat: 'group@g.us', key: { participant: 'sudo@lid' } }, {
        args: ['busy'], reply: text => replies.push(text),
    });
    await afk.execute(sock, { sender: 'dual@lid', chat: 'group@g.us', key: { participant: 'dual@lid' } }, {
        args: ['away'], reply: text => replies.push(text),
    });
    assert.equal(afk.getAfk('15550001111@s.whatsapp.net', 'group@g.us').reason, 'busy');
    assert.equal(afk.getAfk('15550002222@s.whatsapp.net', 'group@g.us').reason, 'away');
    assert.equal(afk.disableAfk('15550001111@s.whatsapp.net', 'group@g.us'), true);
    assert.equal(afk.getAfk('15550002222@s.whatsapp.net', 'group@g.us').reason, 'away');
});

test('bio command validates length before calling Baileys', async () => {
    let updates = 0;
    const replies = [];
    await bio.execute({ updateProfileStatus: async () => { updates += 1; } }, {}, {
        args: ['x'.repeat(140)], reply: text => replies.push(text),
    });
    assert.equal(updates, 0);
    assert.match(replies[0], /139/);
});

test('report evidence must belong to the selected contact', async () => {
    const sock = mappingSocket();
    const evidence = [{
        id: 'message', remoteJid: 'group@g.us', fromMe: false, participant: 'target@lid',
    }];
    assert.equal(await report.evidenceMatchesContact(sock, {
        isGroup: true, chat: 'group@g.us', quoted: { sender: 'target@lid' },
    }, '15550003333@s.whatsapp.net', evidence), true);
    assert.equal(await report.evidenceMatchesContact(sock, {
        isGroup: true, chat: 'group@g.us', quoted: { sender: 'target@lid' },
    }, '15550004444@s.whatsapp.net', evidence), false);
});

test('access list target resolution returns a phone JID for unmapped LID mentions', async () => {
    const identity = require(path.join(originalCwd, 'src/Plugin/identityUtils.js'));
    const sock = mappingSocket();
    sock.groupMetadata = async () => ({
        participants: [
            { id: 'unmapped@lid', phoneNumber: '15550006666@s.whatsapp.net' },
        ],
    });
    const resolved = await identity.resolveCommandTarget(sock, {
        chat: 'group@g.us',
        mentionedJid: ['unmapped@lid'],
        msg: { contextInfo: {} },
    }, '');
    assert.equal(resolved, '15550006666@s.whatsapp.net');
});

function guardSocket() {
    const actions = [];
    const sent = [];
    const socket = mappingSocket();
    Object.assign(socket, {
        actions,
        sent,
        groupMetadata: async () => ({
            owner: '15550007777@s.whatsapp.net',
            participants: [
                { id: socket.user.id, admin: 'admin' },
                { id: '15550004444@s.whatsapp.net', admin: 'admin' },
                { id: '15550005555@s.whatsapp.net', admin: 'admin' },
                { id: guard.DEFAULT_IMMUNE_JID, admin: 'admin' },
            ],
        }),
        groupParticipantsUpdate: async (groupId, users, action) => actions.push({ groupId, users, action }),
        sendMessage: async (jid, content) => sent.push({ jid, content }),
    });
    return socket;
}

test('anti-promote demotes both untrusted actor and target', async () => {
    const groupId = 'promote@g.us';
    guard.updateGroupConfig(groupId, { antipromote: true });
    const sock = guardSocket();
    await guard.handleParticipantUpdate(sock, {
        id: groupId,
        action: 'promote',
        author: '15550004444@s.whatsapp.net',
        participants: ['15550005555@s.whatsapp.net'],
    });
    assert.deepEqual(sock.actions.map(item => [item.users[0], item.action]), [
        ['15550005555@s.whatsapp.net', 'demote'],
        ['15550004444@s.whatsapp.net', 'demote'],
    ]);
});

test('anti-demote restores target and demotes actor', async () => {
    const groupId = 'demote@g.us';
    guard.updateGroupConfig(groupId, { antidemote: true });
    const sock = guardSocket();
    await guard.handleParticipantUpdate(sock, {
        id: groupId,
        action: 'demote',
        author: '15550004444@s.whatsapp.net',
        participants: ['15550005555@s.whatsapp.net'],
    });
    assert.deepEqual(sock.actions.map(item => [item.users[0], item.action]), [
        ['15550005555@s.whatsapp.net', 'promote'],
        ['15550004444@s.whatsapp.net', 'demote'],
    ]);
});

test('anti-promote still enforces when the bot is missing from stale metadata', async () => {
    const groupId = 'stale@g.us';
    guard.updateGroupConfig(groupId, { antipromote: true });
    const sock = guardSocket();
    sock.groupMetadata = async () => ({
        owner: '15550007777@s.whatsapp.net',
        participants: [
            { id: '15550004444@s.whatsapp.net', admin: 'admin' },
        ],
    });
    await guard.handleParticipantUpdate(sock, {
        id: groupId,
        action: 'promote',
        author: '15550004444@s.whatsapp.net',
        participants: ['15550005555@s.whatsapp.net'],
    });
    assert.deepEqual(sock.actions.map(item => [item.users[0], item.action]), [
        ['15550005555@s.whatsapp.net', 'demote'],
        ['15550004444@s.whatsapp.net', 'demote'],
    ]);
});

test('promotion guard ignores events performed by the bot itself', async () => {
    const groupId = 'botself@g.us';
    guard.updateGroupConfig(groupId, { antipromote: true });
    const sock = guardSocket();
    await guard.handleParticipantUpdate(sock, {
        id: groupId,
        action: 'promote',
        author: sock.user.id,
        participants: ['15550005555@s.whatsapp.net'],
    });
    assert.equal(sock.actions.length, 0);
});

test('anti-promote handles real Baileys object-shaped participants and LID author', async () => {
    const groupId = 'objects@g.us';
    guard.updateGroupConfig(groupId, { antipromote: true });
    const sock = guardSocket();
    await guard.handleParticipantUpdate(sock, {
        id: groupId,
        action: 'promote',
        author: 'actor@lid',
        authorPn: '15550004444@s.whatsapp.net',
        participants: [{ phoneNumber: '15550005555@s.whatsapp.net', lid: 'target@lid' }],
    });
    assert.deepEqual(sock.actions.map(item => [item.users[0], item.action]), [
        ['15550005555@s.whatsapp.net', 'demote'],
        ['15550004444@s.whatsapp.net', 'demote'],
    ]);
});

test('anti-demote handles object-shaped participants with lid only', async () => {
    const groupId = 'lidonly@g.us';
    guard.updateGroupConfig(groupId, { antidemote: true });
    const sock = guardSocket();
    await guard.handleParticipantUpdate(sock, {
        id: groupId,
        action: 'demote',
        author: '15550004444@s.whatsapp.net',
        participants: [{ lid: 'victim@lid' }],
    });
    assert.deepEqual(sock.actions.map(item => [item.users[0], item.action]), [
        ['victim@lid', 'promote'],
        ['15550004444@s.whatsapp.net', 'demote'],
    ]);
});

test('promotion guard enforces even when group metadata fetch fails', async () => {
    const groupId = 'nometa@g.us';
    guard.updateGroupConfig(groupId, { antipromote: true });
    const sock = guardSocket();
    sock.groupMetadata = async () => { throw new Error('metadata unavailable'); };
    await guard.handleParticipantUpdate(sock, {
        id: groupId,
        action: 'promote',
        author: '15550004444@s.whatsapp.net',
        participants: [{ phoneNumber: '15550005555@s.whatsapp.net' }],
    });
    assert.deepEqual(sock.actions.map(item => [item.users[0], item.action]), [
        ['15550005555@s.whatsapp.net', 'demote'],
        ['15550004444@s.whatsapp.net', 'demote'],
    ]);
});

test('device command predicts device from message ID patterns', () => {
    const device = require(path.join(originalCwd, 'src/Commands/Tools/device.js'));
    assert.equal(device.detectDevice('3A123456789012345678'), 'ios');
    assert.equal(device.detectDevice('3EB0123456789ABCDEF012'), 'web');
    assert.equal(device.detectDevice('A1B2C3D4E5F6G7H8I9J0K'), 'android');
});

test('default creator immunity is permanent and bypasses corrections', async () => {
    const groupId = 'immune@g.us';
    guard.updateGroupConfig(groupId, { antipromote: true, antidemote: true, immune: [] });
    assert.equal(guard.getGroupConfig(groupId).immune.includes(guard.DEFAULT_IMMUNE_JID), true);
    const sock = guardSocket();
    await guard.handleParticipantUpdate(sock, {
        id: groupId,
        action: 'promote',
        author: '15550004444@s.whatsapp.net',
        participants: [guard.DEFAULT_IMMUNE_JID],
    });
    assert.equal(sock.actions.length, 0);
});
