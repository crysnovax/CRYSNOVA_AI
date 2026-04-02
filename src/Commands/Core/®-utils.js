/**
 * Core/®-utils.js — 👀
 */

const fs = require('fs');
const path = require('path');
const { getTimezone, getTimeData: coreGetTimeData } = require('./®.js');

const ENV_PATH = path.join(__dirname, '../.env');
const DB_PATH = path.join(__dirname, '../database/timezones.json');

const getUserTimezone = (userId) => {
    const envKey = `USER_TZ_${userId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (process.env[envKey]) return process.env[envKey];
    
    if (fs.existsSync(DB_PATH)) {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        if (db[userId]) return db[userId];
    }
    
    return 'Lagos';
};

const saveUserTimezone = (userId, region) => {
    const db = fs.existsSync(DB_PATH) ? JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) : {};
    db[userId] = region;
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    
    // Update .env
    const envKey = `USER_TZ_${userId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    let envContent = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
    envContent = envContent.replace(new RegExp(`${envKey}=.*\\n?`, 'g'), '');
    envContent += `${envKey}=${region}\n`;
    fs.writeFileSync(ENV_PATH, envContent);
};

// Wrapper with fallback
const getTimeData = async (timezone) => {
    try {
        return await coreGetTimeData(timezone);
    } catch (err) {
        // Fallback calculation
        const now = new Date();
        return {
            source: 'local',
            data: {
                timezone,
                datetime: now.toISOString(),
                utc_offset: '+00:00',
                abbreviation: 'UTC',
                dst: false,
                day_of_week: now.getDay(),
                week_number: 1,
                day_of_year: 1
            }
        };
    }
};

module.exports = {
    getUserTimezone,
    saveUserTimezone,
    getTimeData,
    getTimezone
};
