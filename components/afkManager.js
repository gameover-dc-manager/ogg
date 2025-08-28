
const fs = require('fs');
const path = require('path');

const afkFile = path.join(__dirname, '../config/afk_status.json');

// Ensure config directory exists
const configDir = path.dirname(afkFile);
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

function loadAFKData() {
    try {
        if (!fs.existsSync(afkFile)) {
            return {};
        }
        const data = fs.readFileSync(afkFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading AFK data:', error);
        return {};
    }
}

function saveAFKData(data) {
    try {
        fs.writeFileSync(afkFile, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving AFK data:', error);
        return false;
    }
}

function setAFK(guildId, userId, reason = 'AFK') {
    const afkData = loadAFKData();
    const key = `${guildId}_${userId}`;
    
    afkData[key] = {
        reason: reason,
        timestamp: Date.now(),
        guildId: guildId,
        userId: userId
    };
    
    saveAFKData(afkData);
    return true;
}

function removeAFK(guildId, userId) {
    const afkData = loadAFKData();
    const key = `${guildId}_${userId}`;
    
    if (afkData[key]) {
        const afkInfo = afkData[key];
        delete afkData[key];
        saveAFKData(afkData);
        return afkInfo;
    }
    
    return null;
}

function getAFK(guildId, userId) {
    const afkData = loadAFKData();
    const key = `${guildId}_${userId}`;
    return afkData[key] || null;
}

function isAFK(guildId, userId) {
    const afkData = loadAFKData();
    const key = `${guildId}_${userId}`;
    return !!afkData[key];
}

function getAllAFK(guildId) {
    const afkData = loadAFKData();
    const guildAFK = {};
    
    Object.keys(afkData).forEach(key => {
        if (key.startsWith(`${guildId}_`)) {
            const userId = key.split('_')[1];
            guildAFK[userId] = afkData[key];
        }
    });
    
    return guildAFK;
}

function cleanupOldAFK(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days default
    const afkData = loadAFKData();
    const now = Date.now();
    let cleaned = 0;
    
    Object.keys(afkData).forEach(key => {
        const afkInfo = afkData[key];
        if (now - afkInfo.timestamp > maxAge) {
            delete afkData[key];
            cleaned++;
        }
    });
    
    if (cleaned > 0) {
        saveAFKData(afkData);
        console.log(`🧹 Cleaned up ${cleaned} old AFK entries`);
    }
    
    return cleaned;
}

module.exports = {
    setAFK,
    removeAFK,
    getAFK,
    isAFK,
    getAllAFK,
    cleanupOldAFK,
    loadAFKData,
    saveAFKData
};
