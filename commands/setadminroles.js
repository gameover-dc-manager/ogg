
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setadminroles')
        .setDescription('Set roles that can use admin commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a role to admin permissions')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to give admin command access')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role from admin permissions')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to remove admin command access')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all roles with admin permissions'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all admin roles (only server owner can use this)'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const adminRolesPath = path.join(__dirname, '../config/admin_roles.json');

        // Load existing admin roles
        let adminRoles = {};
        try {
            const data = await fs.readFile(adminRolesPath, 'utf8');
            adminRoles = JSON.parse(data);
        } catch (error) {
            adminRoles = {};
        }

        if (!adminRoles[interaction.guild.id]) {
            adminRoles[interaction.guild.id] = [];
        }

        switch (subcommand) {
            case 'add':
                await handleAddRole(interaction, adminRoles, adminRolesPath);
                break;
            case 'remove':
                await handleRemoveRole(interaction, adminRoles, adminRolesPath);
                break;
            case 'list':
                await handleListRoles(interaction, adminRoles);
                break;
            case 'clear':
                await handleClearRoles(interaction, adminRoles, adminRolesPath);
                break;
        }
    },
};

async function handleAddRole(interaction, adminRoles, adminRolesPath) {
    const role = interaction.options.getRole('role');
    const guildRoles = adminRoles[interaction.guild.id];

    if (guildRoles.includes(role.id)) {
        return await interaction.reply({
            content: `❌ The role **${role.name}** already has admin command permissions.`,
            ephemeral: true
        });
    }

    guildRoles.push(role.id);
    await fs.writeFile(adminRolesPath, JSON.stringify(adminRoles, null, 2));

    const embed = new EmbedBuilder()
        .setTitle('✅ Admin Role Added')
        .setDescription(`Added **${role.name}** to admin command permissions.`)
        .addFields(
            { name: 'Role', value: `${role}`, inline: true },
            { name: 'Members with this role', value: role.members.size.toString(), inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleRemoveRole(interaction, adminRoles, adminRolesPath) {
    const role = interaction.options.getRole('role');
    const guildRoles = adminRoles[interaction.guild.id];

    const index = guildRoles.indexOf(role.id);
    if (index === -1) {
        return await interaction.reply({
            content: `❌ The role **${role.name}** doesn't have admin command permissions.`,
            ephemeral: true
        });
    }

    guildRoles.splice(index, 1);
    await fs.writeFile(adminRolesPath, JSON.stringify(adminRoles, null, 2));

    const embed = new EmbedBuilder()
        .setTitle('✅ Admin Role Removed')
        .setDescription(`Removed **${role.name}** from admin command permissions.`)
        .addFields(
            { name: 'Role', value: `${role}`, inline: true },
            { name: 'Remaining admin roles', value: guildRoles.length.toString(), inline: true }
        )
        .setColor('#FF6B6B')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleListRoles(interaction, adminRoles) {
    const guildRoles = adminRoles[interaction.guild.id];

    if (guildRoles.length === 0) {
        return await interaction.reply({
            content: '❌ No roles have been granted admin command permissions.\nUse `/setadminroles add` to add roles.',
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('🛡️ Admin Command Roles')
        .setDescription('Roles that can use admin commands:')
        .setColor('#5865F2')
        .setTimestamp();

    let rolesText = '';
    for (const roleId of guildRoles) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (role) {
            rolesText += `• ${role} (${role.members.size} members)\n`;
        } else {
            rolesText += `• Unknown Role (${roleId}) - Role deleted\n`;
        }
    }

    embed.addFields({ name: 'Authorized Roles', value: rolesText || 'None', inline: false });

    await interaction.reply({ embeds: [embed] });
}

async function handleClearRoles(interaction, adminRoles, adminRolesPath) {
    // Only server owner can clear all admin roles
    if (interaction.user.id !== interaction.guild.ownerId) {
        return await interaction.reply({
            content: '❌ Only the server owner can clear all admin roles.',
            ephemeral: true
        });
    }

    const roleCount = adminRoles[interaction.guild.id].length;
    adminRoles[interaction.guild.id] = [];
    await fs.writeFile(adminRolesPath, JSON.stringify(adminRoles, null, 2));

    const embed = new EmbedBuilder()
        .setTitle('🧹 Admin Roles Cleared')
        .setDescription(`Cleared **${roleCount}** admin roles. Only users with Administrator permission can now use admin commands.`)
        .setColor('#FFA500')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
