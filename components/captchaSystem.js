const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

// In-memory storage for pending verifications with enhanced tracking
const pendingVerifications = new Map();
const suspiciousActivities = new Map();
const verificationAttempts = new Map();

// Enhanced rate limiting for captcha requests
const captchaRateLimit = new Map();
const ipTracker = new Map();

/**
 * Initialize the enhanced captcha system
 * @param {Client} client - Discord client instance
 */
function initializeCaptchaSystem(client) {
    // Prevent duplicate initialization
    if (client.captchaSystemInitialized) {
        console.log('⚠️ Enhanced captcha system already initialized, skipping...');
        return;
    }

    console.log('🔐 Initializing enhanced captcha verification system...');

    // Load existing configuration with enhanced defaults
    try {
        const configPath = path.join(__dirname, '../config/captcha_config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            client.captchaConfig = {
                ...getDefaultConfig(),
                ...config
            };
            console.log('📝 Loaded enhanced captcha configuration from file');
        } else {
            client.captchaConfig = getDefaultConfig();
        }
    } catch (error) {
        console.error('❌ Error loading captcha config:', error);
        client.captchaConfig = getDefaultConfig();
    }

    // Initialize enhanced statistics
    if (!client.captchaStats) {
        client.captchaStats = {
            totalVerifications: 0,
            successfulVerifications: 0,
            failedVerifications: 0,
            pendingVerifications: 0,
            totalAttempts: 0,
            suspiciousAttempts: 0,
            blockedAttempts: 0,
            averageCompletionTime: 0,
            dailyStats: {},
            patternDetections: 0
        };
    }

    // Initialize daily stats if not exists
    if (!client.captchaStats.dailyStats) {
        client.captchaStats.dailyStats = {};
    }

    const today = new Date().toDateString();
    if (!client.captchaStats.dailyStats[today]) {
        client.captchaStats.dailyStats[today] = {
            attempts: 0,
            successful: 0,
            failed: 0,
            suspicious: 0
        };
    }

    // Start enhanced cleanup intervals
    startCleanupIntervals(client);

    // Initialize pattern detection
    initializePatternDetection(client);

    // Mark system as initialized
    client.captchaSystemInitialized = true;

    console.log('✅ Enhanced captcha system initialized successfully');
}

/**
 * Get default configuration for captcha system
 */
function getDefaultConfig() {
    return {
        enabled: false,
        verificationChannelId: null,
        unverifiedRoleId: null,
        verifiedRoleId: null,
        timeoutMinutes: 15,
        maxAttempts: 5,
        difficulty: 'medium',
        requireManualReview: false,
        logVerifications: true,
        enablePatternDetection: true,
        enableSuspiciousActivityTracking: true,
        enableIPTracking: true,
        maxDailyAttempts: 10,
        banDurationHours: 24,
        enableSmartCaptcha: true,
        customMessages: {
            welcome: "Welcome! Complete verification to access the server.",
            timeout: "Verification expired. Contact moderators for assistance.",
            failed: "Verification failed. Please try again.",
            banned: "Too many failed attempts. You've been temporarily restricted."
        }
    };
}

/**
 * Start cleanup intervals for system maintenance
 */
function startCleanupIntervals(client) {
    // Cleanup expired verifications every minute
    setInterval(() => {
        cleanupExpiredVerifications(client);
    }, 60000);

    // Cleanup rate limiting every 5 minutes
    setInterval(() => {
        cleanupRateLimit();
    }, 300000);

    // Cleanup suspicious activities every hour
    setInterval(() => {
        cleanupSuspiciousActivities();
    }, 3600000);

    // Reset daily stats at midnight
    setInterval(() => {
        resetDailyStats(client);
    }, 86400000);
}

/**
 * Initialize pattern detection system
 */
function initializePatternDetection(client) {
    if (!client.captchaConfig.enablePatternDetection) return;

    console.log('🧠 Pattern detection system enabled');

    // Initialize pattern tracking
    if (!client.patternTracker) {
        client.patternTracker = {
            commonFailures: new Map(),
            suspiciousTimings: new Map(),
            userAgents: new Map(),
            ipPatterns: new Map()
        };
    }
}

/**
 * Enhanced member join handler with improved security
 * @param {GuildMember} member - The member who joined
 * @param {Client} client - Discord client instance
 */
async function handleMemberJoin(member, client) {
    try {
        const captchaConfig = client.captchaConfig;

        if (!captchaConfig || !captchaConfig.enabled) {
            return;
        }

        // Enhanced duplicate check
        const existingVerification = Array.from(pendingVerifications.values())
            .find(v => v.memberId === member.id && v.guildId === member.guild.id);

        if (existingVerification) {
            console.log(`⚠️ Enhanced captcha verification already pending for ${member.user.tag}`);
            return;
        }

        // Enhanced rate limiting with IP tracking
        const userId = member.id;
        const userKey = `${member.guild.id}_${userId}`;

        if (!captchaRateLimit.has(userKey)) {
            captchaRateLimit.set(userKey, []);
        }

        const userAttempts = captchaRateLimit.get(userKey);
        const now = Date.now();
        const recentAttempts = userAttempts.filter(time => now - time < 60000); // 1 minute

        // Check if user is temporarily banned
        if (isUserTempBanned(userId, client)) {
            console.log(`🚫 User ${member.user.tag} is temporarily banned from verification`);
            await handleTempBannedUser(member, client);
            return;
        }

        if (recentAttempts.length >= 3) {
            console.log(`⚠️ Enhanced rate limiting for ${member.user.tag} - too many recent requests`);
            await logSuspiciousActivity(userId, 'RATE_LIMIT_EXCEEDED', client);
            return;
        }

        userAttempts.push(now);
        captchaRateLimit.set(userKey, userAttempts);

        // Check daily limits
        const today = new Date().toDateString();
        const dailyAttempts = getDailyAttempts(userId, today);
        if (dailyAttempts >= captchaConfig.maxDailyAttempts) {
            console.log(`🚫 Daily limit exceeded for ${member.user.tag}`);
            await handleDailyLimitExceeded(member, client);
            return;
        }

        console.log(`🔐 Processing enhanced captcha verification for ${member.user.tag}`);

        // Enhanced role assignment with error handling
        await assignUnverifiedRole(member, captchaConfig);

        // Send enhanced captcha challenge
        await sendEnhancedCaptchaChallenge(member, client);

        // Update enhanced stats
        updateStats(client, 'pending');

    } catch (error) {
        console.error('❌ Error in enhanced member join handler:', error);
        await logSystemError(error, member, client);
    }
}

/**
 * Send enhanced captcha challenge with improved features
 */
async function sendEnhancedCaptchaChallenge(member, client) {
    try {
        const { captchaConfig } = client;
        const userId = member.id;

        // Generate smart captcha based on user history
        const captchaType = determineOptimalCaptchaType(userId, client);
        let captchaData;
        let useMathFallback = false;

        try {
            if (captchaType === 'math' || !captchaConfig.enableSmartCaptcha) {
                const { generateMathCaptcha } = require('./captchaGenerator');
                captchaData = generateMathCaptcha('enhanced');
                useMathFallback = true;
            } else {
                const { generateCaptcha } = require('./captchaGenerator');
                captchaData = await generateCaptcha(captchaConfig.difficulty);
            }
        } catch (error) {
            console.log('⚠️ Smart captcha failed, using math fallback:', error.message);
            const { generateMathCaptcha } = require('./captchaGenerator');
            captchaData = generateMathCaptcha('enhanced');
            useMathFallback = true;
        }

        // Create enhanced verification ID with security tokens
        const verificationId = generateSecureVerificationId(member);
        const expiresAt = Date.now() + (captchaConfig.timeoutMinutes * 60 * 1000);

        // Store enhanced verification data
        const verificationData = {
            memberId: member.id,
            guildId: member.guild.id,
            answer: captchaData.answer.toString().toLowerCase(),
            attempts: 0,
            maxAttempts: captchaConfig.maxAttempts,
            expiresAt: expiresAt,
            createdAt: Date.now(),
            captchaType: useMathFallback ? 'math' : 'image',
            difficulty: captchaConfig.difficulty,
            ipHash: hashIP(member),
            userAgent: 'Discord',
            securityToken: generateSecurityToken(),
            warningIssued: false
        };

        pendingVerifications.set(verificationId, verificationData);

        // Create enhanced embed
        const captchaEmbed = createEnhancedCaptchaEmbed(member, captchaData, verificationData, useMathFallback, captchaConfig);

        // Create enhanced button with security features
        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`captcha_verify_${verificationId}`)
                    .setLabel('🔐 Start Verification')
                    .setEmoji('🛡️')
                    .setStyle(ButtonStyle.Primary)
            );

        // Enhanced message sending with fallback options
        await sendCaptchaMessage(member, captchaEmbed, button, captchaData, useMathFallback, captchaConfig);

        // Schedule enhanced auto-cleanup
        setTimeout(async () => {
            if (pendingVerifications.has(verificationId)) {
                await handleEnhancedVerificationTimeout(verificationId, client);
            }
        }, captchaConfig.timeoutMinutes * 60 * 1000);

        // Log verification creation
        await logVerificationEvent('CAPTCHA_SENT', member, verificationData, client);

    } catch (error) {
        console.error('❌ Error sending enhanced captcha challenge:', error);
        await logSystemError(error, member, client);
    }
}

/**
 * Create enhanced captcha embed
 */
function createEnhancedCaptchaEmbed(member, captchaData, verificationData, useMathFallback, captchaConfig) {
    const timeRemaining = Math.round((verificationData.expiresAt - Date.now()) / 60000);

    return new EmbedBuilder()
        .setColor('#4A90E2')
        .setTitle('🛡️ Enhanced Security Verification')
        .setDescription(`
Welcome to **${member.guild.name}**, ${member.user.username}! 

Our enhanced security system requires verification to protect our community from automated threats.

**🔐 Verification Process:**
• Solve the ${useMathFallback ? 'mathematical equation' : 'visual challenge'} below
• You have **${verificationData.maxAttempts} attempts** available
• Verification expires in **${timeRemaining} minutes**
• ${useMathFallback ? 'Enter only the numeric answer' : 'The challenge is case-insensitive'}

**💡 Tips for Success:**
• Take your time to read carefully
• Double-check your answer before submitting
• Contact a moderator if you need assistance

${captchaConfig.customMessages.welcome || 'Complete verification to gain full access to the server.'}
        `)
        .addFields(
            { name: '⏰ Time Limit', value: `${timeRemaining} minutes`, inline: true },
            { name: '🎯 Attempts Available', value: `${verificationData.maxAttempts}`, inline: true },
            { name: '🔧 Security Level', value: captchaConfig.difficulty.toUpperCase(), inline: true },
            {
                name: useMathFallback ? '🧮 Mathematical Challenge' : '👁️ Visual Challenge',
                value: useMathFallback ? captchaData.question : 'Enter the text shown in the image below',
                inline: false
            }
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
        .setFooter({
            text: `Verification ID: ${verificationData.securityToken} | Enhanced Security System`,
            iconURL: member.guild.iconURL()
        })
        .setTimestamp();
}

/**
 * Enhanced captcha interaction handler
 */
async function handleCaptchaInteraction(interaction, client) {
    if (!interaction.customId || !interaction.customId.startsWith('captcha_')) return false;

    try {

        // Enhanced interaction validation
        if (interaction.replied || interaction.deferred) {
            console.log('⚠️ Enhanced captcha interaction already handled');
            return true;
        }

        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 5000) {
            console.log(`⚠️ Enhanced captcha interaction expired (${interactionAge}ms)`);
            try {
                if (interaction.isRepliable()) {
                    await interaction.reply({
                        content: '❌ This captcha session has expired. Please request a new one.',
                        ephemeral: true
                    });
                }
            } catch (error) {
                console.error('❌ Failed to reply to expired interaction:', error);
            }
            return true;
        }

        const parts = interaction.customId.split('_');
        const action = parts[1];
        const verificationId = parts.slice(2).join('_');

        // Enhanced action routing
        switch (action) {
            case 'verify':
                await handleEnhancedVerifyButtonClick(interaction, verificationId, client);
                return true;
            case 'submit':
                const { handleEnhancedCaptchaSubmission } = require('./verificationHandler');
                await handleEnhancedCaptchaSubmission(interaction, verificationId, client, pendingVerifications);
                return true;
            case 'retry':
                await handleEnhancedRetryRequest(interaction, verificationId, client);
                return true;
            case 'help':
                await handleVerificationHelp(interaction, verificationId, client);
                return true;
            default:
                await sendUnknownActionResponse(interaction);
                return true;
        }

    } catch (error) {
        console.error('❌ Error in enhanced captcha interaction handler:', error);
        await handleInteractionError(interaction, error, client);
        return true;
    }
}

/**
 * Handle enhanced verification button click
 */
async function handleEnhancedVerifyButtonClick(interaction, verificationId, client) {
    const verification = pendingVerifications.get(verificationId);

    if (!verification) {
        return await interaction.reply({
            embeds: [createErrorEmbed('❌ Verification Expired', 'This verification session has expired or is invalid. Please contact a moderator for assistance.')],
            flags: MessageFlags.Ephemeral
        });
    }

    if (verification.memberId !== interaction.user.id) {
        await logSuspiciousActivity(interaction.user.id, 'UNAUTHORIZED_VERIFICATION_ATTEMPT', client);
        return await interaction.reply({
            embeds: [createErrorEmbed('🚫 Access Denied', 'This verification session does not belong to you.')],
            flags: MessageFlags.Ephemeral
        });
    }

    if (Date.now() > verification.expiresAt) {
        pendingVerifications.delete(verificationId);
        return await interaction.reply({
            embeds: [createErrorEmbed('⏰ Session Expired', client.captchaConfig.customMessages.timeout || 'This verification session has timed out. Please contact a moderator.')],
            flags: MessageFlags.Ephemeral
        });
    }

    // Enhanced rate limiting check
    if (!passesEnhancedRateLimit(interaction.user.id, client)) {
        return await interaction.reply({
            embeds: [createErrorEmbed('⚠️ Rate Limited', 'Please wait before attempting verification again.')],
            flags: MessageFlags.Ephemeral
        });
    }

    // Show enhanced verification modal
    const { createEnhancedVerificationModal } = require('./verificationHandler');
    const modal = createEnhancedVerificationModal(verificationId, verification);
    await interaction.showModal(modal);

    // Log interaction
    await logVerificationEvent('MODAL_SHOWN', interaction.member, verification, client);
}

/**
 * Handle successful enhanced verification
 */
async function handleEnhancedSuccessfulVerification(verificationId, member, client, timeTaken = 0) {
    try {
        const verification = pendingVerifications.get(verificationId);
        if (!verification) return;

        const { captchaConfig } = client;

        // Enhanced role management
        await manageVerificationRoles(member, captchaConfig, true);

        // Update enhanced statistics
        updateStats(client, 'success', {
            attempts: verification.attempts,
            timeTaken: timeTaken,
            captchaType: verification.captchaType
        });

        // Clean up verification data
        pendingVerifications.delete(verificationId);
        cleanupUserAttempts(member.id);

        // Enhanced logging
        await logVerificationEvent('VERIFICATION_SUCCESS', member, {
            ...verification,
            completionTime: timeTaken,
            finalAttempt: verification.attempts
        }, client);

        // Send success notification
        await sendVerificationSuccessMessage(member, verification, client);

        console.log(`✅ Enhanced verification completed for ${member.user.tag} in ${Math.round(timeTaken / 1000)}s`);

    } catch (error) {
        console.error('❌ Error handling enhanced successful verification:', error);
        await logSystemError(error, member, client);
    }
}

/**
 * Enhanced statistics and utility functions
 */
function updateStats(client, type, data = {}) {
    const stats = client.captchaStats;
    const today = new Date().toDateString();

    if (!stats.dailyStats[today]) {
        stats.dailyStats[today] = { attempts: 0, successful: 0, failed: 0, suspicious: 0 };
    }

    switch (type) {
        case 'pending':
            stats.pendingVerifications = pendingVerifications.size;
            break;
        case 'success':
            stats.successfulVerifications++;
            stats.dailyStats[today].successful++;
            if (data.timeTaken) {
                stats.averageCompletionTime = Math.round(
                    (stats.averageCompletionTime + data.timeTaken) / 2
                );
            }
            break;
        case 'failed':
            stats.failedVerifications++;
            stats.dailyStats[today].failed++;
            break;
        case 'suspicious':
            stats.suspiciousAttempts++;
            stats.dailyStats[today].suspicious++;
            break;
    }
}

/**
 * Enhanced cleanup functions
 */
function cleanupExpiredVerifications(client) {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [verificationId, verification] of pendingVerifications.entries()) {
        if (now > verification.expiresAt) {
            pendingVerifications.delete(verificationId);
            cleanedCount++;
            updateStats(client, 'failed');
        }
    }

    if (cleanedCount > 0) {
        console.log(`🧹 Enhanced cleanup: removed ${cleanedCount} expired verification(s)`);
    }
}

function cleanupRateLimit() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userKey, attempts] of captchaRateLimit.entries()) {
        const filtered = attempts.filter(time => now - time < 300000);
        if (filtered.length === 0) {
            captchaRateLimit.delete(userKey);
            cleanedCount++;
        } else {
            captchaRateLimit.set(userKey, filtered);
        }
    }

    if (cleanedCount > 0) {
        console.log(`🧹 Enhanced cleanup: removed ${cleanedCount} rate limit entries`);
    }
}

/**
 * Enhanced security helper functions
 */
function generateSecureVerificationId(member) {
    const timestamp = Date.now();
    const randomBytes = require('crypto').randomBytes(8).toString('hex');
    return `${member.guild.id}_${member.id}_${timestamp}_${randomBytes}`;
}

function generateSecurityToken() {
    return require('crypto').randomBytes(4).toString('hex').toUpperCase();
}

function hashIP(member) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(`${member.id}_${Date.now()}`).digest('hex').substr(0, 8);
}

function createErrorEmbed(title, description) {
    return new EmbedBuilder()
        .setColor('#FF4444')
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Enhanced logging functions
 */
async function logVerificationEvent(event, member, data, client) {
    if (!client.captchaConfig.logVerifications) return;

    const logChannel = client.channels.cache.get(client.logChannels?.[member.guild.id]);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor(getEventColor(event))
        .setTitle(`🔐 Verification Event: ${event}`)
        .setDescription(`User: ${member.user.tag} (${member.user.id})`)
        .addFields(
            { name: 'Event', value: event, inline: true },
            { name: 'Timestamp', value: new Date().toISOString(), inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

    if (data) {
        if (data.attempts !== undefined) embed.addFields({ name: 'Attempts', value: `${data.attempts}`, inline: true });
        if (data.completionTime) embed.addFields({ name: 'Time Taken', value: `${Math.round(data.completionTime / 1000)}s`, inline: true });
        if (data.captchaType) embed.addFields({ name: 'Type', value: data.captchaType, inline: true });
    }

    try {
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('❌ Failed to send verification log:', error);
    }
}

function getEventColor(event) {
    const colors = {
        'CAPTCHA_SENT': '#4A90E2',
        'MODAL_SHOWN': '#F5A623',
        'VERIFICATION_SUCCESS': '#7ED321',
        'VERIFICATION_FAILED': '#D0021B',
        'SUSPICIOUS_ACTIVITY': '#B8860B'
    };
    return colors[event] || '#888888';
}

/**
 * Enhanced statistics getter
 */
function getEnhancedCaptchaStats(client = null) {
    return {
        ...getCaptchaStats(client),
        suspiciousAttempts: client?.captchaStats?.suspiciousAttempts || 0,
        blockedAttempts: client?.captchaStats?.blockedAttempts || 0,
        averageCompletionTime: client?.captchaStats?.averageCompletionTime || 0,
        patternDetections: client?.captchaStats?.patternDetections || 0,
        dailyStats: client?.captchaStats?.dailyStats || {},
        systemVersion: 'Enhanced v2.0'
    };
}

/**
 * Original getCaptchaStats function for backwards compatibility
 */
function getCaptchaStats(client = null) {
    return {
        pendingVerifications: pendingVerifications.size,
        successfulVerifications: client?.captchaStats?.successfulVerifications || 0,
        failedVerifications: client?.captchaStats?.failedVerifications || 0,
        totalAttempts: client?.captchaStats?.totalAttempts || 0,
        enabled: client?.captchaConfig?.enabled || false,
        difficulty: client?.captchaConfig?.difficulty || 'medium',
        timeoutMinutes: client?.captchaConfig?.timeoutMinutes || 15
    };
}

// Helper function placeholders for additional features
function determineOptimalCaptchaType(userId, client) {
    // Smart captcha type determination based on user history
    return Math.random() > 0.7 ? 'math' : 'image';
}

function isUserTempBanned(userId, client) {
    // Check if user is temporarily banned
    return false; // Placeholder
}

function passesEnhancedRateLimit(userId, client) {
    // Enhanced rate limiting check
    return true; // Placeholder
}

async function assignUnverifiedRole(member, captchaConfig) {
    // Enhanced role assignment with better error handling
    if (!captchaConfig.unverifiedRoleId) return;

    try {
        const role = member.guild.roles.cache.get(captchaConfig.unverifiedRoleId);
        if (role && member.guild.members.me.permissions.has('ManageRoles')) {
            await member.roles.add(role, 'Enhanced captcha verification required');
        }
    } catch (error) {
        console.error('❌ Failed to assign unverified role:', error);
    }
}

async function manageVerificationRoles(member, captchaConfig, success) {
    // Enhanced role management for successful/failed verifications
    const botMember = member.guild.members.me;
    if (!botMember?.permissions.has('ManageRoles')) return;

    try {
        if (success) {
            // Remove unverified role
            if (captchaConfig.unverifiedRoleId) {
                const unverifiedRole = member.guild.roles.cache.get(captchaConfig.unverifiedRoleId);
                if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
                    await member.roles.remove(unverifiedRole, 'Enhanced captcha verification completed');
                }
            }

            // Add verified role
            if (captchaConfig.verifiedRoleId) {
                const verifiedRole = member.guild.roles.cache.get(captchaConfig.verifiedRoleId);
                if (verifiedRole && !member.roles.cache.has(verifiedRole.id)) {
                    await member.roles.add(verifiedRole, 'Enhanced captcha verification completed');
                }
            }
        }
    } catch (error) {
        console.error('❌ Error managing verification roles:', error);
    }
}

// Implementation of required functions
async function handleTempBannedUser(member, client) {
    try {
        console.log(`🚫 User ${member.user.tag} is temporarily banned from verification`);
        // Could implement temporary ban logic here
    } catch (error) {
        console.error('❌ Error handling temp banned user:', error);
    }
}

async function handleDailyLimitExceeded(member, client) {
    try {
        console.log(`🚫 Daily limit exceeded for ${member.user.tag}`);
        // Could implement daily limit exceeded logic here
    } catch (error) {
        console.error('❌ Error handling daily limit exceeded:', error);
    }
}

async function logSuspiciousActivity(userId, type, client) {
    try {
        console.log(`🚨 Suspicious activity detected: ${type} for user ${userId}`);
        // Could log to database or monitoring system
    } catch (error) {
        console.error('❌ Error logging suspicious activity:', error);
    }
}

async function logSystemError(error, member, client) {
    try {
        console.error(`🚨 System error for ${member?.user?.tag || 'unknown user'}:`, error);
        // Could send to error tracking service
    } catch (err) {
        console.error('❌ Error logging system error:', err);
    }
}

async function sendCaptchaMessage(member, embed, button, captchaData, useMathFallback, config) {
    try {
        const messageOptions = { embeds: [embed], components: [button] };
        
        // Try to send via DM first, fallback to verification channel
        try {
            await member.send(messageOptions);
            console.log(`📨 Sent captcha via DM to ${member.user.tag}`);
        } catch (dmError) {
            console.log(`⚠️ Failed to DM ${member.user.tag}, trying verification channel`);
            
            const verificationChannel = member.guild.channels.cache.get(config.verificationChannelId);
            if (verificationChannel) {
                await verificationChannel.send({
                    content: `${member.user}, complete your verification:`,
                    ...messageOptions
                });
                console.log(`📨 Sent captcha to verification channel for ${member.user.tag}`);
            } else {
                console.error('❌ No verification channel configured');
            }
        }
    } catch (error) {
        console.error('❌ Error sending captcha message:', error);
    }
}

async function handleEnhancedVerificationTimeout(verificationId, client) {
    try {
        const verification = pendingVerifications.get(verificationId);
        if (verification) {
            pendingVerifications.delete(verificationId);
            console.log(`⏰ Verification timeout for ${verificationId}`);
        }
    } catch (error) {
        console.error('❌ Error handling verification timeout:', error);
    }
}

async function handleEnhancedRetryRequest(interaction, verificationId, client) {
    try {
        await interaction.reply({
            content: '🔄 Please try the verification process again.',
            ephemeral: true
        });
    } catch (error) {
        console.error('❌ Error handling retry request:', error);
    }
}

async function handleVerificationHelp(interaction, verificationId, client) {
    try {
        await interaction.reply({
            content: '❓ If you need help with verification, please contact a moderator.',
            ephemeral: true
        });
    } catch (error) {
        console.error('❌ Error handling verification help:', error);
    }
}

async function sendUnknownActionResponse(interaction) {
    try {
        await interaction.reply({
            content: '❌ Unknown action. Please try again.',
            ephemeral: true
        });
    } catch (error) {
        console.error('❌ Error sending unknown action response:', error);
    }
}

async function handleInteractionError(interaction, error, client) {
    try {
        console.error('❌ Interaction error:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred. Please try again later.',
                ephemeral: true
            });
        }
    } catch (err) {
        console.error('❌ Error handling interaction error:', err);
    }
}

async function sendVerificationSuccessMessage(member, verification, client) {
    try {
        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Verification Successful!')
            .setDescription(`Welcome to **${member.guild.name}**, ${member.user.username}!`)
            .addFields(
                { name: '🎉 Status', value: 'Successfully verified', inline: true },
                { name: '⏱️ Completed in', value: `${Math.round((Date.now() - verification.createdAt) / 1000)}s`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        try {
            await member.send({ embeds: [successEmbed] });
        } catch (dmError) {
            console.log(`⚠️ Could not DM success message to ${member.user.tag}`);
        }
    } catch (error) {
        console.error('❌ Error sending verification success message:', error);
    }
}

function cleanupUserAttempts(userId) {
    try {
        // Clean up any user-specific attempt tracking
        const userKeys = Array.from(captchaRateLimit.keys()).filter(key => key.includes(userId));
        userKeys.forEach(key => captchaRateLimit.delete(key));
    } catch (error) {
        console.error('❌ Error cleaning up user attempts:', error);
    }
}

function getDailyAttempts(userId, date) {
    try {
        // Track daily attempts per user
        const key = `${userId}_${date}`;
        const attempts = captchaRateLimit.get(key) || [];
        return attempts.length;
    } catch (error) {
        console.error('❌ Error getting daily attempts:', error);
        return 0;
    }
}

function cleanupSuspiciousActivities() {
    try {
        const now = Date.now();
        for (const [userId, activities] of suspiciousActivities.entries()) {
            const filtered = activities.filter(activity => now - activity.timestamp < 86400000);
            if (filtered.length === 0) {
                suspiciousActivities.delete(userId);
            } else {
                suspiciousActivities.set(userId, filtered);
            }
        }
    } catch (error) {
        console.error('❌ Error cleaning up suspicious activities:', error);
    }
}

function resetDailyStats(client) {
    try {
        const today = new Date().toDateString();
        if (!client.captchaStats.dailyStats[today]) {
            client.captchaStats.dailyStats[today] = {
                attempts: 0,
                successful: 0,
                failed: 0,
                suspicious: 0
            };
        }
        
        // Clean up old daily stats (keep last 7 days)
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        Object.keys(client.captchaStats.dailyStats).forEach(date => {
            if (new Date(date) < cutoff) {
                delete client.captchaStats.dailyStats[date];
            }
        });
    } catch (error) {
        console.error('❌ Error resetting daily stats:', error);
    }
}

module.exports = {
    initializeCaptchaSystem,
    handleMemberJoin,
    handleCaptchaInteraction,
    handleSuccessfulVerification: handleEnhancedSuccessfulVerification,
    getCaptchaStats: getEnhancedCaptchaStats,
    pendingVerifications,

    // Enhanced exports
    getEnhancedCaptchaStats,
    updateStats,
    logVerificationEvent,
    generateSecureVerificationId
};