const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '../config');
const blockedDomainsFile = path.join(configDir, 'blocked_domains.json');

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

// Default configuration
const defaultConfig = {
    enabled: true,
    auto_warn: true,
    auto_escalation: true,
    blocked_domains: [
        "malware-site.com",
        "phishing-example.com",
        "spam-links.net"
    ],
    whitelist: [
        "discord.com",
        "github.com",
        "google.com",
        "youtube.com",
        "twitter.com",
        "reddit.com"
    ],
    severity_levels: {
        minor: ["spam-links.net"],
        moderate: ["suspicious-site.com"],
        severe: ["malware-site.com", "phishing-example.com"]
    },
    escalation_thresholds: {
        warn: 1,
        timeout: 2,
        kick: 4,
        ban: 6
    },
    bypass_admins: true,
    log_violations: true,
    allowed_channels: [], // Channels where links are always allowed
    delete_messages: true
};

function loadBlockedDomainsConfig() {
    try {
        if (!fs.existsSync(blockedDomainsFile)) {
            saveBlockedDomainsConfig(defaultConfig);
            return defaultConfig;
        }
        const data = fs.readFileSync(blockedDomainsFile, 'utf8');
        return { ...defaultConfig, ...JSON.parse(data) };
    } catch (error) {
        console.error('❌ Error loading blocked domains config:', error);
        return defaultConfig;
    }
}

function saveBlockedDomainsConfig(config) {
    try {
        fs.writeFileSync(blockedDomainsFile, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving blocked domains config:', error);
        return false;
    }
}

function getDomainSeverity(domain, config) {
    for (const [severity, domains] of Object.entries(config.severity_levels)) {
        if (domains.includes(domain.toLowerCase())) {
            return severity;
        }
    }
    return 'minor'; // default
}

function extractDomain(url) {
    try {
        const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
        return urlObj.hostname.toLowerCase();
    } catch (error) {
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blockeddomains')
        .setDescription('Manage blocked domains and links system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a blocked domain')
                .addStringOption(option =>
                    option
                        .setName('domain')
                        .setDescription('Domain to block (e.g., example.com)')
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
                .setDescription('Remove a blocked domain')
                .addStringOption(option =>
                    option
                        .setName('domain')
                        .setDescription('Domain to unblock')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Manage domain whitelist')
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
                        .setName('domain')
                        .setDescription('Domain to whitelist/remove from whitelist')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('channels')
                .setDescription('Manage allowed channels for links')
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
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to add/remove')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all blocked domains'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configure blocked domains system')
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
                        .setName('delete_messages')
                        .setDescription('Delete messages with blocked links')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Show blocked domains system status')),

    async execute(interaction) {
        const { hasAdminPermissions } = require('../utils/adminPermissions');

        // Check if user has admin permissions
        if (!await hasAdminPermissions(interaction.member)) {
            return await interaction.reply({
                content: '❌ You need admin permissions to manage blocked domains. Contact a server administrator to get the required role.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const config = loadBlockedDomainsConfig();

        try {
            switch (subcommand) {
                case 'add': {
                    const domainInput = interaction.options.getString('domain').toLowerCase();
                    const severity = interaction.options.getString('severity') || 'minor';

                    // Extract domain from input (handles URLs)
                    const domain = extractDomain(domainInput) || domainInput;

                    if (config.blocked_domains.includes(domain)) {
                        return await interaction.reply({
                            content: `❌ **Error**: Domain "${domain}" is already blocked.`,
                            ephemeral: true
                        });
                    }

                    config.blocked_domains.push(domain);
                    if (!config.severity_levels[severity].includes(domain)) {
                        config.severity_levels[severity].push(domain);
                    }

                    saveBlockedDomainsConfig(config);

                    const embed = new EmbedBuilder()
                        .setTitle('✅ Domain Blocked')
                        .setDescription(`Successfully added "${domain}" to blocked domains list.`)
                        .addFields(
                            { name: 'Severity', value: severity.charAt(0).toUpperCase() + severity.slice(1), inline: true },
                            { name: 'Total Blocked Domains', value: config.blocked_domains.length.toString(), inline: true }
                        )
                        .setColor('#00FF00')
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                    break;
                }

                case 'remove': {
                    const domainInput = interaction.options.getString('domain').toLowerCase();
                    const domain = extractDomain(domainInput) || domainInput;

                    if (!config.blocked_domains.includes(domain)) {
                        return await interaction.reply({
                            content: `❌ **Error**: Domain "${domain}" is not in the blocked domains list.`,
                            ephemeral: true
                        });
                    }

                    config.blocked_domains = config.blocked_domains.filter(d => d !== domain);

                    // Remove from severity levels
                    Object.keys(config.severity_levels).forEach(severity => {
                        config.severity_levels[severity] = config.severity_levels[severity].filter(d => d !== domain);
                    });

                    saveBlockedDomainsConfig(config);

                    const embed = new EmbedBuilder()
                        .setTitle('✅ Domain Unblocked')
                        .setDescription(`Successfully removed "${domain}" from blocked domains list.`)
                        .addFields(
                            { name: 'Remaining Blocked Domains', value: config.blocked_domains.length.toString(), inline: true }
                        )
                        .setColor('#00FF00')
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                    break;
                }

                case 'whitelist': {
                    const action = interaction.options.getString('action');
                    const domainInput = interaction.options.getString('domain');

                    if (action === 'list') {
                        const embed = new EmbedBuilder()
                            .setTitle('📋 Domain Whitelist')
                            .setDescription(config.whitelist.length > 0 
                                ? config.whitelist.map((d, i) => `${i + 1}. ${d}`).join('\n')
                                : 'No domains in whitelist.')
                            .setColor('#0099FF')
                            .setTimestamp();

                        return await interaction.editReply({ embeds: [embed] });
                    }

                    if (!domainInput) {
                        return await interaction.reply({
                            content: '❌ **Error**: Please provide a domain for this action.',
                            ephemeral: true
                        });
                    }

                    const domain = extractDomain(domainInput.toLowerCase()) || domainInput.toLowerCase();

                    if (action === 'add') {
                        if (config.whitelist.includes(domain)) {
                            return await interaction.reply({
                                content: `❌ **Error**: Domain "${domain}" is already whitelisted.`,
                                ephemeral: true
                            });
                        }

                        config.whitelist.push(domain);
                        saveBlockedDomainsConfig(config);

                        const embed = new EmbedBuilder()
                            .setTitle('✅ Domain Whitelisted')
                            .setDescription(`Successfully added "${domain}" to whitelist.`)
                            .addFields(
                                { name: 'Total Whitelisted Domains', value: config.whitelist.length.toString(), inline: true }
                            )
                            .setColor('#00FF00')
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embed] });

                    } else if (action === 'remove') {
                        if (!config.whitelist.includes(domain)) {
                            return await interaction.reply({
                                content: `❌ **Error**: Domain "${domain}" is not in the whitelist.`,
                                ephemeral: true
                            });
                        }

                        config.whitelist = config.whitelist.filter(d => d !== domain);
                        saveBlockedDomainsConfig(config);

                        const embed = new EmbedBuilder()
                            .setTitle('✅ Domain Removed from Whitelist')
                            .setDescription(`Successfully removed "${domain}" from whitelist.`)
                            .addFields(
                                { name: 'Remaining Whitelisted Domains', value: config.whitelist.length.toString(), inline: true }
                            )
                            .setColor('#00FF00')
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embed] });
                    }
                    break;
                }

                case 'channels': {
                    const action = interaction.options.getString('action');
                    const channel = interaction.options.getChannel('channel');

                    if (action === 'list') {
                        const embed = new EmbedBuilder()
                            .setTitle('📋 Allowed Link Channels')
                            .setColor('#0099FF')
                            .setTimestamp();

                        if (config.allowed_channels.length === 0) {
                            embed.setDescription('No allowed channels configured. Links are restricted in all channels.');
                        } else {
                            const channelList = config.allowed_channels
                                .map((id, i) => `${i + 1}. <#${id}>`)
                                .join('\n');
                            embed.setDescription(channelList);
                        }

                        return await interaction.editReply({ embeds: [embed] });
                    }

                    if (!channel) {
                        return await interaction.reply({
                            content: '❌ **Error**: Please provide a channel for this action.',
                            ephemeral: true
                        });
                    }

                    if (action === 'add') {
                        if (config.allowed_channels.includes(channel.id)) {
                            return await interaction.reply({
                                content: `❌ **Error**: ${channel} is already in the allowed channels list.`,
                                ephemeral: true
                            });
                        }

                        config.allowed_channels.push(channel.id);
                        saveBlockedDomainsConfig(config);

                        const embed = new EmbedBuilder()
                            .setTitle('✅ Channel Added')
                            .setDescription(`Successfully added ${channel} to allowed link channels.`)
                            .addFields(
                                { name: 'Total Allowed Channels', value: config.allowed_channels.length.toString(), inline: true }
                            )
                            .setColor('#00FF00')
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embed] });

                    } else if (action === 'remove') {
                        if (!config.allowed_channels.includes(channel.id)) {
                            return await interaction.reply({
                                content: `❌ **Error**: ${channel} is not in the allowed channels list.`,
                                ephemeral: true
                            });
                        }

                        config.allowed_channels = config.allowed_channels.filter(id => id !== channel.id);
                        saveBlockedDomainsConfig(config);

                        const embed = new EmbedBuilder()
                            .setTitle('✅ Channel Removed')
                            .setDescription(`Successfully removed ${channel} from allowed link channels.`)
                            .addFields(
                                { name: 'Remaining Allowed Channels', value: config.allowed_channels.length.toString(), inline: true }
                            )
                            .setColor('#00FF00')
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embed] });
                    }
                    break;
                }

                case 'list': {
                    const embed = new EmbedBuilder()
                        .setTitle('📋 Blocked Domains List')
                        .setColor('#0099FF')
                        .setTimestamp();

                    if (config.blocked_domains.length === 0) {
                        embed.setDescription('No blocked domains configured.');
                    } else {
                        const severityGroups = {};

                        config.blocked_domains.forEach(domain => {
                            const severity = getDomainSeverity(domain, config);
                            if (!severityGroups[severity]) severityGroups[severity] = [];
                            severityGroups[severity].push(domain);
                        });

                        Object.entries(severityGroups).forEach(([severity, domains]) => {
                            const severityEmoji = {
                                minor: '🟡',
                                moderate: '🟠', 
                                severe: '🔴'
                            };

                            embed.addFields({
                                name: `${severityEmoji[severity]} ${severity.charAt(0).toUpperCase() + severity.slice(1)} (${domains.length})`,
                                value: domains.join(', ') || 'None',
                                inline: false
                            });
                        });
                    }

                    embed.addFields(
                        { name: 'Total Blocked', value: config.blocked_domains.length.toString(), inline: true },
                        { name: 'Whitelisted', value: config.whitelist.length.toString(), inline: true },
                        { name: 'System Status', value: config.enabled ? '✅ Enabled' : '❌ Disabled', inline: true }
                    );

                    await interaction.editReply({ embeds: [embed] });
                    break;
                }

                case 'config': {
                    const enabled = interaction.options.getBoolean('enabled');
                    const autoWarn = interaction.options.getBoolean('auto_warn');
                    const deleteMessages = interaction.options.getBoolean('delete_messages');

                    let changes = [];

                    if (enabled !== null) {
                        config.enabled = enabled;
                        changes.push(`System: ${enabled ? 'Enabled' : 'Disabled'}`);
                    }

                    if (autoWarn !== null) {
                        config.auto_warn = autoWarn;
                        changes.push(`Auto Warn: ${autoWarn ? 'Enabled' : 'Disabled'}`);
                    }

                    if (deleteMessages !== null) {
                        config.delete_messages = deleteMessages;
                        changes.push(`Delete Messages: ${deleteMessages ? 'Enabled' : 'Disabled'}`);
                    }

                    if (changes.length === 0) {
                        return await interaction.reply({
                            content: '❌ **Error**: No configuration changes specified.',
                            ephemeral: true
                        });
                    }

                    saveBlockedDomainsConfig(config);

                    const embed = new EmbedBuilder()
                        .setTitle('✅ Configuration Updated')
                        .setDescription('Blocked domains system configuration has been updated.')
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
                        .setTitle('📊 Blocked Domains System Status')
                        .setColor(config.enabled ? '#00FF00' : '#FF0000')
                        .setTimestamp()
                        .addFields(
                            { name: 'System Status', value: config.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                            { name: 'Auto Warn', value: config.auto_warn ? '✅ Enabled' : '❌ Disabled', inline: true },
                            { name: 'Delete Messages', value: config.delete_messages ? '✅ Enabled' : '❌ Disabled', inline: true },
                            { name: 'Blocked Domains', value: config.blocked_domains.length.toString(), inline: true },
                            { name: 'Whitelisted Domains', value: config.whitelist.length.toString(), inline: true },
                            { name: 'Allowed Channels', value: config.allowed_channels.length.toString(), inline: true }
                        )
                        .addFields(
                            { name: 'Escalation Thresholds', value: `Warn: ${config.escalation_thresholds.warn}\nTimeout: ${config.escalation_thresholds.timeout}\nKick: ${config.escalation_thresholds.kick}\nBan: ${config.escalation_thresholds.ban}`, inline: false }
                        );

                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }

        } catch (error) {
            console.error('❌ Error in blockeddomains command:', error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ **Error**: An unexpected error occurred while processing your command.',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    },

    // Export functions for use by message handlers
    loadBlockedDomainsConfig,
    saveBlockedDomainsConfig,
    getDomainSeverity,
    extractDomain
};