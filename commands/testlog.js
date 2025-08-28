const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { logAction } = require('../utils/loggingSystem');
const { hasAdminPermission } = require('../utils/adminPermissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testlog')
        .setDescription('Test the logging system with sample events')
        .addStringOption(option =>
            option
                .setName('event')
                .setDescription('Type of event to test')
                .setRequired(true)
                .addChoices(
                    { name: 'Message Edit', value: 'message_edit' },
                    { name: 'Message Delete', value: 'message_delete' },
                    { name: 'Member Join', value: 'member_join' },
                    { name: 'Member Leave', value: 'member_leave' },
                    { name: 'Warning', value: 'warning' },
                    { name: 'Ban', value: 'ban' },
                    { name: 'Kick', value: 'kick' },
                    { name: 'Timeout', value: 'timeout' },
                    { name: 'Voice Join', value: 'voice_join' },
                    { name: 'Voice Leave', value: 'voice_leave' },
                    { name: 'Command Usage', value: 'command_usage' },
                    { name: 'Role Change', value: 'role_change' },
                    { name: 'Channel Change', value: 'channel_change' },
                    { name: 'Admin Action', value: 'admin_action' },
                    { name: 'Automod Action', value: 'automod_action' }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                content: '❌ You need **Manage Server** permission to test logging.',
                ephemeral: true
            });
        }

        const eventType = interaction.options.getString('event');
        const guild = interaction.guild;
        const user = interaction.user;

        // Create sample data based on event type
        let sampleData = getSampleData(eventType, interaction);

        try {
            await interaction.deferReply({ ephemeral: true });
            
            // Test the logging system
            const success = await logAction(guild, eventType, sampleData, user);

            if (success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Test Log Successful')
                    .setDescription(`Successfully tested **${eventType}** logging event`)
                    .addFields(
                        { name: '📋 Event Type', value: eventType, inline: true },
                        { name: '👤 Test User', value: user.tag, inline: true },
                        { name: '📊 Status', value: '✅ Logged', inline: true }
                    )
                    .setColor('#00FF00')
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply({
                    content: '❌ Failed to log test event. Check if logging channel is configured and accessible.'
                });
            }
        } catch (error) {
            console.error('Error testing log:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while testing the logging system.',
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: '❌ An error occurred while testing the logging system.'
                });
            }
        }
    }
};

function getSampleData(eventType, interaction) {
    const user = interaction.user;
    const channel = interaction.channel;
    const guild = interaction.guild;

    const sampleData = {
        message_edit: {
            author: user,
            channel: channel,
            messageId: '1234567890123456789',
            messageUrl: `https://discord.com/channels/${guild.id}/${channel.id}/1234567890123456789`,
            oldContent: 'This is the original message content that was edited.',
            newContent: 'This is the new message content after the edit. Much longer and more detailed!'
        },

        message_delete: {
            author: user,
            channel: channel,
            messageId: '1234567890123456789',
            content: 'This was a deleted message with some content that got removed.',
            attachments: 2,
            createdAt: new Date(Date.now() - 300000).toISOString()
        },

        member_join: {
            member: { 
                user: user,
                joinedAt: new Date(),
                joinedTimestamp: Date.now()
            },
            memberCount: guild.memberCount + 1,
            guild: guild
        },

        member_leave: {
            member: { 
                user: user,
                joinedAt: new Date(Date.now() - 86400000),
                joinedTimestamp: Date.now() - 86400000
            },
            memberCount: guild.memberCount - 1,
            roles: [
                { name: 'Member' },
                { name: 'Active' },
                { name: 'Trusted' }
            ],
            lastMessage: new Date(Date.now() - 3600000).toISOString()
        },

        warning: {
            user: user,
            moderator: interaction.user,
            warningId: 'WARN-001-TEST',
            severity: 'major',
            reason: 'Testing the warning system with a sample violation.',
            expires: Date.now() + 604800000,
            totalWarnings: 2
        },

        ban: {
            user: user,
            moderator: interaction.user,
            reason: 'Test ban for logging system demonstration',
            deleteMessages: 7,
            duration: 'Permanent'
        },

        kick: {
            user: user,
            moderator: interaction.user,
            reason: 'Test kick for logging system demonstration'
        },

        timeout: {
            user: user,
            moderator: interaction.user,
            reason: 'Test timeout for logging system demonstration',
            duration: '1 hour',
            expiresAt: new Date(Date.now() + 3600000).toISOString()
        },

        voice_join: {
            member: { user: user },
            channel: { 
                name: 'General Voice',
                id: '1234567890123456789',
                members: { size: 3 }
            }
        },

        voice_leave: {
            member: { user: user },
            channel: { 
                name: 'General Voice',
                id: '1234567890123456789'
            },
            sessionDuration: 1800000 // 30 minutes
        },

        command_usage: {
            user: user,
            channel: channel,
            channelId: channel.id,
            commandName: 'testlog',
            options: {
                event: eventType
            }
        },

        role_change: {
            role: {
                name: 'Test Role',
                id: '1234567890123456789',
                hexColor: '#FF5733',
                color: 16734003,
                position: 5,
                members: { size: 12 }
            },
            action: 'created',
            moderator: user
        },

        channel_change: {
            channel: {
                name: 'test-channel',
                id: '1234567890123456789',
                type: 'GUILD_TEXT',
                parent: { name: 'Test Category' },
                viewable: true
            },
            action: 'created',
            moderator: user
        },

        admin_action: {
            admin: user,
            action: 'Updated server settings',
            target: 'Server Configuration',
            description: 'Administrator updated server configuration settings',
            details: 'Changed verification level and updated moderation settings'
        },

        automod_action: {
            user: user,
            action: 'Message filtered',
            reason: 'Contains blocked words',
            severity: 'High',
            channel: channel,
            contentRemoved: true
        }
    };

    return sampleData[eventType] || {};
}