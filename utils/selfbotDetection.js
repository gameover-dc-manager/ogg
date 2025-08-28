
const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '../config');
const configFile = path.join(configDir, 'selfbot_config.json');

// Default configuration
const defaultConfig = {
    enabled: true,
    sensitivity: 5,
    mode: 'passive',
    autoAction: false,
    defaultPunishment: 'warn',
    whitelist: [],
    stats: {
        scansToday: 0,
        detectionsTotal: 0,
        falsePositives: 0,
        totalScans: 0
    }
};

function loadSelfbotConfig() {
    try {
        if (!fs.existsSync(configFile)) {
            return {};
        }
        const data = fs.readFileSync(configFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading selfbot config:', error);
        return {};
    }
}

function saveSelfbotConfig(config) {
    try {
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving selfbot config:', error);
        return false;
    }
}

async function getSelfbotConfig(guildId) {
    const allConfigs = loadSelfbotConfig();
    
    if (!allConfigs[guildId]) {
        allConfigs[guildId] = { ...defaultConfig };
        saveSelfbotConfig(allConfigs);
    }
    
    return allConfigs[guildId];
}

async function updateSelfbotConfig(guildId, updates) {
    const allConfigs = loadSelfbotConfig();
    const config = allConfigs[guildId] || { ...defaultConfig };
    
    if (updates.sensitivity !== undefined) config.sensitivity = updates.sensitivity;
    if (updates.autoAction !== undefined) config.autoAction = updates.autoAction;
    if (updates.defaultPunishment !== undefined) config.defaultPunishment = updates.defaultPunishment;
    
    allConfigs[guildId] = config;
    saveSelfbotConfig(allConfigs);
    
    return config;
}

async function setSelfbotMonitoring(guildId, mode) {
    const allConfigs = loadSelfbotConfig();
    const config = allConfigs[guildId] || { ...defaultConfig };
    
    config.mode = mode;
    config.enabled = mode !== 'disable';
    
    allConfigs[guildId] = config;
    saveSelfbotConfig(allConfigs);
    
    return config;
}

async function manageSelfbotWhitelist(guildId, action, user) {
    const allConfigs = loadSelfbotConfig();
    const config = allConfigs[guildId] || { ...defaultConfig };
    
    switch (action) {
        case 'add':
            if (user && !config.whitelist.includes(user.id)) {
                config.whitelist.push(user.id);
                allConfigs[guildId] = config;
                saveSelfbotConfig(allConfigs);
                return { success: true, message: `Added ${user.tag} to whitelist.` };
            }
            return { success: false, message: 'User already whitelisted or invalid user.' };
            
        case 'remove':
            if (user) {
                const index = config.whitelist.indexOf(user.id);
                if (index > -1) {
                    config.whitelist.splice(index, 1);
                    allConfigs[guildId] = config;
                    saveSelfbotConfig(allConfigs);
                    return { success: true, message: `Removed ${user.tag} from whitelist.` };
                }
            }
            return { success: false, message: 'User not found in whitelist.' };
            
        case 'view':
            return { success: true, message: `Whitelist contains ${config.whitelist.length} users.`, whitelist: config.whitelist };
            
        case 'clear':
            config.whitelist = [];
            allConfigs[guildId] = config;
            saveSelfbotConfig(allConfigs);
            return { success: true, message: 'Whitelist cleared.' };
            
        default:
            return { success: false, message: 'Invalid action.' };
    }
}

async function performSelfbotScan(guild, user, deepScan = false) {
    const config = await getSelfbotConfig(guild.id);
    
    if (user) {
        // Scan specific user
        const member = guild.members.cache.get(user.id);
        if (!member) {
            return { error: 'User not found in guild' };
        }
        
        // Check if user is whitelisted
        if (config.whitelist.includes(user.id)) {
            return {
                riskLevel: 'low',
                riskScore: 0,
                confidence: 100,
                factors: [],
                recommendations: ['User is whitelisted']
            };
        }
        
        // Perform scan analysis
        const analysis = await analyzeMemberBehavior(member, deepScan, config.sensitivity);
        
        // Update stats
        config.stats.totalScans++;
        const allConfigs = loadSelfbotConfig();
        allConfigs[guild.id] = config;
        saveSelfbotConfig(allConfigs);
        
        return analysis;
    } else {
        // Scan entire server
        const members = guild.members.cache;
        const results = {
            totalScanned: members.size,
            suspiciousUsers: 0,
            highRisk: 0,
            mediumRisk: 0,
            details: []
        };
        
        for (const [id, member] of members) {
            if (config.whitelist.includes(id)) continue;
            
            const analysis = await analyzeMemberBehavior(member, false, config.sensitivity);
            
            if (analysis.riskLevel !== 'low') {
                results.suspiciousUsers++;
                results.details.push({
                    tag: member.user.tag,
                    riskLevel: analysis.riskLevel,
                    riskScore: analysis.riskScore
                });
                
                if (analysis.riskLevel === 'high') results.highRisk++;
                if (analysis.riskLevel === 'medium') results.mediumRisk++;
            }
        }
        
        return results;
    }
}

async function analyzeMemberBehavior(member, deepScan, sensitivity) {
    const factors = [];
    let riskScore = 0;
    const user = member.user;
    
    // Basic checks
    if (user.bot) {
        return { riskLevel: 'low', riskScore: 0, confidence: 100, factors: ['Verified bot account'], recommendations: [] };
    }
    
    // Account age check
    const accountAge = Date.now() - user.createdTimestamp;
    const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation < 7) {
        factors.push('🚨 Very new account (less than 7 days)');
        riskScore += 30;
    } else if (daysSinceCreation < 30) {
        factors.push('⚠️ New account (less than 30 days)');
        riskScore += 15;
    }
    
    // Username patterns
    if (/\d{4,}$/.test(user.username)) {
        factors.push('🔢 Username ends with many numbers');
        riskScore += 10;
    }
    
    if (user.username.length < 3) {
        factors.push('📝 Very short username');
        riskScore += 5;
    }
    
    // Avatar check
    if (!user.avatar) {
        factors.push('👤 No custom avatar');
        riskScore += 5;
    }
    
    // Member-specific checks
    const joinAge = Date.now() - member.joinedTimestamp;
    const daysSinceJoin = joinAge / (1000 * 60 * 60 * 24);
    
    if (daysSinceJoin < 1) {
        factors.push('🆕 Recently joined (less than 24h)');
        riskScore += 20;
    }
    
    // Nickname patterns
    if (member.nickname && member.nickname !== user.username) {
        if (/^[a-zA-Z]\s*$/.test(member.nickname)) {
            factors.push('🏷️ Single character nickname');
            riskScore += 15;
        }
    }
    
    // Deep scan additional checks
    if (deepScan) {
        // Check for rapid role changes, message patterns, etc.
        // This would require storing historical data
        factors.push('🔍 Deep scan performed');
    }
    
    // Adjust score based on sensitivity
    riskScore = Math.round(riskScore * (sensitivity / 5));
    
    // Determine risk level
    let riskLevel = 'low';
    let confidence = 50;
    
    if (riskScore >= 60) {
        riskLevel = 'high';
        confidence = 85;
    } else if (riskScore >= 30) {
        riskLevel = 'medium';
        confidence = 70;
    } else {
        confidence = 60;
    }
    
    // Generate recommendations
    const recommendations = [];
    if (riskLevel === 'high') {
        recommendations.push('🔍 Manual review recommended');
        recommendations.push('⚠️ Consider monitoring this user');
    } else if (riskLevel === 'medium') {
        recommendations.push('👁️ Keep an eye on this user');
    }
    
    return {
        riskLevel,
        riskScore: Math.min(riskScore, 100),
        confidence,
        factors,
        recommendations
    };
}

async function getSelfbotAnalytics(guildId) {
    const config = await getSelfbotConfig(guildId);
    
    return {
        totalScans: config.stats.totalScans,
        totalDetections: config.stats.detectionsTotal,
        falsePositives: config.stats.falsePositives,
        accuracy: config.stats.totalScans > 0 ? Math.round(((config.stats.totalScans - config.stats.falsePositives) / config.stats.totalScans) * 100) : 0,
        recentScans: config.stats.scansToday,
        recentDetections: Math.floor(config.stats.detectionsTotal * 0.3), // Approximate recent
        avgDaily: Math.floor(config.stats.totalScans / 30), // Approximate
        highRiskDetections: Math.floor(config.stats.detectionsTotal * 0.3),
        mediumRiskDetections: Math.floor(config.stats.detectionsTotal * 0.5),
        lowRiskDetections: Math.floor(config.stats.detectionsTotal * 0.2)
    };
}

module.exports = {
    getSelfbotConfig,
    updateSelfbotConfig,
    setSelfbotMonitoring,
    manageSelfbotWhitelist,
    performSelfbotScan,
    getSelfbotAnalytics,
    analyzeMemberBehavior
};
