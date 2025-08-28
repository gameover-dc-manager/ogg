
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current track'),

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

            const currentTrack = player.queue.current;
            
            if (player.queue.length === 0) {
                await player.destroy();
                await interaction.reply({ 
                    content: `⏭️ **Skipped:** ${currentTrack.title}\n🛑 Queue is empty, disconnecting...`, 
                    flags: 64 
                });
            } else {
                player.skip();
                await interaction.reply({ 
                    content: `⏭️ **Skipped:** ${currentTrack.title}`, 
                    flags: 64 
                });
            }

        } catch (error) {
            console.error('❌ Error in skip command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while trying to skip!', 
                flags: 64 
            });
        }
    }
};
