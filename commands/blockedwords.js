const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '../config');
const blockedWordsFile = path.join(configDir, 'blocked_words.json');

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

// Default configuration
const defaultConfig = {
    enabled: true,
    auto_warn: true,
    auto_escalation: true,
    blocked_words: [
        "fuck", "shit", "spam", "hate", "toxic"
    ],
    whitelist: [],
    severity_levels: {
        minor: ["spam"],
        moderate: ["fuck", "shit", "hate", "toxic"],
        severe: []
    },
    escalation_thresholds: {
        warn: 1,
        timeout: 3,
        kick: 5,
        ban: 7
    },
    bypass_admins: true,
    log_violations: true
};

function loadBlockedWordsConfig() {
    try {
        if (!fs.existsSync(blockedWordsFile)) {
            saveBlockedWordsConfig(defaultConfig);
            return defaultConfig;
        }
        const data = fs.readFileSync(blockedWordsFile, 'utf8');
        return { ...defaultConfig, ...JSON.parse(data) };
    } catch (error) {
        console.error('❌ Error loading blocked words config:', error);
        return defaultConfig;
    }
}

function saveBlockedWordsConfig(config) {
    try {
        fs.writeFileSync(blockedWordsFile, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving blocked words config:', error);
        return false;
    }
}

function getSeverityLevel(word, config) {
    if (!config.severity_levels) return 'minor';

    if (config.severity_levels.severe && config.severity_levels.severe.includes(word)) return 'severe';
    if (config.severity_levels.moderate && config.severity_levels.moderate.includes(word)) return 'moderate';
    return 'minor';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blockedwords')
        .setDescription('Manage blocked words system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a blocked word')
                .addStringOption(option =>
                    option
                        .setName('word')
                        .setDescription('Word to block')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('severity')
                        .setDescription('Severity level')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Minor', value: 'minor' },
                            { name: 'Moderate', value: 'moderate' },
                            { name: 'Severe', value: 'severe' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a blocked word')
                .addStringOption(option =>
                    option
                        .setName('word')
                        .setDescription('Word to unblock')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Manage whitelist')
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' },
                            { name: 'List', value: 'list' }
                        ))
                .addStringOption(option =>
                    option
                        .setName('word')
                        .setDescription('Word to whitelist/remove from whitelist')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all blocked words'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configure blocked words system')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('Enable/disable the system')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option
                        .setName('auto_warn')
                        .setDescription('Automatically warn users')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option
                        .setName('auto_escalation')
                        .setDescription('Enable auto escalation')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Show blocked words system status')),

    async execute(interaction) {
        const { hasAdminPermissions } = require('../utils/adminPermissions');

        // Check if user has admin permissions
        if (!await hasAdminPermissions(interaction.member)) {
            return await interaction.reply({
                content: '❌ You need admin permissions to manage blocked words. Contact a server administrator to get the required role.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const config = loadBlockedWordsConfig();

        try {
            switch (subcommand) {
                case 'add': {
                    const word = interaction.options.getString('word').toLowerCase();
                    const severity = interaction.options.getString('severity') || 'minor';

                    if (config.blocked_words.includes(word)) {
                        return await interaction.reply({
                            content: `❌ **Error**: Word "${word}" is already blocked.`,
                            ephemeral: true
                        });
                    }

                    config.blocked_words.push(word);
                    if (!config.severity_levels[severity]) {
                        config.severity_levels[severity] = [];
                    }
                    if (!config.severity_levels[severity].includes(word)) {
                        config.severity_levels[severity].push(word);
                    }

                    saveBlockedWordsConfig(config);

                    const embed = new EmbedBuilder()
                        .setTitle('✅ Word Blocked')
                        .setDescription(`Successfully added "${word}" to blocked words list.`)
                        .addFields(
                            { name: 'Severity', value: severity.charAt(0).toUpperCase() + severity.slice(1), inline: true },
                            { name: 'Total Blocked Words', value: config.blocked_words.length.toString(), inline: true }
                        )
                        .setColor('#00FF00')
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                    break;
                }

                case 'remove': {
                    const word = interaction.options.getString('word').toLowerCase();

                    if (!config.blocked_words.includes(word)) {
                        return await interaction.reply({
                            content: `❌ **Error**: Word "${word}" is not in the blocked words list.`,
                            ephemeral: true
                        });
                    }

                    config.blocked_words = config.blocked_words.filter(w => w !== word);

                    // Remove from severity levels
                    Object.keys(config.severity_levels).forEach(severity => {
                        config.severity_levels[severity] = config.severity_levels[severity].filter(w => w !== word);
                    });

                    saveBlockedWordsConfig(config);

                    const embed = new EmbedBuilder()
                        .setTitle('✅ Word Unblocked')
                        .setDescription(`Successfully removed "${word}" from blocked words list.`)
                        .addFields(
                            { name: 'Remaining Blocked Words', value: config.blocked_words.length.toString(), inline: true }
                        )
                        .setColor('#00FF00')
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                    break;
                }

                case 'whitelist': {
                    const action = interaction.options.getString('action');
                    const word = interaction.options.getString('word');

                    if (action === 'list') {
                        const embed = new EmbedBuilder()
                            .setTitle('📋 Whitelist')
                            .setDescription(config.whitelist.length > 0
                                ? config.whitelist.map((w, i) => `${i + 1}. ${w}`).join('\n')
                                : 'No words in whitelist.')
                            .setColor('#0099FF')
                            .setTimestamp();

                        return await interaction.reply({ embeds: [embed] });
                    }

                    if (!word) {
                        return await interaction.reply({
                            content: '❌ **Error**: Please provide a word for this action.',
                            ephemeral: true
                        });
                    }

                    const lowerWord = word.toLowerCase();

                    if (action === 'add') {
                        if (config.whitelist.includes(lowerWord)) {
                            return await interaction.reply({
                                content: `❌ **Error**: Word "${word}" is already whitelisted.`,
                                ephemeral: true
                            });
                        }

                        config.whitelist.push(lowerWord);
                        saveBlockedWordsConfig(config);

                        const embed = new EmbedBuilder()
                            .setTitle('✅ Word Whitelisted')
                            .setDescription(`Successfully added "${word}" to whitelist.`)
                            .addFields(
                                { name: 'Total Whitelisted Words', value: config.whitelist.length.toString(), inline: true }
                            )
                            .setColor('#00FF00')
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embed] });

                    } else if (action === 'remove') {
                        if (!config.whitelist.includes(lowerWord)) {
                            return await interaction.reply({
                                content: `❌ **Error**: Word "${word}" is not in the whitelist.`,
                                ephemeral: true
                            });
                        }

                        config.whitelist = config.whitelist.filter(w => w !== lowerWord);
                        saveBlockedWordsConfig(config);

                        const embed = new EmbedBuilder()
                            .setTitle('✅ Word Removed from Whitelist')
                            .setDescription(`Successfully removed "${word}" from whitelist.`)
                            .addFields(
                                { name: 'Remaining Whitelisted Words', value: config.whitelist.length.toString(), inline: true }
                            )
                            .setColor('#00FF00')
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embed] });
                    }
                    break;
                }

                case 'list': {
                    const embed = new EmbedBuilder()
                        .setTitle('📋 Blocked Words List')
                        .setColor('#0099FF')
                        .setTimestamp();

                    if (config.blocked_words.length === 0) {
                        embed.setDescription('No blocked words configured.');
                    } else {
                        const severityGroups = {};

                        config.blocked_words.forEach(word => {
                            const severity = getSeverityLevel(word, config);
                            if (!severityGroups[severity]) severityGroups[severity] = [];
                            severityGroups[severity].push(word);
                        });

                        Object.entries(severityGroups).forEach(([severity, words]) => {
                            const severityEmoji = {
                                minor: '🟡',
                                moderate: '🟠',
                                severe: '🔴'
                            };

                            embed.addFields({
                                name: `${severityEmoji[severity]} ${severity.charAt(0).toUpperCase() + severity.slice(1)} (${words.length})`,
                                value: words.join(', ') || 'None',
                                inline: false
                            });
                        });
                    }

                    embed.addFields(
                        { name: 'Total Blocked', value: config.blocked_words.length.toString(), inline: true },
                        { name: 'Whitelisted', value: config.whitelist.length.toString(), inline: true },
                        { name: 'System Status', value: config.enabled ? '✅ Enabled' : '❌ Disabled', inline: true }
                    );

                    await interaction.editReply({ embeds: [embed] });
                    break;
                }

                case 'config': {
                    const enabled = interaction.options.getBoolean('enabled');
                    const autoWarn = interaction.options.getBoolean('auto_warn');
                    const autoEscalation = interaction.options.getBoolean('auto_escalation');

                    let changes = [];

                    if (enabled !== null) {
                        config.enabled = enabled;
                        changes.push(`System: ${enabled ? 'Enabled' : 'Disabled'}`);
                    }

                    if (autoWarn !== null) {
                        config.auto_warn = autoWarn;
                        changes.push(`Auto Warn: ${autoWarn ? 'Enabled' : 'Disabled'}`);
                    }

                    if (autoEscalation !== null) {
                        config.auto_escalation = autoEscalation;
                        changes.push(`Auto Escalation: ${autoEscalation ? 'Enabled' : 'Disabled'}`);
                    }

                    if (changes.length === 0) {
                        return await interaction.reply({
                            content: '❌ **Error**: No configuration changes specified.',
                            ephemeral: true
                        });
                    }

                    saveBlockedWordsConfig(config);

                    const embed = new EmbedBuilder()
                        .setTitle('✅ Configuration Updated')
                        .setDescription('Blocked words system configuration has been updated.')
                        .addFields(
                            { name: 'Changes Made', value: changes.join('\n'), inline: false }
                        )
                        .setColor('#00FF00')
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                    break;
                }

                case 'status': {
                    const embed = new EmbedBuilder()
                        .setTitle('📊 Blocked Words System Status')
                        .setColor(config.enabled ? '#00FF00' : '#FF0000')
                        .setTimestamp()
                        .addFields(
                            { name: 'System Status', value: config.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                            { name: 'Auto Warn', value: config.auto_warn ? '✅ Enabled' : '❌ Disabled', inline: true },
                            { name: 'Auto Escalation', value: config.auto_escalation ? '✅ Enabled' : '❌ Disabled', inline: true },
                            { name: 'Blocked Words', value: config.blocked_words.length.toString(), inline: true },
                            { name: 'Whitelisted Words', value: config.whitelist.length.toString(), inline: true },
                            { name: 'Admin Bypass', value: config.bypass_admins ? '✅ Enabled' : '❌ Disabled', inline: true }
                        )
                        .addFields(
                            { name: 'Escalation Thresholds', value: `Warn: ${config.escalation_thresholds.warn}\nTimeout: ${config.escalation_thresholds.timeout}\nKick: ${config.escalation_thresholds.kick}\nBan: ${config.escalation_thresholds.ban}`, inline: false }
                        );

                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }

        } catch (error) {
            console.error('❌ Error in blockedwords command:', error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ **Error**: An unexpected error occurred while processing your command.',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    },

    // Export functions for use by message handlers
    loadBlockedWordsConfig,
    saveBlockedWordsConfig,
    getSeverityLevel
};