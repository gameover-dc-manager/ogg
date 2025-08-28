
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Adjust the music volume')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

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

            const volume = interaction.options.getInteger('level');
            const oldVolume = player.volume;

            player.setVolume(volume);

            await interaction.reply({ 
                content: `🔊 Volume changed from **${oldVolume}%** to **${volume}%**`, 
                flags: 64 
            });

        } catch (error) {
            console.error('❌ Error in volume command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while adjusting volume!', 
                flags: 64 
            });
        }
    }
};
