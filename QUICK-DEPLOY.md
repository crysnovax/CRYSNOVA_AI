# 🚀 CRYSNOVA AI V2.0 — Quick Deploy

## For Users (First Time)

```bash
# 1. Extract ZIP
unzip CRYSNOVA-AI-V2-AUTO-SETUP.zip
cd CRYS_DEPLOY

# 2. Install
npm install

# 3. Start (interactive setup begins automatically)
npm start
```

### You'll be asked:
1. **Your name** → e.g., `John`
2. **Bot name** → e.g., `John Bot`
3. **Prefix** → e.g., `.` or `!`
4. **Public mode?** → `yes` or `no`
5. **WhatsApp number** → e.g., `2348077528901`

### Then you get a pairing code:
```
🔐 Your pairing code: AB-CD-EF-12
```

Enter it in WhatsApp:
- Settings → Linked Devices → Link with phone number

**Done! Bot is live!** 🎉

---

## For Developers (Testing)

```bash
# Skip setup wizard (create config manually)
mkdir -p database
cat > database/user-config.json << 'EOF'
{
  "setupCompleted": true,
  "owner": {
    "name": "Dev",
    "number": "1234567890",
    "jid": "1234567890@s.whatsapp.net"
  },
  "bot": {
    "name": "TestBot",
    "prefix": ".",
    "public": true
  }
}
EOF

npm install
npm start
```

---

## Troubleshooting

**Setup won't start?**
```bash
rm database/user-config.json
npm start
```

**Wrong number entered?**
```bash
rm -rf sessions database/user-config.json
npm start
```

**Bot not responding?**
- Check your prefix (`.menu` or `!menu`)
- Check public mode (private = owner only)

---

## File Locations

```
database/user-config.json    ← Your setup answers
sessions/creds.json           ← WhatsApp login
settings/config.js            ← Loads from user-config.json
```

**Never edit `settings/config.js` manually!** It auto-loads from `user-config.json`.

---

**Made by CRYSNOVA** ❤️
