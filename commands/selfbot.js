
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits,
    StringSelectMenuBuilder 
} = require('discord.js');

const { getSelfbotConfig, updateSelfbotConfig, setSelfbotMonitoring, manageSelfbotWhitelist, performSelfbotScan, getSelfbotAnalytics } = require('../utils/selfbotDetection');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('selfbot')
        .setDescription('Advanced selfbot detection and management system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View current selfbot detection status and statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('scan')
                .setDescription('Scan for potential selfbots')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Specific user to scan (optional)')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('deep_scan')
                        .setDescription('Perform deep analysis')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('monitor')
                .setDescription('Configure selfbot monitoring settings')
                .addStringOption(option =>
                    option.setName('mode')
                        .setDescription('Monitoring mode')
                        .setRequired(true)
                        .addChoices(
                            { name: '🔍 Passive Monitoring', value: 'passive' },
                            { name: '🚨 Active Detection', value: 'active' },
                            { name: '⚡ Real-time Alerts', value: 'realtime' },
                            { name: '❌ Disable Monitoring', value: 'disable' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Manage selfbot detection whitelist')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Whitelist action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add User', value: 'add' },
                            { name: 'Remove User', value: 'remove' },
                            { name: 'View List', value: 'view' },
                            { name: 'Clear All', value: 'clear' }
                        ))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to add/remove from whitelist')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configure selfbot detection settings')
                .addIntegerOption(option =>
                    option.setName('sensitivity')
                        .setDescription('Detection sensitivity (1-10)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10))
                .addBooleanOption(option =>
                    option.setName('auto_action')
                        .setDescription('Enable automatic actions on detection')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('punishment')
                        .setDescription('Default punishment for detected selfbots')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Warning Only', value: 'warn' },
                            { name: 'Timeout (1 hour)', value: 'timeout_1h' },
                            { name: 'Timeout (24 hours)', value: 'timeout_24h' },
                            { name: 'Kick', value: 'kick' },
                            { name: 'Ban', value: 'ban' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('analytics')
                .setDescription('View selfbot detection analytics and reports')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'status':
                await handleSelfbotStatus(interaction);
                break;
            case 'scan':
                await handleSelfbotScan(interaction);
                break;
            case 'monitor':
                await handleSelfbotMonitor(interaction);
                break;
            case 'whitelist':
                await handleSelfbotWhitelist(interaction);
                break;
            case 'config':
                await handleSelfbotConfig(interaction);
                break;
            case 'analytics':
                await handleSelfbotAnalytics(interaction);
                break;
        }
    }
};

async function handleSelfbotStatus(interaction) {
    try {
        const config = await getSelfbotConfig(interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setTitle('🤖 Selfbot Detection Status')
            .setColor(config.enabled ? '#00FF00' : '#FF0000')
            .addFields(
                { name: '📊 Status', value: config.enabled ? '✅ Active' : '❌ Disabled', inline: true },
                { name: '🎯 Mode', value: config.mode || 'passive', inline: true },
                { name: '⚡ Sensitivity', value: `${config.sensitivity}/10`, inline: true },
                { name: '🤖 Auto Actions', value: config.autoAction ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: '⚠️ Default Punishment', value: config.defaultPunishment || 'warn', inline: true },
                { name: '📋 Whitelisted Users', value: `${config.whitelist?.length || 0} users`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error in handleSelfbotStatus:', error);
        await interaction.reply({ content: '❌ Error retrieving selfbot status.', ephemeral: true });
    }
}

async function handleSelfbotScan(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });
        
        const user = interaction.options.getUser('user');
        const deepScan = interaction.options.getBoolean('deep_scan') || false;
        
        const results = await performSelfbotScan(interaction.guild, user, deepScan);
        
        if (results.error) {
            return await interaction.editReply({ content: `❌ Error: ${results.error}` });
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🔍 Selfbot Scan Results')
            .setColor('#4A90E2')
            .setTimestamp();
            
        if (user) {
            // Single user scan
            embed.addFields(
                { name: '👤 Target User', value: `${user.tag} (${user.id})`, inline: false },
                { name: '⚠️ Risk Level', value: results.riskLevel || 'Unknown', inline: true },
                { name: '📊 Risk Score', value: `${results.riskScore || 0}/100`, inline: true },
                { name: '🎯 Confidence', value: `${results.confidence || 0}%`, inline: true }
            );
            
            if (results.factors && results.factors.length > 0) {
                embed.addFields({ name: '🔍 Detection Factors', value: results.factors.join('\n'), inline: false });
            }
            
            if (results.recommendations && results.recommendations.length > 0) {
                embed.addFields({ name: '💡 Recommendations', value: results.recommendations.join('\n'), inline: false });
            }
        } else {
            // Server-wide scan
            embed.addFields(
                { name: '📊 Total Scanned', value: `${results.totalScanned || 0} members`, inline: true },
                { name: '⚠️ Suspicious Users', value: `${results.suspiciousUsers || 0}`, inline: true },
                { name: '🚨 High Risk', value: `${results.highRisk || 0}`, inline: true }
            );
        }
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error in handleSelfbotScan:', error);
        await interaction.editReply({ content: '❌ Error performing selfbot scan.' });
    }
}

async function handleSelfbotMonitor(interaction) {
    try {
        const mode = interaction.options.getString('mode');
        
        const result = await setSelfbotMonitoring(interaction.guild.id, mode);
        
        const embed = new EmbedBuilder()
            .setTitle('🔧 Selfbot Monitoring Updated')
            .setDescription(`Monitoring mode set to: **${mode}**`)
            .setColor('#00FF00')
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error in handleSelfbotMonitor:', error);
        await interaction.reply({ content: '❌ Error updating monitoring settings.', ephemeral: true });
    }
}

async function handleSelfbotWhitelist(interaction) {
    try {
        const action = interaction.options.getString('action');
        const user = interaction.options.getUser('user');
        
        const result = await manageSelfbotWhitelist(interaction.guild.id, action, user);
        
        const embed = new EmbedBuilder()
            .setTitle('📋 Selfbot Whitelist Updated')
            .setDescription(result.message)
            .setColor(result.success ? '#00FF00' : '#FF0000')
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error in handleSelfbotWhitelist:', error);
        await interaction.reply({ content: '❌ Error managing whitelist.', ephemeral: true });
    }
}

async function handleSelfbotConfig(interaction) {
    try {
        const sensitivity = interaction.options.getInteger('sensitivity');
        const autoAction = interaction.options.getBoolean('auto_action');
        const punishment = interaction.options.getString('punishment');
        
        const updates = {};
        if (sensitivity !== null) updates.sensitivity = sensitivity;
        if (autoAction !== null) updates.autoAction = autoAction;
        if (punishment !== null) updates.defaultPunishment = punishment;
        
        const config = await updateSelfbotConfig(interaction.guild.id, updates);
        
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Selfbot Configuration Updated')
            .setColor('#00FF00')
            .addFields(
                { name: '⚡ Sensitivity', value: `${config.sensitivity}/10`, inline: true },
                { name: '🤖 Auto Actions', value: config.autoAction ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: '⚠️ Default Punishment', value: config.defaultPunishment, inline: true }
            )
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error in handleSelfbotConfig:', error);
        await interaction.reply({ content: '❌ Error updating configuration.', ephemeral: true });
    }
}

async function handleSelfbotAnalytics(interaction) {
    try {
        const analytics = await getSelfbotAnalytics(interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Selfbot Detection Analytics')
            .setColor('#4A90E2')
            .addFields(
                { name: '🔍 Total Scans', value: `${analytics.totalScans || 0}`, inline: true },
                { name: '🚨 Total Detections', value: `${analytics.totalDetections || 0}`, inline: true },
                { name: '🎯 Accuracy', value: `${analytics.accuracy || 0}%`, inline: true },
                { name: '📈 Recent Scans', value: `${analytics.recentScans || 0}`, inline: true },
                { name: '⚠️ Recent Detections', value: `${analytics.recentDetections || 0}`, inline: true },
                { name: '📊 Daily Average', value: `${analytics.avgDaily || 0}`, inline: true }
            )
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error in handleSelfbotAnalytics:', error);
        await interaction.reply({ content: '❌ Error retrieving analytics.', ephemeral: true });
    }
}
