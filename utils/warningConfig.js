
const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '../config');
const configFile = path.join(configDir, 'warning_config.json');

// Default configuration
const defaultConfig = {
    thresholds: {
        timeout: 3,
        kick: 5,
        ban: 7
    },
    autoPunishment: {
        enabled: true,
        timeoutDuration: {
            minor: 10 * 60 * 1000,    // 10 minutes
            moderate: 60 * 60 * 1000,  // 1 hour
            severe: 6 * 60 * 60 * 1000 // 6 hours
        }
    },
    limits: {
        maxWarningsPerUser: 50,
        defaultExpiry: 30 // days
    },
    customPunishments: {
        enabled: true,
        allowedRoles: [] // Role IDs that can apply custom punishments
    }
};

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

function loadConfig() {
    try {
        if (!fs.existsSync(configFile)) {
            return {};
        }
        const data = fs.readFileSync(configFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading warning config:', error);
        return {};
    }
}

function saveConfig(config) {
    try {
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving warning config:', error);
        return false;
    }
}

async function getWarningConfig(guildId) {
    const allConfigs = loadConfig();
    
    if (!allConfigs[guildId]) {
        allConfigs[guildId] = { ...defaultConfig };
        saveConfig(allConfigs);
    }
    
    return allConfigs[guildId];
}

async function setWarningConfig(guildId, config) {
    const allConfigs = loadConfig();
    allConfigs[guildId] = config;
    return saveConfig(allConfigs);
}

async function resetWarningConfig(guildId) {
    const allConfigs = loadConfig();
    allConfigs[guildId] = { ...defaultConfig };
    return saveConfig(allConfigs);
}

async function updateThresholds(guildId, thresholds) {
    const config = await getWarningConfig(guildId);
    config.thresholds = { ...config.thresholds, ...thresholds };
    return await setWarningConfig(guildId, config);
}

async function toggleAutoPunishment(guildId, enabled) {
    const config = await getWarningConfig(guildId);
    config.autoPunishment.enabled = enabled;
    return await setWarningConfig(guildId, config);
}

module.exports = {
    getWarningConfig,
    setWarningConfig,
    resetWarningConfig,
    updateThresholds,
    toggleAutoPunishment,
    defaultConfig
};
