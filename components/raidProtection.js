
const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { logAction } = require('../utils/loggingSystem');

// In-memory storage for raid detection
const raidData = new Map();
const suspiciousActivity = new Map();
const raidCooldowns = new Map();

// Configuration
const RAID_CONFIG = {
    // Join-based raid detection
    JOIN_THRESHOLD: 4, // users joining (lowered for better detection)
    JOIN_WINDOW: 20, // seconds (reduced window)
    
    // Message-based raid detection
    MESSAGE_THRESHOLD: 8, // messages (lowered threshold)
    MESSAGE_WINDOW: 10, // seconds (tighter window)
    DUPLICATE_MESSAGE_THRESHOLD: 2, // same message from different users (more sensitive)
    
    // Bot-specific detection
    BOT_ACCOUNT_THRESHOLD: 2, // bot accounts joining rapidly
    BOT_ACCOUNT_WINDOW: 30, // seconds
    AVATAR_SIMILARITY_THRESHOLD: 0.8, // similar avatars
    USERNAME_PATTERN_THRESHOLD: 3, // similar username patterns
    
    // Account age thresholds
    SUSPICIOUS_ACCOUNT_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
    VERY_NEW_ACCOUNT_AGE: 1 * 24 * 60 * 60 * 1000, // 1 day
    NEW_ACCOUNT_THRESHOLD: 2, // new accounts joining rapidly (more sensitive)
    
    // Advanced pattern detection
    RAPID_MESSAGE_THRESHOLD: 5, // messages per user in short time
    RAPID_MESSAGE_WINDOW: 5, // seconds
    COORDINATED_ACTION_THRESHOLD: 3, // users performing same action
    
    // Automated responses
    AUTO_LOCKDOWN: true,
    AUTO_KICK_RAIDERS: true,
    AUTO_BAN_PERSISTENT: true,
    AUTO_DELETE_SPAM: true,
    
    // Enhanced security
    QUARANTINE_NEW_ACCOUNTS: true,
    AUTO_ROLE_VERIFICATION: true,
    CHANNEL_SLOWMODE_ON_RAID: true,
    
    // Cooldowns
    RAID_COOLDOWN: 180000, // 3 minutes between raid detections (faster response)
    ANALYSIS_WINDOW: 600000 // 10 minutes of data retention (longer memory)
};

/**
 * Initialize raid protection system
 * @param {Client} client - Discord client instance
 */
function initializeRaidProtection(client) {
    if (client.raidProtectionInitialized) {
        console.log('⚠️ Raid protection already initialized, skipping...');
        return;
    }

    console.log('🛡️ Initializing raid protection system...');

    // Load raid protection config if exists
    try {
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(__dirname, '../config/raid_protection.json');
        
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            client.raidConfig = { ...RAID_CONFIG, ...config };
        } else {
            client.raidConfig = RAID_CONFIG;
        }
    } catch (error) {
        console.error('❌ Error loading raid protection config:', error);
        client.raidConfig = RAID_CONFIG;
    }

    // Initialize statistics
    client.raidStats = {
        totalRaidsDetected: 0,
        totalRaidersKicked: 0,
        totalRaidersBanned: 0,
        lockdownsActivated: 0,
        falsePositives: 0
    };

    // Cleanup old data every minute
    setInterval(() => {
        cleanupOldRaidData();
    }, 60000);

    client.raidProtectionInitialized = true;
    console.log('✅ Raid protection system initialized');
}

/**
 * Analyze member join for potential raid
 * @param {GuildMember} member - The member who joined
 * @param {Client} client - Discord client instance
 */
async function analyzeMemberJoin(member, client) {
    try {
        const guild = member.guild;
        const guildId = guild.id;
        const now = Date.now();

        // Initialize guild data if not exists
        if (!raidData.has(guildId)) {
            raidData.set(guildId, {
                recentJoins: [],
                recentMessages: [],
                suspiciousUsers: new Set(),
                lockdownActive: false,
                lastRaidTime: 0
            });
        }

        const guildRaidData = raidData.get(guildId);
        
        // Check if we're in raid cooldown
        if (now - guildRaidData.lastRaidTime < client.raidConfig.RAID_COOLDOWN) {
            console.log(`⏳ Guild ${guild.name} in raid cooldown, skipping analysis`);
            return;
        }

        // Add join to recent joins with enhanced data
        guildRaidData.recentJoins.push({
            userId: member.id,
            timestamp: now,
            accountAge: now - member.user.createdTimestamp,
            username: member.user.username,
            isBot: member.user.bot,
            hasCustomAvatar: member.user.avatar !== null,
            discriminator: member.user.discriminator,
            displayName: member.displayName,
            joinPosition: guild.memberCount
        });

        // Clean old joins
        guildRaidData.recentJoins = guildRaidData.recentJoins.filter(
            join => now - join.timestamp <= client.raidConfig.JOIN_WINDOW * 1000
        );

        // Analyze for raid patterns
        const raidDetection = await analyzeJoinPatterns(guildRaidData, client.raidConfig, guild);
        
        if (raidDetection.isRaid) {
            await handleRaidDetection(guild, client, raidDetection, guildRaidData);
        }

        // Check for suspicious individual account
        if (member.user.createdTimestamp > now - client.raidConfig.SUSPICIOUS_ACCOUNT_AGE) {
            guildRaidData.suspiciousUsers.add(member.id);
            
            // Log suspicious join
            await logAction(guild, 'suspicious_join', {
                member: member,
                accountAge: Math.floor((now - member.user.createdTimestamp) / (1000 * 60 * 60 * 24)),
                reason: 'New account'
            }, member.user);
        }

    } catch (error) {
        console.error('❌ Error analyzing member join for raid:', error);
    }
}

/**
 * Analyze message for raid patterns
 * @param {Message} message - Discord message
 * @param {Client} client - Discord client instance
 */
async function analyzeMessage(message, client) {
    try {
        if (message.author.bot) return;

        const guild = message.guild;
        if (!guild) return;

        const guildId = guild.id;
        const now = Date.now();

        if (!raidData.has(guildId)) {
            raidData.set(guildId, {
                recentJoins: [],
                recentMessages: [],
                suspiciousUsers: new Set(),
                lockdownActive: false,
                lastRaidTime: 0
            });
        }

        const guildRaidData = raidData.get(guildId);

        // Add message to recent messages
        guildRaidData.recentMessages.push({
            userId: message.author.id,
            content: message.content.toLowerCase().trim(),
            timestamp: now,
            channelId: message.channel.id
        });

        // Clean old messages
        guildRaidData.recentMessages = guildRaidData.recentMessages.filter(
            msg => now - msg.timestamp <= client.raidConfig.MESSAGE_WINDOW * 1000
        );

        // Analyze for message raid patterns
        const messageRaidDetection = analyzeMessagePatterns(guildRaidData, client.raidConfig);
        
        if (messageRaidDetection.isRaid) {
            await handleRaidDetection(guild, client, messageRaidDetection, guildRaidData);
        }

    } catch (error) {
        console.error('❌ Error analyzing message for raid:', error);
    }
}

/**
 * Analyze join patterns for raid detection
 * @param {Object} guildRaidData - Guild-specific raid data
 * @param {Object} config - Raid protection configuration
 * @param {Guild} guild - Discord guild
 * @returns {Object} - Raid detection result
 */
async function analyzeJoinPatterns(guildRaidData, config, guild) {
    const recentJoins = guildRaidData.recentJoins;
    const now = Date.now();

    // Check join rate
    if (recentJoins.length >= config.JOIN_THRESHOLD) {
        // Analyze account ages
        const newAccounts = recentJoins.filter(
            join => join.accountAge < config.SUSPICIOUS_ACCOUNT_AGE
        );

        const veryNewAccounts = recentJoins.filter(
            join => join.accountAge < config.VERY_NEW_ACCOUNT_AGE
        );

        // Bot-specific analysis
        const botAccounts = recentJoins.filter(join => join.isBot);
        const suspiciousAvatars = detectSuspiciousAvatars(recentJoins);
        const patternedUsernames = detectUsernamePatterns(recentJoins);
        const rapidSequentialJoins = detectSequentialJoins(recentJoins);

        const suspiciousPatterns = {
            rapidJoins: recentJoins.length,
            newAccounts: newAccounts.length,
            veryNewAccounts: veryNewAccounts.length,
            botAccounts: botAccounts.length,
            suspiciousAvatars: suspiciousAvatars.length,
            patternedUsernames: patternedUsernames.length,
            sequentialJoins: rapidSequentialJoins,
            averageAccountAge: recentJoins.reduce((sum, join) => sum + join.accountAge, 0) / recentJoins.length,
            timeWindow: config.JOIN_WINDOW
        };

        // Check for various raid indicators
        const indicators = [];
        let raidScore = 0;

        // High join rate
        if (recentJoins.length >= config.JOIN_THRESHOLD) {
            indicators.push('High join rate');
            raidScore += 25;
        }

        // Bot accounts joining
        if (botAccounts.length >= config.BOT_ACCOUNT_THRESHOLD) {
            indicators.push('Multiple bot accounts');
            raidScore += 60; // High score for bot raids
        }

        // Many new accounts
        if (newAccounts.length >= config.NEW_ACCOUNT_THRESHOLD) {
            indicators.push('Multiple new accounts');
            raidScore += 35;
        }

        // Very new accounts (high threat)
        if (veryNewAccounts.length >= 2) {
            indicators.push('Very new accounts');
            raidScore += 45;
        }

        // Similar usernames (bot pattern)
        const usernames = recentJoins.map(join => join.username);
        const similarNames = findSimilarNames(usernames);
        if (similarNames.length > 1) {
            indicators.push('Similar usernames');
            raidScore += 30;
        }

        // Username patterns (typical bot naming)
        if (patternedUsernames.length >= 2) {
            indicators.push('Patterned usernames');
            raidScore += 40;
        }

        // Suspicious avatars (default or similar)
        if (suspiciousAvatars.length >= 2) {
            indicators.push('Suspicious avatars');
            raidScore += 25;
        }

        // Sequential joins (coordinated)
        if (rapidSequentialJoins >= 3) {
            indicators.push('Sequential coordinated joins');
            raidScore += 35;
        }

        // Account age analysis
        const avgAge = suspiciousPatterns.averageAccountAge;
        if (avgAge < 24 * 60 * 60 * 1000) { // Less than 1 day average
            indicators.push('Extremely new accounts');
            raidScore += 50;
        } else if (avgAge < 7 * 24 * 60 * 60 * 1000) { // Less than 1 week average
            indicators.push('Recently created accounts');
            raidScore += 30;
        }

        // All accounts created within same timeframe (bot creation)
        const creationTimes = recentJoins.map(join => join.accountAge);
        const creationVariance = calculateVariance(creationTimes);
        if (creationVariance < 60 * 60 * 1000 && recentJoins.length >= 3) { // Created within 1 hour of each other
            indicators.push('Synchronized account creation');
            raidScore += 55;
        }

        return {
            isRaid: raidScore >= 40, // Lowered threshold for better detection
            type: botAccounts.length >= config.BOT_ACCOUNT_THRESHOLD ? 'bot_raid' : 'join_raid',
            score: raidScore,
            indicators,
            suspiciousPatterns,
            affectedUsers: recentJoins.map(join => join.userId),
            threat_level: raidScore >= 80 ? 'critical' : raidScore >= 60 ? 'high' : raidScore >= 40 ? 'medium' : 'low'
        };
    }

    return { isRaid: false };
}

/**
 * Analyze message patterns for raid detection
 * @param {Object} guildRaidData - Guild-specific raid data
 * @param {Object} config - Raid protection configuration
 * @returns {Object} - Raid detection result
 */
function analyzeMessagePatterns(guildRaidData, config) {
    const recentMessages = guildRaidData.recentMessages;

    if (recentMessages.length >= config.MESSAGE_THRESHOLD) {
        const indicators = [];
        let raidScore = 0;

        // Check for duplicate messages
        const messageGroups = {};
        const channelFlood = {};
        const rapidPosters = {};

        recentMessages.forEach(msg => {
            // Group by content
            if (!messageGroups[msg.content]) {
                messageGroups[msg.content] = new Set();
            }
            messageGroups[msg.content].add(msg.userId);

            // Track channel flooding
            if (!channelFlood[msg.channelId]) {
                channelFlood[msg.channelId] = [];
            }
            channelFlood[msg.channelId].push(msg);

            // Track rapid posting per user
            if (!rapidPosters[msg.userId]) {
                rapidPosters[msg.userId] = [];
            }
            rapidPosters[msg.userId].push(msg.timestamp);
        });

        const duplicateMessages = Object.entries(messageGroups).filter(
            ([content, users]) => users.size >= config.DUPLICATE_MESSAGE_THRESHOLD && content.length > 0
        );

        // Enhanced duplicate message detection
        if (duplicateMessages.length > 0) {
            indicators.push('Coordinated duplicate messages');
            raidScore += 50; // Higher score for coordinated spam
        }

        // Check message rate
        if (recentMessages.length >= config.MESSAGE_THRESHOLD) {
            indicators.push('High message rate');
            raidScore += 30;
        }

        // Check for channel flooding
        const floodedChannels = Object.entries(channelFlood).filter(
            ([channelId, messages]) => messages.length >= 5
        );

        if (floodedChannels.length >= 2) {
            indicators.push('Multi-channel flooding');
            raidScore += 45;
        }

        // Check for rapid posting by individuals
        const rapidSpammers = Object.entries(rapidPosters).filter(
            ([userId, timestamps]) => {
                // Check if user posted more than X messages in rapid succession
                if (timestamps.length >= config.RAPID_MESSAGE_THRESHOLD) {
                    const sortedTimes = timestamps.sort((a, b) => a - b);
                    const timeSpan = sortedTimes[sortedTimes.length - 1] - sortedTimes[0];
                    return timeSpan <= config.RAPID_MESSAGE_WINDOW * 1000;
                }
                return false;
            }
        );

        if (rapidSpammers.length >= 1) {
            indicators.push('Rapid individual spamming');
            raidScore += 35;
        }

        // Check for coordinated messaging (same users posting rapidly)
        const userMessageCounts = {};
        recentMessages.forEach(msg => {
            userMessageCounts[msg.userId] = (userMessageCounts[msg.userId] || 0) + 1;
        });

        const spammyUsers = Object.entries(userMessageCounts).filter(
            ([userId, count]) => count >= 2 // Lowered threshold
        );

        if (spammyUsers.length >= config.COORDINATED_ACTION_THRESHOLD) {
            indicators.push('Coordinated mass messaging');
            raidScore += 40;
        }

        // Check for bot-like messaging patterns
        const botPatterns = analyzeBotMessagePatterns(recentMessages);
        if (botPatterns.score > 0) {
            indicators.push('Bot-like messaging patterns');
            raidScore += botPatterns.score;
        }

        // Check for link spam patterns
        const linkSpam = analyzeLinkSpamPatterns(recentMessages);
        if (linkSpam.isSpam) {
            indicators.push('Coordinated link spam');
            raidScore += 45;
        }

        return {
            isRaid: raidScore >= 40, // Lowered threshold
            type: botPatterns.isBotRaid ? 'bot_message_raid' : 'message_raid',
            score: raidScore,
            indicators,
            duplicateMessages: duplicateMessages.map(([content, users]) => ({
                content: content.substring(0, 100),
                userCount: users.size
            })),
            affectedUsers: Object.keys(userMessageCounts),
            floodedChannels: floodedChannels.map(([channelId, messages]) => ({
                channelId,
                messageCount: messages.length
            })),
            threat_level: raidScore >= 80 ? 'critical' : raidScore >= 60 ? 'high' : raidScore >= 40 ? 'medium' : 'low'
        };
    }

    return { isRaid: false };
}

function analyzeBotMessagePatterns(messages) {
    let botScore = 0;
    let isBotRaid = false;

    // Check for identical message timing (bot coordination)
    const timingGroups = {};
    messages.forEach(msg => {
        const timeSlot = Math.floor(msg.timestamp / 1000); // Group by second
        if (!timingGroups[timeSlot]) timingGroups[timeSlot] = [];
        timingGroups[timeSlot].push(msg);
    });

    const simultaneousMessages = Object.values(timingGroups).filter(group => group.length >= 3);
    if (simultaneousMessages.length > 0) {
        botScore += 30;
        isBotRaid = true;
    }

    // Check for identical message lengths (bot pattern)
    const lengthGroups = {};
    messages.forEach(msg => {
        const length = msg.content.length;
        if (!lengthGroups[length]) lengthGroups[length] = 0;
        lengthGroups[length]++;
    });

    const identicalLengths = Object.values(lengthGroups).filter(count => count >= 3);
    if (identicalLengths.length > 0) {
        botScore += 20;
    }

    // Check for repetitive patterns (bot generation)
    const patterns = messages.map(msg => msg.content.toLowerCase().replace(/[0-9]/g, 'X'));
    const patternCounts = {};
    patterns.forEach(pattern => {
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    });

    const repetitivePatterns = Object.values(patternCounts).filter(count => count >= 2);
    if (repetitivePatterns.length > 0) {
        botScore += 25;
        isBotRaid = true;
    }

    return { score: botScore, isBotRaid };
}

function analyzeLinkSpamPatterns(messages) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const linksPerUser = {};
    const domains = {};

    messages.forEach(msg => {
        const urls = msg.content.match(urlRegex) || [];
        if (urls.length > 0) {
            if (!linksPerUser[msg.userId]) linksPerUser[msg.userId] = 0;
            linksPerUser[msg.userId] += urls.length;

            urls.forEach(url => {
                try {
                    const domain = new URL(url).hostname;
                    if (!domains[domain]) domains[domain] = new Set();
                    domains[domain].add(msg.userId);
                } catch (e) {
                    // Invalid URL, skip
                }
            });
        }
    });

    const linkSpammers = Object.values(linksPerUser).filter(count => count >= 2);
    const sharedDomains = Object.values(domains).filter(users => users.size >= 2);

    return {
        isSpam: linkSpammers.length >= 2 || sharedDomains.length >= 1,
        linkSpammers: linkSpammers.length,
        sharedDomains: sharedDomains.length
    };
}

/**
 * Handle detected raid
 * @param {Guild} guild - Discord guild
 * @param {Client} client - Discord client instance
 * @param {Object} raidDetection - Raid detection data
 * @param {Object} guildRaidData - Guild raid data
 */
async function handleRaidDetection(guild, client, raidDetection, guildRaidData) {
    try {
        console.log(`🚨 RAID DETECTED in ${guild.name}: ${raidDetection.type} (Score: ${raidDetection.score})`);

        // Update statistics
        client.raidStats.totalRaidsDetected++;
        guildRaidData.lastRaidTime = Date.now();

        // Create raid alert embed
        const raidEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🚨 RAID DETECTED')
            .setDescription(`Potential ${raidDetection.type} detected in **${guild.name}**`)
            .addFields(
                { name: '📊 Raid Score', value: `${raidDetection.score}/100`, inline: true },
                { name: '⚠️ Indicators', value: raidDetection.indicators.join('\n'), inline: true },
                { name: '👥 Affected Users', value: `${raidDetection.affectedUsers.length} users`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

        // Add type-specific information
        if (raidDetection.type === 'join_raid' && raidDetection.suspiciousPatterns) {
            const patterns = raidDetection.suspiciousPatterns;
            raidEmbed.addFields({
                name: '📈 Join Analysis',
                value: `• Rapid joins: ${patterns.rapidJoins} in ${patterns.timeWindow}s\n• New accounts: ${patterns.newAccounts}\n• Avg account age: ${Math.floor(patterns.averageAccountAge / (1000 * 60 * 60 * 24))} days`,
                inline: false
            });
        }

        if (raidDetection.type === 'message_raid' && raidDetection.duplicateMessages) {
            const duplicates = raidDetection.duplicateMessages.slice(0, 3);
            const duplicateText = duplicates.map(dup => `• "${dup.content}" (${dup.userCount} users)`).join('\n');
            raidEmbed.addFields({
                name: '💬 Message Analysis',
                value: duplicateText || 'Multiple spam patterns detected',
                inline: false
            });
        }

        // Create action buttons
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`raid_lockdown_${guild.id}`)
                    .setLabel('🔒 Lockdown Server')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`raid_kick_${guild.id}`)
                    .setLabel('👢 Kick Raiders')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`raid_ban_${guild.id}`)
                    .setLabel('🔨 Ban Raiders')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`raid_dismiss_${guild.id}`)
                    .setLabel('❌ False Positive')
                    .setStyle(ButtonStyle.Success)
            );

        // Send alert to log channel or administrators
        const logChannel = client.channels.cache.get(client.logChannels?.[guild.id]);
        if (logChannel) {
            await logChannel.send({
                content: `<@&${await getModeratorRoleId(guild)}> **RAID ALERT**`,
                embeds: [raidEmbed],
                components: [actionRow]
            });
        }

        // Log the raid detection
        await logAction(guild, 'raid_detected', {
            type: raidDetection.type,
            score: raidDetection.score,
            indicators: raidDetection.indicators,
            affectedUserCount: raidDetection.affectedUsers.length
        }, null);

        // Enhanced automated responses based on threat level
        if (raidDetection.threat_level === 'critical') {
            // Critical threat - immediate lockdown and ban
            if (client.raidConfig.AUTO_LOCKDOWN) {
                await activateLockdown(guild, client);
            }
            if (client.raidConfig.AUTO_BAN_PERSISTENT) {
                await banSuspiciousUsers(guild, client, raidDetection.affectedUsers, 'Critical raid threat - automated protection');
            }
        } else if (raidDetection.threat_level === 'high') {
            // High threat - lockdown and kick
            if (client.raidConfig.AUTO_LOCKDOWN) {
                await activateLockdown(guild, client);
            }
            if (client.raidConfig.AUTO_KICK_RAIDERS) {
                await kickSuspiciousUsers(guild, client, raidDetection.affectedUsers, 'High raid threat - automated protection');
            }
        } else if (raidDetection.threat_level === 'medium') {
            // Medium threat - quarantine and monitor
            if (client.raidConfig.QUARANTINE_NEW_ACCOUNTS) {
                await quarantineUsers(guild, client, raidDetection.affectedUsers, 'Medium raid threat - quarantine');
            }
            if (client.raidConfig.CHANNEL_SLOWMODE_ON_RAID) {
                await activateSlowmode(guild, client);
            }
        }

        // Legacy automated responses (fallback)
        if (client.raidConfig.AUTO_LOCKDOWN && raidDetection.score >= 70) {
            await activateLockdown(guild, client);
        }

        if (client.raidConfig.AUTO_KICK_RAIDERS && raidDetection.score >= 60) {
            await kickSuspiciousUsers(guild, client, raidDetection.affectedUsers, 'Automated raid protection');
        }

        // Store raid data for manual review
        if (!suspiciousActivity.has(guild.id)) {
            suspiciousActivity.set(guild.id, []);
        }
        suspiciousActivity.get(guild.id).push({
            ...raidDetection,
            timestamp: Date.now(),
            handled: false
        });

    } catch (error) {
        console.error('❌ Error handling raid detection:', error);
    }
}

/**
 * Handle raid protection button interactions
 * @param {Interaction} interaction - Discord interaction
 * @param {Client} client - Discord client instance
 */
async function handleRaidInteraction(interaction, client) {
    try {
        if (!interaction.customId.startsWith('raid_')) return false;

        const [action, subAction, guildId] = interaction.customId.split('_');
        const guild = client.guilds.cache.get(guildId);

        if (!guild) {
            await interaction.reply({ content: '❌ Guild not found.', ephemeral: true });
            return true;
        }

        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ content: '❌ You need Administrator permissions to use raid protection.', ephemeral: true });
            return true;
        }

        switch (subAction) {
            case 'lockdown':
                await activateLockdown(guild, client);
                await interaction.reply({ content: '🔒 Server lockdown activated!', ephemeral: true });
                break;

            case 'kick':
                const guildRaidData = raidData.get(guildId);
                if (guildRaidData) {
                    const recentJoins = guildRaidData.recentJoins.slice(-10); // Last 10 joins
                    const kickedCount = await kickSuspiciousUsers(guild, client, recentJoins.map(j => j.userId), `Manual raid protection by ${interaction.user.tag}`);
                    await interaction.reply({ content: `👢 Kicked ${kickedCount} suspicious users.`, ephemeral: true });
                } else {
                    await interaction.reply({ content: '❌ No recent suspicious activity found.', ephemeral: true });
                }
                break;

            case 'ban':
                const guildRaidDataBan = raidData.get(guildId);
                if (guildRaidDataBan) {
                    const recentJoins = guildRaidDataBan.recentJoins.slice(-10);
                    const bannedCount = await banSuspiciousUsers(guild, client, recentJoins.map(j => j.userId), `Manual raid protection by ${interaction.user.tag}`);
                    await interaction.reply({ content: `🔨 Banned ${bannedCount} suspicious users.`, ephemeral: true });
                } else {
                    await interaction.reply({ content: '❌ No recent suspicious activity found.', ephemeral: true });
                }
                break;

            case 'dismiss':
                client.raidStats.falsePositives++;
                await interaction.reply({ content: '✅ Raid alert dismissed as false positive.', ephemeral: true });
                break;
        }

        return true;

    } catch (error) {
        console.error('❌ Error handling raid interaction:', error);
        if (!interaction.replied) {
            await interaction.reply({ content: '❌ An error occurred while processing the raid action.', ephemeral: true });
        }
        return true;
    }
}

/**
 * Activate server lockdown
 * @param {Guild} guild - Discord guild
 * @param {Client} client - Discord client instance
 */
async function activateLockdown(guild, client) {
    try {
        console.log(`🔒 Activating lockdown for ${guild.name}`);

        const botMember = guild.members.me;
        if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
            console.log('❌ Bot lacks permissions for lockdown');
            return;
        }

        let lockedChannels = 0;

        // Lock all text channels
        for (const channel of guild.channels.cache.values()) {
            if (channel.isTextBased() && !channel.isThread()) {
                try {
                    await channel.permissionOverwrites.edit(guild.id, {
                        SendMessages: false,
                        AddReactions: false,
                        CreatePublicThreads: false,
                        CreatePrivateThreads: false
                    });
                    lockedChannels++;
                } catch (error) {
                    console.error(`❌ Failed to lock channel ${channel.name}:`, error.message);
                }
            }
        }

        // Update guild data
        const guildRaidData = raidData.get(guild.id);
        if (guildRaidData) {
            guildRaidData.lockdownActive = true;
        }

        client.raidStats.lockdownsActivated++;

        // Log lockdown activation
        await logAction(guild, 'lockdown_activated', {
            lockedChannels,
            reason: 'Automated raid protection',
            duration: 'Manual unlock required'
        }, null);

        console.log(`✅ Lockdown activated for ${guild.name} - ${lockedChannels} channels locked`);

    } catch (error) {
        console.error('❌ Error activating lockdown:', error);
    }
}

/**
 * Kick suspicious users
 * @param {Guild} guild - Discord guild
 * @param {Client} client - Discord client instance
 * @param {Array} userIds - User IDs to kick
 * @param {string} reason - Kick reason
 * @returns {number} - Number of users kicked
 */
async function kickSuspiciousUsers(guild, client, userIds, reason) {
    let kickedCount = 0;

    const botMember = guild.members.me;
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.KickMembers)) {
        console.log('❌ Bot lacks kick permissions');
        return 0;
    }

    for (const userId of userIds) {
        try {
            const member = guild.members.cache.get(userId);
            if (member && member.kickable) {
                await member.kick(reason);
                kickedCount++;
                console.log(`👢 Kicked ${member.user.tag} (${userId}) - ${reason}`);
            }
        } catch (error) {
            console.error(`❌ Failed to kick ${userId}:`, error.message);
        }
    }

    client.raidStats.totalRaidersKicked += kickedCount;
    return kickedCount;
}

/**
 * Ban suspicious users
 * @param {Guild} guild - Discord guild
 * @param {Client} client - Discord client instance
 * @param {Array} userIds - User IDs to ban
 * @param {string} reason - Ban reason
 * @returns {number} - Number of users banned
 */
async function banSuspiciousUsers(guild, client, userIds, reason) {
    let bannedCount = 0;

    const botMember = guild.members.me;
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
        console.log('❌ Bot lacks ban permissions');
        return 0;
    }

    for (const userId of userIds) {
        try {
            const member = guild.members.cache.get(userId);
            if (member && member.bannable) {
                await member.ban({ reason, deleteMessageSeconds: 86400 }); // Delete 1 day of messages
                bannedCount++;
                console.log(`🔨 Banned ${member.user.tag} (${userId}) - ${reason}`);
            }
        } catch (error) {
            console.error(`❌ Failed to ban ${userId}:`, error.message);
        }
    }

    client.raidStats.totalRaidersBanned += bannedCount;
    return bannedCount;
}

/**
 * Get raid protection statistics
 * @param {Client} client - Discord client instance
 * @param {string} guildId - Guild ID (optional)
 * @returns {Object} - Statistics
 */
function getRaidStats(client, guildId = null) {
    const stats = {
        global: client.raidStats || {},
        activeMonitoring: raidData.size,
        currentSuspiciousActivity: 0
    };

    if (guildId && raidData.has(guildId)) {
        const guildData = raidData.get(guildId);
        stats.guild = {
            recentJoins: guildData.recentJoins.length,
            recentMessages: guildData.recentMessages.length,
            suspiciousUsers: guildData.suspiciousUsers.size,
            lockdownActive: guildData.lockdownActive,
            lastRaidTime: guildData.lastRaidTime
        };
    }

    // Count current suspicious activity
    for (const activities of suspiciousActivity.values()) {
        stats.currentSuspiciousActivity += activities.filter(a => !a.handled).length;
    }

    return stats;
}

/**
 * Utility functions
 */
function findSimilarNames(usernames) {
    const similar = [];
    for (let i = 0; i < usernames.length; i++) {
        for (let j = i + 1; j < usernames.length; j++) {
            if (calculateSimilarity(usernames[i], usernames[j]) > 0.6) { // More sensitive
                similar.push([usernames[i], usernames[j]]);
            }
        }
    }
    return similar;
}

function detectSuspiciousAvatars(recentJoins) {
    const suspicious = [];
    const defaultAvatarCount = recentJoins.filter(join => !join.hasCustomAvatar).length;
    
    // High number of default avatars
    if (defaultAvatarCount >= 2) {
        suspicious.push(...recentJoins.filter(join => !join.hasCustomAvatar));
    }
    
    return suspicious;
}

function detectUsernamePatterns(recentJoins) {
    const patterns = [];
    const usernames = recentJoins.map(join => join.username);
    
    // Check for numbered sequences (user1, user2, etc.)
    const numberedPattern = /^(.+?)(\d+)$/;
    const baseNames = {};
    
    usernames.forEach((username, index) => {
        const match = username.match(numberedPattern);
        if (match) {
            const baseName = match[1];
            if (!baseNames[baseName]) baseNames[baseName] = [];
            baseNames[baseName].push(index);
        }
        
        // Check for random string patterns (common in bot names)
        if (/^[a-z]{8,12}$/.test(username.toLowerCase()) || 
            /^user[0-9]{4,8}$/.test(username.toLowerCase()) ||
            /^[a-z]+[0-9]{4,8}$/.test(username.toLowerCase())) {
            patterns.push(recentJoins[index]);
        }
    });
    
    // Add users with similar base names
    Object.values(baseNames).forEach(indices => {
        if (indices.length >= 2) {
            patterns.push(...indices.map(i => recentJoins[i]));
        }
    });
    
    return patterns;
}

function detectSequentialJoins(recentJoins) {
    let sequentialCount = 0;
    const sortedJoins = recentJoins.sort((a, b) => a.timestamp - b.timestamp);
    
    for (let i = 1; i < sortedJoins.length; i++) {
        const timeDiff = sortedJoins[i].timestamp - sortedJoins[i-1].timestamp;
        if (timeDiff < 2000) { // Less than 2 seconds apart
            sequentialCount++;
        }
    }
    
    return sequentialCount;
}

function calculateVariance(numbers) {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
}

function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + cost
            );
        }
    }
    return matrix[str2.length][str1.length];
}

function cleanupOldRaidData() {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    for (const [guildId, data] of raidData.entries()) {
        // Clean old joins
        data.recentJoins = data.recentJoins.filter(join => now - join.timestamp <= maxAge);
        
        // Clean old messages
        data.recentMessages = data.recentMessages.filter(msg => now - msg.timestamp <= maxAge);
        
        // Clean suspicious users if they're old
        const suspiciousArray = Array.from(data.suspiciousUsers);
        for (const userId of suspiciousArray) {
            const hasRecentActivity = data.recentJoins.some(join => join.userId === userId) ||
                                    data.recentMessages.some(msg => msg.userId === userId);
            if (!hasRecentActivity) {
                data.suspiciousUsers.delete(userId);
            }
        }

        // Remove guild data if empty
        if (data.recentJoins.length === 0 && data.recentMessages.length === 0 && 
            data.suspiciousUsers.size === 0 && !data.lockdownActive) {
            raidData.delete(guildId);
        }
    }

    // Clean old suspicious activities
    for (const [guildId, activities] of suspiciousActivity.entries()) {
        const filtered = activities.filter(activity => now - activity.timestamp <= maxAge * 2);
        if (filtered.length === 0) {
            suspiciousActivity.delete(guildId);
        } else {
            suspiciousActivity.set(guildId, filtered);
        }
    }
}

/**
 * Quarantine suspicious users
 * @param {Guild} guild - Discord guild
 * @param {Client} client - Discord client instance
 * @param {Array} userIds - User IDs to quarantine
 * @param {string} reason - Quarantine reason
 * @returns {number} - Number of users quarantined
 */
async function quarantineUsers(guild, client, userIds, reason) {
    let quarantinedCount = 0;

    const botMember = guild.members.me;
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        console.log('❌ Bot lacks role management permissions for quarantine');
        return 0;
    }

    // Find or create quarantine role
    let quarantineRole = guild.roles.cache.find(role => role.name === 'Quarantined');
    if (!quarantineRole) {
        try {
            quarantineRole = await guild.roles.create({
                name: 'Quarantined',
                color: '#808080',
                permissions: [],
                reason: 'Raid protection quarantine role'
            });

            // Set up permissions for quarantine role
            for (const channel of guild.channels.cache.values()) {
                if (channel.isTextBased() && !channel.isThread()) {
                    await channel.permissionOverwrites.edit(quarantineRole, {
                        SendMessages: false,
                        AddReactions: false,
                        CreatePublicThreads: false,
                        CreatePrivateThreads: false,
                        AttachFiles: false,
                        EmbedLinks: false
                    });
                }
            }
        } catch (error) {
            console.error('❌ Failed to create quarantine role:', error.message);
            return 0;
        }
    }

    for (const userId of userIds) {
        try {
            const member = guild.members.cache.get(userId);
            if (member && !member.roles.cache.has(quarantineRole.id)) {
                await member.roles.add(quarantineRole, reason);
                quarantinedCount++;
                console.log(`🔒 Quarantined ${member.user.tag} (${userId}) - ${reason}`);
            }
        } catch (error) {
            console.error(`❌ Failed to quarantine ${userId}:`, error.message);
        }
    }

    return quarantinedCount;
}

/**
 * Activate slowmode on channels
 * @param {Guild} guild - Discord guild
 * @param {Client} client - Discord client instance
 */
async function activateSlowmode(guild, client) {
    try {
        console.log(`⏱️ Activating slowmode for ${guild.name}`);

        const botMember = guild.members.me;
        if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
            console.log('❌ Bot lacks permissions for slowmode');
            return;
        }

        let slowmodeChannels = 0;

        // Apply slowmode to text channels
        for (const channel of guild.channels.cache.values()) {
            if (channel.isTextBased() && !channel.isThread() && channel.rateLimitPerUser < 30) {
                try {
                    await channel.setRateLimitPerUser(30, 'Raid protection slowmode');
                    slowmodeChannels++;
                } catch (error) {
                    console.error(`❌ Failed to set slowmode on ${channel.name}:`, error.message);
                }
            }
        }

        console.log(`✅ Slowmode activated on ${slowmodeChannels} channels`);

    } catch (error) {
        console.error('❌ Error activating slowmode:', error);
    }
}

async function getModeratorRoleId(guild) {
    // Try to find a moderator role
    const modRoles = guild.roles.cache.filter(role => 
        role.name.toLowerCase().includes('mod') || 
        role.name.toLowerCase().includes('admin') ||
        role.permissions.has(PermissionFlagsBits.ManageMessages)
    );
    
    return modRoles.first()?.id || guild.roles.everyone.id;
}

module.exports = {
    initializeRaidProtection,
    analyzeMemberJoin,
    analyzeMessage,
    handleRaidInteraction,
    getRaidStats,
    activateLockdown,
    quarantineUsers,
    activateSlowmode,
    raidData,
    suspiciousActivity
};
