
const { EmbedBuilder } = require('discord.js');

function formatDuration(ms) {
    if (!ms || isNaN(ms) || ms <= 0) return 'Unknown';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function registerKazagumoEvents(client) {
    if (!client.manager) {
        console.warn('❌ Kazagumo manager not initialized yet.');
        return;
    }

    // Clear any existing listeners to prevent duplicates
    client.manager.removeAllListeners();

    client.manager.on('playerCreate', (player) => {
        console.log(`🎵 Player created for guild: ${player.guildId}`);
        player.autoDisconnectTimeout = null;
        player.emptyTimeout = null;
        player.nowPlayingMessage = null;
    });

    client.manager.on('playerStart', async (player, track) => {
        console.log(`🎵 Track started: ${track.title} in guild: ${player.guildId}`);

        const channel = client.channels.cache.get(player.textId);
        if (!channel) return;

        try {
            // Delete previous now playing message
            if (player.nowPlayingMessage) {
                try {
                    await player.nowPlayingMessage.delete();
                } catch (error) {
                    console.log('Could not delete previous now playing message:', error);
                }
                player.nowPlayingMessage = null;
            }

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setAuthor({
                    name: 'Now Playing',
                    iconURL: 'https://cdn.discordapp.com/attachments/1234567890/music.gif'
                })
                .setTitle(track.title)
                .setURL(track.uri)
                .setThumbnail(track.thumbnail || null)
                .setDescription(`
🎧 **Song:** [${track.title}](${track.uri})
👤 **Artist:** ${track.author}
⏱️ **Duration:** ${track.isStream ? 'Live Stream' : formatDuration(track.length)}
👤 **Requested by:** ${track.requester?.username || 'Unknown'}
                `)
                .addFields(
                    { name: '📺 Source', value: track.sourceName || 'Unknown', inline: true },
                    { name: '🔗 Link', value: `[Open](${track.uri})`, inline: true },
                    { name: '📋 Queue', value: `${player.queue.length} track${player.queue.length === 1 ? '' : 's'}`, inline: true }
                )
                .setFooter({
                    text: 'Music Player • Enhanced System',
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            const message = await channel.send({ embeds: [embed] });
            player.nowPlayingMessage = message;

            // Auto-delete after 30 seconds if queue is empty
            if (player.queue.length === 0) {
                setTimeout(async () => {
                    try {
                        if (player.nowPlayingMessage && player.queue.length === 0) {
                            await player.nowPlayingMessage.delete();
                            player.nowPlayingMessage = null;
                        }
                    } catch (error) {
                        console.log('Could not auto-delete now playing message:', error);
                    }
                }, 30000);
            }

        } catch (error) {
            console.error('❌ Failed to send now playing message:', error);
        }
    });

    client.manager.on('playerEnd', async (player) => {
        console.log(`🎵 Track ended in guild: ${player.guildId}, queue length: ${player.queue.length}`);
        
        // Clear any existing timeouts
        if (player.emptyTimeout) {
            clearTimeout(player.emptyTimeout);
            player.emptyTimeout = null;
        }
    });

    client.manager.on('queueEnd', async (player) => {
        console.log(`🏁 Queue ended for guild: ${player.guildId}`);

        const channel = client.channels.cache.get(player.textId);
        if (channel) {
            try {
                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('🏁 Queue Ended')
                    .setDescription('The music queue has ended. Add more songs or I\'ll disconnect in 2 minutes.')
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
            } catch (error) {
                console.error('❌ Failed to send queue end message:', error);
            }
        }

        // Set disconnect timeout
        player.autoDisconnectTimeout = setTimeout(async () => {
            try {
                const currentPlayer = client.manager.players.get(player.guildId);
                if (currentPlayer && currentPlayer.queue.length === 0 && !currentPlayer.playing) {
                    console.log(`🔌 Auto-disconnecting from ${player.guildId} due to inactivity`);
                    
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('🔌 Disconnected')
                            .setDescription('Disconnected due to inactivity.')
                            .setTimestamp();

                        await channel.send({ embeds: [embed] });
                    }
                    
                    await currentPlayer.destroy();
                }
            } catch (error) {
                console.error('❌ Error destroying player on queue end:', error);
            }
        }, 120000); // 2 minutes
    });

    client.manager.on('playerDestroy', (player) => {
        console.log(`🔌 Player destroyed for guild: ${player.guildId}`);

        // Clear all timeouts
        if (player.autoDisconnectTimeout) {
            clearTimeout(player.autoDisconnectTimeout);
            player.autoDisconnectTimeout = null;
        }

        if (player.emptyTimeout) {
            clearTimeout(player.emptyTimeout);
            player.emptyTimeout = null;
        }

        // Clean up now playing message
        if (player.nowPlayingMessage) {
            try {
                player.nowPlayingMessage.delete().catch(() => {});
            } catch (error) {
                console.log('Could not delete now playing message on destroy:', error);
            }
            player.nowPlayingMessage = null;
        }
    });

    client.manager.on('playerError', (player, error) => {
        console.error(`❌ Player error in guild ${player.guildId}:`, error);

        const channel = client.channels.cache.get(player.textId);
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Player Error')
                .setDescription('An error occurred while playing music. Trying to continue...')
                .setTimestamp();

            channel.send({ embeds: [embed] }).catch(console.error);
        }
    });

    client.manager.on('trackStuck', (player, track) => {
        console.error(`🎵 Track stuck: ${track.title}`);

        const channel = client.channels.cache.get(player.textId);
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⚠️ Track Stuck')
                .setDescription(`Track "${track.title}" got stuck and was skipped.`)
                .setTimestamp();

            channel.send({ embeds: [embed] }).catch(console.error);
        }

        if (player.queue.length > 0) {
            player.skip();
        } else {
            player.destroy();
        }
    });

    client.manager.on('trackError', (player, track, payload) => {
        console.error(`❌ Track error: ${track.title}`, payload);

        const channel = client.channels.cache.get(player.textId);
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Track Error')
                .setDescription(`Error playing "${track.title}". Skipping to next track.`)
                .setTimestamp();

            channel.send({ embeds: [embed] }).catch(console.error);
        }

        if (player.queue.length > 0) {
            player.skip();
        } else {
            player.destroy();
        }
    });

    console.log('✅ Kazagumo events registered successfully');
}

async function searchAndPlay(query, interaction) {
    try {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            throw new Error('User not in voice channel');
        }

        // Check bot permissions
        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(['Connect', 'Speak'])) {
            throw new Error('Missing voice channel permissions');
        }

        // Get or create player
        let player = interaction.client.manager.players.get(interaction.guild.id);

        if (!player) {
            player = await interaction.client.manager.createPlayer({
                guildId: interaction.guild.id,
                textId: interaction.channel.id,
                voiceId: voiceChannel.id,
                volume: 80,
                selfDeaf: true,
                selfMute: false
            });

            console.log(`🎵 Created new player for guild: ${interaction.guild.id}`);
        }

        // Clear any pending auto-disconnect timeouts
        if (player.autoDisconnectTimeout) {
            clearTimeout(player.autoDisconnectTimeout);
            player.autoDisconnectTimeout = null;
        }

        if (player.emptyTimeout) {
            clearTimeout(player.emptyTimeout);
            player.emptyTimeout = null;
        }

        // Search for tracks
        console.log(`🔍 Searching for: ${query}`);
        const result = await interaction.client.manager.search(query, {
            requester: interaction.user
        });

        if (!result || !result.tracks || result.tracks.length === 0) {
            if (player && !player.playing && player.queue.length === 0) {
                try {
                    await player.destroy();
                } catch (e) { 
                    console.error('Error destroying empty player:', e);
                }
            }

            throw new Error('No tracks found for your search!');
        }

        // Add track(s) to queue
        if (result.type === 'PLAYLIST') {
            result.tracks.forEach(track => player.queue.add(track));
            console.log(`📋 Added ${result.tracks.length} tracks from playlist to queue`);
        } else {
            const track = result.tracks[0];
            player.queue.add(track);
            console.log(`➕ Added track to queue: ${track.title}`);
        }

        // Connect to voice channel
        if (!player.connected) {
            try {
                console.log(`🔗 Connecting to voice channel: ${voiceChannel.name}`);
                await player.connect();
                console.log(`✅ Successfully connected to voice channel`);
            } catch (connectError) {
                console.error('❌ Connection failed:', connectError);
                throw new Error('Failed to connect to voice channel');
            }
        }

        // Start playing
        if (!player.playing && !player.paused && player.queue.length > 0) {
            console.log(`▶️ Starting playback`);
            try {
                await player.play();
                console.log(`🎵 Playback started successfully`);
            } catch (playError) {
                console.error('❌ Failed to start playback:', playError);
                throw new Error('Failed to start playback');
            }
        }

        return result;

    } catch (error) {
        console.error('❌ Error in searchAndPlay:', error);

        // Cleanup failed player
        const player = interaction.client.manager.players.get(interaction.guild.id);
        if (player && !player.playing && player.queue.length === 0) {
            setTimeout(async () => {
                try {
                    const currentPlayer = interaction.client.manager.players.get(interaction.guild.id);
                    if (currentPlayer && !currentPlayer.playing && currentPlayer.queue.length === 0) {
                        console.log('🧹 Cleaning up failed player');
                        await currentPlayer.destroy();
                    }
                } catch (destroyError) {
                    console.error('❌ Error in cleanup:', destroyError);
                }
            }, 3000);
        }

        throw error;
    }
}

module.exports = {
    searchAndPlay,
    registerKazagumoEvents,
    formatDuration
};
