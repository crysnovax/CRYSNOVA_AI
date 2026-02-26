## CRYSNOVA AI V2.0


<!-- CRYSNOVA WA BOT | Modern Profile README  -->

<p align="center">
  <img src="https://crysnovax-media-api.crysnovax.workers.dev/1771948318227-media" alt="CRYSNOVA X BOT" width="100%">
  <p align="center">
  <a href="https://github.com/crysnovax">
    <img 
      src="https://i.imgur.com/HPLf1Qk.jpeg" 
      alt="CRYSNOVA AI V2 - Holographic Neon Circle Logo" 
      width="380" 
      style="
        border-radius: 50%;
        box-shadow: 
          0 0 40px rgba(0, 255, 240, 0.9),
          0 0 80px rgba(0, 255, 240, 0.6),
          inset 0 0 30px rgba(255, 255, 255, 0.4);
        transition: all 0.3s ease;
      "
    />
  </a>
</p>

<p align="center">
  <strong>CRYSN⚉VA AI V2</strong><br>
  <em>Professional WhatsApp Bot • Built by crysnova</em>
</p>
A modular WhatsApp bot built using Node.js and Baileys — the perfect foundation for my YouTube tutorial series.  
This is a More integrated version of CRYSNOVA AI V1.0 with Amazing Customizable features tagging along the much more established WhatsApp bot.
it's completely user friendly and requires less labor compared to V1.0 everything is now sorted for easy access and manipulation 
> crysnovax

## 💡 Key Features
- **Dynamic Plugin System**: Simply add .js files for new commands — no complex setup required.
- **Auto-Reload Functionality**: Changes take effect instantly without restarting the bot.
- **Permission Controls**: Built-in support for owner and admin roles to manage access.
- **Organized Command Categories**: Keeps your bot structured and easy to navigate.
- **Essential Tools**: Includes system utilities, media handling, and more.
- **Beginner-Friendly**: Clean, readable code designed for learning and experimentation.

Follow along with the tutorial series: Each episode introduces 1–2 new commands, building your skills step by step.

## 👾 FORK CRYSNOVA-AI
    
  <a href="https://github.com/crysnovax/CRYSNOVA_AI/fork"><img title="CRYSNOVA AI" src="https://img.shields.io/badge/FORK-CRYSNOVA AI-h?color=blue&style=for-the-badge&logo=stackshare"></a>

## 🧠 Editing Bot Files
Need to tweak or customize? Download [MT Manager](https://t.me/crysnovax) for easy file management.

## 👨‍💻 Credits
- **Base Project**: [CRYSNOVA](https://t.me/crysnovax)
- **Tutorials & Upgrades**: **CRYSTAL LEVI**
- **Library**: [Baileys by @crysnovax](https://github.com/crysnovax/CRYSNOVA_AI)

## 📺 Connect & Learn
- **YouTube Channel**: [CRYSNOVA](https://youtube.com/@crysnovax)
- **WhatsApp Channel**: [Official Channel](https://whatsapp.com/channel/0029Vb6pe77K0IBn48HLKb38)

## 🚀 Getting Started
1. Clone the repository: `git clone https://github.com/crysnovax/CRYSNOVA_AI`
2. Install dependencies: `npm install`
3. Run the bot: `node index.js`
4. Scan the QR code with WhatsApp to connect.

##HOW TO GET CRYSNOVA_AI RUNNING ON PANNEL:
USE START UP SCRIPT 
♻️ `create a new file`
paste:
```#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors (using ANSI codes - works without chalk)
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Foreground colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    // Background colors
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m'
};

// Helper to colorize text
function c(text, color = 'white') {
    return `${colors[color]}${text}${colors.reset}`;
}

// Configuration
const PROJECT_DIR = 'CRYSNOVA_AI';
const REPO_URL = 'https://github.com/crysnovax/CRYSNOVA_AI.git';
const ENTRY_FILE = 'main.js';

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Helper to ask questions
function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

// Helper to run commands
function run(command, cwd = '.') {
    console.log(c(`[RUN] ${command}`, 'dim'));
    try {
        return execSync(command, {
            cwd,
            encoding: 'utf8',
            stdio: 'inherit'
        });
    } catch (error) {
        console.error(c(`[ERROR] Command failed: ${command}`, 'red'));
        throw error;
    }
}

// Display beautiful banner
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

// Display configuration menu
function showConfigMenu() {
    console.log(c('\n┌─────────────────────────────────────────────────────────────┐', 'magenta'));
    console.log(c('│                                                             │', 'magenta'));
    console.log(c('│  ', 'magenta') + c('📋 CONFIGURATION REQUIRED', 'bright') + c('                                │', 'magenta'));
    console.log(c('│                                                             │', 'magenta'));
    console.log(c('│  ', 'magenta') + c('Please provide the following information:', 'yellow') + c('                │', 'magenta'));
    console.log(c('│                                                             │', 'magenta'));
    console.log(c('├─────────────────────────────────────────────────────────────┤', 'magenta'));
    console.log(c('│                                                             │', 'magenta'));
    console.log(c('│  ', 'magenta') + c('1. OWNER NUMBER', 'cyan') + c('                                          │', 'magenta'));
    console.log(c('│     ', 'magenta') + c('→ Your WhatsApp number (without +)', 'white') + c('                  │', 'magenta'));
    console.log(c('│     ', 'magenta') + c('→ Example: 2348077528901', 'dim') + c('                             │', 'magenta'));
    console.log(c('│                                                             │', 'magenta'));
    console.log(c('│  ', 'magenta') + c('2. OWNER NAME', 'cyan') + c('                                            │', 'magenta'));
    console.log(c('│     ', 'magenta') + c('→ Your name or nickname', 'white') + c('                             │', 'magenta'));
    console.log(c('│     ', 'magenta') + c('→ Example: John', 'dim') + c('                                      │', 'magenta'));
    console.log(c('│                                                             │', 'magenta'));
    console.log(c('│  ', 'magenta') + c('3. BOT NAME', 'cyan') + c('                                              │', 'magenta'));
    console.log(c('│     ', 'magenta') + c('→ Your bot\'s display name', 'white') + c('                           │', 'magenta'));
    console.log(c('│     ', 'magenta') + c('→ Example: My Awesome Bot', 'dim') + c('                          │', 'magenta'));
    console.log(c('│                                                             │', 'magenta'));
    console.log(c('└─────────────────────────────────────────────────────────────┘', 'magenta'));
    console.log('');
}

// Display input prompt with style
function showInputPrompt(number, label, example) {
    console.log(c('┌─────────────────────────────────────────────────────────────┐', 'blue'));
    console.log(c(`│ ${number}. `, 'blue') + c(label.toUpperCase(), 'bright') + ' '.repeat(Math.max(0, 59 - label.length)) + c('│', 'blue'));
    console.log(c('└─────────────────────────────────────────────────────────────┘', 'blue'));
    if (example) {
        console.log(c(`   💡 Example: ${example}`, 'dim'));
    }
}

async function setupOwnerNumber() {
    showConfigMenu();
    
    const configPath = path.join(PROJECT_DIR, 'settings', 'config.js');
    const databaseDir = path.join(PROJECT_DIR, 'database');
    const userConfigPath = path.join(databaseDir, 'user-config.json');
    
    // Check if already configured
    if (fs.existsSync(userConfigPath)) {
        try {
            const existing = JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));
            if (existing?.owner?.number) {
                console.log(c('✓ Configuration file found!', 'green'));
                console.log(c(`  Owner: ${existing.owner.name || 'Unknown'}`, 'cyan'));
                console.log(c(`  Number: ${existing.owner.number}`, 'cyan'));
                console.log(c(`  Bot: ${existing.bot.name || 'CRYSNOVA AI'}`, 'cyan'));
                console.log('');
                
                const useExisting = await ask(c('Use existing configuration? (yes/no): ', 'yellow'));
                if (useExisting.toLowerCase() === 'yes' || useExisting.toLowerCase() === 'y' || !useExisting) {
                    console.log(c('✅ Using existing configuration!\n', 'green'));
                    return;
                }
            }
        } catch {}
    }
    
    // Ask for owner number
    showInputPrompt('1', 'OWNER NUMBER', '2348077528901');
    let ownerNumber = await ask(c('   Enter: ', 'yellow'));
    
    // Validate input
    while (!ownerNumber || !/^\d{10,15}$/.test(ownerNumber)) {
        console.log(c('   ❌ Invalid! Must be 10-15 digits, no + or spaces', 'red'));
        ownerNumber = await ask(c('   Enter: ', 'yellow'));
    }
    console.log(c(`   ✓ Number saved: ${ownerNumber}`, 'green'));
    console.log('');
    
    // Ask for owner name
    showInputPrompt('2', 'OWNER NAME', 'John');
    let ownerName = await ask(c('   Enter: ', 'yellow'));
    
    // Use default if empty
    if (!ownerName) {
        ownerName = 'CRYSNOVA';
        console.log(c(`   ℹ Using default: ${ownerName}`, 'cyan'));
    } else {
        console.log(c(`   ✓ Name saved: ${ownerName}`, 'green'));
    }
    console.log('');
    
    // Ask for bot name
    showInputPrompt('3', 'BOT NAME', 'My Awesome Bot');
    let botName = await ask(c('   Enter: ', 'yellow'));
    
    // Use default if empty
    if (!botName) {
        botName = 'CRYSNOVA AI V2';
        console.log(c(`   ℹ Using default: ${botName}`, 'cyan'));
    } else {
        console.log(c(`   ✓ Bot name saved: ${botName}`, 'green'));
    }
    console.log('');
    
    // Create database directory
    if (!fs.existsSync(databaseDir)) {
        fs.mkdirSync(databaseDir, { recursive: true });
    }
    
    // Create user-config.json
    const userConfig = {
        owner: {
            number: ownerNumber,
            name: ownerName,
            jid: `${ownerNumber}@s.whatsapp.net`
        },
        bot: {
            number: ownerNumber,
            name: botName,
            public: false,
            terminal: true,
            reactsw: true,
            prefix: "."
        }
    };
    
    fs.writeFileSync(userConfigPath, JSON.stringify(userConfig, null, 4));
    
    // Update config.js
    if (fs.existsSync(configPath)) {
        let configContent = fs.readFileSync(configPath, 'utf8');
        configContent = configContent.replace(
            /const defaultNumber = "2348077528901"; \/\/make sure this is your number change it from mine/,
            `const defaultNumber = "${ownerNumber}"; // Auto-configured`
        );
        fs.writeFileSync(configPath, configContent);
    }
    
    // Show success summary
    console.log(c('┌─────────────────────────────────────────────────────────────┐', 'green'));
    console.log(c('│                                                             │', 'green'));
    console.log(c('│  ', 'green') + c('✅ CONFIGURATION COMPLETE!', 'bright') + c('                              │', 'green'));
    console.log(c('│                                                             │', 'green'));
    console.log(c('├─────────────────────────────────────────────────────────────┤', 'green'));
    console.log(c('│                                                             │', 'green'));
    console.log(c('│  ', 'green') + c('📋 Summary:', 'cyan') + c('                                              │', 'green'));
    console.log(c('│                                                             │', 'green'));
    console.log(c('│  ', 'green') + c(`👤 Owner: ${ownerName}`, 'white') + ' '.repeat(Math.max(0, 50 - ownerName.length)) + c('│', 'green'));
    console.log(c('│  ', 'green') + c(`📞 Number: ${ownerNumber}`, 'white') + ' '.repeat(Math.max(0, 49 - ownerNumber.length)) + c('│', 'green'));
    console.log(c('│  ', 'green') + c(`🤖 Bot: ${botName}`, 'white') + ' '.repeat(Math.max(0, 52 - botName.length)) + c('│', 'green'));
    console.log(c('│                                                             │', 'green'));
    console.log(c('│  ', 'green') + c(`💾 Saved to: database/user-config.json`, 'dim') + c('                  │', 'green'));
    console.log(c('│                                                             │', 'green'));
    console.log(c('└─────────────────────────────────────────────────────────────┘', 'green'));
    console.log('');
}

async function main() {
    showBanner();
    
    console.log(c('═══ STARTING DEPLOYMENT PROCESS ═══\n', 'bright'));

    // Step 1: Clone repo
    if (!fs.existsSync(PROJECT_DIR)) {
        console.log(c('[1/5] 📥 Cloning repository...', 'cyan'));
        run(`git clone ${REPO_URL} ${PROJECT_DIR}`);
        console.log(c('✓ Repository cloned successfully!\n', 'green'));
    } else {
        console.log(c('[1/5] ✓ Repository already exists\n', 'green'));
    }

    // Step 2: Install dependencies
    console.log(c('[2/5] 📦 Installing dependencies...', 'cyan'));
    run('npm install', PROJECT_DIR);
    console.log(c('✓ Dependencies installed!\n', 'green'));

    // Step 3: Setup configuration
    console.log(c('[3/5] ⚙️  Setting up configuration...', 'cyan'));
    await setupOwnerNumber();
    rl.close();

    // Step 4: Environment check
    console.log(c('[4/5] 🔍 Checking environment...', 'cyan'));
    const envPath = path.join(PROJECT_DIR, '.env');
    const envExamplePath = path.join(PROJECT_DIR, '.env.example');
    
    if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log(c('✓ Created .env from template', 'green'));
    } else {
        console.log(c('✓ Environment OK', 'green'));
    }
    console.log('');

    // Step 5: Start bot
    console.log(c('[5/5] 🚀 Starting bot...', 'cyan'));
    console.log('');
    
    const mainJsPath = path.join(PROJECT_DIR, ENTRY_FILE);
    const packageJsonPath = path.join(PROJECT_DIR, 'package.json');
    
    let startCommand, startArgs;

    if (fs.existsSync(mainJsPath)) {
        startCommand = 'node';
        startArgs = [ENTRY_FILE];
        console.log(c(`Found ${ENTRY_FILE}, starting with node...\n`, 'dim'));
    } else if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (pkg.scripts?.start) {
            startCommand = 'npm';
            startArgs = ['start'];
            console.log(c('Using npm start from package.json...\n', 'dim'));
        } else {
            throw new Error(`No ${ENTRY_FILE} found and no start script in package.json`);
        }
    } else {
        throw new Error(`No ${ENTRY_FILE} found and no package.json`);
    }

    console.log(c('╔══════════════════════════════════════════════════════════════╗', 'green'));
    console.log(c('║                                                              ║', 'green'));
    console.log(c('║             ', 'green') + c('🎉 BOT IS STARTING NOW! 🎉', 'bright') + c('                      ║', 'green'));
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
    console.error(c('\n❌ DEPLOYMENT FAILED:', 'red'), err.message);
    rl.close();
    process.exit(1);
});
```

`save as index.js`
`run npm start`
REMEMBER TO RESTART THE PANEL AFTER PAIRING WITH WHATSAPP 

## FREE PANEL:
bot hosting net (https://Bot-hosting.net)

For detailed setup and command addition, check the tutorial videos!

> Built by crysn⚉va
---

<div align="center">
  
**© 2026 CRYSNOVA AI. Powered by CRYSN⚉VA X. All rights reserved.**

Made by crysnovax

---

⭐ **Thank you for visiting my profile!** 🙌  
