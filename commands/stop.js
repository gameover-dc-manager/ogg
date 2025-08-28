
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop music playback and disconnect the bot'),

    async execute(interaction) {
        try {
            if (!interaction.client.manager) {
                return await interaction.reply({ 
                    content: '❌ Music system is not available!', 
                    flags: 64 
                });
            }

            const player = interaction.client.manager.players.get(interaction.guild.id);

            if (!player) {
                return await interaction.reply({ 
                    content: '❌ No active music player found!', 
                    flags: 64 
                });
            }

            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return await interaction.reply({ 
                    content: '❌ You must be in a voice channel!', 
                    flags: 64 
                });
            }

            if (player.voiceId !== voiceChannel.id) {
                return await interaction.reply({ 
                    content: '❌ You must be in the same voice channel as the bot!', 
                    flags: 64 
                });
            }

            // Clear any timeouts
            if (player.autoDisconnectTimeout) {
                clearTimeout(player.autoDisconnectTimeout);
                player.autoDisconnectTimeout = null;
            }

            if (player.emptyTimeout) {
                clearTimeout(player.emptyTimeout);
                player.emptyTimeout = null;
            }

            // Clear queue and destroy player
            player.queue.clear();
            await player.destroy();

            await interaction.reply({ 
                content: '🛑 **Stopped** music playback and disconnected from voice channel!', 
                flags: 64 
            });

        } catch (error) {
            console.error('❌ Error in stop command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while trying to stop music!', 
                flags: 64 
            });
        }
    }
};
