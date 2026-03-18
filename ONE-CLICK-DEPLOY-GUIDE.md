# 🚀 CRYSNOVA AI - ONE-CLICK DEPLOYMENT GUIDE

## 🎯 **FOR USERS WITHOUT PANELS**

Your users can deploy CRYSNOVA AI bot on these platforms **FOR FREE** with one click!

---

## ⚡ **OPTION 1: RAILWAY (BEST - FREE $5/MONTH)**

### **Step 1: Add This Button to Your README.md**

```markdown
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/crysnova-ai?referralCode=YOUR_CODE)
```

### **Step 2: Create `railway.json` in your repo:**

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### **Step 3: Create `.nixpacks` file:**

```toml
[phases.setup]
nixPkgs = ['nodejs-18_x', 'ffmpeg', 'imagemagick', 'libwebp']

[phases.install]
cmds = ['npm install']

[start]
cmd = 'npm start'
```

---

## ⚡ **OPTION 2: RENDER (FREE TIER)**

### **Add This Button:**

```markdown
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/crysnovax/CRYSNOVA_AI)
```

### **Create `render.yaml` in your repo:**

```yaml
services:
  - type: web
    name: crysnova-ai
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_VERSION
        value: 18.x
      - key: PORT
        value: 3000
```

---

## ⚡ **OPTION 3: KOYEB (FREE - EASY)**

### **Add This Button:**

```markdown
[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&repository=github.com/crysnovax/CRYSNOVA_AI&branch=main&name=crysnova-ai)
```

### **Create `.koyeb.yml` in your repo:**

```yaml
app:
  name: crysnova-ai
  services:
    - name: bot
      type: web
      instances: 1
      regions:
        - fra
      build:
        buildpack: nodejs
        nodejs_version: 18
      ports:
        - port: 3000
          protocol: http
      env:
        - PORT=3000
```

---

## ⚡ **OPTION 4: HEROKU (PAID BUT POPULAR)**

### **Add This Button:**

```markdown
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/crysnovax/CRYSNOVA_AI)
```

### **Create `app.json` in your repo:**

```json
{
  "name": "CRYSNOVA AI",
  "description": "Professional WhatsApp Bot - CRYSNOVA AI V2.0",
  "repository": "https://github.com/crysnovax/CRYSNOVA_AI",
  "logo": "https://media.crysnovax.workers.dev/b5160094-6827-4c63-9b40-7dfb979c1684.png",
  "keywords": ["whatsapp", "bot", "crysnova", "ai"],
  "buildpacks": [
    {
      "url": "heroku/nodejs"
    },
    {
      "url": "https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest"
    },
    {
      "url": "https://github.com/clhuang/heroku-buildpack-webp-binaries"
    }
  ],
  "formation": {
    "worker": {
      "quantity": 1,
      "size": "basic"
    }
  },
  "env": {
    "OWNER_NUMBER": {
      "description": "Your WhatsApp number (without +)",
      "required": true
    },
    "BOT_NAME": {
      "description": "Bot name",
      "value": "CRYSNOVA AI",
      "required": false
    },
    "PREFIX": {
      "description": "Bot command prefix",
      "value": ".",
      "required": false
    },
    "PUBLIC_MODE": {
      "description": "Public mode (true/false)",
      "value": "true",
      "required": false
    }
  }
}
```

### **Create `Procfile`:**

```
worker: npm start
```

---

## 📋 **WHAT TO ADD TO YOUR README.md:**

```markdown
# 🚀 DEPLOY CRYSNOVA AI - NO PANEL NEEDED!

## ⚡ One-Click Deploy (Choose One):

### **Option 1: Railway (Recommended - Free)**
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/crysnova-ai)

### **Option 2: Render (Free)**
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/crysnovax/CRYSNOVA_AI)

### **Option 3: Koyeb (Free)**
[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&repository=github.com/crysnovax/CRYSNOVA_AI&branch=main&name=crysnova-ai)

### **Option 4: Heroku ($5/month)**
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/crysnovax/CRYSNOVA_AI)

---

## 📖 **How to Deploy:**

1. **Click any button above** ☝️
2. **Sign up/Login** to the platform
3. **Wait for deployment** (2-3 minutes)
4. **Open the deployed app**
5. **Enter your phone number** when prompted
6. **Get pairing code** and pair on WhatsApp
7. **Done!** ✅ Your bot is running!

### **No hosting panel needed!**
### **No VPS needed!**
### **No technical knowledge needed!**

Just click, pair, and use! 🔥
```

---

## 🎯 **WHAT USERS WILL DO:**

1. Visit your GitHub repo
2. Click "Deploy to Railway" (or other button)
3. Platform automatically:
   - ✅ Clones your repo
   - ✅ Installs dependencies
   - ✅ Starts the bot
   - ✅ Shows pairing code
4. User pairs and bot runs!

---

## 📦 **FILES YOU NEED TO ADD TO YOUR REPO:**

```
your-repo/
├── app.json          ← Heroku config
├── railway.json      ← Railway config
├── render.yaml       ← Render config
├── .koyeb.yml        ← Koyeb config
├── Procfile          ← Process config
├── .nixpacks         ← Railway build config
└── README.md         ← Updated with deploy buttons
```

---

## ✅ **BENEFITS:**

✅ **No panel needed** - Just click and deploy  
✅ **Free tier available** - Railway, Render, Koyeb  
✅ **Auto-restart** - If bot crashes  
✅ **Easy pairing** - Terminal shows pairing code  
✅ **24/7 running** - As long as free tier allows  
✅ **Simple updates** - Redeploy from GitHub  

---

**This is the EASIEST way for users without panels!** 🔥
