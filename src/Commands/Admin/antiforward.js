const { createAntiMessageModeration } = require('../../Plugin/antiMessageModeration');

function contextIsForwarded(contextInfo) {
    return contextInfo?.isForwarded === true || Number(contextInfo?.forwardingScore) > 0;
}

function isForwardedMessage(message, seen = new WeakSet()) {
    if (!message || typeof message !== 'object') return false;
    if (seen.has(message)) return false;
    seen.add(message);

    if (contextIsForwarded(message.contextInfo)) return true;

    return Object.values(message).some(value => {
        if (Array.isArray(value)) {
            return value.some(item => isForwardedMessage(item, seen));
        }
        return isForwardedMessage(value, seen);
    });
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
