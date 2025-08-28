
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
        .setName('queue')
        .setDescription('View the current music queue'),

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
            const queue = player.queue;

            if (!current) {
                return await interaction.reply({ 
                    content: '❌ No track is currently playing!', 
                    flags: 64 
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎵 Music Queue')
                .setThumbnail(current.thumbnail || null);

            // Current track
            embed.addFields({
                name: '🎧 Currently Playing',
                value: `**[${current.title}](${current.uri})**\n` +
                       `👤 **Artist:** ${current.author}\n` +
                       `⏱️ **Duration:** ${current.isStream ? 'Live Stream' : formatDuration(current.length)}\n` +
                       `👤 **Requested by:** ${current.requester?.username || 'Unknown'}`,
                inline: false
            });

            // Queue
            if (queue.length > 0) {
                const upcoming = queue.slice(0, 10).map((track, index) => {
                    return `**${index + 1}.** [${track.title}](${track.uri}) - ${track.author}`;
                }).join('\n');

                embed.addFields({
                    name: `📋 Up Next (${queue.length} track${queue.length === 1 ? '' : 's'})`,
                    value: upcoming + (queue.length > 10 ? `\n... and ${queue.length - 10} more` : ''),
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '📋 Up Next',
                    value: 'No tracks in queue',
                    inline: false
                });
            }

            // Player info
            embed.setFooter({
                text: `Loop: ${player.loop || 'Off'} | Volume: ${player.volume || 100}% | Paused: ${player.paused ? 'Yes' : 'No'}`,
                iconURL: interaction.client.user.displayAvatarURL()
            });

            await interaction.reply({ embeds: [embed], flags: 64 });

        } catch (error) {
            console.error('❌ Error in queue command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while fetching the queue!', 
                flags: 64 
            });
        }
    }
};
