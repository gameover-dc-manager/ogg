
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const customCommandsPath = path.join(__dirname, '../config/custom_commands.json');

async function loadCustomCommands() {
    try {
        const data = await fs.readFile(customCommandsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

async function saveCustomCommands(data) {
    await fs.writeFile(customCommandsPath, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('customcommands')
        .setDescription('Manage custom commands for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new custom command')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Command name (without prefix)')
                        .setRequired(true)
                        .setMaxLength(32))
                .addStringOption(option =>
                    option.setName('response')
                        .setDescription('Command response text')
                        .setRequired(true)
                        .setMaxLength(2000))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Command description')
                        .setRequired(false)
                        .setMaxLength(100))
                .addBooleanOption(option =>
                    option.setName('embed')
                        .setDescription('Send response as embed')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Embed color (hex code like #FF0000)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('permissions')
                        .setDescription('Required permissions to use command')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Everyone', value: 'everyone' },
                            { name: 'Manage Messages', value: 'manage_messages' },
                            { name: 'Manage Channels', value: 'manage_channels' },
                            { name: 'Manage Guild', value: 'manage_guild' },
                            { name: 'Administrator', value: 'administrator' }
                        ))
                .addStringOption(option =>
                    option.setName('command_type')
                        .setDescription('How the command can be triggered')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Both Prefix & Slash', value: 'both' },
                            { name: 'Prefix Only (!command)', value: 'prefix' },
                            { name: 'Slash Only (/command)', value: 'slash' }
                        ))
                .addStringOption(option =>
                    option.setName('prefix')
                        .setDescription('Custom prefix for this command (default: !)')
                        .setRequired(false)
                        .setMaxLength(5)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing custom command')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Command name to edit')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a custom command')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Command name to delete')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all custom commands in this server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get information about a custom command')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Command name')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable/disable a custom command')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Command name')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable the command')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('variables')
                .setDescription('Show available variables for custom commands')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await handleCreate(interaction);
                break;
            case 'edit':
                await handleEdit(interaction);
                break;
            case 'delete':
                await handleDelete(interaction);
                break;
            case 'list':
                await handleList(interaction);
                break;
            case 'info':
                await handleInfo(interaction);
                break;
            case 'toggle':
                await handleToggle(interaction);
                break;
            case 'variables':
                await handleVariables(interaction);
                break;
        }
    },

    async autocomplete(interaction) {
        const data = await loadCustomCommands();
        const guildCommands = data[interaction.guild.id] || {};
        
        const focusedValue = interaction.options.getFocused();
        const choices = Object.keys(guildCommands).filter(choice => 
            choice.toLowerCase().includes(focusedValue.toLowerCase())
        );

        await interaction.respond(
            choices.slice(0, 25).map(choice => ({ name: choice, value: choice }))
        );
    }
};

async function handleCreate(interaction) {
    // Check if interaction is already acknowledged
    if (interaction.replied || interaction.deferred) {
        return await interaction.followUp({
            content: '❌ This interaction has already been processed.',
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    const commandName = interaction.options.getString('name').toLowerCase();
    const response = interaction.options.getString('response');
    const description = interaction.options.getString('description') || 'Custom command';
    const useEmbed = interaction.options.getBoolean('embed') || false;
    const color = interaction.options.getString('color') || '#0099FF';
    const permissions = interaction.options.getString('permissions') || 'everyone';
    const commandType = interaction.options.getString('command_type') || 'both';
    const customPrefix = interaction.options.getString('prefix') || '!';

    // Validate command name
    if (!/^[a-z0-9_-]+$/.test(commandName)) {
        return await interaction.editReply({
            content: '❌ **Invalid command name**: Only lowercase letters, numbers, hyphens, and underscores are allowed.'
        });
    }

    // Validate color if provided
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return await interaction.editReply({
            content: '❌ **Invalid color**: Please use hex format like #FF0000'
        });
    }

    const data = await loadCustomCommands();
    if (!data[interaction.guild.id]) {
        data[interaction.guild.id] = {};
    }

    // Check if command already exists
    if (data[interaction.guild.id][commandName]) {
        return await interaction.editReply({
            content: `❌ **Command already exists**: \`${commandName}\` already exists. Use \`/customcommands edit\` to modify it.`
        });
    }

    // Create the custom command
    data[interaction.guild.id][commandName] = {
        name: commandName,
        response: response,
        description: description,
        useEmbed: useEmbed,
        color: color,
        permissions: permissions,
        commandType: commandType,
        prefix: customPrefix,
        enabled: true,
        createdBy: interaction.user.id,
        createdAt: Date.now(),
        uses: 0
    };

    // Log the custom command creation
    console.log(`[CUSTOM-COMMANDS] Created command "${commandName}" by ${interaction.user.tag} (${interaction.user.id}) in ${interaction.guild.name}`);

    await saveCustomCommands(data);

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Custom Command Created')
        .setDescription(`Successfully created custom command: \`${commandName}\``)
        .addFields(
            { name: '📝 Response', value: response.length > 100 ? response.substring(0, 100) + '...' : response, inline: false },
            { name: '🎨 Style', value: useEmbed ? 'Embed' : 'Plain Text', inline: true },
            { name: '🔐 Permissions', value: permissions.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), inline: true },
            { name: '⚙️ Type', value: commandType === 'both' ? 'Prefix & Slash' : commandType === 'prefix' ? 'Prefix Only' : 'Slash Only', inline: true },
            { name: '🎯 Usage', value: getUsageString(commandName, commandType, customPrefix), inline: false }
        )
        .setFooter({ text: `Created by ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleEdit(interaction) {
    const commandName = interaction.options.getString('name').toLowerCase();
    const data = await loadCustomCommands();
    const guildCommands = data[interaction.guild.id] || {};

    if (!guildCommands[commandName]) {
        return await interaction.reply({
            content: `❌ **Command not found**: \`${commandName}\` doesn't exist.`,
            ephemeral: true
        });
    }

    const command = guildCommands[commandName];

    const modal = new ModalBuilder()
        .setCustomId(`edit_custom_command_${commandName}`)
        .setTitle(`Edit Command: ${commandName}`);

    const responseInput = new TextInputBuilder()
        .setCustomId('response')
        .setLabel('Response Text')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(command.response)
        .setRequired(true)
        .setMaxLength(2000);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Description')
        .setStyle(TextInputStyle.Short)
        .setValue(command.description)
        .setRequired(false)
        .setMaxLength(100);

    const colorInput = new TextInputBuilder()
        .setCustomId('color')
        .setLabel('Embed Color (hex code)')
        .setStyle(TextInputStyle.Short)
        .setValue(command.color)
        .setRequired(false)
        .setMaxLength(7);

    const embedInput = new TextInputBuilder()
        .setCustomId('useEmbed')
        .setLabel('Use Embed (true/false)')
        .setStyle(TextInputStyle.Short)
        .setValue(command.useEmbed.toString())
        .setRequired(false)
        .setMaxLength(5);

    const permissionsInput = new TextInputBuilder()
        .setCustomId('permissions')
        .setLabel('Permissions (everyone, manage_messages, etc.)')
        .setStyle(TextInputStyle.Short)
        .setValue(command.permissions)
        .setRequired(false)
        .setMaxLength(20);

    const firstRow = new ActionRowBuilder().addComponents(responseInput);
    const secondRow = new ActionRowBuilder().addComponents(descriptionInput);
    const thirdRow = new ActionRowBuilder().addComponents(colorInput);
    const fourthRow = new ActionRowBuilder().addComponents(embedInput);
    const fifthRow = new ActionRowBuilder().addComponents(permissionsInput);

    modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

    await interaction.showModal(modal);
}

async function handleDelete(interaction) {
    if (interaction.replied || interaction.deferred) {
        return await interaction.followUp({
            content: '❌ This interaction has already been processed.',
            ephemeral: true
        });
    }
    await interaction.deferReply({ ephemeral: true });

    const commandName = interaction.options.getString('name').toLowerCase();
    const data = await loadCustomCommands();
    const guildCommands = data[interaction.guild.id] || {};

    if (!guildCommands[commandName]) {
        return await interaction.editReply({
            content: `❌ **Command not found**: \`${commandName}\` doesn't exist.`
        });
    }

    delete data[interaction.guild.id][commandName];
    await saveCustomCommands(data);

    const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('🗑️ Custom Command Deleted')
        .setDescription(`Successfully deleted custom command: \`${commandName}\``)
        .setFooter({ text: `Deleted by ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleList(interaction) {
    if (interaction.replied || interaction.deferred) {
        return await interaction.followUp({
            content: '❌ This interaction has already been processed.',
            ephemeral: true
        });
    }
    await interaction.deferReply({ ephemeral: true });

    const data = await loadCustomCommands();
    const guildCommands = data[interaction.guild.id] || {};
    const commands = Object.values(guildCommands);

    if (commands.length === 0) {
        return await interaction.editReply({
            content: '📭 **No custom commands**: This server has no custom commands yet. Use `/customcommands create` to make one!'
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(`📋 Custom Commands (${commands.length})`)
        .setDescription(`Here are all custom commands for **${interaction.guild.name}**:`)
        .setFooter({ text: `Use /customcommands info <name> for detailed information` })
        .setTimestamp();

    let description = '';
    commands.slice(0, 25).forEach(cmd => {
        const status = cmd.enabled ? '✅' : '❌';
        const uses = cmd.uses || 0;
        description += `${status} \`${cmd.name}\` - ${cmd.description} (${uses} uses)\n`;
    });

    if (description.length > 4096) {
        description = description.substring(0, 4000) + '...\n*And more...*';
    }

    embed.setDescription(description);

    if (commands.length > 25) {
        embed.addFields({
            name: '📊 Summary',
            value: `Showing 25 of ${commands.length} commands`,
            inline: false
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleInfo(interaction) {
    if (interaction.replied || interaction.deferred) {
        return await interaction.followUp({
            content: '❌ This interaction has already been processed.',
            ephemeral: true
        });
    }
    await interaction.deferReply({ ephemeral: true });

    const commandName = interaction.options.getString('name').toLowerCase();
    const data = await loadCustomCommands();
    const guildCommands = data[interaction.guild.id] || {};

    if (!guildCommands[commandName]) {
        return await interaction.editReply({
            content: `❌ **Command not found**: \`${commandName}\` doesn't exist.`
        });
    }

    const command = guildCommands[commandName];
    const creator = await interaction.client.users.fetch(command.createdBy).catch(() => null);

    const embed = new EmbedBuilder()
        .setColor(command.color)
        .setTitle(`ℹ️ Command Info: ${command.name}`)
        .setDescription(command.description)
        .addFields(
            { name: '📝 Response', value: command.response.length > 1000 ? command.response.substring(0, 1000) + '...' : command.response, inline: false },
            { name: '🎨 Style', value: command.useEmbed ? 'Embed' : 'Plain Text', inline: true },
            { name: '🔐 Permissions', value: command.permissions.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), inline: true },
            { name: '📊 Status', value: command.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '📈 Uses', value: (command.uses || 0).toString(), inline: true },
            { name: '👤 Created By', value: creator ? creator.username : 'Unknown User', inline: true },
            { name: '📅 Created', value: `<t:${Math.floor(command.createdAt / 1000)}:R>`, inline: true }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleToggle(interaction) {
    if (interaction.replied || interaction.deferred) {
        return await interaction.followUp({
            content: '❌ This interaction has already been processed.',
            ephemeral: true
        });
    }
    await interaction.deferReply({ ephemeral: true });

    const commandName = interaction.options.getString('name').toLowerCase();
    const enabled = interaction.options.getBoolean('enabled');
    const data = await loadCustomCommands();
    const guildCommands = data[interaction.guild.id] || {};

    if (!guildCommands[commandName]) {
        return await interaction.editReply({
            content: `❌ **Command not found**: \`${commandName}\` doesn't exist.`
        });
    }

    data[interaction.guild.id][commandName].enabled = enabled;
    await saveCustomCommands(data);

    const embed = new EmbedBuilder()
        .setColor(enabled ? '#00FF00' : '#FF6B6B')
        .setTitle(`${enabled ? '✅' : '❌'} Command ${enabled ? 'Enabled' : 'Disabled'}`)
        .setDescription(`Custom command \`${commandName}\` has been **${enabled ? 'enabled' : 'disabled'}**.`)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleVariables(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('📋 Available Variables')
        .setDescription('You can use these variables in your custom command responses:')
        .addFields(
            { name: '👤 User Variables', value: '`{user}` - User mention\n`{username}` - Username\n`{userid}` - User ID\n`{usertag}` - User#0000\n`{usernickname}` - Server nickname', inline: false },
            { name: '🏠 Server Variables', value: '`{server}` - Server name\n`{serverid}` - Server ID\n`{membercount}` - Member count\n`{channelcount}` - Channel count', inline: false },
            { name: '📱 Channel Variables', value: '`{channel}` - Channel mention\n`{channelname}` - Channel name\n`{channelid}` - Channel ID', inline: false },
            { name: '⏰ Time Variables', value: '`{date}` - Current date\n`{time}` - Current time\n`{timestamp}` - Unix timestamp', inline: false },
            { name: '🎲 Random Variables', value: '`{random:1-100}` - Random number\n`{choice:option1,option2,option3}` - Random choice', inline: false }
        )
        .addFields({
            name: '💡 Example Usage',
            value: '```\nWelcome {user} to {server}! You are member #{membercount}.\nToday is {date} and it\'s {time}.\n```',
            inline: false
        })
        .setFooter({ text: 'Variables are case-sensitive and must be wrapped in curly braces {}' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

function getUsageString(commandName, commandType, prefix) {
    switch (commandType) {
        case 'prefix':
            return `Use \`${prefix}${commandName}\``;
        case 'slash':
            return `Use \`/${commandName}\``;
        case 'both':
        default:
            return `Use \`${prefix}${commandName}\` or \`/${commandName}\``;
    }
}

// Export functions for use in other modules
module.exports.loadCustomCommands = loadCustomCommands;
module.exports.saveCustomCommands = saveCustomCommands;
