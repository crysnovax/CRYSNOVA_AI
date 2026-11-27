const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePairingNumber, requestPairingCode, waitForPairingReady } = require('../library/pairing');

test('normalizes international phone numbers to digits only', () => {
    assert.equal(normalizePairingNumber('+234 912-208-3563'), '2349122083563');
});

test('rejects phone numbers outside the supported international length', () => {
    assert.throws(() => normalizePairingNumber('12345'), /10 to 15 digits/);
    assert.throws(() => normalizePairingNumber(''), /10 to 15 digits/);
});

test('requests the configured CRYSNOVA pairing code with a normalized phone number', async () => {
    const calls = [];
    const sock = {
        requestPairingCode: async (...args) => {
            calls.push(args);
            return 'CRYSNOVA';
        },
    };

    const result = await requestPairingCode(sock, '+234 912-208-3563');

    assert.deepEqual(calls, [['2349122083563', 'CRYSNOVA']]);
    assert.deepEqual(result, { phoneNumber: '2349122083563', code: 'CRYSNOVA' });
});

test('waits for the socket readiness flag before a dashboard code request', async () => {
    const sock = { pairingReady: false, pairingClosed: false };
    setTimeout(() => { sock.pairingReady = true; }, 10);
    await waitForPairingReady(sock, 100);
});

test('stops waiting when the pairing socket closes', async () => {
    const sock = { pairingReady: false, pairingClosed: true };
    await assert.rejects(waitForPairingReady(sock, 100), /connection closed/);
});

test('surfaces Plogme request failures to the caller', async () => {
    const failure = new Error('Method Not Allowed');
    const sock = { requestPairingCode: async () => { throw failure; } };

    await assert.rejects(requestPairingCode(sock, '2349122083563'), error => error === failure);
});
