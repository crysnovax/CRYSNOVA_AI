const test = require('node:test');
const assert = require('node:assert/strict');
const { getGroupAdminStatus } = require('../library/serialize');

test('caches group metadata while evaluating admin status per sender', async () => {
    let calls = 0;
    const sock = {
        user: { id: '99999@s.whatsapp.net' },
        groupMetadata: async () => {
            calls += 1;
            return {
                participants: [
                    { id: '11111@s.whatsapp.net', admin: 'admin' },
                    { id: '99999@s.whatsapp.net', admin: 'superadmin' },
                ],
            };
        },
    };

    assert.deepEqual(await getGroupAdminStatus(sock, 'group@g.us', '11111@s.whatsapp.net'), {
        isAdmin: true,
        isBotAdmin: true,
    });
    assert.deepEqual(await getGroupAdminStatus(sock, 'group@g.us', '22222@s.whatsapp.net'), {
        isAdmin: false,
        isBotAdmin: true,
    });
    assert.equal(calls, 1);
});

test('shares and cools down rate-limited metadata requests', async () => {
    let calls = 0;
    const sock = {
        user: { id: '99999@s.whatsapp.net' },
        groupMetadata: async () => {
            calls += 1;
            throw new Error('rate-overlimit');
        },
    };

    const results = await Promise.all([
        getGroupAdminStatus(sock, 'limited@g.us', '11111@s.whatsapp.net'),
        getGroupAdminStatus(sock, 'limited@g.us', '22222@s.whatsapp.net'),
    ]);
    assert.deepEqual(results, [null, null]);
    assert.equal(await getGroupAdminStatus(sock, 'limited@g.us', '33333@s.whatsapp.net'), null);
    assert.equal(calls, 1);
});
