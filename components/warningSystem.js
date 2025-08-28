const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// Default constants for auto-escalation (can be overridden by config)
const DEFAULT_AUTO_ESCALATION_THRESHOLDS = {
    timeout: 3,
    kick: 5,
    ban: 7
};

const ESCALATION_DURATIONS = {
    timeout: {
        minor: 10 * 60 * 1000,
        moderate: 60 * 60 * 1000,
        severe: 6 * 60 * 60 * 1000
    }
};

// File paths
const warningsDir = path.join(__dirname, '../config');
const warningsFile = path.join(warningsDir, 'warnings.json');

// Ensure warnings directory exists
if (!fs.existsSync(warningsDir)) {
    fs.mkdirSync(warningsDir, { recursive: true });
}

// In-memory cache for preventing duplicate operations
const operationCache = new Map();
const OPERATION_TIMEOUT = 10000; // 10 seconds

function getCacheKey(operation, guildId, userId, data) {
    if (operation === 'add' && data.reason && data.severity) {
        return `${operation}:${guildId}:${userId}:${data.reason}:${data.severity}:${data.moderatorId}`;
    }
    if (operation === 'appeal' && data.warningId) {
        return `${operation}:${guildId}:${userId}:${data.warningId}`;
    }
    return `${operation}:${guildId}:${userId}:${JSON.stringify(data)}`;
}

function isOperationCached(key) {
    const cached = operationCache.get(key);
    if (cached && Date.now() - cached < OPERATION_TIMEOUT) {
        return true;
    }
    if (cached) {
        operationCache.delete(key);
    }
    return false;
}

function cacheOperation(key) {
    operationCache.set(key, Date.now());
    // Clean up old entries
    if (operationCache.size > 200) {
        const cutoff = Date.now() - OPERATION_TIMEOUT;
        for (const [k, timestamp] of operationCache.entries()) {
            if (timestamp < cutoff) {
                operationCache.delete(k);
            }
        }
    }
}

function createWarning(guildId, userId, reason, moderatorId, severity = 'minor', expiresInDays = 0) {
    const now = Date.now();
    const expires = expiresInDays > 0 ? now + (expiresInDays * 24 * 60 * 60 * 1000) : 0;

    return {
        id: generateWarningId(),
        guildId,
        userId,
        reason,
        moderatorId,
        severity,
        timestamp: now,
        expires: expires,
        expired: false,
        removed: false,
        removedBy: null,
        removedReason: null,
        removedTimestamp: null,
        logged: false,
        appealed: false,
        appealReason: null,
        appealedAt: null,
        appealStatus: null,
        appealProcessedBy: null,
        appealProcessedAt: null,
        appealModeratorReason: null,
        appealNotified: false
    };
}

function generateWarningId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function loadWarnings() {
    try {
        if (!fs.existsSync(warningsFile)) {
            return {};
        }
        const data = fs.readFileSync(warningsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading warnings:', error);
        return {};
    }
}

function saveWarnings(warnings) {
    try {
        fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving warnings:', error);
        return false;
    }
}

async function addWarning(guildId, userId, reason, moderatorId, severity = 'moderate', expiresInDays = 0, client = null) {
    try {
        // Validate inputs
        if (!guildId || !userId || !reason || !moderatorId) {
            console.error('❌ Invalid warning parameters:', { guildId, userId, reason, moderatorId });
            return null;
        }

        const warningId = generateWarningId();
        const timestamp = Date.now();
        const expires = expiresInDays > 0 ? timestamp + (expiresInDays * 24 * 60 * 60 * 1000) : 0;

        const warning = {
            id: warningId,
            guildId: String(guildId),
            userId: String(userId),
            reason: String(reason),
            moderatorId: String(moderatorId),
            severity: severity || 'moderate',
            timestamp,
            expires,
            expired: false,
            removed: false,
            removedBy: null,
            removedReason: null,
            removedTimestamp: null,
            logged: false,
            appealed: false,
            appealReason: null,
            appealedAt: null,
            appealStatus: null,
            appealProcessedBy: null,
            appealProcessedAt: null,
            appealModeratorReason: null,
            appealNotified: false
        };

        const warnings = loadWarnings();
        const userKey = `${guildId}_${userId}`;

        if (!warnings[userKey]) {
            warnings[userKey] = [];
        }

        // Check for duplicate warnings (same reason within 5 minutes)
        const recentWarnings = warnings[userKey].filter(w =>
            !w.removed && !w.expired &&
            timestamp - w.timestamp < 300000 && // 5 minutes
            w.reason === reason
        );

        if (recentWarnings.length > 0) {
            console.log(`⚠️ Duplicate warning prevented for ${userId}: ${reason}`);
            return recentWarnings[0]; // Return existing warning
        }

        warnings[userKey].push(warning);
        saveWarnings(warnings);

        console.log(`✅ Warning added: ${warningId} for ${userId} in ${guildId} (${severity})`);
        return warning;

    } catch (error) {
        console.error('❌ Error adding warning:', error);
        return null;
    }
}

async function removeWarning(guildId, userId, warningId, removedBy, reason = 'No reason provided') {
    try {
        const warnings = loadWarnings();
        const key = `${guildId}_${userId}`;

        if (!warnings[key]) {
            return false;
        }

        const warningIndex = warnings[key].findIndex(w => w.id === warningId && !w.removed);
        if (warningIndex === -1) {
            return false;
        }

        const warning = warnings[key][warningIndex];
        warning.removed = true;
        warning.removedBy = removedBy;
        warning.removedReason = reason;
        warning.removedTimestamp = Date.now();

        saveWarnings(warnings);
        console.log(`✅ Warning ${warningId} removed for user ${userId} in guild ${guildId}`);

        if (global.client) {
            try {
                const guild = global.client.guilds.cache.get(guildId);
                const user = global.client.users.cache.get(userId);
                const moderator = removedBy ? global.client.users.cache.get(removedBy) : null;

                if (guild && user) {
                    // Lift punishments for the removed warning
                    await liftWarningPunishments(guild, userId, warning, moderator || { tag: 'System', id: 'system' });

                    const { logAction } = require('../utils/loggingSystem');
                    logAction(guild, 'warning_removed', {
                        user: user,
                        moderator: moderator || { tag: 'System', id: 'system' },
                        warningId: warningId,
                        originalReason: warning.reason,
                        removalReason: reason,
                        description: `Warning **${warningId}** removed from **${user.tag}**`
                    }, user).catch(logError => {
                        console.error('❌ Failed to log warning removal:', logError);
                    });
                }
            } catch (error) {
                console.error('❌ Error logging warning removal:', error);
            }
        }

        return true;
    } catch (error) {
        console.error('❌ Error removing warning:', error);
        return false;
    }
}

async function clearWarnings(guildId, userId, moderatorId, reason = 'No reason provided') {
    try {
        const warnings = loadWarnings();
        const key = `${guildId}_${userId}`;

        if (!warnings[key]) {
            return 0;
        }

        const activeWarnings = warnings[key].filter(w => !w.removed && !w.expired);

        activeWarnings.forEach(warning => {
            warning.removed = true;
            warning.removedBy = moderatorId;
            warning.removedReason = reason;
            warning.removedTimestamp = Date.now();
        });

        saveWarnings(warnings);
        console.log(`✅ ${activeWarnings.length} warnings cleared for user ${userId} in guild ${guildId}`);

        // Lift all punishments since all warnings are cleared
        if (global.client && activeWarnings.length > 0) {
            try {
                const guild = global.client.guilds.cache.get(guildId);
                const moderator = moderatorId ? global.client.users.cache.get(moderatorId) : null;

                if (guild) {
                    // Create a fake warning to represent the clearing action
                    const clearingAction = {
                        id: 'CLEAR_ALL',
                        reason: 'All warnings cleared'
                    };

                    await liftWarningPunishments(guild, userId, clearingAction, moderator || { tag: 'System', id: 'system' });
                    console.log(`🧹 Punishments lifted for user ${userId} after clearing all warnings`);
                }
            } catch (error) {
                console.error('❌ Error lifting punishments after clearing warnings:', error);
            }
        }

        return activeWarnings.length;
    } catch (error) {
        console.error('❌ Error clearing warnings:', error);
        return 0;
    }
}

async function getUserWarnings(guildId, userId) {
    try {
        await cleanupExpiredWarnings();

        const warnings = loadWarnings();
        const key = `${guildId}_${userId}`;

        if (!warnings[key] || warnings[key].length === 0) {
            return [];
        }

        const userWarnings = warnings[key].sort((a, b) => b.timestamp - a.timestamp);
        const validWarnings = userWarnings.filter(w => w && w.id && w.reason);

        return validWarnings;
    } catch (error) {
        console.error('❌ Error getting user warnings:', error);
        return [];
    }
}

async function getAllWarnings(guildId) {
    try {
        await cleanupExpiredWarnings();

        const warnings = loadWarnings();
        const allWarnings = [];

        Object.keys(warnings).forEach(key => {
            if (key.startsWith(`${guildId}_`)) {
                allWarnings.push(...warnings[key]);
            }
        });

        return allWarnings.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('❌ Error getting all warnings:', error);
        return [];
    }
}

async function getWarningStats(guildId) {
    try {
        const allWarnings = await getAllWarnings(guildId);

        const stats = {
            total: allWarnings.length,
            active: allWarnings.filter(w => !w.removed && !w.expired).length,
            expired: allWarnings.filter(w => w.expired).length,
            removed: allWarnings.filter(w => w.removed).length,
            severities: {
                minor: allWarnings.filter(w => w.severity === 'minor').length,
                moderate: allWarnings.filter(w => w.severity === 'moderate').length,
                severe: allWarnings.filter(w => w.severity === 'severe').length
            },
            uniqueUsers: new Set(allWarnings.map(w => w.userId)).size,
            activeModerators: new Set(allWarnings.map(w => w.moderatorId)).size,
            topOffenders: []
        };

        const userCounts = {};
        allWarnings.filter(w => !w.removed && !w.expired).forEach(warning => {
            userCounts[warning.userId] = (userCounts[warning.userId] || 0) + 1;
        });

        stats.topOffenders = Object.entries(userCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([userId, count]) => ({ userId, count }));

        return stats;
    } catch (error) {
        console.error('❌ Error getting warning stats:', error);
        return {
            total: 0,
            active: 0,
            expired: 0,
            removed: 0,
            severities: { minor: 0, moderate: 0, severe: 0 },
            uniqueUsers: 0,
            activeModerators: 0,
            topOffenders: []
        };
    }
}

async function cleanupExpiredWarnings() {
    try {
        const warnings = loadWarnings();
        const now = Date.now();
        let updated = false;

        Object.keys(warnings).forEach(key => {
            warnings[key].forEach(warning => {
                if (warning.expires > 0 && warning.expires <= now && !warning.expired) {
                    warning.expired = true;
                    updated = true;
                    console.log(`⏰ Warning ${warning.id} expired for user ${warning.userId}`);
                }
            });
        });

        if (updated) {
            saveWarnings(warnings);
        }

        return updated;
    } catch (error) {
        console.error('❌ Error cleaning up expired warnings:', error);
        return false;
    }
}

async function appealWarning(guildId, userId, warningId, appealReason, appealEvidence = null) {
    try {
        // Validate appeal reason length (20-500 characters)
        if (!appealReason || appealReason.trim().length < 20) {
            return { success: false, message: 'Appeal reason must be at least 20 characters long.' };
        }

        if (appealReason.trim().length > 500) {
            return { success: false, message: 'Appeal reason must be no more than 500 characters long.' };
        }

        // Create a unique operation key to prevent duplicates
        const operationKey = `appeal:${guildId}:${userId}:${warningId}`;

        // Check if this appeal is already being processed
        if (!global.activeAppeals) {
            global.activeAppeals = new Set();
        }

        if (global.activeAppeals.has(operationKey)) {
            console.log(`⚠️ Duplicate appeal operation detected, skipping: ${operationKey}`);
            return { success: false, message: 'Appeal already being processed. Please wait.' };
        }

        // Mark this appeal as being processed
        global.activeAppeals.add(operationKey);

        try {
            const warnings = loadWarnings();
            const key = `${guildId}_${userId}`;

            if (!warnings[key] || warnings[key].length === 0) {
                return { success: false, message: 'No warnings found for this user.' };
            }

            const warning = warnings[key].find(w => w.id === warningId);
            if (!warning) {
                return { success: false, message: 'Warning not found.' };
            }

            // Check if there's a recent pending appeal (within last 5 minutes)
            const recentAppealThreshold = Date.now() - (5 * 60 * 1000); // 5 minutes
            if (warning.appealed &&
                warning.appealStatus === 'pending' &&
                warning.appealedAt > recentAppealThreshold) {
                return { success: false, message: 'Appeal already in progress. Please wait before submitting another appeal.' };
            }

            // Allow resubmission for old pending appeals or processed appeals
            if (warning.appealed && (warning.appealStatus === 'approved' || warning.appealStatus === 'denied' || warning.appealedAt <= recentAppealThreshold)) {
                warning.appealReason = appealReason.trim();
                warning.appealEvidence = appealEvidence?.trim() || null;
                warning.appealedAt = Date.now();
                warning.appealStatus = 'pending';
                warning.appealProcessedBy = null;
                warning.appealProcessedAt = null;
                warning.appealModeratorReason = null;
                warning.appealNotified = false;
                console.log(`✅ Resubmitting appeal for warning ${warningId}`);
            } else {
                warning.appealed = true;
                warning.appealReason = appealReason.trim();
                warning.appealEvidence = appealEvidence?.trim() || null;
                warning.appealedAt = Date.now();
                warning.appealStatus = 'pending';
                warning.appealNotified = false;
                console.log(`✅ First appeal submission for warning ${warningId}`);
            }

            saveWarnings(warnings);
            console.log(`✅ Warning ${warningId} appealed by user ${userId}`);

            return { success: true, warning };
        } finally {
            // Always remove the operation key when done
            global.activeAppeals.delete(operationKey);
        }
    } catch (error) {
        console.error('❌ Error appealing warning:', error);
        return { success: false, message: 'An error occurred while processing the appeal.' };
    }
}

async function processWarningAppeal(guildId, warningId, moderatorReason, userId) {
    try {
        const warnings = loadWarnings();
        let foundWarning = null;
        let userKey = null;

        Object.keys(warnings).forEach(key => {
            if (key.startsWith(`${guildId}_`)) {
                const warning = warnings[key].find(w => w.id === warningId && !w.removed);
                if (warning) {
                    foundWarning = warning;
                    userKey = key;
                }
            }
        });

        if (!foundWarning) {
            return { success: false, message: 'Warning not found.' };
        }

        if (!foundWarning.appealed) {
            return { success: false, message: 'This warning has not been appealed.' };
        }

        if (foundWarning.appealStatus !== 'pending') {
            return { success: false, message: 'This appeal has already been processed.' };
        }

        const approved = moderatorReason === 'Appeal approved by moderator' || moderatorReason.toLowerCase().includes('approved');

        foundWarning.appealStatus = approved ? 'approved' : 'denied';
        foundWarning.appealProcessedBy = userId;
        foundWarning.appealProcessedAt = Date.now();
        foundWarning.appealModeratorReason = moderatorReason;

        if (approved) {
            foundWarning.removed = true;
            foundWarning.removedBy = userId;
            foundWarning.removedReason = 'Appeal approved';
            foundWarning.removedTimestamp = Date.now();
        }

        saveWarnings(warnings);
        console.log(`✅ Warning appeal ${warningId} ${approved ? 'approved' : 'denied'} by ${userId}`);

        return { success: true, warning: foundWarning, approved };
    } catch (error) {
        console.error('❌ Error processing warning appeal:', error);
        return { success: false, message: 'An error occurred while processing the appeal.' };
    }
}

async function editWarning(guildId, warningId, newReason, newSeverity = null) {
    try {
        const warnings = loadWarnings();
        let foundWarning = null;
        let userKey = null;

        Object.keys(warnings).forEach(key => {
            if (key.startsWith(`${guildId}_`)) {
                const warning = warnings[key].find(w => w.id === warningId && !w.removed);
                if (warning) {
                    foundWarning = warning;
                    userKey = key;
                }
            }
        });

        if (!foundWarning) {
            return { success: false, message: 'Warning not found or already removed.' };
        }

        const originalReason = foundWarning.reason;
        const originalSeverity = foundWarning.severity;

        foundWarning.reason = newReason;
        if (newSeverity) {
            foundWarning.severity = newSeverity;
        }
        foundWarning.lastModified = Date.now();
        foundWarning.editHistory = foundWarning.editHistory || [];
        foundWarning.editHistory.push({
            originalReason,
            originalSeverity,
            timestamp: Date.now()
        });

        saveWarnings(warnings);
        console.log(`✅ Warning ${warningId} edited in guild ${guildId}`);

        return { success: true, warning: foundWarning };
    } catch (error) {
        console.error('❌ Error editing warning:', error);
        return { success: false, message: 'An error occurred while editing the warning.' };
    }
}

async function exportWarningData(guildId, format = 'json') {
    try {
        const allWarnings = await getAllWarnings(guildId);

        if (format === 'csv') {
            const headers = 'ID,User ID,Reason,Moderator ID,Severity,Timestamp,Expires,Expired,Removed,Removed By,Removed Reason\n';
            const rows = allWarnings.map(w => {
                return [
                    w.id,
                    w.userId,
                    `"${w.reason.replace(/"/g, '""')}"`,
                    w.moderatorId,
                    w.severity,
                    new Date(w.timestamp).toISOString(),
                    w.expires ? new Date(w.expires).toISOString() : '',
                    w.expired,
                    w.removed,
                    w.removedBy || '',
                    w.removedReason ? `"${w.removedReason.replace(/"/g, '""')}"` : ''
                ].join(',');
            }).join('\n');

            return headers + rows;
        }

        return JSON.stringify(allWarnings, null, 2);
    } catch (error) {
        console.error('❌ Error exporting warning data:', error);
        return null;
    }
}

class WarningSystem {
    constructor(client = null) {
        this.client = client;
    }

    async addWarning(guildId, userId, reason, moderatorId, severity = 'moderate', expiresInDays = 0) {
        return await addWarning(guildId, userId, reason, moderatorId, severity, expiresInDays, this.client);
    }

    async getUserWarnings(guildId, userId) {
        return await getUserWarnings(guildId, userId);
    }

    async removeWarning(guildId, userId, warningId, removedBy, reason = 'No reason provided') {
        return await removeWarning(guildId, userId, warningId, removedBy, reason);
    }

    async editWarning(guildId, warningId, newReason, newSeverity) {
        return await editWarning(guildId, warningId, newReason, newSeverity);
    }

    async cleanupExpiredWarnings() {
        return await cleanupExpiredWarnings();
    }

    async getAllWarnings(guildId) {
        return await getAllWarnings(guildId);
    }

    async getWarningStats(guildId) {
        return await getWarningStats(guildId);
    }
}

async function liftWarningPunishments(guild, userId, warning, moderator) {
    try {
        console.log(`🔄 Checking for punishments to lift for warning ${warning.id}`);

        // Try to get the member
        const member = await guild.members.fetch(userId).catch(() => null);
        const user = await guild.client.users.fetch(userId).catch(() => null);

        if (!user) {
            console.log(`⚠️ User ${userId} not found, cannot lift punishments`);
            return;
        }

        // Check if user is currently banned
        try {
            const ban = await guild.bans.fetch(userId).catch(() => null);
            if (ban) {
                console.log(`🔓 User ${user.tag} is banned, attempting to unban...`);
                await guild.bans.remove(userId, `Warning removed - lifting automatic ban (Warning: ${warning.id})`);
                console.log(`✅ Successfully unbanned ${user.tag} due to warning removal`);

                // Log the unban
                try {
                    const { logAction } = require('../utils/loggingSystem');
                    await logAction(guild, 'user_unbanned', {
                        user: user,
                        moderator: moderator,
                        warningId: warning.id,
                        originalReason: warning.reason,
                        description: `**${user.tag}** was unbanned due to warning removal (${warning.id})`
                    }, user);
                } catch (logError) {
                    console.error('❌ Failed to log unban action:', logError);
                }
                return; // User was banned, so they're not in the server to have timeouts
            }
        } catch (error) {
            // User is not banned, continue to check for other punishments
            console.log(`ℹ️ User ${user.tag} is not banned, checking for other punishments...`);
        }

        // If member is not in the server, we can't lift timeouts
        if (!member) {
            console.log(`⚠️ Member ${user.tag} not found in server, cannot check/lift timeout`);
            return;
        }

        // Check if user is currently timed out
        if (member.isCommunicationDisabled()) {
            console.log(`⏰ User ${member.user.tag} is timed out, removing timeout...`);
            try {
                await member.timeout(null, `Warning removed - lifting automatic timeout (Warning: ${warning.id})`);
                console.log(`✅ Successfully removed timeout for ${member.user.tag} due to warning removal`);

                // Log the timeout removal
                try {
                    const { logAction } = require('../utils/loggingSystem');
                    await logAction(guild, 'timeout_removed', {
                        user: member.user,
                        moderator: moderator,
                        warningId: warning.id,
                        originalReason: warning.reason,
                        description: `**${member.user.tag}**'s timeout was removed due to warning removal (${warning.id})`
                    }, member.user);
                } catch (logError) {
                    console.error('❌ Failed to log timeout removal:', logError);
                }
            } catch (timeoutError) {
                console.error(`❌ Failed to remove timeout for ${member.user.tag}:`, timeoutError);
            }
        }

        // Check if we should reverse escalation by looking at remaining active warnings
        const allWarnings = await getUserWarnings(guild.id, userId);
        const activeWarnings = allWarnings.filter(w => !w.removed && !w.expired);

        console.log(`📊 User ${user.tag} now has ${activeWarnings.length} active warnings after removal`);

        // If they now have 0 active warnings, ensure they're not punished
        if (activeWarnings.length === 0) {
            console.log(`✨ User ${user.tag} has no remaining active warnings - ensuring clean slate`);

            // Double-check timeout removal
            if (member && member.isCommunicationDisabled()) {
                try {
                    await member.timeout(null, `All warnings cleared - removing any remaining timeout`);
                    console.log(`🧹 Cleared any remaining timeout for ${user.tag}`);
                } catch (error) {
                    console.error(`❌ Failed to clear remaining timeout:`, error);
                }
            }
        }

    } catch (error) {
        console.error(`❌ Error lifting punishments for warning ${warning.id}:`, error);
    }
}

async function processAutoEscalation(guild, user, member) {
    try {
        const warnings = await getUserWarnings(guild.id, user.id);
        const activeWarnings = warnings.filter(w => !w.expired && !w.removed);

        // Get custom thresholds or use defaults
        let thresholds = DEFAULT_AUTO_ESCALATION_THRESHOLDS;
        try {
            const { getWarningConfig } = require('../utils/warningConfig');
            const config = await getWarningConfig(guild.id);
            thresholds = config.thresholds;
        } catch (error) {
            console.log('⚠️ Using default thresholds due to config error:', error.message);
        }

        const escalationResult = {
            totalWarnings: activeWarnings.length,
            action: 'none',
            reason: 'No escalation required'
        };

        if (activeWarnings.length >= thresholds.ban) {
            try {
                await member.ban({ reason: 'Auto-escalation: Too many warnings' });
                escalationResult.action = 'ban';
                escalationResult.reason = `Auto-ban: ${activeWarnings.length} active warnings`;
                console.log(`🔨 Auto-escalation: Banned ${user.tag} (${activeWarnings.length} warnings)`);
            } catch (error) {
                console.error('❌ Auto-escalation ban failed:', error);
            }
        } else if (activeWarnings.length >= thresholds.kick) {
            try {
                await member.kick('Auto-escalation: Too many warnings');
                escalationResult.action = 'kick';
                escalationResult.reason = `Auto-kick: ${activeWarnings.length} active warnings`;
                console.log(`👢 Auto-escalation: Kicked ${user.tag} (${activeWarnings.length} warnings)`);
            } catch (error) {
                console.error('❌ Auto-escalation kick failed:', error);
            }
        } else if (activeWarnings.length >= thresholds.timeout) {
            try {
                const latestWarning = activeWarnings[0];
                const timeoutDuration = ESCALATION_DURATIONS.timeout[latestWarning.severity] || ESCALATION_DURATIONS.timeout.moderate;

                await member.timeout(timeoutDuration, 'Auto-escalation: Too many warnings');
                escalationResult.action = 'timeout';
                escalationResult.reason = `Auto-timeout: ${activeWarnings.length} active warnings`;
                console.log(`⏰ Auto-escalation: Timed out ${user.tag} for ${Math.floor(timeoutDuration / 60000)}m (${activeWarnings.length} warnings)`);
            } catch (error) {
                console.error('❌ Auto-escalation timeout failed:', error);
            }
        }

        return escalationResult;
    } catch (error) {
        console.error('❌ Error in auto-escalation:', error);
        return {
            totalWarnings: 0,
            action: 'error',
            reason: 'Failed to process auto-escalation'
        };
    }
}

module.exports = {
    WarningSystem,
    addWarning,
    getUserWarnings,
    removeWarning,
    editWarning,
    cleanupExpiredWarnings,
    exportWarningData,
    getAllWarnings,
    getWarningStats,
    loadWarnings,
    saveWarnings,
    clearWarnings,
    appealWarning,
    processWarningAppeal,
    processAutoEscalation,
    liftWarningPunishments
};