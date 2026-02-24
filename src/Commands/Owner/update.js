const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// ── CONFIGURATION ──
const CONFIG = {
    repo: 'crysnovax/CRYSNOVA_AI',
    branch: 'main',
    backupDir: './.update_backup',
    tempDir: './.update_temp',
    maxRetries: 3,
    requestTimeout: 30000
};

// ── USER DATA PROTECTION ──
const PROTECTED_PATHS = [
    'sessions/',
    'database/',
    '.env',
    'config.js',
    'settings/',
    'data/',
    'auth_info_baileys/',
    'creds.json',
    'package-lock.json',
    'node_modules/'
];

// ── SAFE FILE OPERATIONS ──
const safeFs = {
    exists: (p) => {
        try { return fs.existsSync(p); } catch { return false; }
    },
    
    mkdir: (p) => {
        try {
            if (!safeFs.exists(p)) {
                fs.mkdirSync(p, { recursive: true });
            }
            return true;
        } catch (err) {
            console.error(`[SAFE_FS] mkdir failed: ${p}`, err.message);
            return false;
        }
    },
    
    write: (p, data) => {
        try {
            safeFs.mkdir(path.dirname(p));
            fs.writeFileSync(p, data);
            return true;
        } catch (err) {
            console.error(`[SAFE_FS] write failed: ${p}`, err.message);
            return false;
        }
    },
    
    copy: (src, dest) => {
        try {
            if (!safeFs.exists(src)) return false;
            safeFs.mkdir(path.dirname(dest));
            fs.copyFileSync(src, dest);
            return true;
        } catch (err) {
            console.error(`[SAFE_FS] copy failed: ${src} -> ${dest}`, err.message);
            return false;
        }
    },
    
    remove: (p) => {
        try {
            if (!safeFs.exists(p)) return true;
            const stat = fs.statSync(p);
            if (stat.isDirectory()) {
                fs.rmSync(p, { recursive: true, force: true });
            } else {
                fs.unlinkSync(p);
            }
            return true;
        } catch (err) {
            console.error(`[SAFE_FS] remove failed: ${p}`, err.message);
            return false;
        }
    }
};

// ── MAIN MODULE ──
module.exports = {
    name: 'update',
    alias: ['upgrade', 'sync', 'gitpull'],
    category: 'owner',
    owner: true,
    desc: 'Safe auto-updater with backup and dependency install',
     // ⭐ Reaction config
    reactions: {
        start: '♻️',
        success: '📦'
    },
    

    execute: async (sock, m, { reply, prefix }) => {
        const logs = [];
        const startTime = Date.now();
        
        // ✅ DEFINE sendProgress FIRST (before using it!)
        const sendProgress = async (text) => {
            logs.push({ time: Date.now(), text });
            console.log(`[UPDATE] ${text}`);
            await reply(text);
        };

        try {
            // Now we can use sendProgress (it's already defined)
            await sendProgress('🔍 *CRYSNOVA AI Update System*\n\nChecking for updates...');

            // ── STEP 1: GET VERSION INFO ──
            const versionUrl = `https://raw.githubusercontent.com/${CONFIG.repo}/${CONFIG.branch}/package.json`;
            
            let remotePackage;
            try {
                const response = await axios.get(versionUrl, {
                    timeout: CONFIG.requestTimeout,
                    headers: { 'Cache-Control': 'no-cache' }
                });
                remotePackage = response.data;
            } catch (err) {
                console.error('[UPDATE] Version check failed:', err.message);
                return reply('✘ *Update check failed*\nCannot reach repository. Check your internet connection.');
            }

            const localPackage = safeFs.exists('./package.json') 
                ? JSON.parse(fs.readFileSync('./package.json', 'utf8'))
                : { version: '0.0.0' };

            const currentVer = localPackage.version;
            const remoteVer = remotePackage.version;

            console.log(`[UPDATE] Local=${currentVer}, Remote=${remoteVer}`);

            if (currentVer === remoteVer) {
                return reply(`✓ *CRYSNOVA AI is up to date!*\n\nVersion: ${currentVer}`);
            }

            await sendProgress(`⬆ *Update Available!*\n\nCurrent: ${currentVer}\nLatest: ${remoteVer}\n\nStarting safe update...`);

            // ── STEP 2: CREATE BACKUP ──
            await sendProgress('💾 *Creating backup...*');
            
            safeFs.remove(CONFIG.backupDir);
            safeFs.mkdir(CONFIG.backupDir);

            const backupPaths = ['src', 'plugins', 'library', 'settings', 'index.js', 'package.json'];
            let backupCount = 0;

            for (const p of backupPaths) {
                if (safeFs.exists(p)) {
                    const dest = path.join(CONFIG.backupDir, p);
                    try {
                        if (fs.statSync(p).isDirectory()) {
                            fs.cpSync(p, dest, { recursive: true });
                        } else {
                            safeFs.copy(p, dest);
                        }
                        backupCount++;
                    } catch (err) {
                        console.log(`[UPDATE] Backup skip: ${p}`);
                    }
                }
            }

            await sendProgress(`✓ *Backup created* (${backupCount} items)`);

            // ── STEP 3: DOWNLOAD UPDATE ──
            await sendProgress('✪ _*Downloading update...*_');
            
            const zipUrl = `https://github.com/${CONFIG.repo}/archive/refs/heads/${CONFIG.branch}.zip`;
            const zipPath = path.join(CONFIG.tempDir, 'update.zip');
            
            safeFs.remove(CONFIG.tempDir);
            safeFs.mkdir(CONFIG.tempDir);

            let zipBuffer;
            let retries = 0;
            
            while (retries < CONFIG.maxRetries) {
                try {
                    const response = await axios.get(zipUrl, {
                        responseType: 'arraybuffer',
                        timeout: 120000,
                        maxContentLength: 100 * 1024 * 1024
                    });
                    zipBuffer = Buffer.from(response.data);
                    break;
                } catch (err) {
                    retries++;
                    console.log(`[UPDATE] Download retry ${retries}`);
                    if (retries >= CONFIG.maxRetries) throw err;
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            fs.writeFileSync(zipPath, zipBuffer);
            const zipSize = (zipBuffer.length / 1024 / 1024).toFixed(2);
            await sendProgress(`✓ *Downloaded* (${zipSize}MB)`);

            // ── STEP 4: EXTRACT ──
            await sendProgress('📦 `Extracting files...`');
            
            const zip = new AdmZip(zipBuffer);
            const entries = zip.getEntries();
            const repoPrefix = `CRYSNOVA_AI-${CONFIG.branch}/`;
            
            let extractedCount = 0;
            let skippedCount = 0;

            for (const entry of entries) {
                try {
                    if (entry.isDirectory) continue;
                    
                    let entryName = entry.entryName.replace(repoPrefix, '');

                    // Check protected paths
                    const isProtected = PROTECTED_PATHS.some(protected => 
                        entryName.toLowerCase().startsWith(protected.toLowerCase())
                    );

                    if (isProtected) {
                        skippedCount++;
                        continue;
                    }

                    const targetPath = path.join('./', entryName);
                    if (safeFs.write(targetPath, entry.getData())) {
                        extractedCount++;
                    }

                } catch (err) {
                    console.log(`[UPDATE] Extract error: ${entry.entryName}`);
                }
            }

            await sendProgress(`✓ *Extracted* ${extractedCount} files, skipped ${skippedCount}`);

            // ── STEP 5: INSTALL DEPENDENCIES ──
            await sendProgress('✪ _*Installing dependencies...*_');
            
            let depsInstalled = false;
            try {
                const newPackage = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
                const oldDeps = JSON.stringify(localPackage.dependencies || {});
                const newDeps = JSON.stringify(newPackage.dependencies || {});

                if (oldDeps !== newDeps) {
                    await execPromise('npm install --production', { timeout: 300000 });
                    depsInstalled = true;
                }
            } catch (err) {
                console.log('[UPDATE] Deps install warning:', err.message);
            }

            await sendProgress(depsInstalled ? '✓ *Dependencies installed*' : '𓄄 *Dependencies unchanged*');

            // ── CLEANUP ──
            safeFs.remove(CONFIG.tempDir);
            
            // Auto-delete backup after 24h
            setTimeout(() => safeFs.remove(CONFIG.backupDir), 24 * 60 * 60 * 1000);

            // ── FINAL REPORT ──
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            
            await reply(`⚉ *UPDATE COMPLETE!*

📊 *Summary:*
• Version: ${currentVer} → ${remoteVer}
• Files: ${extractedCount} updated
• Protected: ${skippedCount} skipped
• Backup: ${backupCount} items
• Duration: ${duration}s

⚠️ *RESTART REQUIRED*
Use: ${prefix}restart or restart panel

💾 Backup: \`${CONFIG.backupDir}\``);

            // Auto-restart if enabled
            if (process.env.AUTO_RESTART === 'true') {
                await reply('♻️ *Auto-restarting in 5s...*');
                setTimeout(() => process.exit(0), 5000);
            }

        } catch (err) {
            console.error('[UPDATE ERROR]', err);
            
            await reply('✘ *Update failed!*\nRestoring backup...');
            
            // Restore
            if (safeFs.exists(CONFIG.backupDir)) {
                try {
                    fs.cpSync(CONFIG.backupDir, './', { recursive: true, force: true });
                    await reply('✓ *Backup restored*');
                } catch {
                    await reply('✘ *Restore failed* - manual fix needed');
                }
            }
            
            safeFs.remove(CONFIG.tempDir);
        }
    }
};
                                      
