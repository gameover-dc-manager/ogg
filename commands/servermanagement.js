const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servermanagement')
        .setDescription('Advanced server management tools')
        .addSubcommandGroup(group =>
            group
                .setName('templates')
                .setDescription('Channel template management')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('save')
                        .setDescription('Save current channel configuration as template')
                        .addStringOption(option =>
                            option.setName('name')
                                .setDescription('Template name')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('description')
                                .setDescription('Template description')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('apply')
                        .setDescription('Apply a channel template')
                        .addStringOption(option =>
                            option.setName('template')
                                .setDescription('Template to apply')
                                .setRequired(true)
                                .setAutocomplete(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List all saved templates'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('delete')
                        .setDescription('Delete a template')
                        .addStringOption(option =>
                            option.setName('template')
                                .setDescription('Template to delete')
                                .setRequired(true)
                                .setAutocomplete(true))))
        .addSubcommandGroup(group =>
            group
                .setName('roles')
                .setDescription('Advanced role management')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('automation')
                        .setDescription('Set up role automation rules')
                        .addRoleOption(option =>
                            option.setName('role')
                                .setDescription('Role to automate')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('trigger')
                                .setDescription('Automation trigger')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'On Join', value: 'join' },
                                    { name: 'Message Count', value: 'messages' },
                                    { name: 'Voice Time', value: 'voice' },
                                    { name: 'Reaction Count', value: 'reactions' }
                                ))
                        .addIntegerOption(option =>
                            option.setName('threshold')
                                .setDescription('Threshold value for trigger')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('temporary')
                        .setDescription('Create temporary roles')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to give temporary role')
                                .setRequired(true))
                        .addRoleOption(option =>
                            option.setName('role')
                                .setDescription('Role to assign temporarily')
                                .setRequired(true))
                        .addIntegerOption(option =>
                            option.setName('duration')
                                .setDescription('Duration in hours')
                                .setRequired(true)
                                .setMinValue(1)
                                .setMaxValue(168)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('rotation')
                        .setDescription('Set up role rotation schedule')
                        .addRoleOption(option =>
                            option.setName('role')
                                .setDescription('Role to rotate')
                                .setRequired(true))
                        .addIntegerOption(option =>
                            option.setName('interval')
                                .setDescription('Rotation interval in days')
                                .setRequired(true)
                                .setMinValue(1)
                                .setMaxValue(30))))
        .addSubcommandGroup(group =>
            group
                .setName('backup')
                .setDescription('Server backup and restore')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('create')
                        .setDescription('Create server backup')
                        .addStringOption(option =>
                            option.setName('name')
                                .setDescription('Backup name')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('restore')
                        .setDescription('Restore from backup')
                        .addStringOption(option =>
                            option.setName('backup')
                                .setDescription('Backup to restore')
                                .setRequired(true)
                                .setAutocomplete(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List all backups'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('delete')
                        .setDescription('Delete a backup')
                        .addStringOption(option =>
                            option.setName('backup')
                                .setDescription('Backup to delete')
                                .setRequired(true)
                                .setAutocomplete(true))))
        .addSubcommand(subcommand =>
            subcommand
                .setName('analytics')
                .setDescription('View detailed server analytics'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { hasAdminPermissions } = require('../utils/adminPermissions');

        if (!await hasAdminPermissions(interaction.member)) {
            return await interaction.reply({
                content: '❌ You need admin permissions to use server management tools.',
                ephemeral: true
            });
        }

        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommandGroup) {
                case 'templates':
                    await handleTemplateCommands(interaction, subcommand);
                    break;
                case 'roles':
                    await handleRoleCommands(interaction, subcommand);
                    break;
                case 'backup':
                    await handleBackupCommands(interaction, subcommand);
                    break;
                default:
                    if (subcommand === 'analytics') {
                        await handleAnalytics(interaction);
                    }
            }
        } catch (error) {
            console.error('Error in server management command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while executing the command.',
                    ephemeral: true
                });
            }
        }
    },

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const subcommandGroup = interaction.options.getSubcommandGroup();

        if (focusedOption.name === 'template' || focusedOption.name === 'backup') {
            const configPath = path.join(__dirname, `../config/${focusedOption.name === 'template' ? 'channel_templates' : 'server_backups'}.json`);

            try {
                const data = await fs.readFile(configPath, 'utf8');
                const configs = JSON.parse(data);
                const guildConfigs = configs[interaction.guild.id] || {};

                const choices = Object.keys(guildConfigs)
                    .filter(name => name.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .slice(0, 25)
                    .map(name => ({ name, value: name }));

                await interaction.respond(choices);
            } catch (error) {
                await interaction.respond([]);
            }
        }
    }
};

async function handleTemplateCommands(interaction, subcommand) {
    const templatesPath = path.join(__dirname, '../config/channel_templates.json');

    let templates = {};
    try {
        const data = await fs.readFile(templatesPath, 'utf8');
        templates = JSON.parse(data);
    } catch (error) {
        templates = {};
    }

    if (!templates[interaction.guild.id]) {
        templates[interaction.guild.id] = {};
    }

    switch (subcommand) {
        case 'save':
            await saveChannelTemplate(interaction, templates, templatesPath);
            break;
        case 'apply':
            await applyChannelTemplate(interaction, templates);
            break;
        case 'list':
            await listChannelTemplates(interaction, templates);
            break;
        case 'delete':
            await deleteChannelTemplate(interaction, templates, templatesPath);
            break;
    }
}

async function saveChannelTemplate(interaction, templates, templatesPath) {
    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString('name');
    const description = interaction.options.getString('description') || 'No description provided';

    // Capture current server structure
    const channels = [];
    const categories = [];

    for (const [id, channel] of interaction.guild.channels.cache) {
        if (channel.type === ChannelType.GuildCategory) {
            categories.push({
                name: channel.name,
                position: channel.position,
                permissions: channel.permissionOverwrites.cache.map(overwrite => ({
                    id: overwrite.id,
                    type: overwrite.type,
                    allow: overwrite.allow.toArray(),
                    deny: overwrite.deny.toArray()
                }))
            });
        } else {
            channels.push({
                name: channel.name,
                type: channel.type,
                parent: channel.parent?.name || null,
                position: channel.position,
                topic: channel.topic,
                nsfw: channel.nsfw,
                bitrate: channel.bitrate,
                userLimit: channel.userLimit,
                rateLimitPerUser: channel.rateLimitPerUser,
                permissions: channel.permissionOverwrites.cache.map(overwrite => ({
                    id: overwrite.id,
                    type: overwrite.type,
                    allow: overwrite.allow.toArray(),
                    deny: overwrite.deny.toArray()
                }))
            });
        }
    }

    templates[interaction.guild.id][name] = {
        name,
        description,
        createdAt: new Date().toISOString(),
        createdBy: interaction.user.id,
        categories,
        channels,
        totalChannels: channels.length,
        totalCategories: categories.length
    };

    await fs.writeFile(templatesPath, JSON.stringify(templates, null, 2));

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Template Saved')
        .setDescription(`Successfully saved channel template: **${name}**`)
        .addFields(
            { name: '📊 Statistics', value: `**Categories:** ${categories.length}\n**Channels:** ${channels.length}`, inline: true },
            { name: '📝 Description', value: description, inline: true }
        )
        .setTimestamp();

    try {
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error editing reply in saveChannelTemplate:', error);
    }
}

async function applyChannelTemplate(interaction, templates) {
    const templateName = interaction.options.getString('template');
    const template = templates[interaction.guild.id]?.[templateName];

    if (!template) {
        return await interaction.reply({
            content: '❌ Template not found!',
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ Apply Template Confirmation')
        .setDescription(`Are you sure you want to apply template **${templateName}**?\n\n**This will:**\n• Create ${template.totalCategories} categories\n• Create ${template.totalChannels} channels\n• Set up all permissions`)
        .addFields(
            { name: '📋 Template Info', value: `**Created:** <t:${Math.floor(new Date(template.createdAt).getTime() / 1000)}:R>\n**Description:** ${template.description}` }
        )
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`apply_template_${templateName}`)
                .setLabel('Apply Template')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_template')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleRoleCommands(interaction, subcommand) {
    const roleAutomationPath = path.join(__dirname, '../config/role_automation.json');

    switch (subcommand) {
        case 'automation':
            await setupRoleAutomation(interaction, roleAutomationPath);
            break;
        case 'temporary':
            await createTemporaryRole(interaction);
            break;
        case 'rotation':
            await setupRoleRotation(interaction, roleAutomationPath);
            break;
    }
}

async function setupRoleAutomation(interaction, automationPath) {
    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole('role');
    const trigger = interaction.options.getString('trigger');
    const threshold = interaction.options.getInteger('threshold') || 1;

    let automation = {};
    try {
        const data = await fs.readFile(automationPath, 'utf8');
        automation = JSON.parse(data);
    } catch (error) {
        automation = {};
    }

    if (!automation[interaction.guild.id]) {
        automation[interaction.guild.id] = {};
    }

    automation[interaction.guild.id][role.id] = {
        roleId: role.id,
        roleName: role.name,
        trigger,
        threshold,
        createdAt: new Date().toISOString(),
        createdBy: interaction.user.id,
        active: true
    };

    await fs.writeFile(automationPath, JSON.stringify(automation, null, 2));

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🤖 Role Automation Setup')
        .setDescription(`Successfully configured automation for ${role}`)
        .addFields(
            { name: '⚡ Trigger', value: trigger, inline: true },
            { name: '🎯 Threshold', value: threshold.toString(), inline: true },
            { name: '📅 Status', value: 'Active', inline: true }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function createTemporaryRole(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const duration = interaction.options.getInteger('duration');
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) {
        return await interaction.editReply({
            content: '❌ User not found in this server.'
        });
    }

    try {
        await member.roles.add(role);

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⏰ Temporary Role Assigned')
            .setDescription(`${user} has been given the ${role} role for ${duration} hours`)
            .addFields(
                { name: '⏳ Expires', value: `<t:${Math.floor((Date.now() + duration * 60 * 60 * 1000) / 1000)}:R>`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // Schedule role removal
        setTimeout(async () => {
            try {
                const updatedMember = await interaction.guild.members.fetch(user.id);
                if (updatedMember.roles.cache.has(role.id)) {
                    await updatedMember.roles.remove(role);

                    const removalEmbed = new EmbedBuilder()
                        .setColor('#FF6B6B')
                        .setTitle('⏰ Temporary Role Expired')
                        .setDescription(`${user}'s ${role} role has expired and been removed`)
                        .setTimestamp();

                    await interaction.followUp({ embeds: [removalEmbed], ephemeral: true });
                }
            } catch (error) {
                console.error('Error removing temporary role:', error);
            }
        }, duration * 60 * 60 * 1000);

    } catch (error) {
        console.error('Error assigning temporary role:', error);
        await interaction.editReply({
            content: '❌ Failed to assign temporary role. Check my permissions.'
        });
    }
}

async function handleBackupCommands(interaction, subcommand) {
    const backupsPath = path.join(__dirname, '../config/server_backups.json');

    switch (subcommand) {
        case 'create':
            await createServerBackup(interaction, backupsPath);
            break;
        case 'list':
            await listServerBackups(interaction, backupsPath);
            break;
        case 'delete':
            await deleteServerBackup(interaction, backupsPath);
            break;
        case 'restore':
            await showRestoreWarning(interaction, backupsPath);
            break;
    }
}

async function createServerBackup(interaction, backupsPath) {
    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString('name') || `Backup-${Date.now()}`;

    // Create comprehensive backup
    const backup = {
        name,
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        createdAt: new Date().toISOString(),
        createdBy: interaction.user.id,

        // Server settings
        settings: {
            name: interaction.guild.name,
            description: interaction.guild.description,
            icon: interaction.guild.iconURL(),
            verificationLevel: interaction.guild.verificationLevel,
            explicitContentFilter: interaction.guild.explicitContentFilter,
            defaultMessageNotifications: interaction.guild.defaultMessageNotifications
        },

        // Roles
        roles: interaction.guild.roles.cache
            .filter(role => !role.managed && role.id !== interaction.guild.id)
            .map(role => ({
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                mentionable: role.mentionable,
                permissions: role.permissions.toArray(),
                position: role.position
            })),

        // Channels
        channels: interaction.guild.channels.cache.map(channel => ({
            name: channel.name,
            type: channel.type,
            parent: channel.parent?.name || null,
            position: channel.position,
            topic: channel.topic,
            nsfw: channel.nsfw,
            bitrate: channel.bitrate,
            userLimit: channel.userLimit,
            rateLimitPerUser: channel.rateLimitPerUser,
            permissions: channel.permissionOverwrites.cache.map(overwrite => ({
                id: overwrite.id,
                type: overwrite.type,
                allow: overwrite.allow.toArray(),
                deny: overwrite.deny.toArray()
            }))
        })),

        statistics: {
            totalMembers: interaction.guild.memberCount,
            totalRoles: interaction.guild.roles.cache.size,
            totalChannels: interaction.guild.channels.cache.size,
            boostLevel: interaction.guild.premiumTier
        }
    };

    let backups = {};
    try {
        const data = await fs.readFile(backupsPath, 'utf8');
        backups = JSON.parse(data);
    } catch (error) {
        backups = {};
    }

    if (!backups[interaction.guild.id]) {
        backups[interaction.guild.id] = {};
    }

    backups[interaction.guild.id][name] = backup;
    await fs.writeFile(backupsPath, JSON.stringify(backups, null, 2));

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('💾 Backup Created Successfully')
        .setDescription(`Server backup **${name}** has been created`)
        .addFields(
            { name: '📊 Backed Up', value: `**Roles:** ${backup.roles.length}\n**Channels:** ${backup.channels.length}\n**Settings:** Complete`, inline: true },
            { name: '📅 Created', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleAnalytics(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate analytics
    const members = guild.members.cache;
    const channels = guild.channels.cache;
    const roles = guild.roles.cache;

    const newMembersWeek = members.filter(member => member.joinedAt > weekAgo).size;
    const newMembersMonth = members.filter(member => member.joinedAt > monthAgo).size;
    const onlineMembers = members.filter(member => member.presence?.status !== 'offline').size;
    const botsCount = members.filter(member => member.user.bot).size;
    const humansCount = members.size - botsCount;

    const textChannels = channels.filter(ch => ch.type === ChannelType.GuildText).size;
    const voiceChannels = channels.filter(ch => ch.type === ChannelType.GuildVoice).size;
    const categories = channels.filter(ch => ch.type === ChannelType.GuildCategory).size;

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📊 Advanced Server Analytics')
        .setDescription(`Comprehensive analytics for **${guild.name}**`)
        .addFields(
            {
                name: '👥 Member Analytics',
                value: `**Total Members:** ${members.size.toLocaleString()}\n**Humans:** ${humansCount.toLocaleString()}\n**Bots:** ${botsCount}\n**Online:** ${onlineMembers}\n**Growth (7d):** +${newMembersWeek}\n**Growth (30d):** +${newMembersMonth}`,
                inline: true
            },
            {
                name: '📱 Channel Structure',
                value: `**Text Channels:** ${textChannels}\n**Voice Channels:** ${voiceChannels}\n**Categories:** ${categories}\n**Total:** ${channels.size}\n**Avg per Category:** ${categories > 0 ? Math.round((textChannels + voiceChannels) / categories) : 0}`,
                inline: true
            },
            {
                name: '🎭 Role Distribution',
                value: `**Total Roles:** ${roles.size}\n**Hoisted Roles:** ${roles.filter(r => r.hoist).size}\n**Managed Roles:** ${roles.filter(r => r.managed).size}\n**Mentionable:** ${roles.filter(r => r.mentionable).size}`,
                inline: true
            },
            {
                name: '⭐ Server Features',
                value: `**Boost Level:** ${guild.premiumTier}/3\n**Boost Count:** ${guild.premiumSubscriptionCount || 0}\n**Verification:** Level ${guild.verificationLevel}\n**Features:** ${guild.features.length}`,
                inline: true
            },
            {
                name: '📈 Activity Metrics',
                value: `**Engagement Rate:** ${((onlineMembers / members.size) * 100).toFixed(1)}%\n**Bot Ratio:** ${((botsCount / members.size) * 100).toFixed(1)}%\n**Growth Rate:** ${newMembersWeek > 0 ? '+' : ''}${((newMembersWeek / members.size) * 100).toFixed(1)}%/week`,
                inline: true
            },
            {
                name: '🏆 Server Health Score',
                value: calculateHealthScore(guild, members, onlineMembers, newMembersWeek),
                inline: true
            }
        )
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setFooter({ text: `Analytics generated • Server ID: ${guild.id}` })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('analytics_detailed')
                .setLabel('📊 Detailed Report')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('analytics_export')
                .setLabel('📄 Export Data')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({ embeds: [embed], components: [row] });
}

function calculateHealthScore(guild, members, onlineMembers, newMembersWeek) {
    let score = 0;
    let maxScore = 100;

    // Member activity (30 points)
    const activityRate = onlineMembers / members.size;
    score += Math.min(30, activityRate * 30 * 2);

    // Growth rate (25 points)
    const growthRate = newMembersWeek / members.size;
    score += Math.min(25, growthRate * 25 * 10);

    // Server features (25 points)
    score += Math.min(25, (guild.premiumTier * 8) + (guild.features.length * 2));

    // Organization (20 points)
    const hasCategories = guild.channels.cache.some(ch => ch.type === ChannelType.GuildCategory);
    const roleCount = guild.roles.cache.size;
    score += hasCategories ? 10 : 0;
    score += Math.min(10, (roleCount / members.size) * 100);

    const healthScore = Math.min(100, Math.max(0, score)).toFixed(1);
    const healthLevel = healthScore >= 80 ? '🟢 Excellent' : healthScore >= 60 ? '🟡 Good' : healthScore >= 40 ? '🟠 Fair' : '🔴 Needs Attention';

    return `**${healthScore}/100**\n${healthLevel}`;
}

async function listChannelTemplates(interaction, templates) {
    const guildTemplates = templates[interaction.guild.id] || {};

    if (Object.keys(guildTemplates).length === 0) {
        return await interaction.reply({
            content: '📋 No channel templates found. Create one with `/servermanagement templates save`!',
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📋 Channel Templates')
        .setDescription(`Templates saved for **${interaction.guild.name}**`)
        .setTimestamp();

    for (const [name, template] of Object.entries(guildTemplates)) {
        embed.addFields({
            name: `📁 ${name}`,
            value: `**Description:** ${template.description}\n**Channels:** ${template.totalChannels} • **Categories:** ${template.totalCategories}\n**Created:** <t:${Math.floor(new Date(template.createdAt).getTime() / 1000)}:R>`,
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function listServerBackups(interaction, backupsPath) {
    let backups = {};
    try {
        const data = await fs.readFile(backupsPath, 'utf8');
        backups = JSON.parse(data);
    } catch (error) {
        backups = {};
    }

    const guildBackups = backups[interaction.guild.id] || {};

    if (Object.keys(guildBackups).length === 0) {
        return await interaction.reply({
            content: '💾 No backups found. Create one with `/servermanagement backup create`!',
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('💾 Server Backups')
        .setDescription(`Backups for **${interaction.guild.name}**`)
        .setTimestamp();

    for (const [name, backup] of Object.entries(guildBackups)) {
        embed.addFields({
            name: `💿 ${name}`,
            value: `**Created:** <t:${Math.floor(new Date(backup.createdAt).getTime() / 1000)}:R>\n**Roles:** ${backup.roles.length} • **Channels:** ${backup.channels.length}\n**Members at backup:** ${backup.statistics.totalMembers}`,
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}