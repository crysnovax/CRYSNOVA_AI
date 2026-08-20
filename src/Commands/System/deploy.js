'use strict';

const { randomBytes } = require('node:crypto');

const PANEL_URL = 'https://leonodes.xyz/login?ref=6238a049';
const DISCORD_URL = 'https://discord.com';
const SUPPORT_URL = 'https://crysnovax.link';
const MENU_IMAGE = 'https://cdn.crysnovax.link/files/1783544348569-450d330b-87ee-478f-821e-c76d5730e741.jpeg';

const quoted = message => ({ quoted: message });
const actionButton = (action, text, nonce) => ({
    id: `.deploy ${action} --menu=${nonce}`,
    text
});

const buildMenu = (nonce = randomBytes(6).toString('hex')) => ({
    header: {
        title: 'CRYSNOVA AI Deployment Guide',
        image: { url: MENU_IMAGE, mime_type: 'image/jpeg' }
    },
    body: {
        row: true,
        cards: [
            {
                title: 'Deployment steps',
                buttons: [
                    actionButton('step1', 'Step 1 · Discord', nonce),
                    actionButton('step2', 'Step 2 · Panel', nonce),
                    actionButton('step3', 'Step 3 · Start', nonce)
                ]
            },
            {
                title: 'Help',
                buttons: [
                    actionButton('step4', 'Step 4 · Verify', nonce),
                    actionButton('help', 'Help', nonce),
                    actionButton('tutorials', 'Links', nonce)
                ]
            }
        ]
    },
    footer: { text: 'CRYSNOVA AI · Open a step for instructions', url: SUPPORT_URL }
});

const rows = (...items) => [
    { isHeading: true, items: ['Item', 'Instruction'] },
    ...items.map(item => ({ items: item }))
];

const STEPS = {
    step1: {
        title: 'Step 1 · Discord account',
        table: rows(
            ['Open', DISCORD_URL],
            ['Account', 'Create an account if you do not already have one.'],
            ['Verify', 'Verify the email address before continuing.'],
            ['Ready', 'Keep the verified account ready for panel verification.']
        )
    },
    step2: {
        title: 'Step 2 · Create a panel server',
        table: rows(
            ['Open', PANEL_URL],
            ['Account', 'Create or sign in to your panel account.'],
            ['Verify', 'Complete the available email and Discord verification.'],
            ['Server', 'Create a Node.js server for CRYSNOVA AI.']
        )
    },
    step3: {
        title: 'Step 3 · Upload and start',
        table: rows(
            ['File', 'Upload the generated index.js to the server root.'],
            ['Start', 'Start the Node.js server and watch the console.'],
            ['Command', 'Use node index.js if the panel requests a startup command.']
        ),
        code: 'node index.js'
    },
    step4: {
        title: 'Step 4 · Verify the connection',
        table: rows(
            ['Console', 'Wait for the connected or ready message.'],
            ['WhatsApp', 'Send .menu to the connected CRYSNOVA AI account.'],
            ['Failure', 'Check the owner number, session files, and panel logs.']
        )
    },
    help: {
        title: 'CRYSNOVA AI deployment help',
        table: rows(
            ['Pairing', 'Use a fresh session and confirm the owner number format.'],
            ['Panel', 'Confirm index.js is in the server root and Node.js is selected.'],
            ['Support', SUPPORT_URL]
        )
    },
    tutorials: {
        title: 'CRYSNOVA AI deployment links',
        table: rows(['Panel', PANEL_URL], ['Support', SUPPORT_URL], ['Discord', DISCORD_URL])
    }
};

const sendStep = async (sock, message, step) => {
    if (typeof sock.sendMessage !== 'function') throw new Error('sock.sendMessage is unavailable.');
    const richResponse = [
        { text: step.title },
        { title: step.title, table: step.table },
        ...(step.code ? [{ code: [{ codeContent: step.code, highlightType: 0 }], language: 'javascript' }] : [])
    ];
    return sock.sendMessage(message.chat, { richResponse }, quoted(message));
};

const deploy = {
    name: 'deploy',
    alias: ['setup'],
    desc: 'Open the CRYSNOVA AI deployment guide',
    category: 'System',
    reactions: { start: '📚', success: '✅', error: '❔' },
    execute: async (sock, message, { args, reply }) => {
        const action = String(args?.[0] || 'menu').toLowerCase();
        try {
            if (action === 'menu' || action === 'start') {
                if (typeof sock.richMenu !== 'function') return reply('CRYSNOVA AI RichMenu requires @crysnovax/baileys 2.7.12 or newer.');
                await sock.richMenu(message.chat, buildMenu(), quoted(message));
                return;
            }
            const step = STEPS[action];
            if (!step) return reply('Use .deploy to open the CRYSNOVA AI guide.');
            await sendStep(sock, message, step);
        } catch (error) {
            return reply(`Deployment guide failed: ${error?.message || error}`);
        }
    }
};

module.exports = deploy;
module.exports._internals = { buildMenu, STEPS, sendStep };
