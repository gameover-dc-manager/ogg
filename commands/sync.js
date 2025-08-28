const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync')
        .setDescription('Sync all slash commands with Discord')
        .setDefaultMemberPermissions('0'), // Only bot owner can use this

    async execute(interaction) {
        // Check if user is bot owner (you can modify this check as needed)
        const botOwners = ['769040767267504128']; // Replace with your Discord user ID (right-click your profile > Copy User ID)

        if (!botOwners.includes(interaction.user.id)) {
            return await interaction.reply({
                content: '❌ Only bot owners can use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            console.log('🔄 Starting manual command sync...');

            // Enhanced command validation
            const validCommands = new Map();
            const invalidCommands = [];

            for (const [name, command] of interaction.client.commands.entries()) {
                try {
                    // Check if command has required properties
                    if (!command.data) {
                        invalidCommands.push({ name, reason: 'Missing data property' });
                        continue;
                    }

                    if (typeof command.data.toJSON !== 'function') {
                        invalidCommands.push({ name, reason: 'Invalid SlashCommandBuilder' });
                        continue;
                    }

                    // Test JSON serialization
                    const commandData = command.data.toJSON();

                    // Validate required fields
                    if (!commandData.name || commandData.name.length < 1 || commandData.name.length > 32) {
                        invalidCommands.push({ name, reason: 'Invalid command name' });
                        continue;
                    }

                    if (!commandData.description || commandData.description.length < 1 || commandData.description.length > 100) {
                        invalidCommands.push({ name, reason: 'Invalid description length' });
                        continue;
                    }

                    // Validate options ordering (required before optional)
                    if (commandData.options) {
                        let foundOptional = false;
                        let hasOrderingError = false;

                        for (const option of commandData.options) {
                            if (option.required === false || option.required === undefined) {
                                foundOptional = true;
                            } else if (foundOptional && option.required === true) {
                                invalidCommands.push({ name, reason: 'Required options must come before optional ones' });
                                hasOrderingError = true;
                                break;
                            }
                        }

                        if (hasOrderingError) continue;
                    }

                    // If we get here, command is valid
                    validCommands.set(name, commandData);

                } catch (err) {
                    invalidCommands.push({ name, reason: err.message });
                }
            }

            // Create detailed embed response
            const embed = new EmbedBuilder()
                .setTitle('🔄 Command Sync Results')
                .setColor('#0099FF')
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

            // Log validation results
            if (invalidCommands.length > 0) {
                console.warn(`⚠️ Found ${invalidCommands.length} invalid commands:`);
                invalidCommands.forEach(({ name, reason }) => {
                    console.warn(`   - ${name}: ${reason}`);
                });

                const invalidList = invalidCommands.slice(0, 10).map(cmd => `• ${cmd.name}: ${cmd.reason}`).join('\n');
                embed.addFields({
                    name: '❌ Invalid Commands',
                    value: invalidList + (invalidCommands.length > 10 ? `\n... and ${invalidCommands.length - 10} more` : ''),
                    inline: false
                });
            }

            console.log(`📝 Syncing ${validCommands.size} valid commands...`);

            if (validCommands.size === 0) {
                embed.setDescription('⚠️ No valid commands to sync!')
                    .setColor('#FFA500');
                // Check if interaction is still valid before replying
                if (!interaction.isRepliable() || !interaction.deferred) {
                    console.log('❌ Cannot reply to interaction - invalid state');
                    return;
                }

                return await interaction.editReply({ embeds: [embed] });
            }

            const commandsToSync = Array.from(validCommands.values());

            // Perform the sync
            const startTime = Date.now();
            await interaction.client.application.commands.set(commandsToSync);
            const syncTime = Date.now() - startTime;

            console.log(`✅ Successfully synced ${commandsToSync.length} application (/) commands globally.`);

            embed.setDescription(`✅ Successfully synced **${commandsToSync.length}** commands!`)
                .setColor('#00FF00')
                .addFields(
                    { name: '📊 Statistics', value: `Valid: ${validCommands.size}\nInvalid: ${invalidCommands.length}\nTotal: ${interaction.client.commands.size}`, inline: true },
                    { name: '⏱️ Sync Time', value: `${syncTime}ms`, inline: true },
                    { name: '🌐 Scope', value: 'Global', inline: true }
                );

            // Check if interaction is still valid before replying
            if (!interaction.isRepliable() || !interaction.deferred) {
                console.log('❌ Cannot reply to interaction - invalid state');
                return;
            }

            return await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Error during manual command sync:', error);

            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Command Sync Failed')
                .setDescription(`Failed to sync commands: ${error.message}`)
                .setColor('#FF0000')
                .setTimestamp();

            // Enhanced error reporting
            if (error.code === 50035) {
                errorEmbed.addFields({
                    name: '💡 Discord API Validation Error',
                    value: 'Common fixes:\n• Ensure command names are lowercase, 1-32 characters\n• Ensure descriptions are 1-100 characters\n• Required options must come before optional ones\n• Choice values must be strings for string options',
                    inline: false
                });
                if (error.errors) {
                    console.error('   Detailed errors:', JSON.stringify(error.errors, null, 2));
                }
            } else if (error.code === 50001) {
                errorEmbed.addFields({
                    name: '💡 Missing Access',
                    value: 'Bot may lack application.commands scope',
                    inline: false
                });
            } else if (error.code === 429) {
                errorEmbed.addFields({
                    name: '💡 Rate Limited',
                    value: 'Too many command updates. Please wait before trying again.',
                    inline: false
                });
            }

            // Check if interaction is still valid before replying
            if (!interaction.isRepliable() || !interaction.deferred) {
                console.log('❌ Cannot reply to interaction - invalid state');
                return;
            }

            return await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};