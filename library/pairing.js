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

async function requestPairingCode(sock, input) {
    if (!sock || typeof sock.requestPairingCode !== 'function') {
        throw new Error('WhatsApp socket is not ready to request a pairing code.');
    }

    const phoneNumber = normalizePairingNumber(input);
    const code = await sock.requestPairingCode(phoneNumber);
    if (typeof code !== 'string' || !code.trim()) {
        throw new Error('Plogme returned an empty pairing code.');
    }

    return { phoneNumber, code };
}

module.exports = { normalizePairingNumber, requestPairingCode };
