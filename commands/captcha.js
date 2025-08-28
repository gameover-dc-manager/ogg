const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('captcha')
        .setDescription('Manage enhanced captcha verification system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup enhanced captcha verification system')
                .addChannelOption(option =>
                    option
                        .setName('verification-channel')
                        .setDescription('Channel where captcha challenges will be sent')
                        .setRequired(true))
                .addRoleOption(option =>
                    option
                        .setName('unverified-role')
                        .setDescription('Role assigned to unverified users')
                        .setRequired(true))
                .addRoleOption(option =>
                    option
                        .setName('verified-role')
                        .setDescription('Role assigned to verified users')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configure advanced captcha settings')
                .addStringOption(option =>
                    option
                        .setName('difficulty')
                        .setDescription('Captcha difficulty level')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Easy', value: 'easy' },
                            { name: 'Medium', value: 'medium' },
                            { name: 'Hard', value: 'hard' },
                            { name: 'Expert', value: 'expert' }))
                .addIntegerOption(option =>
                    option
                        .setName('timeout')
                        .setDescription('Verification timeout in minutes')
                        .setRequired(false)
                        .setMinValue(5)
                        .setMaxValue(120))
                .addIntegerOption(option =>
                    option
                        .setName('max-attempts')
                        .setDescription('Maximum verification attempts')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(15))
                .addIntegerOption(option =>
                    option
                        .setName('daily-limit')
                        .setDescription('Maximum daily verification attempts per user')
                        .setRequired(false)
                        .setMinValue(5)
                        .setMaxValue(50))
                .addBooleanOption(option =>
                    option
                        .setName('smart-captcha')
                        .setDescription('Enable smart captcha type selection')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option
                        .setName('pattern-detection')
                        .setDescription('Enable suspicious pattern detection')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option
                        .setName('manual-review')
                        .setDescription('Require manual review for failed verifications')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option
                        .setName('log-verifications')
                        .setDescription('Log all verification attempts')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View comprehensive captcha system status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('analytics')
                .setDescription('View detailed analytics and statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable captcha verification system'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable captcha verification system'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Test captcha generation (admin only)')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Type of captcha to test')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Image', value: 'image' },
                            { name: 'Math', value: 'math' },
                            { name: 'Enhanced Math', value: 'enhanced_math' })))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset captcha statistics')
                .addBooleanOption(option =>
                    option
                        .setName('include-daily')
                        .setDescription('Also reset daily statistics')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('permissions')
                .setDescription('Check bot permissions and role hierarchy'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleanup')
                .setDescription('Manual cleanup of expired verifications'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('export')
                .setDescription('Export verification logs and statistics')),

    async execute(interaction) {
        const { hasAdminPermissions } = require('../utils/adminPermissions');

        // Check if user has admin permissions for captcha management
        if (!await hasAdminPermissions(interaction.member)) {
            return await interaction.reply({
                content: '❌ You need admin permissions to manage the captcha system. Contact a server administrator to get the required role.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'setup':
                    await handleEnhancedSetup(interaction);
                    break;
                case 'config':
                    await handleEnhancedConfig(interaction);
                    break;
                case 'status':
                    await handleEnhancedStatus(interaction);
                    break;
                case 'analytics':
                    await handleAnalytics(interaction);
                    break;
                case 'enable':
                    await handleEnable(interaction);
                    break;
                case 'disable':
                    await handleDisable(interaction);
                    break;
                case 'test':
                    await handleEnhancedTest(interaction);
                    break;
                case 'reset':
                    await handleEnhancedReset(interaction);
                    break;
                case 'permissions':
                    await handleEnhancedPermissions(interaction);
                    break;
                case 'cleanup':
                    await handleManualCleanup(interaction);
                    break;
                case 'export':
                    await handleExport(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        flags: MessageFlags.Ephemeral
                    });
            }
        } catch (error) {
            console.error('❌ Error executing enhanced captcha command:', error);

            const errorMessage = {
                content: '❌ An error occurred while executing the command. Please check the console for details.',
                flags: MessageFlags.Ephemeral
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
};

/**
 * Handle enhanced captcha setup
 */
async function handleEnhancedSetup(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const verificationChannel = interaction.options.getChannel('verification-channel');
    const unverifiedRole = interaction.options.getRole('unverified-role');
    const verifiedRole = interaction.options.getRole('verified-role');

    // Initialize enhanced captcha config
    if (!interaction.client.captchaConfig) {
        const { getDefaultConfig } = require('../components/captchaSystem');
        interaction.client.captchaConfig = getDefaultConfig ? getDefaultConfig() : {
            enabled: false,
            verificationChannelId: null,
            unverifiedRoleId: null,
            verifiedRoleId: null,
            timeoutMinutes: 15,
            maxAttempts: 5,
            difficulty: 'medium',
            requireManualReview: false,
            logVerifications: true,
            enableSmartCaptcha: true,
            enablePatternDetection: true,
            maxDailyAttempts: 10
        };
    }

    // Initialize enhanced stats
    if (!interaction.client.captchaStats) {
        interaction.client.captchaStats = {
            totalVerifications: 0,
            successfulVerifications: 0,
            failedVerifications: 0,
            pendingVerifications: 0,
            totalAttempts: 0,
            suspiciousAttempts: 0,
            averageCompletionTime: 0,
            dailyStats: {}
        };
    }

    // Update configuration
    const client = interaction.client;
    client.captchaConfig.verificationChannelId = verificationChannel.id;
    client.captchaConfig.unverifiedRoleId = unverifiedRole.id;
    client.captchaConfig.verifiedRoleId = verifiedRole?.id || null;
    client.captchaConfig.enabled = true;

    // Save configuration
    await saveConfig(client.captchaConfig);

    const setupEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Enhanced Captcha System Setup Complete')
        .setDescription('The enhanced captcha verification system has been configured with advanced security features.')
        .addFields(
            { name: '📢 Verification Channel', value: `${verificationChannel}`, inline: true },
            { name: '🚫 Unverified Role', value: `${unverifiedRole}`, inline: true },
            { name: '✅ Verified Role', value: verifiedRole ? `${verifiedRole}` : 'Not set', inline: true },
            { name: '🔧 Status', value: '✅ Enabled', inline: true },
            { name: '⚙️ Difficulty', value: client.captchaConfig.difficulty.toUpperCase(), inline: true },
            { name: '⏰ Timeout', value: `${client.captchaConfig.timeoutMinutes} minutes`, inline: true },
            { name: '🧠 Smart Captcha', value: client.captchaConfig.enableSmartCaptcha ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '🔍 Pattern Detection', value: client.captchaConfig.enablePatternDetection ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '📊 Daily Limit', value: `${client.captchaConfig.maxDailyAttempts} attempts`, inline: true }
        )
        .setFooter({
            text: 'Enhanced security features are now active for new members',
            iconURL: interaction.guild.iconURL()
        })
        .setTimestamp();

    await interaction.editReply({ embeds: [setupEmbed] });
}

/**
 * Handle enhanced configuration
 */
async function handleEnhancedConfig(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const client = interaction.client;

    if (!client.captchaConfig) {
        return await interaction.editReply({
            content: '❌ Enhanced captcha system is not setup. Please run `/captcha setup` first.'
        });
    }

    const updates = [];
    const options = [
        'difficulty', 'timeout', 'max-attempts', 'daily-limit',
        'smart-captcha', 'pattern-detection', 'manual-review', 'log-verifications'
    ];

    for (const option of options) {
        const value = interaction.options.get(option)?.value;
        if (value !== undefined && value !== null) {
            switch (option) {
                case 'difficulty':
                    client.captchaConfig.difficulty = value;
                    updates.push(`🎯 Difficulty: ${value.toUpperCase()}`);
                    break;
                case 'timeout':
                    client.captchaConfig.timeoutMinutes = value;
                    updates.push(`⏰ Timeout: ${value} minutes`);
                    break;
                case 'max-attempts':
                    client.captchaConfig.maxAttempts = value;
                    updates.push(`🎲 Max attempts: ${value}`);
                    break;
                case 'daily-limit':
                    client.captchaConfig.maxDailyAttempts = value;
                    updates.push(`📊 Daily limit: ${value} attempts`);
                    break;
                case 'smart-captcha':
                    client.captchaConfig.enableSmartCaptcha = value;
                    updates.push(`🧠 Smart captcha: ${value ? 'Enabled' : 'Disabled'}`);
                    break;
                case 'pattern-detection':
                    client.captchaConfig.enablePatternDetection = value;
                    updates.push(`🔍 Pattern detection: ${value ? 'Enabled' : 'Disabled'}`);
                    break;
                case 'manual-review':
                    client.captchaConfig.requireManualReview = value;
                    updates.push(`👨‍💼 Manual review: ${value ? 'Enabled' : 'Disabled'}`);
                    break;
                case 'log-verifications':
                    client.captchaConfig.logVerifications = value;
                    updates.push(`📝 Logging: ${value ? 'Enabled' : 'Disabled'}`);
                    break;
            }
        }
    }

    if (updates.length === 0) {
        return await interaction.editReply({
            content: '❌ No configuration options were provided.'
        });
    }

    // Save configuration
    await saveConfig(client.captchaConfig);

    const configEmbed = new EmbedBuilder()
        .setColor('#4A90E2')
        .setTitle('⚙️ Enhanced Captcha Configuration Updated')
        .setDescription('The following advanced settings have been updated:')
        .addFields(
            { name: '🔄 Updated Settings', value: updates.join('\n'), inline: false },
            { name: '💡 Tip', value: 'Use `/captcha status` to view the complete configuration', inline: false }
        )
        .setFooter({
            text: 'Configuration saved successfully',
            iconURL: interaction.guild.iconURL()
        })
        .setTimestamp();

    await interaction.editReply({ embeds: [configEmbed] });
}

/**
 * Handle enhanced status display
 */
async function handleEnhancedStatus(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const client = interaction.client;
    const config = client.captchaConfig;

    if (!config) {
        return await interaction.editReply({
            content: '❌ Enhanced captcha system is not setup. Please run `/captcha setup` first.'
        });
    }

    // Get enhanced statistics
    const { getEnhancedCaptchaStats } = require('../components/captchaSystem');
    const stats = getEnhancedCaptchaStats(client);

    const statusEmbed = new EmbedBuilder()
        .setColor(config.enabled ? '#00FF00' : '#FF0000')
        .setTitle('🛡️ Enhanced Captcha System Status')
        .setDescription(config.enabled ? 
            '✅ **Enhanced security system is ACTIVE** and protecting your server' : 
            '❌ **System is DISABLED** - No verification protection active')
        .addFields(
            { name: '⚙️ Core Configuration', value: '─────────────────', inline: false },
            { name: '🔧 System Status', value: config.enabled ? '✅ Active' : '❌ Disabled', inline: true },
            { name: '🎯 Difficulty Level', value: config.difficulty.toUpperCase(), inline: true },
            { name: '⏰ Session Timeout', value: `${config.timeoutMinutes} minutes`, inline: true },
            { name: '🎲 Max Attempts', value: `${config.maxAttempts}`, inline: true },
            { name: '📊 Daily Limit', value: `${config.maxDailyAttempts} per user`, inline: true },
            { name: '👨‍💼 Manual Review', value: config.requireManualReview ? 'Yes' : 'No', inline: true },

            { name: '🧠 Advanced Features', value: '─────────────────', inline: false },
            { name: '💡 Smart Captcha', value: config.enableSmartCaptcha ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '🔍 Pattern Detection', value: config.enablePatternDetection ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '📝 Comprehensive Logging', value: config.logVerifications ? '✅ Enabled' : '❌ Disabled', inline: true },

            { name: '📊 Live Statistics', value: '─────────────────', inline: false },
            { name: '⏳ Active Sessions', value: `${stats.pendingVerifications}`, inline: true },
            { name: '✅ Successful', value: `${stats.successfulVerifications}`, inline: true },
            { name: '❌ Failed', value: `${stats.failedVerifications}`, inline: true },
            { name: '🚨 Suspicious', value: `${stats.suspiciousAttempts || 0}`, inline: true },
            { name: '⏱️ Avg Time', value: `${Math.round((stats.averageCompletionTime || 0) / 1000)}s`, inline: true },
            { name: '📈 Success Rate', value: `${calculateSuccessRate(stats)}%`, inline: true }
        )
        .setThumbnail(interaction.guild.iconURL())
        .setFooter({
            text: 'Enhanced Captcha Security System v2.0',
            iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

    // Add role and channel information
    await addRoleChannelInfo(statusEmbed, config, interaction.guild);

    await interaction.editReply({ embeds: [statusEmbed] });
}

/**
 * Handle analytics display
 */
async function handleAnalytics(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const client = interaction.client;
    const { getEnhancedCaptchaStats } = require('../components/captchaSystem');
    const stats = getEnhancedCaptchaStats(client);

    const analyticsEmbed = new EmbedBuilder()
        .setColor('#4A90E2')
        .setTitle('📊 Enhanced Captcha Analytics')
        .setDescription('Detailed verification analytics and insights')
        .addFields(
            { name: '📈 Overall Performance', value: '─────────────────', inline: false },
            { name: '📊 Total Verifications', value: `${stats.totalAttempts || 0}`, inline: true },
            { name: '✅ Success Rate', value: `${calculateSuccessRate(stats)}%`, inline: true },
            { name: '⏱️ Average Time', value: `${Math.round((stats.averageCompletionTime || 0) / 1000)}s`, inline: true },

            { name: '🔍 Security Insights', value: '─────────────────', inline: false },
            { name: '🚨 Suspicious Activities', value: `${stats.suspiciousAttempts || 0}`, inline: true },
            { name: '🛡️ Blocked Attempts', value: `${stats.blockedAttempts || 0}`, inline: true },
            { name: '🧠 Pattern Detections', value: `${stats.patternDetections || 0}`, inline: true }
        )
        .setFooter({ text: 'Data updated in real-time' })
        .setTimestamp();

    // Add daily statistics if available
    if (stats.dailyStats && Object.keys(stats.dailyStats).length > 0) {
        const today = new Date().toDateString();
        const todayStats = stats.dailyStats[today];

        if (todayStats) {
            analyticsEmbed.addFields(
                { name: '📅 Today\'s Activity', value: '─────────────────', inline: false },
                { name: '🎯 Attempts Today', value: `${todayStats.attempts}`, inline: true },
                { name: '✅ Successful Today', value: `${todayStats.successful}`, inline: true },
                { name: '❌ Failed Today', value: `${todayStats.failed}`, inline: true },
                { name: '🚨 Suspicious Today', value: `${todayStats.suspicious}`, inline: true }
            );
        }
    }

    await interaction.editReply({ embeds: [analyticsEmbed] });
}

/**
 * Handle enhanced test
 */
async function handleEnhancedTest(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const client = interaction.client;
    const testType = interaction.options.getString('type') || 'image';

    if (!client.captchaConfig) {
        return await interaction.editReply({
            content: '❌ Enhanced captcha system is not setup. Please run `/captcha setup` first.'
        });
    }

    try {
        let captchaData;
        const { generateCaptcha, generateMathCaptcha } = require('../components/captchaGenerator');
        const { AttachmentBuilder } = require('discord.js');

        switch (testType) {
            case 'math':
                captchaData = generateMathCaptcha('simple');
                break;
            case 'enhanced_math':
                captchaData = generateMathCaptcha('enhanced');
                break;
            default:
                captchaData = await generateCaptcha(client.captchaConfig.difficulty);
                break;
        }

        const testEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🧪 Enhanced Captcha Test')
            .setDescription(`**Test Results for ${testType.toUpperCase()} captcha**\n\nDifficulty: **${client.captchaConfig.difficulty}**`)
            .addFields(
                { name: '🔑 Answer', value: `||${captchaData.answer}||`, inline: true },
                { name: '📊 Type', value: captchaData.type || testType, inline: true },
                { name: '⏰ Generated', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setFooter({
                text: 'This is a test captcha for administrators only',
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();

        if (captchaData.question) {
            testEmbed.addFields({ name: '❓ Question', value: captchaData.question, inline: false });
        }

        const messageOptions = { embeds: [testEmbed] };

        if (captchaData.buffer) {
            const attachment = new AttachmentBuilder(captchaData.buffer, { name: 'test_captcha.png' });
            messageOptions.files = [attachment];
            testEmbed.setImage('attachment://test_captcha.png');
        }

        await interaction.editReply(messageOptions);

    } catch (error) {
        console.error('❌ Error generating enhanced test captcha:', error);
        await interaction.editReply({
            content: '❌ Failed to generate test captcha. Please check the console for details.'
        });
    }
}

/**
 * Handle enhanced reset
 */
async function handleEnhancedReset(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const client = interaction.client;
    const includDaily = interaction.options.getBoolean('include-daily') || false;

    if (!client.captchaStats) {
        client.captchaStats = {
            totalVerifications: 0,
            successfulVerifications: 0,
            failedVerifications: 0,
            pendingVerifications: 0,
            totalAttempts: 0,
            suspiciousAttempts: 0,
            averageCompletionTime: 0,
            dailyStats: {}
        };
    }

    // Reset main statistics
    const oldStats = { ...client.captchaStats };
    client.captchaStats.totalVerifications = 0;
    client.captchaStats.successfulVerifications = 0;
    client.captchaStats.failedVerifications = 0;
    client.captchaStats.totalAttempts = 0;
    client.captchaStats.suspiciousAttempts = 0;
    client.captchaStats.averageCompletionTime = 0;

    if (includDaily) {
        client.captchaStats.dailyStats = {};
    }

    const resetEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔄 Enhanced Statistics Reset Complete')
        .setDescription('Captcha verification statistics have been reset.')
        .addFields(
            { name: '📊 Previous Stats', value: 
                `✅ Successful: ${oldStats.successfulVerifications}\n` +
                `❌ Failed: ${oldStats.failedVerifications}\n` +
                `🚨 Suspicious: ${oldStats.suspiciousAttempts || 0}`, inline: true },
            { name: '🆕 Current Stats', value: 'All counters reset to 0', inline: true },
            { name: '📅 Daily Stats', value: includDaily ? 'Also reset' : 'Preserved', inline: true },
            { name: '⏳ Note', value: 'Active verification sessions were not affected', inline: false }
        )
        .setFooter({ text: 'Statistics reset completed' })
        .setTimestamp();

    await interaction.editReply({ embeds: [resetEmbed] });
}

// Helper functions
async function saveConfig(config) {
    try {
        const configDir = path.join(__dirname, '../config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        const configPath = path.join(configDir, 'captcha_config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Failed to save enhanced captcha config:', error);
    }
}

function calculateSuccessRate(stats) {
    const total = (stats.successfulVerifications || 0) + (stats.failedVerifications || 0);
    if (total === 0) return 0;
    return Math.round(((stats.successfulVerifications || 0) / total) * 100);
}

async function addRoleChannelInfo(embed, config, guild) {
    const roleChannelFields = [];

    if (config.verificationChannelId) {
        const channel = guild.channels.cache.get(config.verificationChannelId);
        roleChannelFields.push({ name: '📢 Verification Channel', value: channel ? `${channel}` : '❌ Not Found', inline: true });
    }

    if (config.unverifiedRoleId) {
        const role = guild.roles.cache.get(config.unverifiedRoleId);
        roleChannelFields.push({ name: '🚫 Unverified Role', value: role ? `${role}` : '❌ Not Found', inline: true });
    }

    if (config.verifiedRoleId) {
        const role = guild.roles.cache.get(config.verifiedRoleId);
        roleChannelFields.push({ name: '✅ Verified Role', value: role ? `${role}` : '❌ Not Found', inline: true });
    }

    if (roleChannelFields.length > 0) {
        embed.addFields({ name: '🏷️ Roles & Channels', value: '─────────────────', inline: false }, ...roleChannelFields);
    }
}

// Implement remaining handlers with placeholder functionality
async function handleEnable(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.client.captchaConfig) {
        return await interaction.editReply({
            content: '❌ Captcha system is not setup. Please run `/captcha setup` first.'
        });
    }

    if (interaction.client.captchaConfig.enabled) {
        return await interaction.editReply({
            content: '⚠️ Enhanced captcha system is already enabled.'
        });
    }

    interaction.client.captchaConfig.enabled = true;
    await saveConfig(interaction.client.captchaConfig);

    const enableEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Enhanced Captcha System Enabled')
        .setDescription('The enhanced captcha verification system is now active with advanced security features.')
        .setTimestamp();

    await interaction.editReply({ embeds: [enableEmbed] });
}

async function handleDisable(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.client.captchaConfig) {
        return await interaction.editReply({
            content: '❌ Captcha system is not setup.'
        });
    }

    if (!interaction.client.captchaConfig.enabled) {
        return await interaction.editReply({
            content: '⚠️ Enhanced captcha system is already disabled.'
        });
    }

    interaction.client.captchaConfig.enabled = false;
    await saveConfig(interaction.client.captchaConfig);

    const disableEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🔴 Enhanced Captcha System Disabled')
        .setDescription('The enhanced captcha verification system has been disabled. New members will not require verification.')
        .setTimestamp();

    await interaction.editReply({ embeds: [disableEmbed] });
}

async function handleEnhancedPermissions(interaction) {
    // Implementation similar to original but with enhanced checks
    await interaction.reply({ content: 'Enhanced permissions check - implementation pending', ephemeral: true });
}

async function handleManualCleanup(interaction) {
    // Manual cleanup implementation
    await interaction.reply({ content: 'Manual cleanup - implementation pending', ephemeral: true });
}

async function handleExport(interaction) {
    // Export functionality implementation
    await interaction.reply({ content: 'Export functionality - implementation pending', ephemeral: true });
}