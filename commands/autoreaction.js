
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const AUTO_REACTIONS_FILE = path.join(__dirname, '..', 'config', 'auto_reactions.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoreaction')
        .setDescription('🤖 Manage automatic reactions and message triggers')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add an auto-reaction trigger')
                .addStringOption(option =>
                    option.setName('trigger')
                        .setDescription('Text that triggers the reaction (case insensitive)')
                        .setRequired(true)
                        .setMaxLength(100))
                .addStringOption(option =>
                    option.setName('reaction')
                        .setDescription('Emoji to react with (use emoji or name)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Trigger type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Contains (word anywhere in message)', value: 'contains' },
                            { name: 'Starts With (message begins with)', value: 'starts' },
                            { name: 'Exact Match (entire message)', value: 'exact' },
                            { name: 'Ends With (message ends with)', value: 'ends' }
                        ))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Specific channel (leave empty for all channels)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove an auto-reaction trigger')
                .addStringOption(option =>
                    option.setName('trigger_id')
                        .setDescription('ID of the trigger to remove')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all auto-reaction triggers'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable/disable auto-reactions in this server')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable auto-reactions')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            // Check permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return await interaction.reply({
                    content: '❌ **Access Denied**: You need the "Manage Messages" permission to use auto-reaction commands.',
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
                default:
                    await interaction.reply({ 
                        content: '❌ **Error**: Unknown subcommand.',
                        ephemeral: true
                    });
            }

        } catch (error) {
            console.error('❌ Error in autoreaction command:', error);

            const errorMessage = '❌ **System Error**: Something went wrong while processing your auto-reaction request.';

            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                } else if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage });
                }
            } catch (replyError) {
                console.error('Failed to send autoreaction error message:', replyError);
            }
        }
    },

    async autocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === 'trigger_id') {
                const data = await loadAutoReactions();
                const guildTriggers = data[interaction.guild.id] || {};

                if (!guildTriggers.triggers) {
                    return await interaction.respond([]);
                }

                const choices = guildTriggers.triggers.map((trigger, index) => ({
                    name: `${trigger.trigger} → ${trigger.reaction} (${trigger.type})`,
                    value: index.toString()
                }));

                const filtered = choices.filter(choice => 
                    choice.name.toLowerCase().includes(focusedOption.value.toLowerCase())
                ).slice(0, 25);

                await interaction.respond(filtered);
            }
        } catch (error) {
            console.error('Error in autoreaction autocomplete:', error);
            await interaction.respond([]);
        }
    },
};

async function loadAutoReactions() {
    try {
        const data = await fs.readFile(AUTO_REACTIONS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const defaultData = {};
            await saveAutoReactions(defaultData);
            return defaultData;
        }
        throw error;
    }
}

async function saveAutoReactions(data) {
    try {
        const configDir = path.dirname(AUTO_REACTIONS_FILE);
        await fs.mkdir(configDir, { recursive: true });
        await fs.writeFile(AUTO_REACTIONS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving auto reactions:', error);
        throw error;
    }
}

async function handleAdd(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const trigger = interaction.options.getString('trigger').toLowerCase().trim();
    const reaction = interaction.options.getString('reaction').trim();
    const type = interaction.options.getString('type');
    const channel = interaction.options.getChannel('channel');

    // Validate trigger
    if (trigger.length < 1) {
        return await interaction.editReply({ 
            content: '❌ **Error**: Trigger must be at least 1 character long.' 
        });
    }

    // Test if reaction is valid
    try {
        // Try to react to this interaction to test the emoji
        const testMessage = await interaction.followUp({ 
            content: 'Testing emoji...', 
            ephemeral: true 
        });
        await testMessage.react(reaction);
        await testMessage.delete();
    } catch (error) {
        return await interaction.editReply({ 
            content: '❌ **Error**: Invalid emoji. Please use a valid Unicode emoji or server emoji.' 
        });
    }

    const data = await loadAutoReactions();
    if (!data[interaction.guild.id]) {
        data[interaction.guild.id] = {
            enabled: true,
            triggers: []
        };
    }

    // Check for duplicate triggers
    const existingTrigger = data[interaction.guild.id].triggers.find(t => 
        t.trigger === trigger && t.type === type && t.channelId === (channel?.id || null)
    );

    if (existingTrigger) {
        return await interaction.editReply({ 
            content: '❌ **Error**: A trigger with the same text, type, and channel already exists.' 
        });
    }

    // Add new trigger
    const newTrigger = {
        trigger: trigger,
        reaction: reaction,
        type: type,
        channelId: channel?.id || null,
        createdBy: interaction.user.id,
        createdAt: Date.now(),
        uses: 0
    };

    data[interaction.guild.id].triggers.push(newTrigger);
    await saveAutoReactions(data);

    const embed = new EmbedBuilder()
        .setTitle('✅ Auto-Reaction Added!')
        .setDescription('Successfully created a new auto-reaction trigger')
        .addFields(
            { name: '🔤 Trigger Text', value: `\`${trigger}\``, inline: true },
            { name: '😀 Reaction', value: reaction, inline: true },
            { name: '⚙️ Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
            { name: '📍 Channel', value: channel ? channel.toString() : 'All channels', inline: true },
            { name: '👤 Created By', value: interaction.user.toString(), inline: true },
            { name: '🆔 Trigger ID', value: `${data[interaction.guild.id].triggers.length - 1}`, inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleRemove(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const triggerId = parseInt(interaction.options.getString('trigger_id'));
    const data = await loadAutoReactions();
    const guildData = data[interaction.guild.id];

    if (!guildData || !guildData.triggers || !guildData.triggers[triggerId]) {
        return await interaction.editReply({ 
            content: '❌ **Error**: Trigger not found.' 
        });
    }

    const removedTrigger = guildData.triggers[triggerId];
    guildData.triggers.splice(triggerId, 1);
    await saveAutoReactions(data);

    const embed = new EmbedBuilder()
        .setTitle('🗑️ Auto-Reaction Removed')
        .setDescription('Successfully removed the auto-reaction trigger')
        .addFields(
            { name: '🔤 Trigger Text', value: `\`${removedTrigger.trigger}\``, inline: true },
            { name: '😀 Reaction', value: removedTrigger.reaction, inline: true },
            { name: '📊 Total Uses', value: removedTrigger.uses.toString(), inline: true }
        )
        .setColor('#FF6B6B')
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleList(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const data = await loadAutoReactions();
    const guildData = data[interaction.guild.id];

    if (!guildData || !guildData.triggers || guildData.triggers.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('📋 No Auto-Reactions')
            .setDescription('No auto-reaction triggers have been set up for this server.\n\n🚀 **Get Started:**\nUse `/autoreaction add` to create your first trigger!')
            .setColor('#FFA500')
            .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
        .setTitle('🤖 Auto-Reaction Triggers')
        .setDescription(`**Status:** ${guildData.enabled ? '✅ Enabled' : '❌ Disabled'}\n**Total Triggers:** ${guildData.triggers.length}`)
        .setColor('#5865F2')
        .setTimestamp();

    guildData.triggers.forEach((trigger, index) => {
        const channel = trigger.channelId ? 
            interaction.guild.channels.cache.get(trigger.channelId) : null;
        
        embed.addFields({
            name: `🆔 ${index} - ${trigger.reaction} ${trigger.trigger}`,
            value: [
                `**Type:** ${trigger.type}`,
                `**Channel:** ${channel ? channel.toString() : 'All channels'}`,
                `**Uses:** ${trigger.uses}`,
                `**Created:** <t:${Math.floor(trigger.createdAt / 1000)}:R>`
            ].join('\n'),
            inline: true
        });
    });

    await interaction.editReply({ embeds: [embed] });
}

async function handleToggle(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const enabled = interaction.options.getBoolean('enabled');
    const data = await loadAutoReactions();

    if (!data[interaction.guild.id]) {
        data[interaction.guild.id] = {
            enabled: enabled,
            triggers: []
        };
    } else {
        data[interaction.guild.id].enabled = enabled;
    }

    await saveAutoReactions(data);

    const embed = new EmbedBuilder()
        .setTitle(`🤖 Auto-Reactions ${enabled ? 'Enabled' : 'Disabled'}`)
        .setDescription(`Auto-reaction system has been **${enabled ? 'enabled' : 'disabled'}** for this server.`)
        .setColor(enabled ? '#00FF00' : '#FF6B6B')
        .setTimestamp();

    if (enabled && data[interaction.guild.id].triggers.length === 0) {
        embed.addFields({
            name: '💡 Next Steps',
            value: 'Use `/autoreaction add` to create your first auto-reaction trigger!',
            inline: false
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

// Export the process function for use in messageCreate event
module.exports.processAutoReactions = async function(message) {
    if (message.author.bot || !message.guild) return;

    try {
        const data = await loadAutoReactions();
        const guildData = data[message.guild.id];

        if (!guildData || !guildData.enabled || !guildData.triggers) return;

        const content = message.content.toLowerCase();

        for (const trigger of guildData.triggers) {
            // Check channel restriction
            if (trigger.channelId && trigger.channelId !== message.channel.id) {
                continue;
            }

            let shouldReact = false;

            switch (trigger.type) {
                case 'contains':
                    shouldReact = content.includes(trigger.trigger);
                    break;
                case 'starts':
                    shouldReact = content.startsWith(trigger.trigger);
                    break;
                case 'exact':
                    shouldReact = content === trigger.trigger;
                    break;
                case 'ends':
                    shouldReact = content.endsWith(trigger.trigger);
                    break;
            }

            if (shouldReact) {
                try {
                    await message.react(trigger.reaction);
                    
                    // Increment usage counter
                    trigger.uses++;
                    await saveAutoReactions(data);
                    
                } catch (error) {
                    console.error(`Error reacting with ${trigger.reaction}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Error processing auto reactions:', error);
    }
};
