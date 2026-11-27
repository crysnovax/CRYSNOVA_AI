function normalizePairingNumber(input) {
    if (typeof input !== 'string') {
        throw new Error('Phone number must be a string of 10 to 15 international digits.');
    }

    const phoneNumber = input.replace(/\D/g, '');
    if (!/^\d{10,15}$/.test(phoneNumber)) {
        throw new Error('Phone number must contain 10 to 15 digits in international format.');
    }

    return phoneNumber;
}

const CUSTOM_PAIRING_CODE = 'CRYSNOVA';

function waitForPairingReady(sock, timeoutMs = 20000) {
    if (sock?.pairingReady) return Promise.resolve();
    if (!sock) return Promise.reject(new Error('WhatsApp socket is not available.'));

    return new Promise((resolve, reject) => {
        const finish = (error) => {
            clearInterval(check);
            clearTimeout(timeout);
            if (error) reject(error);
            else resolve();
        };
        const check = setInterval(() => {
            if (sock.pairingReady) finish();
            else if (sock.pairingClosed) finish(new Error('WhatsApp connection closed before pairing was ready.'));
        }, 100);
        const timeout = setTimeout(() => finish(new Error('Timed out waiting for the WhatsApp pairing handshake.')), timeoutMs);
    });
}

async function requestPairingCode(sock, input) {
    if (!sock || typeof sock.requestPairingCode !== 'function') {
        throw new Error('WhatsApp socket is not ready to request a pairing code.');
    }

    const phoneNumber = normalizePairingNumber(input);
    const code = await sock.requestPairingCode(phoneNumber, CUSTOM_PAIRING_CODE);
    if (typeof code !== 'string' || !code.trim()) {
        throw new Error('Plogme returned an empty pairing code.');
    }

    return { phoneNumber, code };
}

module.exports = { normalizePairingNumber, requestPairingCode, waitForPairingReady };
