async function downloadMedia(m) {
    if (!m.quoted) return null;

    try {
        const buffer = await m.quoted.download();
        return buffer;
    } catch {
        return null;
    }
}

module.exports = { downloadMedia };