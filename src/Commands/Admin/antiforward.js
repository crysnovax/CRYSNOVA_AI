const { createAntiMessageModeration } = require('../../Plugin/antiMessageModeration');

const NESTED_MESSAGE_KEYS = [
    'ephemeralMessage',
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
    'documentWithCaptionMessage',
    'groupStatusMessage',
    'groupStatusMessageV2'
];

function contextIsForwarded(contextInfo) {
    return contextInfo?.isForwarded === true || Number(contextInfo?.forwardingScore) > 0;
}

function isForwardedMessage(message) {
    if (!message || typeof message !== 'object') return false;

    for (const [key, value] of Object.entries(message)) {
        if (NESTED_MESSAGE_KEYS.includes(key)) continue;
        if (contextIsForwarded(value?.contextInfo)) return true;
    }

    return NESTED_MESSAGE_KEYS.some(key => isForwardedMessage(message[key]?.message));
}

const plugin = createAntiMessageModeration({
    command: 'antiforward',
    aliases: ['antifw', 'afw'],
    label: 'Anti Forward',
    description: 'Moderate forwarded messages',
    databaseName: 'antiforward.json',
    warningDatabaseName: 'antiforward_warns.json',
    detector: isForwardedMessage,
    violationLabel: 'forwarded messages'
});

plugin.handleAntiForward = plugin.handleModeration;
plugin.isForwardedMessage = isForwardedMessage;

module.exports = plugin;
