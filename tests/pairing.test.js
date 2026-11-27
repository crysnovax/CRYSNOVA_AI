const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePairingNumber, requestPairingCode } = require('../library/pairing');

test('normalizes international phone numbers to digits only', () => {
    assert.equal(normalizePairingNumber('+234 912-200-8563'), '2349122008563');
});

test('rejects phone numbers outside the supported international length', () => {
    assert.throws(() => normalizePairingNumber('12345'), /10 to 15 digits/);
    assert.throws(() => normalizePairingNumber(''), /10 to 15 digits/);
});

test('requests a Plogme pairing code with the documented single phone argument', async () => {
    const calls = [];
    const sock = {
        requestPairingCode: async (...args) => {
            calls.push(args);
            return 'ABCD-EFGH';
        },
    };

    const result = await requestPairingCode(sock, '+234 912-200-8563');

    assert.deepEqual(calls, [['2349122008563']]);
    assert.deepEqual(result, { phoneNumber: '2349122008563', code: 'ABCD-EFGH' });
});

test('surfaces Plogme request failures to the caller', async () => {
    const failure = new Error('Method Not Allowed');
    const sock = { requestPairingCode: async () => { throw failure; } };

    await assert.rejects(requestPairingCode(sock, '2349122008563'), error => error === failure);
});
