const { createAntiMessageModeration } = require('../../Plugin/antiMessageModeration');

const NESTED_MESSAGE_KEYS = [
    'ephemeralMessage',
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
    'documentWithCaptionMessage'
];

function isGroupStatusMessage(message) {
    if (!message || typeof message !== 'object') return false;
    if (message.groupStatusMessage || message.groupStatusMessageV2) return true;

    for (const value of Object.values(message)) {
        if (value?.contextInfo?.isGroupStatus === true) return true;
    }

    return NESTED_MESSAGE_KEYS.some(key => isGroupStatusMessage(message[key]?.message));
}

const plugin = createAntiMessageModeration({
    command: 'antigroupstatus',
    aliases: ['antigs', 'ags'],
    label: 'Anti Group Status',
    description: 'Moderate real group-status posts',
    databaseName: 'antigroupstatus.json',
    warningDatabaseName: 'antigroupstatus_warns.json',
    detector: isGroupStatusMessage,
    violationLabel: 'group-status posts',
    deleteMessage: async (sock, m, mek) => {
        if (typeof sock.deleteGroupStatus !== 'function') {
            throw new Error('deleteGroupStatus is unavailable in this Baileys build');
        }
        await sock.deleteGroupStatus(m.chat, mek?.key || m.key);
    }
});

plugin.handleAntiGroupStatus = plugin.handleModeration;
plugin.isGroupStatusMessage = isGroupStatusMessage;

module.exports = plugin;
