
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause or resume the current track'),

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

            if (!player.queue.current) {
                return await interaction.reply({ 
                    content: '❌ No track is currently playing!', 
                    flags: 64 
                });
            }

            if (player.paused) {
                player.pause(false);
                await interaction.reply({ 
                    content: '▶️ **Resumed** playback!', 
                    flags: 64 
                });
            } else {
                player.pause(true);
                await interaction.reply({ 
                    content: '⏸️ **Paused** playback!', 
                    flags: 64 
                });
            }

        } catch (error) {
            console.error('❌ Error in pause command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while trying to pause/resume!', 
                flags: 64 
            });
        }
    }
};
