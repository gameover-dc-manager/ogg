const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const SEVERITY_COLORS = {
    minor: '#FFA500',    // Orange
    moderate: '#FF6B35', // Red-Orange  
    severe: '#DC143C'    // Crimson
};

const SEVERITY_EMOJIS = {
    minor: '⚠️',
    moderate: '🚨',
    severe: '🔴'
};

/**
 * Create a formatted warning embed
 */
function createWarningEmbed(warning, user, moderator, guild) {
    const embed = new EmbedBuilder()
        .setTitle(`${SEVERITY_EMOJIS[warning.severity]} Warning Information`)
        .setColor(SEVERITY_COLORS[warning.severity])
        .addFields(
            { name: '👤 User', value: `${user.toString()} (${user.tag})`, inline: true },
            { name: '🛡️ Moderator', value: moderator ? moderator.toString() : 'Unknown', inline: true },
            { name: '🏠 Server', value: guild.name, inline: true },
            { name: '📝 Reason', value: warning.reason, inline: false },
            { name: '⚡ Severity', value: warning.severity.charAt(0).toUpperCase() + warning.severity.slice(1), inline: true },
            { name: '🆔 Warning ID', value: warning.id, inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(warning.timestamp / 1000)}:F>`, inline: true }
        )
        .setTimestamp(warning.timestamp)
        .setFooter({ text: `Warning ${warning.id}` });

    // Add expiration info if applicable
    if (warning.expires > 0) {
        embed.addFields({ 
            name: '⏰ Expires', 
            value: `<t:${Math.floor(warning.expires / 1000)}:R>`, 
            inline: true 
        });
    }

    // Add removal info if applicable
    if (warning.removed) {
        embed.addFields({ 
            name: '🗑️ Removed', 
            value: `<t:${Math.floor(warning.removedTimestamp / 1000)}:F>\nReason: ${warning.removedReason || 'No reason provided'}`, 
            inline: false 
        });
        embed.setColor('#808080'); // Gray for removed warnings
    }

    // Add expired status
    if (warning.expired) {
        embed.addFields({ 
            name: '⏰ Status', 
            value: 'Expired', 
            inline: true 
        });
        embed.setColor('#696969'); // Dim gray for expired warnings
    }

    return embed;
}

/**
 * Create warning management buttons
 */
function createWarningButtons(warningId, userId, disabled = false) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`warning_remove_${warningId}_${userId}`)
                .setLabel('Remove Warning')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(`warning_details_${warningId}_${userId}`)
                .setLabel('View Details')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔍')
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(`warning_history_${userId}`)
                .setLabel('User History')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋')
                .setDisabled(disabled)
        );

    return row;
}

/**
 * Format warning duration for display
 */
function formatDuration(milliseconds) {
    if (!milliseconds || milliseconds <= 0) return 'Permanent';
    
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Calculate warning points for escalation
 */
function calculateWarningPoints(warnings) {
    const pointValues = {
        minor: 1,
        moderate: 2,
        severe: 3
    };

    return warnings
        .filter(w => !w.removed && !w.expired)
        .reduce((total, warning) => total + (pointValues[warning.severity] || 1), 0);
}

/**
 * Get escalation level based on warning count/points
 */
function getEscalationLevel(warningCount, warningPoints) {
    if (warningPoints >= 10 || warningCount >= 7) {
        return { level: 'ban', action: 'Ban', color: '#8B0000', emoji: '🔨' };
    } else if (warningPoints >= 6 || warningCount >= 5) {
        return { level: 'kick', action: 'Kick', color: '#FF4500', emoji: '👢' };
    } else if (warningPoints >= 3 || warningCount >= 3) {
        return { level: 'timeout', action: 'Timeout', color: '#FFD700', emoji: '⏰' };
    }
    return { level: 'none', action: 'None', color: '#90EE90', emoji: '✅' };
}

/**
 * Create audit log entry for warning actions
 */
function createAuditLogEntry(action, warning, moderator, additionalInfo = {}) {
    return {
        id: generateAuditId(),
        action,
        warning,
        moderator: {
            id: moderator.id,
            tag: moderator.tag,
            displayName: moderator.displayName || moderator.username
        },
        timestamp: Date.now(),
        additionalInfo
    };
}

/**
 * Generate audit log ID
 */
function generateAuditId() {
    return `AUDIT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if user has permission to manage warnings
 */
function hasWarningPermissions(member) {
    return member.permissions.has('ManageMessages') || 
           member.permissions.has('ModerateMembers') || 
           member.permissions.has('Administrator');
}

/**
 * Validate warning severity
 */
function isValidSeverity(severity) {
    return ['minor', 'moderate', 'severe'].includes(severity);
}

/**
 * Sanitize warning reason
 */
function sanitizeReason(reason) {
    if (!reason || typeof reason !== 'string') {
        return 'No reason provided';
    }
    
    return reason
        .trim()
        .substring(0, 1000) // Limit to 1000 characters
        .replace(/[^\w\s\-.,!?()[\]{}:;"']/g, '') // Remove special characters
        .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Create warning summary for user DM
 */
function createUserNotificationEmbed(warning, guildName) {
    const embed = new EmbedBuilder()
        .setTitle(`${SEVERITY_EMOJIS[warning.severity]} Warning Received`)
        .setColor(SEVERITY_COLORS[warning.severity])
        .setDescription(`You have received a warning in **${guildName}**.`)
        .addFields(
            { name: '📝 Reason', value: warning.reason, inline: false },
            { name: '⚡ Severity', value: warning.severity.charAt(0).toUpperCase() + warning.severity.slice(1), inline: true },
            { name: '🆔 Warning ID', value: warning.id, inline: true }
        )
        .setTimestamp();

    if (warning.expires > 0) {
        embed.addFields({ 
            name: '⏰ Expires', 
            value: `<t:${Math.floor(warning.expires / 1000)}:R>`, 
            inline: true 
        });
    }

    embed.setFooter({ 
        text: 'If you believe this warning was given in error, please contact a server moderator.' 
    });

    return embed;
}

module.exports = {
    createWarningEmbed,
    createWarningButtons,
    formatDuration,
    calculateWarningPoints,
    getEscalationLevel,
    createAuditLogEntry,
    generateAuditId,
    hasWarningPermissions,
    isValidSeverity,
    sanitizeReason,
    createUserNotificationEmbed,
    SEVERITY_COLORS,
    SEVERITY_EMOJIS
};
const fs = require('fs');
const path = require('path');

function saveWarningsToFile(warnings) {
    try {
        const configDir = './config';
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(
            path.join(configDir, 'warnings.json'), 
            JSON.stringify(warnings, null, 2)
        );
        return true;
    } catch (error) {
        console.error('❌ Error saving warnings:', error);
        return false;
    }
}

function loadWarningsFromFile() {
    try {
        const filePath = './config/warnings.json';
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('❌ Error loading warnings:', error);
        return {};
    }
}

function generateWarningId() {
    return `warn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatWarningMessage(warning) {
    const severity = warning.severity || 'minor';
    const emoji = severity === 'severe' ? '🔴' : severity === 'moderate' ? '🚨' : '⚠️';
    
    return `${emoji} **Warning:** ${warning.reason}\n` +
           `**Severity:** ${severity.charAt(0).toUpperCase() + severity.slice(1)}\n` +
           `**Date:** <t:${Math.floor(warning.timestamp / 1000)}:F>\n` +
           `**Moderator:** ${warning.moderator}`;
}

function calculateWarningExpiry(severity) {
    const now = Date.now();
    switch (severity) {
        case 'minor':
            return now + (7 * 24 * 60 * 60 * 1000); // 7 days
        case 'moderate':
            return now + (30 * 24 * 60 * 60 * 1000); // 30 days
        case 'severe':
            return now + (90 * 24 * 60 * 60 * 1000); // 90 days
        default:
            return now + (14 * 24 * 60 * 60 * 1000); // 14 days default
    }
}

function isWarningExpired(warning) {
    return Date.now() > warning.expiresAt;
}

function getWarningColor(severity) {
    const colors = {
        minor: '#FFA500',    // Orange
        moderate: '#FF6B35', // Red-Orange
        severe: '#DC143C'    // Crimson
    };
    return colors[severity] || colors.minor;
}

module.exports = {
    saveWarningsToFile,
    loadWarningsFromFile,
    generateWarningId,
    formatWarningMessage,
    calculateWarningExpiry,
    isWarningExpired,
    getWarningColor
};
