
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

function formatDuration(ms) {
    if (!ms || isNaN(ms) || ms <= 0) return 'Unknown';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show information about the currently playing track'),

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

            const current = player.queue.current;

            if (!current) {
                return await interaction.reply({ 
                    content: '❌ No track is currently playing!', 
                    flags: 64 
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setAuthor({
                    name: 'Now Playing',
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTitle(current.title)
                .setURL(current.uri)
                .setThumbnail(current.thumbnail || null)
                .setDescription(`
🎧 **Song:** [${current.title}](${current.uri})
👤 **Artist:** ${current.author}
⏱️ **Duration:** ${current.isStream ? 'Live Stream' : formatDuration(current.length)}
👤 **Requested by:** ${current.requester?.username || 'Unknown'}
                `)
                .addFields(
                    { name: '📺 Source', value: current.sourceName || 'Unknown', inline: true },
                    { name: '🔊 Volume', value: `${player.volume || 100}%`, inline: true },
                    { name: '⏸️ Status', value: player.paused ? 'Paused' : 'Playing', inline: true },
                    { name: '🔄 Loop', value: player.loop || 'Off', inline: true },
                    { name: '📋 Queue Length', value: `${player.queue.length} track${player.queue.length === 1 ? '' : 's'}`, inline: true },
                    { name: '🔗 Link', value: `[Open](${current.uri})`, inline: true }
                )
                .setFooter({
                    text: 'Music Player • Enhanced System',
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: 64 });

        } catch (error) {
            console.error('❌ Error in nowplaying command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while fetching current track info!', 
                flags: 64 
            });
        }
    }
};
