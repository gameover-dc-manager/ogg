
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

async function handleServerManagementInteractions(interaction) {
    // Validate interaction before processing
    if (!interaction || !interaction.isRepliable()) {
        console.log('❌ Invalid interaction in server management handler');
        return;
    }

    const customId = interaction.customId;

    try {
        if (customId.startsWith('apply_template_')) {
            await handleApplyTemplate(interaction);
        } else if (customId.startsWith('restore_backup_')) {
            await handleRestoreBackup(interaction);
        } else if (customId === 'cancel_template' || customId === 'cancel_backup') {
            await handleCancel(interaction);
        } else if (customId === 'analytics_detailed') {
            await handleDetailedAnalytics(interaction);
        } else if (customId === 'analytics_export') {
            await handleExportAnalytics(interaction);
        }
    } catch (error) {
        console.error('Error in server management handler:', error);
        
        // Only try to respond if we haven't already
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '❌ An error occurred while processing this interaction.',
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Failed to send error reply in handler:', replyError);
            }
        }
    }
}

async function handleApplyTemplate(interaction) {
    if (!interaction.isRepliable()) {
        console.log('❌ Invalid interaction in handleApplyTemplate');
        return;
    }

    try {
        await interaction.deferUpdate();
    } catch (error) {
        console.error('Error deferring update in handleApplyTemplate:', error);
        return;
    }

    const templateName = interaction.customId.replace('apply_template_', '');
    const templatesPath = path.join(__dirname, '../config/channel_templates.json');

    try {
        const data = await fs.readFile(templatesPath, 'utf8');
        const templates = JSON.parse(data);
        const template = templates[interaction.guild.id]?.[templateName];

        if (!template) {
            return await interaction.editReply({
                content: '❌ Template not found!',
                components: []
            });
        }

        let createdCategories = 0;
        let createdChannels = 0;
        const categoryMap = new Map();

        // Create categories first
        for (const categoryData of template.categories) {
            try {
                const category = await interaction.guild.channels.create({
                    name: categoryData.name,
                    type: ChannelType.GuildCategory,
                    position: categoryData.position
                });

                categoryMap.set(categoryData.name, category);
                createdCategories++;

                // Apply permissions
                for (const perm of categoryData.permissions) {
                    try {
                        await category.permissionOverwrites.create(perm.id, {
                            allow: perm.allow,
                            deny: perm.deny
                        });
                    } catch (permError) {
                        console.error('Error applying category permissions:', permError);
                    }
                }
            } catch (error) {
                console.error('Error creating category:', error);
            }
        }

        // Create channels
        for (const channelData of template.channels) {
            try {
                const parent = channelData.parent ? categoryMap.get(channelData.parent) : null;

                const channelOptions = {
                    name: channelData.name,
                    type: channelData.type,
                    parent: parent,
                    position: channelData.position
                };

                // Add channel-specific properties
                if (channelData.topic) channelOptions.topic = channelData.topic;
                if (channelData.nsfw !== undefined) channelOptions.nsfw = channelData.nsfw;
                if (channelData.bitrate) channelOptions.bitrate = channelData.bitrate;
                if (channelData.userLimit) channelOptions.userLimit = channelData.userLimit;
                if (channelData.rateLimitPerUser) channelOptions.rateLimitPerUser = channelData.rateLimitPerUser;

                const channel = await interaction.guild.channels.create(channelOptions);
                createdChannels++;

                // Apply permissions
                for (const perm of channelData.permissions) {
                    try {
                        await channel.permissionOverwrites.create(perm.id, {
                            allow: perm.allow,
                            deny: perm.deny
                        });
                    } catch (permError) {
                        console.error('Error applying channel permissions:', permError);
                    }
                }
            } catch (error) {
                console.error('Error creating channel:', error);
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Template Applied Successfully')
            .setDescription(`Template **${templateName}** has been applied to the server`)
            .addFields(
                { name: '📊 Results', value: `**Categories Created:** ${createdCategories}/${template.totalCategories}\n**Channels Created:** ${createdChannels}/${template.totalChannels}`, inline: true },
                { name: '⏰ Completion Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });

    } catch (error) {
        console.error('Error applying template:', error);
        await interaction.editReply({
            content: '❌ Failed to apply template. Please check my permissions.',
            components: []
        });
    }
}

async function handleRestoreBackup(interaction) {
    await interaction.deferUpdate();

    const backupName = interaction.customId.replace('restore_backup_', '');
    const backupsPath = path.join(__dirname, '../config/server_backups.json');

    try {
        const data = await fs.readFile(backupsPath, 'utf8');
        const backups = JSON.parse(data);
        const backup = backups[interaction.guild.id]?.[backupName];

        if (!backup) {
            return await interaction.editReply({
                content: '❌ Backup not found!',
                components: []
            });
        }

        // Note: Full server restoration would be very destructive
        // This implementation focuses on safe restoration elements
        
        let restoredRoles = 0;
        let restoredChannels = 0;

        // Restore roles (only create missing ones, don't delete existing)
        for (const roleData of backup.roles) {
            const existingRole = interaction.guild.roles.cache.find(r => r.name === roleData.name);
            if (!existingRole) {
                try {
                    await interaction.guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        hoist: roleData.hoist,
                        mentionable: roleData.mentionable,
                        permissions: roleData.permissions,
                        reason: `Restored from backup: ${backupName}`
                    });
                    restoredRoles++;
                } catch (error) {
                    console.error('Error restoring role:', error);
                }
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Backup Restored')
            .setDescription(`Backup **${backupName}** has been partially restored`)
            .addFields(
                { name: '📊 Restoration Results', value: `**Roles Restored:** ${restoredRoles}\n**Note:** Only missing elements were restored to prevent conflicts`, inline: false },
                { name: '⚠️ Safe Restoration', value: 'This restoration only adds missing elements and does not remove existing ones for safety', inline: false }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });

    } catch (error) {
        console.error('Error restoring backup:', error);
        await interaction.editReply({
            content: '❌ Failed to restore backup.',
            components: []
        });
    }
}

async function handleCancel(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('❌ Operation Cancelled')
        .setDescription('The operation has been cancelled.')
        .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
}

async function handleDetailedAnalytics(interaction) {
    if (!interaction.isRepliable()) {
        console.log('❌ Invalid interaction in handleDetailedAnalytics');
        return;
    }

    try {
        await interaction.deferUpdate();
    } catch (error) {
        console.error('Error deferring update in handleDetailedAnalytics:', error);
        return;
    }

    const guild = interaction.guild;
    const members = guild.members.cache;
    const channels = guild.channels.cache;
    const roles = guild.roles.cache;

    // Advanced analytics calculations
    const membersByJoinDate = Array.from(members.values()).sort((a, b) => a.joinedAt - b.joinedAt);
    const membersByStatus = {
        online: members.filter(m => m.presence?.status === 'online').size,
        idle: members.filter(m => m.presence?.status === 'idle').size,
        dnd: members.filter(m => m.presence?.status === 'dnd').size,
        offline: members.filter(m => !m.presence || m.presence.status === 'offline').size
    };

    const channelsByType = {
        text: channels.filter(ch => ch.type === ChannelType.GuildText).size,
        voice: channels.filter(ch => ch.type === ChannelType.GuildVoice).size,
        category: channels.filter(ch => ch.type === ChannelType.GuildCategory).size,
        forum: channels.filter(ch => ch.type === ChannelType.GuildForum).size,
        stage: channels.filter(ch => ch.type === ChannelType.GuildStageVoice).size
    };

    const roleDistribution = {
        hoisted: roles.filter(r => r.hoist).size,
        managed: roles.filter(r => r.managed).size,
        mentionable: roles.filter(r => r.mentionable).size,
        admin: roles.filter(r => r.permissions.has('Administrator')).size
    };

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📊 Detailed Server Analytics Report')
        .setDescription(`Comprehensive analytics for **${guild.name}**`)
        .addFields(
            {
                name: '👥 Member Status Distribution',
                value: `🟢 Online: ${membersByStatus.online}\n🟡 Idle: ${membersByStatus.idle}\n🔴 DND: ${membersByStatus.dnd}\n⚫ Offline: ${membersByStatus.offline}`,
                inline: true
            },
            {
                name: '📱 Channel Type Breakdown',
                value: `💬 Text: ${channelsByType.text}\n🔊 Voice: ${channelsByType.voice}\n📁 Categories: ${channelsByType.category}\n📋 Forum: ${channelsByType.forum}\n🎪 Stage: ${channelsByType.stage}`,
                inline: true
            },
            {
                name: '🎭 Role Analysis',
                value: `📌 Hoisted: ${roleDistribution.hoisted}\n🤖 Managed: ${roleDistribution.managed}\n📢 Mentionable: ${roleDistribution.mentionable}\n👑 Admin: ${roleDistribution.admin}`,
                inline: true
            },
            {
                name: '📈 Growth Pattern',
                value: `**First Member:** <t:${Math.floor(membersByJoinDate[0]?.joinedTimestamp / 1000)}:D>\n**Newest Member:** <t:${Math.floor(membersByJoinDate[membersByJoinDate.length - 1]?.joinedTimestamp / 1000)}:R>\n**Average Joins/Day:** ${(members.size / Math.max(1, (Date.now() - guild.createdTimestamp) / (1000 * 60 * 60 * 24))).toFixed(2)}`,
                inline: false
            },
            {
                name: '⚡ Server Vitals',
                value: `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n**Owner:** <@${guild.ownerId}>\n**Boost Tier:** ${guild.premiumTier}/3 (${guild.premiumSubscriptionCount || 0} boosts)\n**Features:** ${guild.features.join(', ') || 'None'}`,
                inline: false
            }
        )
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setFooter({ text: `Detailed Report • Generated at ${new Date().toLocaleString()}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleExportAnalytics(interaction) {
    if (!interaction.isRepliable()) {
        console.log('❌ Invalid interaction in handleExportAnalytics');
        return;
    }

    try {
        await interaction.deferUpdate();
    } catch (error) {
        console.error('Error deferring update in handleExportAnalytics:', error);
        return;
    }

    const guild = interaction.guild;
    const analyticsData = {
        guildName: guild.name,
        guildId: guild.id,
        exportDate: new Date().toISOString(),
        exportedBy: interaction.user.id,
        
        summary: {
            totalMembers: guild.memberCount,
            totalChannels: guild.channels.cache.size,
            totalRoles: guild.roles.cache.size,
            boostTier: guild.premiumTier,
            premiumSubscriptions: guild.premiumSubscriptionCount
        },
        
        members: {
            total: guild.memberCount,
            bots: guild.members.cache.filter(m => m.user.bot).size,
            humans: guild.members.cache.filter(m => !m.user.bot).size,
            online: guild.members.cache.filter(m => m.presence?.status !== 'offline').size
        },
        
        channels: {
            text: guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).size,
            voice: guild.channels.cache.filter(ch => ch.type === ChannelType.GuildVoice).size,
            categories: guild.channels.cache.filter(ch => ch.type === ChannelType.GuildCategory).size,
            total: guild.channels.cache.size
        },
        
        roles: {
            total: guild.roles.cache.size,
            hoisted: guild.roles.cache.filter(r => r.hoist).size,
            managed: guild.roles.cache.filter(r => r.managed).size,
            mentionable: guild.roles.cache.filter(r => r.mentionable).size
        }
    };

    const dataString = JSON.stringify(analyticsData, null, 2);
    const buffer = Buffer.from(dataString, 'utf8');

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('📄 Analytics Export Ready')
        .setDescription('Your server analytics data has been exported as a JSON file.')
        .addFields(
            { name: '📊 Export Contains', value: '• Member statistics\n• Channel breakdown\n• Role analysis\n• Server overview', inline: true },
            { name: '📅 Export Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    await interaction.editReply({
        embeds: [embed],
        files: [{
            attachment: buffer,
            name: `${guild.name}_analytics_${Date.now()}.json`
        }]
    });
}

module.exports = {
    handleServerManagementInteractions
};
