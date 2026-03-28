const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors (ANSI codes)
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    black: '\x1b[30m', red: '\x1b[31m', green: '\x1b[32m',
    yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m',
    cyan: '\x1b[36m', white: '\x1b[37m',
    bgBlack: '\x1b[40m', bgGreen: '\x1b[42m'
};

function c(text, color = 'white') {
    return `${colors[color]}${text}${colors.reset}`;
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()));
    });
}

function run(command, cwd = '.') {
    console.log(c(`[RUN] ${command}`, 'dim'));
    try {
        return execSync(command, { cwd, encoding: 'utf8', stdio: 'inherit' });
    } catch (error) {
        console.error(c(`[ERROR] Command failed: ${command}`, 'red'));
        throw error;
    }
}

// .env helpers
function readEnv(envPath) {
    if (!fs.existsSync(envPath)) return {};
    const map = {};
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        map[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
    return map;
}

function writeEnv(envPath, updates) {
    if (!fs.existsSync(envPath)) {
        const lines = Object.entries(updates).map(([k, v]) => `${k}=${v}`).join('\n');
        fs.writeFileSync(envPath, lines + '\n');
        return;
    }
    const raw = fs.readFileSync(envPath, 'utf8').split('\n');
    const seen = new Set();
    const out = [];
    for (const line of raw) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) { out.push(line); continue; }
        const idx = trimmed.indexOf('=');
        if (idx === -1) { out.push(line); continue; }
        const k = trimmed.slice(0, idx).trim();
        seen.add(k);
        out.push(k in updates ? `${k}=${updates[k]}` : line);
    }
    for (const [k, v] of Object.entries(updates)) {
        if (!seen.has(k)) out.push(`${k}=${v}`);
    }
    fs.writeFileSync(envPath, out.join('\n'));
}

// Check if config is complete
function isConfigComplete(env) {
    return env.OWNER_NUMBER && env.OWNER_NAME && env.BOT_NAME &&
           env.OWNER_NUMBER.length >= 10;
}

// Display banner
function showBanner() {
    console.clear();
    console.log(c('\n╔══════════════════════════════════════════════════════════════╗', 'cyan'));
    console.log(c('║                                                              ║', 'cyan'));
    console.log(c('║             ', 'cyan') + c('🚀 CRYSNOVA AI V2 — DEPLOY SCRIPT 🚀', 'bright') + c('            ║', 'cyan'));
    console.log(c('║                                                              ║', 'cyan'));
    console.log(c('║         ', 'cyan') + c('Automated Setup & Configuration System', 'yellow') + c('              ║', 'cyan'));
    console.log(c('║                                                              ║', 'cyan'));
    console.log(c('╚══════════════════════════════════════════════════════════════╝', 'cyan'));
    console.log('');
}

// Display existing config
function showExistingConfig(env) {
    console.log(c('┌─────────────────────────────────────────────────────────────┐', 'green'));
    console.log(c('│                                                             │', 'green'));
    console.log(c('│  ', 'green') + c('✅ CONFIGURATION FOUND!', 'bright') + c('                                 │', 'green'));
    console.log(c('│                                                             │', 'green'));
    console.log(c('├─────────────────────────────────────────────────────────────┤', 'green'));
    console.log(c('│                                                             │', 'green'));
    console.log(c('│  ', 'green') + c(`👤 Owner: ${env.OWNER_NAME}`, 'white') + ' '.repeat(Math.max(0, 50 - env.OWNER_NAME.length)) + c('│', 'green'));
    console.log(c('│  ', 'green') + c(`📞 Number: ${env.OWNER_NUMBER}`, 'white') + ' '.repeat(Math.max(0, 49 - env.OWNER_NUMBER.length)) + c('│', 'green'));
    console.log(c('│  ', 'green') + c(`🤖 Bot: ${env.BOT_NAME}`, 'white') + ' '.repeat(Math.max(0, 52 - env.BOT_NAME.length)) + c('│', 'green'));
    console.log(c('│                                                             │', 'green'));
    console.log(c('└─────────────────────────────────────────────────────────────┘', 'green'));
    console.log('');
    console.log(c('🔄 Using existing configuration...\n', 'cyan'));
}

// Ask for new configuration
async function askForConfig(envPath) {
    console.log(c('┌─────────────────────────────────────────────────────────────┐', 'magenta'));
    console.log(c('│                                                             │', 'magenta'));
    console.log(c('│  ', 'magenta') + c('📋 FIRST TIME SETUP', 'bright') + c('                                     │', 'magenta'));
    console.log(c('│                                                             │', 'magenta'));
    console.log(c('│  ', 'magenta') + c('Please provide the following information:', 'yellow') + c('                │', 'magenta'));
    console.log(c('│                                                             │', 'magenta'));
    console.log(c('└─────────────────────────────────────────────────────────────┘', 'magenta'));
    console.log('');

    // Owner Number
    console.log(c('┌─────────────────────────────────────────────────────────────┐', 'blue'));
    console.log(c('│ 1. OWNER NUMBER                                             │', 'blue'));
    console.log(c('└─────────────────────────────────────────────────────────────┘', 'blue'));
    console.log(c('   💡 Your WhatsApp number without + (e.g., 2348077528901)', 'dim'));
    
    let ownerNumber = await ask(c('   Enter: ', 'yellow'));
    while (!ownerNumber || !/^\d{10,15}$/.test(ownerNumber)) {
        console.log(c('   ❌ Invalid! Must be 10-15 digits only', 'red'));
        ownerNumber = await ask(c('   Enter: ', 'yellow'));
    }
    console.log(c(`   ✓ Number: ${ownerNumber}\n`, 'green'));

    // Owner Name
    console.log(c('┌─────────────────────────────────────────────────────────────┐', 'blue'));
    console.log(c('│ 2. OWNER NAME                                               │', 'blue'));
    console.log(c('└─────────────────────────────────────────────────────────────┘', 'blue'));
    console.log(c('   💡 Your name or nickname', 'dim'));
    
    let ownerName = await ask(c('   Enter: ', 'yellow'));
    if (!ownerName) ownerName = 'CRYSNOVA';
    console.log(c(`   ✓ Name: ${ownerName}\n`, 'green'));

    // Bot Name
    console.log(c('┌─────────────────────────────────────────────────────────────┐', 'blue'));
    console.log(c('│ 3. BOT NAME                                                 │', 'blue'));
    console.log(c('└─────────────────────────────────────────────────────────────┘', 'blue'));
    console.log(c('   💡 Display name for your bot', 'dim'));
    
    let botName = await ask(c('   Enter: ', 'yellow'));
    if (!botName) botName = 'CRYSNOVA AI V2';
    console.log(c(`   ✓ Bot: ${botName}\n`, 'green'));

    // Save to .env
    writeEnv(envPath, {
        BOT_NAME: botName,
        OWNER_NUMBER: ownerNumber,
        OWNER_NUMBERS: ownerNumber,
        OWNER_NAME: ownerName,
    });

    // Show success
    console.log(c('┌─────────────────────────────────────────────────────────────┐', 'green'));
    console.log(c('│                                                             │', 'green'));
    console.log(c('│  ', 'green') + c('✅ CONFIGURATION SAVED!', 'bright') + c('                                 │', 'green'));
    console.log(c('│                                                             │', 'green'));
    console.log(c('│  ', 'green') + c(`👤 Owner: ${ownerName}`, 'white') + ' '.repeat(Math.max(0, 50 - ownerName.length)) + c('│', 'green'));
    console.log(c('│  ', 'green') + c(`📞 Number: ${ownerNumber}`, 'white') + ' '.repeat(Math.max(0, 49 - ownerNumber.length)) + c('│', 'green'));
    console.log(c('│  ', 'green') + c(`🤖 Bot: ${botName}`, 'white') + ' '.repeat(Math.max(0, 52 - botName.length)) + c('│', 'green'));
    console.log(c('│                                                             │', 'green'));
    console.log(c('└─────────────────────────────────────────────────────────────┘', 'green'));
    console.log('');
}

// Main setup function
async function setupConfiguration() {
    const envPath = path.join(PROJECT_DIR, '.env');
    const envExamplePath = path.join(PROJECT_DIR, '.env.example');

    // Create .env from example if doesn't exist
    if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log(c('✓ Created .env from template\n', 'green'));
    }

    // Read existing config
    const env = readEnv(envPath);

    // Check if config is complete
    if (isConfigComplete(env)) {
        // Auto-use existing config, no questions!
        showExistingConfig(env);
        return;
    }

    // First time or incomplete - ask for config
    await askForConfig(envPath);
}

const PROJECT_DIR = 'CRYSNOVA_AI';
const REPO_URL = 'https://github.com/crysnovax/CRYSNOVA_AI.git';
const ENTRY_FILE = 'index.js';

async function main() {
    showBanner();
    
    console.log(c('═══ STARTING DEPLOYMENT ═══\n', 'bright'));

    // Step 1: Clone
    if (!fs.existsSync(PROJECT_DIR)) {
        console.log(c('[1/4] 📥 Cloning repository...', 'cyan'));
        run(`git clone ${REPO_URL} ${PROJECT_DIR}`);
        console.log(c('✓ Cloned!\n', 'green'));
    } else {
        console.log(c('[1/4] ✓ Repository exists\n', 'green'));
    }

    // Step 2: Install
    console.log(c('[2/4] 📦 Installing dependencies...', 'cyan'));
    run('npm install', PROJECT_DIR);
    console.log(c('✓ Dependencies ready!\n', 'green'));

    // Step 3: Configure (SMART - asks only once!)
    console.log(c('[3/4] ⚙️  Checking configuration...', 'cyan'));
    await setupConfiguration();
    rl.close();

    // Step 4: Start
    console.log(c('[4/4] 🚀 Starting bot...', 'cyan'));
    console.log('');

    const mainJsPath = path.join(PROJECT_DIR, ENTRY_FILE);
    const packageJsonPath = path.join(PROJECT_DIR, 'package.json');
    
    let startCommand, startArgs;

    if (fs.existsSync(mainJsPath)) {
        startCommand = 'node';
        startArgs = [ENTRY_FILE];
    } else if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (pkg.scripts?.start) {
            startCommand = 'npm';
            startArgs = ['start'];
        } else {
            throw new Error(`No ${ENTRY_FILE} or start script found`);
        }
    } else {
        throw new Error(`No ${ENTRY_FILE} found`);
    }

    console.log(c('╔══════════════════════════════════════════════════════════════╗', 'green'));
    console.log(c('║                                                              ║', 'green'));
    console.log(c('║             ', 'green') + c('🎉 BOT IS STARTING! 🎉', 'bright') + c('                          ║', 'green'));
    console.log(c('║                                                              ║', 'green'));
    console.log(c('╚══════════════════════════════════════════════════════════════╝', 'green'));
    console.log('');

    const child = spawn(startCommand, startArgs, {
        cwd: PROJECT_DIR,
        stdio: 'inherit',
        shell: true
    });

    child.on('close', (code) => process.exit(code));
    child.on('error', (err) => {
        console.error(c('Failed to start:', 'red'), err);
        process.exit(1);
    });
}

main().catch(err => {
    console.error(c('\n❌ FAILED:', 'red'), err.message);
    rl.close();
    process.exit(1);
});

