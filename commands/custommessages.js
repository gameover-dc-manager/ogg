
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const CUSTOM_MESSAGES_FILE = path.join(__dirname, '..', 'config', 'custom_messages.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('custommessages')
        .setDescription('💬 Manage custom message triggers and auto-responses')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a custom message trigger')
                .addStringOption(option =>
                    option.setName('trigger')
                        .setDescription('Text that triggers the response')
                        .setRequired(true)
                        .setMaxLength(100))
                .addStringOption(option =>
                    option.setName('response')
                        .setDescription('Bot response message')
                        .setRequired(true)
                        .setMaxLength(1000))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Response type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Reply (replies to the message)', value: 'reply' },
                            { name: 'Send (sends in channel)', value: 'send' },
                            { name: 'DM (direct message to user)', value: 'dm' }
                        ))
                .addStringOption(option =>
                    option.setName('match_type')
                        .setDescription('How to match the trigger')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Contains (anywhere in message)', value: 'contains' },
                            { name: 'Exact (entire message)', value: 'exact' },
                            { name: 'Starts With', value: 'starts' },
                            { name: 'Ends With', value: 'ends' }
                        ))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Specific channel (leave empty for all channels)')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('cooldown')
                        .setDescription('Cooldown in seconds (0 = no cooldown)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(3600)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a custom message trigger')
                .addStringOption(option =>
                    option.setName('trigger_id')
                        .setDescription('ID of the trigger to remove')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all custom message triggers'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable/disable custom messages in this server')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable custom messages')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Test a custom message trigger')
                .addStringOption(option =>
                    option.setName('trigger_id')
                        .setDescription('ID of the trigger to test')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return await interaction.reply({
                    content: '❌ **Access Denied**: You need the "Manage Messages" permission to use custom message commands.',
                    ephemeral: true
                });
            }

            switch (subcommand) {
                case 'add':
                    await handleAdd(interaction);
                    break;
                case 'remove':
                    await handleRemove(interaction);
                    break;
                case 'list':
                    await handleList(interaction);
                    break;
                case 'toggle':
                    await handleToggle(interaction);
                    break;
                case 'test':
                    await handleTest(interaction);
                    break;
                default:
                    await interaction.reply({ 
                        content: '❌ **Error**: Unknown subcommand.',
                        ephemeral: true
                    });
            }

        } catch (error) {
            console.error('❌ Error in custommessages command:', error);

            const errorMessage = '❌ **System Error**: Something went wrong while processing your custom message request.';

            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                } else if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage });
                }
            } catch (replyError) {
                console.error('Failed to send custommessages error message:', replyError);
            }
        }
    },

    async autocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === 'trigger_id') {
                const data = await loadCustomMessages();
                const guildTriggers = data[interaction.guild.id] || {};

                if (!guildTriggers.triggers) {
                    return await interaction.respond([]);
                }

                const choices = guildTriggers.triggers.map((trigger, index) => ({
                    name: `${trigger.trigger} → ${trigger.response.substring(0, 50)}${trigger.response.length > 50 ? '...' : ''}`,
                    value: index.toString()
                }));

                const filtered = choices.filter(choice => 
                    choice.name.toLowerCase().includes(focusedOption.value.toLowerCase())
                ).slice(0, 25);

                await interaction.respond(filtered);
            }
        } catch (error) {
            console.error('Error in custommessages autocomplete:', error);
            await interaction.respond([]);
        }
    },
};

async function loadCustomMessages() {
    try {
        const data = await fs.readFile(CUSTOM_MESSAGES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const defaultData = {};
            await saveCustomMessages(defaultData);
            return defaultData;
        }
        throw error;
    }
}

async function saveCustomMessages(data) {
    try {
        const configDir = path.dirname(CUSTOM_MESSAGES_FILE);
        await fs.mkdir(configDir, { recursive: true });
        await fs.writeFile(CUSTOM_MESSAGES_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving custom messages:', error);
        throw error;
    }
}

async function handleAdd(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const trigger = interaction.options.getString('trigger').toLowerCase().trim();
    const response = interaction.options.getString('response').trim();
    const type = interaction.options.getString('type');
    const matchType = interaction.options.getString('match_type') || 'contains';
    const channel = interaction.options.getChannel('channel');
    const cooldown = interaction.options.getInteger('cooldown') || 0;

    if (trigger.length < 1) {
        return await interaction.editReply({ 
            content: '❌ **Error**: Trigger must be at least 1 character long.' 
        });
    }

    if (response.length < 1) {
        return await interaction.editReply({ 
            content: '❌ **Error**: Response must be at least 1 character long.' 
        });
    }

    const data = await loadCustomMessages();
    if (!data[interaction.guild.id]) {
        data[interaction.guild.id] = {
            enabled: true,
            triggers: []
        };
    }

    // Check for duplicate triggers
    const existingTrigger = data[interaction.guild.id].triggers.find(t => 
        t.trigger === trigger && t.matchType === matchType && t.channelId === (channel?.id || null)
    );

    if (existingTrigger) {
        return await interaction.editReply({ 
            content: '❌ **Error**: A trigger with the same text, match type, and channel already exists.' 
        });
    }

    // Add new trigger
    const newTrigger = {
        trigger: trigger,
        response: response,
        type: type,
        matchType: matchType,
        channelId: channel?.id || null,
        cooldown: cooldown,
        createdBy: interaction.user.id,
        createdAt: Date.now(),
        uses: 0,
        lastUsed: {}
    };

    data[interaction.guild.id].triggers.push(newTrigger);
    await saveCustomMessages(data);

    const embed = new EmbedBuilder()
        .setTitle('✅ Custom Message Added!')
        .setDescription('Successfully created a new custom message trigger')
        .addFields(
            { name: '🔤 Trigger', value: `\`${trigger}\``, inline: true },
            { name: '💬 Response Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
            { name: '🎯 Match Type', value: matchType.charAt(0).toUpperCase() + matchType.slice(1), inline: true },
            { name: '📍 Channel', value: channel ? channel.toString() : 'All channels', inline: true },
            { name: '⏱️ Cooldown', value: cooldown > 0 ? `${cooldown} seconds` : 'None', inline: true },
            { name: '🆔 Trigger ID', value: `${data[interaction.guild.id].triggers.length - 1}`, inline: true },
            { name: '📝 Response Preview', value: response.length > 100 ? response.substring(0, 100) + '...' : response, inline: false }
        )
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleRemove(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const triggerId = parseInt(interaction.options.getString('trigger_id'));
    const data = await loadCustomMessages();
    const guildData = data[interaction.guild.id];

    if (!guildData || !guildData.triggers || !guildData.triggers[triggerId]) {
        return await interaction.editReply({ 
            content: '❌ **Error**: Trigger not found.' 
        });
    }

    const removedTrigger = guildData.triggers[triggerId];
    guildData.triggers.splice(triggerId, 1);
    await saveCustomMessages(data);

    const embed = new EmbedBuilder()
        .setTitle('🗑️ Custom Message Removed')
        .setDescription('Successfully removed the custom message trigger')
        .addFields(
            { name: '🔤 Trigger', value: `\`${removedTrigger.trigger}\``, inline: true },
            { name: '💬 Type', value: removedTrigger.type, inline: true },
            { name: '📊 Uses', value: removedTrigger.uses.toString(), inline: true }
        )
        .setColor('#FF6B6B')
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleList(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const data = await loadCustomMessages();
    const guildData = data[interaction.guild.id];

    if (!guildData || !guildData.triggers || guildData.triggers.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('📋 No Custom Messages')
            .setDescription('No custom message triggers have been set up for this server.\n\n🚀 **Get Started:**\nUse `/custommessages add` to create your first trigger!')
            .setColor('#FFA500')
            .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
        .setTitle('💬 Custom Message Triggers')
        .setDescription(`**Status:** ${guildData.enabled ? '✅ Enabled' : '❌ Disabled'}\n**Total Triggers:** ${guildData.triggers.length}`)
        .setColor('#5865F2')
        .setTimestamp();

    guildData.triggers.forEach((trigger, index) => {
        const channel = trigger.channelId ? 
            interaction.guild.channels.cache.get(trigger.channelId) : null;
        
        embed.addFields({
            name: `🆔 ${index} - "${trigger.trigger}"`,
            value: [
                `**Response:** ${trigger.response.length > 50 ? trigger.response.substring(0, 50) + '...' : trigger.response}`,
                `**Type:** ${trigger.type} | **Match:** ${trigger.matchType}`,
                `**Channel:** ${channel ? channel.toString() : 'All channels'}`,
                `**Cooldown:** ${trigger.cooldown > 0 ? `${trigger.cooldown}s` : 'None'} | **Uses:** ${trigger.uses}`
            ].join('\n'),
            inline: true
        });
    });

    await interaction.editReply({ embeds: [embed] });
}

async function handleToggle(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const enabled = interaction.options.getBoolean('enabled');
    const data = await loadCustomMessages();

    if (!data[interaction.guild.id]) {
        data[interaction.guild.id] = {
            enabled: enabled,
            triggers: []
        };
    } else {
        data[interaction.guild.id].enabled = enabled;
    }

    await saveCustomMessages(data);

    const embed = new EmbedBuilder()
        .setTitle(`💬 Custom Messages ${enabled ? 'Enabled' : 'Disabled'}`)
        .setDescription(`Custom message system has been **${enabled ? 'enabled' : 'disabled'}** for this server.`)
        .setColor(enabled ? '#00FF00' : '#FF6B6B')
        .setTimestamp();

    if (enabled && data[interaction.guild.id].triggers.length === 0) {
        embed.addFields({
            name: '💡 Next Steps',
            value: 'Use `/custommessages add` to create your first custom message trigger!',
            inline: false
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleTest(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const triggerId = parseInt(interaction.options.getString('trigger_id'));
    const data = await loadCustomMessages();
    const guildData = data[interaction.guild.id];

    if (!guildData || !guildData.triggers || !guildData.triggers[triggerId]) {
        return await interaction.editReply({ 
            content: '❌ **Error**: Trigger not found.' 
        });
    }

    const trigger = guildData.triggers[triggerId];

    const embed = new EmbedBuilder()
        .setTitle('🧪 Test Results')
        .setDescription(`Testing trigger: \`${trigger.trigger}\``)
        .addFields(
            { name: '📝 Response', value: trigger.response, inline: false },
            { name: '💬 Type', value: trigger.type, inline: true },
            { name: '🎯 Match Type', value: trigger.matchType, inline: true },
            { name: '⏱️ Cooldown', value: trigger.cooldown > 0 ? `${trigger.cooldown}s` : 'None', inline: true }
        )
        .setColor('#FFA500')
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Simulate the trigger response
    if (trigger.type === 'reply') {
        await interaction.followUp({ content: `**Test Reply:** ${trigger.response}` });
    } else if (trigger.type === 'send') {
        await interaction.followUp({ content: `**Test Message:** ${trigger.response}` });
    } else if (trigger.type === 'dm') {
        await interaction.followUp({ content: `**Test DM:** Would send "${trigger.response}" to user's DMs` });
    }
}

// Export the process function for use in messageCreate event
module.exports.processCustomMessages = async function(message) {
    if (message.author.bot || !message.guild) return;

    try {
        const data = await loadCustomMessages();
        const guildData = data[message.guild.id];

        if (!guildData || !guildData.enabled || !guildData.triggers) return;

        const content = message.content.toLowerCase();

        for (const trigger of guildData.triggers) {
            // Check channel restriction
            if (trigger.channelId && trigger.channelId !== message.channel.id) {
                continue;
            }

            // Check cooldown
            if (trigger.cooldown > 0) {
                const lastUsed = trigger.lastUsed[message.author.id] || 0;
                const timeLeft = (lastUsed + (trigger.cooldown * 1000)) - Date.now();
                if (timeLeft > 0) {
                    continue;
                }
            }

            let shouldRespond = false;

            switch (trigger.matchType) {
                case 'contains':
                    shouldRespond = content.includes(trigger.trigger);
                    break;
                case 'exact':
                    shouldRespond = content === trigger.trigger;
                    break;
                case 'starts':
                    shouldRespond = content.startsWith(trigger.trigger);
                    break;
                case 'ends':
                    shouldRespond = content.endsWith(trigger.trigger);
                    break;
            }

            if (shouldRespond) {
                try {
                    // Process response with variables
                    let response = trigger.response
                        .replace(/{user}/g, message.author.toString())
                        .replace(/{username}/g, message.author.username)
                        .replace(/{server}/g, message.guild.name)
                        .replace(/{channel}/g, message.channel.toString());

                    // Send response based on type
                    if (trigger.type === 'reply') {
                        await message.reply(response);
                    } else if (trigger.type === 'send') {
                        await message.channel.send(response);
                    } else if (trigger.type === 'dm') {
                        try {
                            await message.author.send(response);
                        } catch (dmError) {
                            console.log(`Could not DM user ${message.author.tag}`);
                        }
                    }

                    // Update usage stats
                    trigger.uses++;
                    if (trigger.cooldown > 0) {
                        trigger.lastUsed[message.author.id] = Date.now();
                    }
                    await saveCustomMessages(data);

                } catch (error) {
                    console.error(`Error sending custom message response:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Error processing custom messages:', error);
    }
};
