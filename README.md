# CRYSNOVA AI


<!-- ₹REE WA BOT | Modern Profile README  -->

<p align="center">
  <img src="https://i.ibb.co/bjcyx74M/temp-media-1771053680102.jpg" alt="CRYSNOVA X BOT" width="100%">
  
A modular WhatsApp bot built using Node.js and Baileys — the perfect foundation for my YouTube tutorial series.  
This base lets you add new commands daily, helping you create a fully customized WhatsApp bot from scratch, even if you're new to coding.

## 💡 Key Features
- **Dynamic Plugin System**: Simply add .js files for new commands — no complex setup required.
- **Auto-Reload Functionality**: Changes take effect instantly without restarting the bot.
- **Permission Controls**: Built-in support for owner and admin roles to manage access.
- **Organized Command Categories**: Keeps your bot structured and easy to navigate.
- **Essential Tools**: Includes system utilities, media handling, and more.
- **Beginner-Friendly**: Clean, readable code designed for learning and experimentation.

Follow along with the tutorial series: Each episode introduces 1–2 new commands, building your skills step by step.

## 👾 FORK CRYSNOVA-AI
    
  <a href="https://github.com/crysnovax/CRYSNOVA-AI/fork"><img title="CRYSNOVA AI" src="https://img.shields.io/badge/FORK-CRYSNOVA AI-h?color=blue&style=for-the-badge&logo=stackshare"></a>

## 🧠 Editing Bot Files
Need to tweak or customize? Download [MT Manager](https://t.me/crysnovax) for easy file management.

## 👨‍💻 Credits
- **Base Project**: [CRYSNOVA](https://t.me/crysnovax)
- **Tutorials & Upgrades**: **CRYSTAL LEVI**
- **Library**: [Baileys by @crysnovax](https://github.com/crysnovax/CRYSNOVA-AI)

## 📺 Connect & Learn
- **YouTube Channel**: [CRYSNOVA](https://youtube.com/@crysnovax)
- **WhatsApp Channel**: [Official Channel](https://whatsapp.com/channel/0029Vb6pe77K0IBn48HLKb38)

## 🚀 Getting Started
1. Clone the repository: `git clone https://github.com/crysnovax/CRYSNOVA-AI`
2. Install dependencies: `npm install`
3. Run the bot: `node index.js`
4. Scan the QR code with WhatsApp to connect.

## Installation & Deployment

There are two main ways to deploy **CRYSNOVA AI** on your hosting panel (bot-hosting.net, Pterodactyl-based, etc.):

### Method 1 – One-command Bash deploy script (recommended)

Run this in your panel's **Console / Terminal** after creating the file.

1. Create the script file:

```bash
nano deploy.sh
#!/bin/bash
# CRYSNOVA AI - One-command deploy script
# Run: chmod +x deploy.sh && ./deploy.sh

set -e

REPO="git@github.com:crysnovax/CRYSNOVA-AIt.git"
APP_NAME="crysnova-bot"
BRANCH="main"

echo "======================================"
echo "  CRYSNOVA AI Deployment Script"
echo "  $(date)"
echo "======================================"

# Check git
if ! command -v git >/dev/null 2>&1; then
    echo "❌ Git not found. Install git first."
    exit 1
fi

# Clone or update
if [ ! -d ".git" ]; then
    echo "📥 Cloning fresh repository via SSH..."
    git clone "$REPO" .
else
    echo "🔄 Repository exists → pulling latest..."
    git fetch origin
    git reset --hard origin/"$BRANCH"
    git clean -fd
fi

# Install dependencies
echo "📦 Installing npm packages..."
npm install --no-audit --no-fund --production

# PM2 setup
echo "🔧 Setting up PM2..."
if ! command -v pm2 >/dev/null 2>&1; then
    echo "Installing PM2 globally..."
    npm install -g pm2
fi

# Restart / start bot
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start index.js --name "$APP_NAME"
pm2 save

echo ""
echo "======================================"
echo "✅ Deployment finished!"
echo ""
echo "Useful PM2 commands:"
echo "  pm2 status          → check running processes"
echo "  pm2 logs $APP_NAME  → view live logs"
echo "  pm2 stop $APP_NAME  → stop bot"
echo "  pm2 restart $APP_NAME → restart bot"
echo "======================================"






For detailed setup and command addition, check the tutorial videos!

> Built by crysn⚉va
---

<div align="center">

**© 2026 CRYSNOVA AI. Powered by CRYSN⚉VA X. All rights reserved.**

Made by crysnovax

---

⭐ **Thank you for visiting my profile!** 🙌  
