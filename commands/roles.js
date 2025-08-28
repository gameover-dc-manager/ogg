const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDescription('Role management commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('assign')
                .setDescription('Assign a role to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to assign the role to')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to assign')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to remove the role from')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mute')
                .setDescription('Mute a user in the server')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to mute')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for muting')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration to mute the user (in minutes)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10080))) // 1 week max
        .addSubcommand(subcommand =>
            subcommand
                .setName('unmute')
                .setDescription('Unmute a user in the server')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to unmute')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const { hasAdminPermissions } = require('../utils/adminPermissions');
        
        // Check if user has admin permissions for role management
        if (!await hasAdminPermissions(interaction.member)) {
            return await interaction.reply({
                content: '❌ You need admin permissions to manage roles. Contact a server administrator to get the required role.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'assign':
                await handleAssignRole(interaction);
                break;
            case 'remove':
                await handleRemoveRole(interaction);
                break;
            case 'mute':
                await handleMute(interaction);
                break;
            case 'unmute':
                await handleUnmute(interaction);
                break;
        }
    }
};

async function handleAssignRole(interaction) {
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const member = interaction.guild.members.cache.get(user.id);

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({ content: 'You need the Manage Roles permission to use this command.', flags: 64 });
    }

    if (!member) {
        return interaction.reply({ content: 'User not found in this guild.', flags: 64 });
    }

    if (member.roles.cache.has(role.id)) {
        return interaction.reply({ content: `${user} already has the ${role.name} role.`, flags: 64 });
    }

    try {
        await member.roles.add(role);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Role Assigned')
            .setDescription(`Successfully assigned the **${role.name}** role to ${user}.`)
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error assigning role:', error);
        await interaction.reply({ content: 'An error occurred while assigning the role.', flags: 64 });
    }
}

async function handleRemoveRole(interaction) {
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const member = interaction.guild.members.cache.get(user.id);

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({ content: 'You need the Manage Roles permission to use this command.', flags: 64 });
    }

    if (!member) {
        return interaction.reply({ content: 'User not found in this guild.', flags: 64 });
    }

    if (!member.roles.cache.has(role.id)) {
        return interaction.reply({ content: `${user} doesn't have the ${role.name} role.`, flags: 64 });
    }

    try {
        await member.roles.remove(role);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Role Removed')
            .setDescription(`Successfully removed the **${role.name}** role from ${user}.`)
            .setColor('#FF0000')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error removing role:', error);
        await interaction.reply({ content: 'An error occurred while removing the role.', flags: 64 });
    }
}

async function handleMute(interaction) {
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const member = interaction.guild.members.cache.get(user.id);

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({ content: 'You need the Manage Roles permission to use this command.', flags: 64 });
    }

    if (!member) {
        return interaction.reply({ content: 'User not found in this guild.', flags: 64 });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({ content: 'I don\'t have the required permissions to manage roles.', flags: 64 });
    }

    // Create or get mute role
    let muteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
    if (!muteRole) {
        try {
            muteRole = await interaction.guild.roles.create({
                name: 'Muted',
                permissions: []
            });

            // Apply mute role to all channels
            for (const channel of interaction.guild.channels.cache.values()) {
                if (channel.isTextBased()) {
                    await channel.permissionOverwrites.create(muteRole, {
                        SendMessages: false,
                        AddReactions: false
                    });
                } else if (channel.isVoiceBased()) {
                    await channel.permissionOverwrites.create(muteRole, {
                        Speak: false
                    });
                }
            }
        } catch (error) {
            console.error('Error creating mute role:', error);
            return interaction.reply({ content: 'Error creating mute role.', flags: 64 });
        }
    }

    try {
        await member.roles.add(muteRole);
        
        const embed = new EmbedBuilder()
            .setTitle('🔇 User Muted')
            .setDescription(`${user} has been muted.`)
            .setColor('#FFA500')
            .setTimestamp();

        if (duration) {
            embed.addFields({ name: 'Duration', value: `${duration} minutes`, inline: true });
        }

        await interaction.reply({ embeds: [embed] });

        // Auto-unmute after duration
        if (duration) {
            setTimeout(async () => {
                try {
                    await member.roles.remove(muteRole);
                    await interaction.followUp({ content: `${user} has been unmuted after ${duration} minutes.` });
                } catch (error) {
                    console.error('Error auto-unmuting user:', error);
                }
            }, duration * 60 * 1000);
        }
    } catch (error) {
        console.error('Error muting user:', error);
        await interaction.reply({ content: 'An error occurred while muting the user.', flags: 64 });
    }
}

async function handleUnmute(interaction) {
    const user = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(user.id);

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({ content: 'You need the Manage Roles permission to use this command.', flags: 64 });
    }

    if (!member) {
        return interaction.reply({ content: 'User not found in this guild.', flags: 64 });
    }

    const muteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
    if (!muteRole || !member.roles.cache.has(muteRole.id)) {
        return interaction.reply({ content: `${user} is not muted.`, flags: 64 });
    }

    try {
        await member.roles.remove(muteRole);
        
        const embed = new EmbedBuilder()
            .setTitle('🔊 User Unmuted')
            .setDescription(`${user} has been unmuted.`)
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error unmuting user:', error);
        await interaction.reply({ content: 'An error occurred while unmuting the user.', flags: 64 });
    }
}