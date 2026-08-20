const DEPLOY_BUTTON_COMMANDS = new Map([
    ['step 1 · discord', '.deploy step1'],
    ['step 1 - discord', '.deploy step1'],
    ['step 1 discord', '.deploy step1'],
    ['step 2 · panel', '.deploy step2'],
    ['step 2 - panel', '.deploy step2'],
    ['step 2 panel', '.deploy step2'],
    ['step 3 · pair', '.deploy step3'],
    ['step 3 - pair', '.deploy step3'],
    ['step 3 pair', '.deploy step3'],
    ['step 4 · upload', '.deploy step4'],
    ['step 4 - upload', '.deploy step4'],
    ['step 4 upload', '.deploy step4'],
    ['help', '.deploy help'],
    ['tutorials', '.deploy tutorials'],
    ['back to menu', '.deploy menu'],
    ['menu', '.deploy menu']
]);

const normalizeDeployButton = value => {
    const text = String(value || '').trim();
    if (!text) return null;
    const menuScoped = text.match(/^\.deploy\s+(step[1-4]|help|tutorials|menu)(?:\s+--menu=[a-z0-9_-]+)?$/i);
    if (menuScoped) return `.deploy ${menuScoped[1].toLowerCase()}`;
    const deployScoped = text.match(/^deploy:(step[1-4]|help|tutorials|menu)(?:\s+--menu=[a-z0-9_-]+)?$/i);
    if (deployScoped) return `.deploy ${deployScoped[1].toLowerCase()}`;
    return DEPLOY_BUTTON_COMMANDS.get(text.toLowerCase()) || null;
};

const parseJson = value => {
    if (!value) return null;
    if (Buffer.isBuffer(value)) value = value.toString('utf8');
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return null; }
};

/**
 * Extract a user-visible label or callback id from Baileys-normalized or raw
 * WhatsApp interactive response messages. Gen4 rich-menu taps can be echoed as
 * ordinary conversation text, but newer clients may use one of the response
 * message envelopes below.
 */
const extractDeployButtonValues = message => {
    const values = [];
    const add = value => {
        if (value !== undefined && value !== null && String(value).trim()) values.push(String(value).trim());
    };
    const visit = node => {
        if (!node || typeof node !== 'object') return;
        add(node.conversation);
        add(node.text);
        add(node.contentText);
        add(node.selectedButtonId);
        add(node.selectedDisplayText);
        add(node.selectedId);
        add(node.title);
        add(node.buttonId);
        add(node.id);
        add(node.displayText);
        add(node.singleSelectReply?.selectedRowId);
        add(node.singleSelectReply?.selectedDisplayText);
        add(node.nativeFlowResponseMessage?.name);
        add(node.nativeFlowResponseMessage?.buttonParamsJson);
        add(node.interactiveResponseMessage?.body?.text);
        add(node.interactiveResponseMessage?.nativeFlowResponseMessage?.name);
        add(node.interactiveResponseMessage?.nativeFlowResponseMessage?.buttonParamsJson);

        for (const candidate of [
            node.buttonParamsJson,
            node.nativeFlowResponseMessage?.buttonParamsJson,
            node.interactiveResponseMessage?.nativeFlowResponseMessage?.buttonParamsJson
        ]) {
            const parsed = parseJson(candidate);
            if (parsed) {
                add(parsed.id);
                add(parsed.button_id);
                add(parsed.buttonId);
                add(parsed.selected_id);
                add(parsed.display_text);
                add(parsed.text);
                visit(parsed);
            }
        }

        for (const [key, child] of Object.entries(node)) {
            if (key === 'contextInfo' || key === 'messageContextInfo') continue;
            if (child && typeof child === 'object') visit(child);
        }
    };
    visit(message);
    return [...new Set(values)];
};

const normalizeDeployButtonMessage = message => {
    for (const value of extractDeployButtonValues(message)) {
        const command = normalizeDeployButton(value);
        if (command) return command;
    }
    return null;
};

module.exports = {
    normalizeDeployButton,
    normalizeDeployButtonMessage,
    extractDeployButtonValues,
    DEPLOY_BUTTON_COMMANDS
};
