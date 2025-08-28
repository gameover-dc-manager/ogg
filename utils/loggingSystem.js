const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// Enhanced logging configuration management
class LoggingManager {
    constructor() {
        this.configPath = path.join(__dirname, '../config/logging_config.json');
        this.logChannelsPath = path.join(__dirname, '../config/log_channels.json');
        this.cache = new Map();
        this.channelCache = new Map();
        this.initializeSystem();
    }

    initializeSystem() {
        try {
            this.ensureConfigDirectories();
            this.loadConfigurations();
            console.log('✅ Logging system initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize logging system:', error);
        }
    }

    ensureConfigDirectories() {
        const configDir = path.dirname(this.configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
    }

    loadConfigurations() {
        try {
            // Load logging config
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                const config = JSON.parse(data);
                this.cache.clear();
                Object.entries(config).forEach(([guildId, guildConfig]) => {
                    this.cache.set(guildId, guildConfig);
                });
            }

            // Load log channels config
            if (fs.existsSync(this.logChannelsPath)) {
                const data = fs.readFileSync(this.logChannelsPath, 'utf8');
                const channels = JSON.parse(data);
                this.channelCache.clear();
                Object.entries(channels).forEach(([guildId, channelId]) => {
                    this.channelCache.set(guildId, channelId);
                });
            }
        } catch (error) {
            console.error('❌ Error loading logging configurations:', error);
        }
    }

    saveLoggingConfig() {
        try {
            const config = {};
            this.cache.forEach((value, key) => {
                config[key] = value;
            });
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
            return true;
        } catch (error) {
            console.error('❌ Error saving logging config:', error);
            return false;
        }
    }

    getDefaultConfig() {
        return {
            enabled: true,
            log_bot_messages: false,
            log_message_edits: true,
            log_message_deletes: true,
            log_member_joins: true,
            log_member_leaves: true,
            log_warnings: true,
            log_bans: true,
            log_kicks: true,
            log_timeouts: true,
            log_role_changes: true,
            log_channel_changes: true,
            log_admin_actions: true,
            ignore_admin_actions: false,
            ignore_owner_actions: false,
            log_automod_actions: true,
            log_voice_events: true,
            log_nickname_changes: true,
            log_avatar_changes: true,
            log_emoji_changes: true,
            log_sticker_changes: true,
            log_thread_events: true,
            log_invite_events: true,
            log_webhook_events: true,
            log_command_usage: true,
            log_button_interactions: false,
            log_modal_interactions: false
        };
    }

    getLoggingConfig(guildId) {
        if (!guildId) return this.getDefaultConfig();

        if (this.cache.has(guildId)) {
            return this.cache.get(guildId);
        }

        // Create default config for new guild
        const defaultConfig = this.getDefaultConfig();
        this.cache.set(guildId, defaultConfig);
        this.saveLoggingConfig();

        console.log(`✅ Created default logging config for guild ${guildId}`);
        return defaultConfig;
    }

    updateLoggingConfig(guildId, updates) {
        if (!guildId || !updates) return false;

        const currentConfig = this.getLoggingConfig(guildId);
        const updatedConfig = { ...currentConfig, ...updates };

        this.cache.set(guildId, updatedConfig);
        return this.saveLoggingConfig();
    }

    getLogChannel(guild) {
        if (!guild) return null;

        try {
            const channelId = this.channelCache.get(guild.id);
            if (!channelId) {
                console.log(`❌ No log channel configured for guild: ${guild.name} (${guild.id})`);
                return null;
            }

            const channel = guild.channels.cache.get(channelId);
            if (!channel) {
                console.log(`❌ Log channel not found with ID: ${channelId} for guild: ${guild.name}`);
                return null;
            }

            // Check permissions
            const permissions = channel.permissionsFor(guild.members.me);
            if (!permissions || !permissions.has(['SendMessages', 'EmbedLinks'])) {
                console.log(`❌ Missing permissions in log channel ${channel.name} for guild: ${guild.name}`);
                return null;
            }

            return channel;
        } catch (error) {
            console.error(`❌ Error getting log channel for guild ${guild.name}:`, error);
            return null;
        }
    }

    shouldLog(guild, actionType, user = null) {
        if (!guild || !actionType) return false;

        try {
            const config = this.getLoggingConfig(guild.id);

            // Check if logging is enabled
            if (!config.enabled) {
                return false;
            }

            // Check if it's a bot and bot logging is disabled
            if (user && user.bot && !config.log_bot_messages) {
                return false;
            }

            // Check if user is owner and owner actions should be ignored
            if (user && user.id === guild.ownerId && config.ignore_owner_actions) {
                return false;
            }

            // Check if user is admin and admin actions should be ignored
            if (user && guild.members.cache.get(user.id)?.permissions.has('Administrator') && config.ignore_admin_actions) {
                return false;
            }

            // Check specific action type
            const actionMap = {
                'message_edit': 'log_message_edits',
                'message_delete': 'log_message_deletes',
                'member_join': 'log_member_joins',
                'member_leave': 'log_member_leaves',
                'warning': 'log_warnings',
                'warning_added': 'log_warnings',
                'warning_removed': 'log_warnings',
                'warning_appeal': 'log_warnings',
                'ban': 'log_bans',
                'kick': 'log_kicks',
                'timeout': 'log_timeouts',
                'role_change': 'log_role_changes',
                'channel_change': 'log_channel_changes',
                'admin_action': 'log_admin_actions',
                'automod_action': 'log_automod_actions',
                'voice_join': 'log_voice_events',
                'voice_leave': 'log_voice_events',
                'voice_move': 'log_voice_events',
                'nickname_change': 'log_nickname_changes',
                'avatar_change': 'log_avatar_changes',
                'emoji_create': 'log_emoji_changes',
                'emoji_delete': 'log_emoji_changes',
                'emoji_update': 'log_emoji_changes',
                'sticker_create': 'log_sticker_changes',
                'sticker_delete': 'log_sticker_changes',
                'sticker_update': 'log_sticker_changes',
                'thread_create': 'log_thread_events',
                'thread_delete': 'log_thread_events',
                'thread_update': 'log_thread_events',
                'invite_create': 'log_invite_events',
                'invite_delete': 'log_invite_events',
                'webhook_create': 'log_webhook_events',
                'webhook_delete': 'log_webhook_events',
                'webhook_update': 'log_webhook_events',
                'command_usage': 'log_command_usage',
                'button_interaction': 'log_button_interactions',
                'modal_interaction': 'log_modal_interactions',
                'purge': 'log_message_deletes'
            };

            const configKey = actionMap[actionType];
            return configKey ? config[configKey] || false : true;
        } catch (error) {
            console.error(`❌ Error checking if should log ${actionType}:`, error);
            return false;
        }
    }

    async logAction(guild, actionType, data, user = null) {
        try {
            // Validate inputs
            if (!guild || !actionType || !data) {
                console.warn('⚠️ Missing required parameters for logAction');
                return false;
            }

            console.log(`📝 [LOG] Attempting to log ${actionType} for guild ${guild.name}`);

            // Check if we should log this action
            if (!this.shouldLog(guild, actionType, user)) {
                console.log(`📝 [LOG] Skipping log for ${actionType} - disabled or filtered`);
                return false;
            }

            // Get log channel
            const logChannel = this.getLogChannel(guild);
            if (!logChannel) {
                console.log(`❌ [LOG] No valid log channel for guild ${guild.name}`);
                return false;
            }

            // Create embed
            const embed = this.createEmbedForAction(actionType, data);
            if (!embed) {
                console.log(`❌ [LOG] Failed to create embed for ${actionType}`);
                return false;
            }

            // Send log message
            await logChannel.send({ embeds: [embed] });
            console.log(`✅ [LOG] Successfully logged ${actionType} for ${guild.name}`);
            return true;

        } catch (error) {
            console.error(`❌ [LOG] Error logging ${actionType} for ${guild.name}:`, error.message);
            return false;
        }
    }

    createEmbedForAction(actionType, data) {
        try {
            const embedFactory = new EmbedFactory();
            return embedFactory.createEmbed(actionType, data);
        } catch (error) {
            console.error(`❌ Error creating embed for ${actionType}:`, error);
            return this.createErrorEmbed(actionType, error);
        }
    }

    createErrorEmbed(actionType, error) {
        return new EmbedBuilder()
            .setTitle('🚨 Logging Error')
            .setDescription(`Failed to create log embed for action: \`${actionType}\``)
            .addFields({ name: 'Error', value: `\`\`\`${error.message}\`\`\``, inline: false })
            .setColor('#FF0000')
            .setTimestamp();
    }
}

// Enhanced embed factory with better error handling
class EmbedFactory {
    createEmbed(actionType, data) {
        const methodMap = {
            'message_edit': () => this.createMessageEditEmbed(data),
            'message_delete': () => this.createMessageDeleteEmbed(data),
            'member_join': () => this.createMemberJoinEmbed(data),
            'member_leave': () => this.createMemberLeaveEmbed(data),
            'warning': () => this.createWarningEmbed(data),
            'warning_added': () => this.createWarningEmbed(data),
            'warning_removed': () => this.createWarningRemovedEmbed(data),
            'ban': () => this.createBanEmbed(data),
            'kick': () => this.createKickEmbed(data),
            'timeout': () => this.createTimeoutEmbed(data),
            'purge': () => this.createPurgeEmbed(data),
            'voice_join': () => this.createVoiceJoinEmbed(data),
            'voice_leave': () => this.createVoiceLeaveEmbed(data),
            'command_usage': () => this.createCommandUsageEmbed(data)
        };

        const createMethod = methodMap[actionType];
        if (createMethod) {
            return createMethod();
        }

        return this.createGenericEmbed(actionType, data);
    }

    safeGet(obj, path, defaultValue = 'Unknown') {
        try {
            return path.split('.').reduce((curr, prop) => curr?.[prop], obj) || defaultValue;
        } catch {
            return defaultValue;
        }
    }

    createMessageEditEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle('✏️ Message Edited')
            .setColor('#FFA500')
            .setTimestamp();

        try {
            const authorTag = this.safeGet(data, 'author.tag');
            const authorId = this.safeGet(data, 'author.id');
            const channelName = this.safeGet(data, 'channel.name') || this.safeGet(data, 'channel');
            const oldContent = this.safeGet(data, 'oldContent', '').substring(0, 800) || '*No content*';
            const newContent = this.safeGet(data, 'newContent', '').substring(0, 800) || '*No content*';

            embed.setDescription(`**User:** ${authorTag}\n**Channel:** ${channelName}`)
                .addFields(
                    { name: '👤 User ID', value: `\`${authorId}\``, inline: true },
                    { name: '💬 Channel', value: channelName, inline: true },
                    { name: '📝 Before', value: `\`\`\`${oldContent}\`\`\``.substring(0, 1024), inline: false },
                    { name: '✅ After', value: `\`\`\`${newContent}\`\`\``.substring(0, 1024), inline: false }
                );

            const avatarUrl = this.safeGet(data, 'author.displayAvatarURL');
            if (avatarUrl && typeof avatarUrl === 'function') {
                embed.setThumbnail(avatarUrl({ size: 64 }));
            }
        } catch (error) {
            embed.addFields({ name: 'Error', value: `Failed to format embed: ${error.message}`, inline: false });
        }

        return embed;
    }

    createMessageDeleteEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle('🗑️ Message Deleted')
            .setColor('#FF4444')
            .setTimestamp();

        try {
            const authorTag = this.safeGet(data, 'author.tag');
            const authorId = this.safeGet(data, 'author.id');
            const channelName = this.safeGet(data, 'channel.name') || this.safeGet(data, 'channel');
            const content = this.safeGet(data, 'content', '').substring(0, 1000) || '*No content*';

            embed.setDescription(`**User:** ${authorTag}\n**Channel:** ${channelName}`)
                .addFields(
                    { name: '👤 User ID', value: `\`${authorId}\``, inline: true },
                    { name: '💬 Channel', value: channelName, inline: true },
                    { name: '📝 Content', value: `\`\`\`${content}\`\`\``, inline: false }
                );

            const avatarUrl = this.safeGet(data, 'author.displayAvatarURL');
            if (avatarUrl && typeof avatarUrl === 'function') {
                embed.setThumbnail(avatarUrl({ size: 64 }));
            }
        } catch (error) {
            embed.addFields({ name: 'Error', value: `Failed to format embed: ${error.message}`, inline: false });
        }

        return embed;
    }

    createMemberJoinEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle('👋 Member Joined')
            .setColor('#00FF88')
            .setTimestamp();

        try {
            const memberTag = this.safeGet(data, 'member.user.tag') || this.safeGet(data, 'user.tag');
            const memberId = this.safeGet(data, 'member.user.id') || this.safeGet(data, 'user.id');
            const memberCount = this.safeGet(data, 'memberCount', 'Unknown');
            const accountAge = data.member?.user?.createdTimestamp ? 
                Math.floor((Date.now() - data.member.user.createdTimestamp) / (1000 * 60 * 60 * 24)) : 'Unknown';

            embed.setDescription(`**${memberTag}** joined the server`)
                .addFields(
                    { name: '👤 User', value: `${memberTag}\n\`${memberId}\``, inline: true },
                    { name: '📊 Member Count', value: `**${memberCount}**`, inline: true },
                    { name: '📅 Account Age', value: `${accountAge} days`, inline: true }
                );

            const avatarUrl = this.safeGet(data, 'member.user.displayAvatarURL') || this.safeGet(data, 'user.displayAvatarURL');
            if (avatarUrl && typeof avatarUrl === 'function') {
                embed.setThumbnail(avatarUrl({ size: 128 }));
            }
        } catch (error) {
            embed.addFields({ name: 'Error', value: `Failed to format embed: ${error.message}`, inline: false });
        }

        return embed;
    }

    createMemberLeaveEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle('👋 Member Left')
            .setColor('#FF4444')
            .setTimestamp();

        try {
            const memberTag = this.safeGet(data, 'member.user.tag') || this.safeGet(data, 'user.tag');
            const memberId = this.safeGet(data, 'member.user.id') || this.safeGet(data, 'user.id');
            const memberCount = this.safeGet(data, 'memberCount', 'Unknown');

            embed.setDescription(`**${memberTag}** left the server`)
                .addFields(
                    { name: '👤 User', value: `${memberTag}\n\`${memberId}\``, inline: true },
                    { name: '📊 Member Count', value: `**${memberCount}**`, inline: true }
                );

            const avatarUrl = this.safeGet(data, 'member.user.displayAvatarURL') || this.safeGet(data, 'user.displayAvatarURL');
            if (avatarUrl && typeof avatarUrl === 'function') {
                embed.setThumbnail(avatarUrl({ size: 128 }));
            }
        } catch (error) {
            embed.addFields({ name: 'Error', value: `Failed to format embed: ${error.message}`, inline: false });
        }

        return embed;
    }

    createWarningEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle('⚠️ Warning Issued')
            .setColor('#FFA500')
            .setTimestamp();

        try {
            const userTag = this.safeGet(data, 'user.tag');
            const userId = this.safeGet(data, 'user.id');
            const moderatorTag = this.safeGet(data, 'moderator.tag');
            const reason = this.safeGet(data, 'reason', 'No reason provided').substring(0, 900);
            const warningId = this.safeGet(data, 'warningId');

            embed.setDescription(`Warning issued to **${userTag}**`)
                .addFields(
                    { name: '👤 User', value: `${userTag}\n\`${userId}\``, inline: true },
                    { name: '👮 Moderator', value: moderatorTag, inline: true },
                    { name: '🆔 Warning ID', value: `\`${warningId}\``, inline: true },
                    { name: '📝 Reason', value: `\`\`\`${reason}\`\`\``, inline: false }
                );

            const avatarUrl = this.safeGet(data, 'user.displayAvatarURL');
            if (avatarUrl && typeof avatarUrl === 'function') {
                embed.setThumbnail(avatarUrl());
            }
        } catch (error) {
            embed.addFields({ name: 'Error', value: `Failed to format embed: ${error.message}`, inline: false });
        }

        return embed;
    }

    createWarningRemovedEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle('✅ Warning Removed')
            .setColor('#00FF00')
            .setTimestamp();

        try {
            const userTag = this.safeGet(data, 'user.tag');
            const userId = this.safeGet(data, 'user.id');
            const moderatorTag = this.safeGet(data, 'moderator.tag');
            const warningId = this.safeGet(data, 'warningId');
            const reason = this.safeGet(data, 'removalReason', 'No reason provided');

            embed.setDescription(`Warning removed from **${userTag}**`)
                .addFields(
                    { name: '👤 User', value: `${userTag}\n\`${userId}\``, inline: true },
                    { name: '👮 Moderator', value: moderatorTag, inline: true },
                    { name: '🆔 Warning ID', value: `\`${warningId}\``, inline: true },
                    { name: '📝 Reason', value: `\`\`\`${reason}\`\`\``, inline: false }
                );
        } catch (error) {
            embed.addFields({ name: 'Error', value: `Failed to format embed: ${error.message}`, inline: false });
        }

        return embed;
    }

    createBanEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle('🔨 Member Banned')
            .setColor('#8B0000')
            .setTimestamp();

        try {
            const userTag = this.safeGet(data, 'user.tag');
            const userId = this.safeGet(data, 'user.id');
            const moderatorTag = this.safeGet(data, 'moderator.tag', 'Unknown');
            const reason = this.safeGet(data, 'reason', 'No reason provided');

            embed.setDescription(`**${userTag}** was banned`)
                .addFields(
                    { name: '👤 User', value: `${userTag}\n\`${userId}\``, inline: true },
                    { name: '👮 Moderator', value: moderatorTag, inline: true },
                    { name: '📝 Reason', value: `\`\`\`${reason}\`\`\``, inline: false }
                );
        } catch (error) {
            embed.addFields({ name: 'Error', value: `Failed to format embed: ${error.message}`, inline: false });
        }

        return embed;
    }

    createKickEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle('🦵 Member Kicked')
            .setColor('#FF8C00')
            .setTimestamp();

        try {
            const userTag = this.safeGet(data, 'user.tag');
            const userId = this.safeGet(data, 'user.id');
            const moderatorTag = this.safeGet(data, 'moderator.tag', 'Unknown');
            const reason = this.safeGet(data, 'reason', 'No reason provided');

            embed.setDescription(`**${userTag}** was kicked`)
                .addFields(
                    { name: '👤 User', value: `${userTag}\n\`${userId}\``, inline: true },
                    { name: '👮 Moderator', value: moderatorTag, inline: true },
                    { name: '📝 Reason', value: `\`\`\`${reason}\`\`\``, inline: false }
                );
        } catch (error) {
            embed.addFields({ name: 'Error', value: `Failed to format embed: ${error.message}`, inline: false });
        }

        return embed;
    }

    createTimeoutEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle('🔇 Member Timed Out')
            .setColor('#FFA500')
            .setTimestamp();

        try {
            const userTag = this.safeGet(data, 'user.tag');
            const userId = this.safeGet(data, 'user.id');
            const moderatorTag = this.safeGet(data, 'moderator.tag', 'Auto-Moderation');
            const duration = this.safeGet(data, 'duration', 'Unknown');
            const reason = this.safeGet(data, 'reason', 'No reason provided');

            embed.setDescription(`**${userTag}** was timed out`)
                .addFields(
                    { name: '👤 User', value: `${userTag}\n\`${userId}\``, inline: true },
                    { name: '👮 Moderator', value: moderatorTag, inline: true },
                    { name: '⏱️ Duration', value: duration, inline: true },
                    { name: '📝 Reason', value: `\`\`\`${reason}\`\`\``, inline: false }
                );
        } catch (error) {
            embed.addFields({ name: 'Error', value: `Failed to format embed: ${error.message}`, inline: false });
        }

        return embed;
    }

    createPurgeEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle('🗑️ Messages Purged')
            .setColor('#FFA500')
            .setTimestamp();

        try {
            const moderatorTag = this.safeGet(data, 'moderator.tag');
            const channelName = this.safeGet(data, 'channel.name') || this.safeGet(data, 'channel');
            const messageCount = this.safeGet(data, 'messageCount', 0);

            embed.setDescription(`Messages purged by **${moderatorTag}**`)
                .addFields(
                    { name: '👮 Moderator', value: moderatorTag, inline: true },
                    { name: '💬 Channel', value: channelName, inline: true },
                    { name: '📊 Messages Deleted', value: messageCount.toString(), inline: true }
                );
        } catch (error) {
            embed.addFields({ name: 'Error', value: `Failed to format embed: ${error.message}`, inline: false });
        }

        return embed;
    }

    createVoiceJoinEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle('🔊 Voice Channel Joined')
            .setColor('#00FF00')
            .setTimestamp();

        try {
            const memberTag = this.safeGet(data, 'member.user.tag');
            const channelName = this.safeGet(data, 'channel.name');

            embed.setDescription(`**${memberTag}** joined voice channel`)
                .addFields(
                    { name: '👤 User', value: memberTag, inline: true },
                    { name: '🎤 Channel', value: channelName, inline: true }
                );
        } catch (error) {
            embed.addFields({ name: 'Error', value: `Failed to format embed: ${error.message}`, inline: false });
        }

        return embed;
    }

    createVoiceLeaveEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle('🔇 Voice Channel Left')
            .setColor('#FF4444')
            .setTimestamp();

        try {
            const memberTag = this.safeGet(data, 'member.user.tag');
            const channelName = this.safeGet(data, 'channel.name');

            embed.setDescription(`**${memberTag}** left voice channel`)
                .addFields(
                    { name: '👤 User', value: memberTag, inline: true },
                    { name: '🎤 Channel', value: channelName, inline: true }
                );
        } catch (error) {
            embed.addFields({ name: 'Error', value: `Failed to format embed: ${error.message}`, inline: false });
        }

        return embed;
    }

    createCommandUsageEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle('📝 Command Used')
            .setColor('#3498db')
            .setTimestamp();

        try {
            const userTag = this.safeGet(data, 'user.tag');
            const commandName = this.safeGet(data, 'commandName');
            const channelId = this.safeGet(data, 'channelId');

            embed.setDescription(`Command: \`${commandName}\``)
                .addFields(
                    { name: '👤 User', value: userTag, inline: true },
                    { name: '📍 Channel', value: `<#${channelId}>`, inline: true }
                );
        } catch (error) {
            embed.addFields({ name: 'Error', value: `Failed to format embed: ${error.message}`, inline: false });
        }

        return embed;
    }

    createGenericEmbed(actionType, data) {
        const embed = new EmbedBuilder()
            .setTitle(`📋 ${actionType.replace(/_/g, ' ').toUpperCase()}`)
            .setDescription('Action performed')
            .setColor('#808080')
            .setTimestamp();

        try {
            const dataString = JSON.stringify(data, null, 2).substring(0, 1000);
            embed.addFields({ name: '📊 Event Details', value: `\`\`\`json\n${dataString}\`\`\``, inline: false });
        } catch (error) {
            embed.addFields({ name: 'Error', value: `Failed to format data: ${error.message}`, inline: false });
        }

        return embed;
    }
}

// Create singleton instance
const loggingManager = new LoggingManager();

// Export functions for backward compatibility
module.exports = {
    // New enhanced methods
    manager: loggingManager,

    // Legacy methods for backward compatibility
    loadLoggingConfig: () => loggingManager.loadConfigurations(),
    saveLoggingConfig: (config) => loggingManager.saveLoggingConfig(),
    getLoggingConfig: (guildId) => loggingManager.getLoggingConfig(guildId),
    updateLoggingConfig: (guildId, updates) => loggingManager.updateLoggingConfig(guildId, updates),
    shouldLog: (guild, actionType, user) => loggingManager.shouldLog(guild, actionType, user),
    logAction: (guild, actionType, data, user) => loggingManager.logAction(guild, actionType, data, user),
    createEmbedForAction: (actionType, data) => loggingManager.createEmbedForAction(actionType, data),

    // Initialize functions
    initializeGuildLogging: (guildId) => {
        try {
            loggingManager.getLoggingConfig(guildId);
            return true;
        } catch (error) {
            console.error(`❌ Error initializing logging for guild ${guildId}:`, error);
            return false;
        }
    },

    initializeAllGuildsLogging: (client) => {
        try {
            let initialized = 0;
            let failed = 0;

            client.guilds.cache.forEach(guild => {
                try {
                    loggingManager.getLoggingConfig(guild.id);
                    initialized++;
                } catch (error) {
                    console.error(`❌ Failed to initialize logging for guild ${guild.id}:`, error);
                    failed++;
                }
            });

            console.log(`✅ Logging initialization complete: ${initialized} successful, ${failed} failed`);
            return { initialized, failed };
        } catch (error) {
            console.error(`❌ Error during bulk logging initialization:`, error);
            return { initialized: 0, failed: 0 };
        }
    }
};