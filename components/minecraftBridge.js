
const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { Rcon } = require('rcon-client');

class MinecraftBridge {
    constructor(client) {
        this.client = client;
        this.config = this.loadConfig();
        this.rconClient = null;
        this.serverStatus = {
            online: false,
            players: 0,
            maxPlayers: 0,
            playerList: []
        };
        this.chatChannels = new Map(); // Discord channel ID -> Minecraft server mapping
    }

    loadConfig() {
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(__dirname, '../config/minecraft_config.json');
        
        try {
            if (fs.existsSync(configPath)) {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading Minecraft config:', error);
        }

        // Default configuration
        const defaultConfig = {
            enabled: false,
            servers: {},
            chatBridge: {
                enabled: false,
                discordToMinecraft: true,
                minecraftToDiscord: true,
                formatDiscordMessages: true
            },
            statusChannel: null,
            updateInterval: 60000 // 1 minute
        };

        this.saveConfig(defaultConfig);
        return defaultConfig;
    }

    saveConfig(config = this.config) {
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(__dirname, '../config/minecraft_config.json');
        
        try {
            if (!fs.existsSync(path.dirname(configPath))) {
                fs.mkdirSync(path.dirname(configPath), { recursive: true });
            }
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            this.config = config;
        } catch (error) {
            console.error('Error saving Minecraft config:', error);
        }
    }

    async addServer(guildId, serverName, host, port = 25565, rconPort = null, rconPassword = null) {
        if (!this.config.servers[guildId]) {
            this.config.servers[guildId] = {};
        }

        this.config.servers[guildId][serverName] = {
            host,
            port,
            rconPort,
            rconPassword,
            lastSeen: null,
            online: false
        };

        this.saveConfig();
        return true;
    }

    async removeServer(guildId, serverName) {
        if (this.config.servers[guildId] && this.config.servers[guildId][serverName]) {
            delete this.config.servers[guildId][serverName];
            this.saveConfig();
            return true;
        }
        return false;
    }

    async getServerStatus(host, port = 25565) {
        try {
            // Use Minecraft server query API
            const response = await axios.get(`https://api.mcsrvstat.us/2/${host}:${port}`, {
                timeout: 10000
            });

            const data = response.data;
            
            return {
                online: data.online || false,
                players: data.players?.online || 0,
                maxPlayers: data.players?.max || 0,
                playerList: data.players?.list || [],
                version: data.version || 'Unknown',
                motd: data.motd?.clean?.[0] || 'No MOTD',
                latency: data.debug?.ping || 0
            };
        } catch (error) {
            console.error('Error checking server status:', error);
            return {
                online: false,
                players: 0,
                maxPlayers: 0,
                playerList: [],
                version: 'Unknown',
                motd: 'Server Offline',
                latency: 0
            };
        }
    }

    async connectRcon(host, port, password) {
        try {
            if (this.rconClient) {
                await this.rconClient.end();
            }

            this.rconClient = new Rcon({
                host,
                port,
                password,
                timeout: 5000
            });

            await this.rconClient.connect();
            return true;
        } catch (error) {
            console.error('RCON connection failed:', error);
            this.rconClient = null;
            return false;
        }
    }

    async sendRconCommand(command) {
        if (!this.rconClient) {
            throw new Error('RCON not connected');
        }

        try {
            const response = await this.rconClient.send(command);
            return response;
        } catch (error) {
            console.error('RCON command failed:', error);
            throw error;
        }
    }

    async sendMinecraftMessage(message, playerName = 'Discord') {
        if (!this.rconClient) {
            return false;
        }

        try {
            // Clean Discord message for Minecraft
            const cleanMessage = message
                .replace(/<@!?(\d+)>/g, '@user') // Replace mentions
                .replace(/<#(\d+)>/g, '#channel') // Replace channel mentions
                .replace(/<:(\w+):\d+>/g, ':$1:') // Replace custom emojis
                .substring(0, 100); // Limit length

            await this.sendRconCommand(`say [Discord] <${playerName}> ${cleanMessage}`);
            return true;
        } catch (error) {
            console.error('Failed to send message to Minecraft:', error);
            return false;
        }
    }

    async getOnlinePlayers() {
        if (!this.rconClient) {
            return [];
        }

        try {
            const response = await this.sendRconCommand('list');
            // Parse player list from response
            const match = response.match(/players online: (.+)/i);
            if (match && match[1] !== '') {
                return match[1].split(', ').map(name => name.trim());
            }
            return [];
        } catch (error) {
            console.error('Failed to get player list:', error);
            return [];
        }
    }

    async kickPlayer(playerName, reason = 'Kicked by Discord admin') {
        if (!this.rconClient) {
            throw new Error('RCON not connected');
        }

        return await this.sendRconCommand(`kick ${playerName} ${reason}`);
    }

    async banPlayer(playerName, reason = 'Banned by Discord admin') {
        if (!this.rconClient) {
            throw new Error('RCON not connected');
        }

        return await this.sendRconCommand(`ban ${playerName} ${reason}`);
    }

    async pardonPlayer(playerName) {
        if (!this.rconClient) {
            throw new Error('RCON not connected');
        }

        return await this.sendRconCommand(`pardon ${playerName}`);
    }

    createStatusEmbed(serverName, status, host, port) {
        const embed = new EmbedBuilder()
            .setTitle(`🏰 ${serverName} Server Status`)
            .setColor(status.online ? '#00FF00' : '#FF0000')
            .addFields(
                { name: '🔌 Status', value: status.online ? '✅ Online' : '❌ Offline', inline: true },
                { name: '👥 Players', value: `${status.players}/${status.maxPlayers}`, inline: true },
                { name: '📡 Ping', value: `${status.latency}ms`, inline: true },
                { name: '🏷️ Version', value: status.version, inline: true },
                { name: '🌐 Address', value: `${host}:${port}`, inline: true },
                { name: '📝 MOTD', value: status.motd || 'No MOTD', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Minecraft Bridge • Updates every minute' });

        if (status.playerList && status.playerList.length > 0) {
            const playerNames = status.playerList.slice(0, 10).join(', ');
            embed.addFields({ 
                name: '👤 Online Players', 
                value: playerNames + (status.playerList.length > 10 ? '...' : ''), 
                inline: false 
            });
        }

        return embed;
    }

    async startStatusUpdates() {
        if (!this.config.enabled) return;

        setInterval(async () => {
            for (const guildId in this.config.servers) {
                for (const serverName in this.config.servers[guildId]) {
                    const server = this.config.servers[guildId][serverName];
                    const status = await this.getServerStatus(server.host, server.port);
                    
                    // Update server status
                    server.online = status.online;
                    server.lastSeen = Date.now();

                    // Send status updates to status channels
                    if (this.config.statusChannel) {
                        const channel = this.client.channels.cache.get(this.config.statusChannel);
                        if (channel) {
                            const embed = this.createStatusEmbed(serverName, status, server.host, server.port);
                            // Update or send new message
                            const messages = await channel.messages.fetch({ limit: 50 });
                            const existingMessage = messages.find(m => 
                                m.author.id === this.client.user.id && 
                                m.embeds[0]?.title?.includes(serverName)
                            );

                            if (existingMessage) {
                                await existingMessage.edit({ embeds: [embed] });
                            } else {
                                await channel.send({ embeds: [embed] });
                            }
                        }
                    }
                }
            }
            
            this.saveConfig();
        }, this.config.updateInterval);
    }

    async setupChatBridge(discordChannelId, guildId, serverName) {
        this.chatChannels.set(discordChannelId, { guildId, serverName });
        
        // Add Discord message listener
        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            if (!this.chatChannels.has(message.channel.id)) return;
            if (!this.config.chatBridge.enabled || !this.config.chatBridge.discordToMinecraft) return;

            const bridge = this.chatChannels.get(message.channel.id);
            const server = this.config.servers[bridge.guildId]?.[bridge.serverName];
            
            if (server && server.rconPort && server.rconPassword) {
                // Connect to RCON if not connected
                if (!this.rconClient) {
                    await this.connectRcon(server.host, server.rconPort, server.rconPassword);
                }

                await this.sendMinecraftMessage(message.content, message.author.username);
            }
        });
    }
}

module.exports = { MinecraftBridge };
