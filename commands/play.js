
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube, Spotify, or SoundCloud')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('YouTube URL, Spotify URL, or search keyword')
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            // Check if user is in a voice channel
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return await interaction.reply({ 
                    content: '❌ You must be in a voice channel to play music!', 
                    flags: 64 
                });
            }

            // Check bot permissions
            const permissions = voiceChannel.permissionsFor(interaction.client.user);
            if (!permissions.has(['Connect', 'Speak'])) {
                return await interaction.reply({ 
                    content: '❌ I don\'t have permission to connect or speak in that voice channel!', 
                    flags: 64 
                });
            }

            // Check if music system is available
            if (!interaction.client.manager) {
                return await interaction.reply({ 
                    content: '❌ Music system is not available! Please contact an administrator.', 
                    flags: 64 
                });
            }

            const query = interaction.options.getString('query');

            // Defer the reply immediately after getting the query
            await interaction.deferReply({ flags: 64 });

            // Get or create player
            let player = interaction.client.manager.players.get(interaction.guild.id);

            if (!player) {
                player = await interaction.client.manager.createPlayer({
                    guildId: interaction.guild.id,
                    textId: interaction.channel.id,
                    voiceId: voiceChannel.id,
                    volume: 80,
                    selfDeaf: true
                });
            }

            // Search for tracks
            const result = await interaction.client.manager.search(query, {
                requester: interaction.user
            });

            if (!result || !result.tracks || result.tracks.length === 0) {
                await interaction.editReply({ 
                    content: '❌ No tracks found for your search query!' 
                });
                
                if (player && !player.playing && player.queue.length === 0) {
                    await player.destroy();
                }
                return;
            }

            // Add tracks to queue
            if (result.type === 'PLAYLIST') {
                result.tracks.forEach(track => player.queue.add(track));
                
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('📋 Playlist Added')
                    .setDescription(`Added **${result.tracks.length}** tracks from **${result.playlistName}**`)
                    .addFields(
                        { name: '🎵 First Track', value: result.tracks[0].title, inline: true },
                        { name: '👤 Requested by', value: interaction.user.username, inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                const track = result.tracks[0];
                player.queue.add(track);

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎵 Track Added')
                    .setDescription(`**${track.title}** by ${track.author}`)
                    .setThumbnail(track.thumbnail || null)
                    .addFields(
                        { name: '⏱️ Duration', value: track.isStream ? 'Live Stream' : this.formatDuration(track.length), inline: true },
                        { name: '👤 Requested by', value: interaction.user.username, inline: true },
                        { name: '📺 Source', value: track.sourceName || 'Unknown', inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            }

            // Connect and play with timeout protection
            try {
                if (!player.connected) {
                    await Promise.race([
                        player.connect(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
                    ]);
                }

                if (!player.playing && !player.paused) {
                    await Promise.race([
                        player.play(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Play timeout')), 3000))
                    ]);
                }
            } catch (connectError) {
                console.error('Connection/Play error:', connectError);
                if (connectError.message === 'Connection timeout' || connectError.message === 'Play timeout') {
                    // Continue anyway, the player might still work
                    console.log('Continuing despite timeout...');
                } else if (connectError.code === 1 && connectError.message.includes('already connected')) {
                    // Player is already connected, just try to play
                    if (!player.playing && !player.paused) {
                        try {
                            await player.play();
                        } catch (playError) {
                            console.log('Play after connection error:', playError);
                        }
                    }
                } else {
                    throw connectError;
                }
            }

        } catch (error) {
            console.error('❌ Error in play command:', error);
            
            // Check if interaction is still valid before trying to respond
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2500) {
                console.log(`⏰ Play command interaction too old (${interactionAge}ms), skipping error reply`);
                return;
            }

            try {
                if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                    await interaction.reply({ 
                        content: '❌ An error occurred while trying to play music!', 
                        flags: 64 
                    });
                } else if (interaction.deferred && !interaction.replied && interaction.isRepliable()) {
                    await interaction.editReply({ 
                        content: '❌ An error occurred while trying to play music!' 
                    });
                }
            } catch (replyError) {
                // Skip specific Discord API errors
                if (replyError.code === 10062 || replyError.code === 40060) {
                    console.log(`ℹ️ Skipping error reply due to interaction state (code: ${replyError.code})`);
                } else {
                    console.error('❌ Failed to send error message:', replyError);
                }
            }
        }
    },

    formatDuration(ms) {
        if (!ms || isNaN(ms) || ms <= 0) return 'Unknown';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
};
