
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { MinecraftBridge } = require('../components/minecraftBridge');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minecraft')
        .setDescription('Minecraft server management commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('addserver')
                .setDescription('Add a Minecraft server for monitoring')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Server name/identifier')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('host')
                        .setDescription('Server hostname or IP (for Aternos: yourserver.aternos.me)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('port')
                        .setDescription('Server port (default: 25565)')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('rcon_port')
                        .setDescription('RCON port (optional, for admin commands)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('rcon_password')
                        .setDescription('RCON password (optional, for admin commands)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('removeserver')
                .setDescription('Remove a Minecraft server')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Server name to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check server status')
                .addStringOption(option =>
                    option.setName('server')
                        .setDescription('Server name (optional, shows all if not specified)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('players')
                .setDescription('List online players')
                .addStringOption(option =>
                    option.setName('server')
                        .setDescription('Server name')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('chat')
                .setDescription('Setup chat bridge between Discord and Minecraft')
                .addStringOption(option =>
                    option.setName('server')
                        .setDescription('Server name')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Discord channel for chat bridge')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('command')
                .setDescription('Execute server command (requires RCON)')
                .addStringOption(option =>
                    option.setName('server')
                        .setDescription('Server name')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('cmd')
                        .setDescription('Command to execute')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Kick a player from the server')
                .addStringOption(option =>
                    option.setName('server')
                        .setDescription('Server name')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('player')
                        .setDescription('Player name to kick')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for kick')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('Configure Minecraft integration settings')),

    async execute(interaction) {
        const bridge = new MinecraftBridge(interaction.client);
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'addserver':
                await handleAddServer(interaction, bridge);
                break;
            case 'removeserver':
                await handleRemoveServer(interaction, bridge);
                break;
            case 'status':
                await handleStatus(interaction, bridge);
                break;
            case 'players':
                await handlePlayers(interaction, bridge);
                break;
            case 'chat':
                await handleChatBridge(interaction, bridge);
                break;
            case 'command':
                await handleCommand(interaction, bridge);
                break;
            case 'kick':
                await handleKick(interaction, bridge);
                break;
            case 'settings':
                await handleSettings(interaction, bridge);
                break;
        }
    }
};

async function handleAddServer(interaction, bridge) {
    const name = interaction.options.getString('name');
    const host = interaction.options.getString('host');
    const port = interaction.options.getInteger('port') || 25565;
    const rconPort = interaction.options.getInteger('rcon_port');
    const rconPassword = interaction.options.getString('rcon_password');

    await interaction.deferReply();

    try {
        // Test server connection
        const status = await bridge.getServerStatus(host, port);
        
        await bridge.addServer(interaction.guild.id, name, host, port, rconPort, rconPassword);

        const embed = new EmbedBuilder()
            .setTitle('✅ Server Added Successfully')
            .setDescription(`**${name}** has been added to your server list`)
            .addFields(
                { name: '🌐 Address', value: `${host}:${port}`, inline: true },
                { name: '🔌 Status', value: status.online ? '✅ Online' : '❌ Offline', inline: true },
                { name: '👥 Players', value: `${status.players}/${status.maxPlayers}`, inline: true },
                { name: '🔐 RCON', value: rconPort ? '✅ Configured' : '❌ Not configured', inline: true }
            )
            .setColor('#00FF00')
            .setTimestamp();

        if (!status.online) {
            embed.setFooter({ text: 'Note: Server appears to be offline. This is normal for Aternos servers when not in use.' });
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error adding server:', error);
        await interaction.editReply({ 
            content: '❌ **Error**: Failed to add server. Please check the hostname and try again.' 
        });
    }
}

async function handleRemoveServer(interaction, bridge) {
    const name = interaction.options.getString('name');

    const success = await bridge.removeServer(interaction.guild.id, name);

    if (success) {
        await interaction.reply({ 
            content: `✅ **Server Removed**: ${name} has been removed from your server list.`,
            flags: 64
        });
    } else {
        await interaction.reply({ 
            content: `❌ **Error**: Server "${name}" not found.`,
            flags: 64
        });
    }
}

async function handleStatus(interaction, bridge) {
    const serverName = interaction.options.getString('server');
    const guildId = interaction.guild.id;

    await interaction.deferReply();

    try {
        const servers = bridge.config.servers[guildId] || {};
        
        if (Object.keys(servers).length === 0) {
            return await interaction.editReply({ 
                content: '❌ **No servers configured**. Use `/minecraft addserver` to add your Aternos server first.' 
            });
        }

        if (serverName) {
            // Show specific server status
            const server = servers[serverName];
            if (!server) {
                return await interaction.editReply({ 
                    content: `❌ **Server not found**: "${serverName}"` 
                });
            }

            const status = await bridge.getServerStatus(server.host, server.port);
            const embed = bridge.createStatusEmbed(serverName, status, server.host, server.port);
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mc_refresh_${serverName}`)
                        .setLabel('🔄 Refresh')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`mc_players_${serverName}`)
                        .setLabel('👥 Players')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({ embeds: [embed], components: [row] });
        } else {
            // Show all servers
            const embeds = [];
            for (const [name, server] of Object.entries(servers)) {
                const status = await bridge.getServerStatus(server.host, server.port);
                const embed = bridge.createStatusEmbed(name, status, server.host, server.port);
                embeds.push(embed);
            }

            await interaction.editReply({ embeds: embeds.slice(0, 10) }); // Discord limit
        }
    } catch (error) {
        console.error('Error checking status:', error);
        await interaction.editReply({ 
            content: '❌ **Error**: Failed to check server status.' 
        });
    }
}

async function handlePlayers(interaction, bridge) {
    const serverName = interaction.options.getString('server');
    const guildId = interaction.guild.id;

    await interaction.deferReply();

    try {
        const server = bridge.config.servers[guildId]?.[serverName];
        if (!server) {
            return await interaction.editReply({ 
                content: `❌ **Server not found**: "${serverName}"` 
            });
        }

        if (!server.rconPort || !server.rconPassword) {
            return await interaction.editReply({ 
                content: '❌ **RCON not configured** for this server. Player list requires RCON access.' 
            });
        }

        const connected = await bridge.connectRcon(server.host, server.rconPort, server.rconPassword);
        if (!connected) {
            return await interaction.editReply({ 
                content: '❌ **RCON connection failed**. Make sure RCON is enabled on your server.' 
            });
        }

        const players = await bridge.getOnlinePlayers();
        const status = await bridge.getServerStatus(server.host, server.port);

        const embed = new EmbedBuilder()
            .setTitle(`👥 Players Online - ${serverName}`)
            .setDescription(players.length > 0 ? players.join('\n') : 'No players online')
            .addFields(
                { name: '📊 Count', value: `${players.length}/${status.maxPlayers}`, inline: true },
                { name: '🌐 Server', value: `${server.host}:${server.port}`, inline: true }
            )
            .setColor('#0099FF')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error getting players:', error);
        await interaction.editReply({ 
            content: '❌ **Error**: Failed to get player list.' 
        });
    }
}

async function handleChatBridge(interaction, bridge) {
    const serverName = interaction.options.getString('server');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const guildId = interaction.guild.id;

    const server = bridge.config.servers[guildId]?.[serverName];
    if (!server) {
        return await interaction.reply({ 
            content: `❌ **Server not found**: "${serverName}"`,
            flags: 64
        });
    }

    if (!server.rconPort || !server.rconPassword) {
        return await interaction.reply({ 
            content: '❌ **RCON required** for chat bridge. Please configure RCON when adding the server.',
            flags: 64
        });
    }

    await bridge.setupChatBridge(channel.id, guildId, serverName);
    bridge.config.chatBridge.enabled = true;
    bridge.saveConfig();

    const embed = new EmbedBuilder()
        .setTitle('💬 Chat Bridge Configured')
        .setDescription(`Chat bridge set up between **${channel}** and **${serverName}**`)
        .addFields(
            { name: '🎮 Minecraft Server', value: serverName, inline: true },
            { name: '💬 Discord Channel', value: channel.toString(), inline: true },
            { name: '🔄 Status', value: '✅ Active', inline: true }
        )
        .setColor('#00FF00')
        .setFooter({ text: 'Messages will now be synchronized between Discord and Minecraft!' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleCommand(interaction, bridge) {
    const serverName = interaction.options.getString('server');
    const command = interaction.options.getString('cmd');
    const guildId = interaction.guild.id;

    await interaction.deferReply();

    try {
        const server = bridge.config.servers[guildId]?.[serverName];
        if (!server) {
            return await interaction.editReply({ 
                content: `❌ **Server not found**: "${serverName}"` 
            });
        }

        if (!server.rconPort || !server.rconPassword) {
            return await interaction.editReply({ 
                content: '❌ **RCON not configured** for this server.' 
            });
        }

        const connected = await bridge.connectRcon(server.host, server.rconPort, server.rconPassword);
        if (!connected) {
            return await interaction.editReply({ 
                content: '❌ **RCON connection failed**.' 
            });
        }

        const response = await bridge.sendRconCommand(command);

        const embed = new EmbedBuilder()
            .setTitle('📟 Command Executed')
            .addFields(
                { name: '🎮 Server', value: serverName, inline: true },
                { name: '⌨️ Command', value: `\`${command}\``, inline: true },
                { name: '📤 Response', value: `\`\`\`${response || 'No response'}\`\`\``, inline: false }
            )
            .setColor('#0099FF')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error executing command:', error);
        await interaction.editReply({ 
            content: '❌ **Error**: Failed to execute command.' 
        });
    }
}

async function handleKick(interaction, bridge) {
    const serverName = interaction.options.getString('server');
    const player = interaction.options.getString('player');
    const reason = interaction.options.getString('reason') || 'Kicked by Discord admin';
    const guildId = interaction.guild.id;

    await interaction.deferReply();

    try {
        const server = bridge.config.servers[guildId]?.[serverName];
        if (!server) {
            return await interaction.editReply({ 
                content: `❌ **Server not found**: "${serverName}"` 
            });
        }

        if (!server.rconPort || !server.rconPassword) {
            return await interaction.editReply({ 
                content: '❌ **RCON not configured** for this server.' 
            });
        }

        const connected = await bridge.connectRcon(server.host, server.rconPort, server.rconPassword);
        if (!connected) {
            return await interaction.editReply({ 
                content: '❌ **RCON connection failed**.' 
            });
        }

        await bridge.kickPlayer(player, reason);

        const embed = new EmbedBuilder()
            .setTitle('🦵 Player Kicked')
            .addFields(
                { name: '🎮 Server', value: serverName, inline: true },
                { name: '👤 Player', value: player, inline: true },
                { name: '📝 Reason', value: reason, inline: false },
                { name: '👨‍💼 Kicked by', value: interaction.user.tag, inline: true }
            )
            .setColor('#FF6B35')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error kicking player:', error);
        await interaction.editReply({ 
            content: '❌ **Error**: Failed to kick player. Make sure the player is online.' 
        });
    }
}

async function handleSettings(interaction, bridge) {
    const embed = new EmbedBuilder()
        .setTitle('⚙️ Minecraft Integration Settings')
        .setDescription('Current configuration for Minecraft server integration')
        .addFields(
            { name: '🔌 Integration Status', value: bridge.config.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '💬 Chat Bridge', value: bridge.config.chatBridge.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '🔄 Update Interval', value: `${bridge.config.updateInterval / 1000}s`, inline: true },
            { name: '📊 Configured Servers', value: Object.keys(bridge.config.servers[interaction.guild.id] || {}).length.toString(), inline: true }
        )
        .setColor('#0099FF')
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('mc_toggle_integration')
                .setLabel(bridge.config.enabled ? 'Disable Integration' : 'Enable Integration')
                .setStyle(bridge.config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('mc_toggle_chat')
                .setLabel(bridge.config.chatBridge.enabled ? 'Disable Chat Bridge' : 'Enable Chat Bridge')
                .setStyle(bridge.config.chatBridge.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}
