const {
   Client,
   GatewayIntentBits,
   Collection,
   Events,
   ActionRowBuilder,
   // ── modal builders ────────────────────────────────────────────
   ModalBuilder,
   TextInputBuilder,
   TextInputStyle,
   // ─────────────────────────────────────────────────────────────
   ButtonBuilder,
   ButtonStyle,
   EmbedBuilder
} = require('discord.js');
const { handleAppealButton, handleAppealModal, handleAppealDecision, sendAppealButtonToUser } = require('./components/appealView');
const fs = require('fs');
const path = require('path');
const ConfigManager = require('./utils/configManager');
require('dotenv').config();

// Initialize configuration manager
const configManager = new ConfigManager();

// Load configuration with error handling
let config, logChannels, warnings;

try {
    config = require('./config/config.json');
} catch (error) {
    console.log('📝 Creating default config.json...');
    config = {
        lavalink: {
            host: "localhost",
            port: 2333,
            password: "youshallnotpass",
            secure: false
        },
        blockedKeywords: ["spam", "bad"],
        adultSites: ["example.com"],
        moderationSettings: {
            autoTimeout: true,
            timeoutDuration: 600000
        }
    };
}

try {
    logChannels = require('./config/log_channels.json');
} catch (error) {
    console.log('📝 Creating default log_channels.json...');
    logChannels = {};
}

try {
    warnings = require('./config/warnings.json');
} catch (error) {
    console.log('📝 Creating default warnings.json...');
    warnings = {};
}

// Initialize Discord client with proper intents for DM handling
const { Partials } = require('discord.js');

// Start web server for real-time progress
const express = require('express');
const cors = require('cors');
const webApp = express();
webApp.use(cors());
webApp.use(express.json());
webApp.use(express.static(path.join(__dirname, 'web')));

// Track data for web interface
let currentWebTrack = null;

// Removed the duplicate web server initialization on port 3000

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User]
});

// Initialize captcha stats
client.captchaStats = {
    totalVerifications: 0,
    successfulVerifications: 0,
    failedVerifications: 0,
    pendingVerifications: 0,
    totalAttempts: 0
};

client.pendingVerifications = new Map();

// Initialize Lavalink with better error handling
const { Kazagumo } = require('kazagumo');
const { Connectors } = require('shoukaku');

let kazagumoInitialized = false;
try {
    // Use public Lavalink nodes for better reliability
    const nodes = [
        {
            name: 'MainNode',
            url: 'lavalink.jirayu.net:13592',
            auth: 'youshallnotpass',
            secure: false
        }
    ];

    client.manager = new Kazagumo({
        defaultSearchEngine: 'youtube',
        send: (guildId, payload) => {
            const guild = client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        }
    }, new Connectors.DiscordJS(client), nodes);

    client.manager.shoukaku.on('ready', (name) => {
        console.log(`✅ Lavalink Node "${name}" is ready`);
        kazagumoInitialized = true;

        // Register voice events after connection
        const { registerKazagumoEvents } = require('./utils/voice');
        registerKazagumoEvents(client);
    });

    client.manager.shoukaku.on('error', (name, error) => {
        console.error(`❌ Lavalink Node "${name}" encountered an error:`, error);
        if (error.code === 'ECONNREFUSED') {
            console.log(`ℹ️ Music services unavailable - Lavalink server is not running`);
        }
    });

    client.manager.shoukaku.on('close', (name) => {
        console.log(`🔌 Lavalink Node "${name}" disconnected`);
        kazagumoInitialized = false;
    });

    client.manager.shoukaku.on('disconnect', (name) => {
        console.log(`🔌 Lavalink Node "${name}" disconnected`);
        kazagumoInitialized = false;
    });

    // Enhanced playerStart event with rich embed
    client.manager.on('playerStart', async (player, track) => {
        const channel = client.channels.cache.get(player.textId);
        if (!channel) return;

        // Format duration helper
        function formatDuration(ms) {
            if (!ms || isNaN(ms) || ms <= 0) return 'Unknown';
            const totalSeconds = Math.floor(ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Create progress bar helper
        function createProgressBar(current, total, length = 10) {
            if (total <= 0) return '░'.repeat(length);
            const progress = Math.min(current / total, 1);
            const filled = Math.floor(progress * length);
            const empty = length - filled;
            return '▓'.repeat(filled) + '░'.repeat(empty);
        }

        // Create enhanced embed with real-time progress
        function createEmbed(currentPosition = 0) {
            const currentTime = formatDuration(currentPosition);
            const totalTime = track.isStream ? 'Live' : formatDuration(track.length);
            const progressBar = track.isStream ? '🔴 LIVE' : createProgressBar(currentPosition, track.length);

            return new EmbedBuilder()
                .setColor('#FF6B35')
                .setAuthor({
                    name: '🎵 Now Playing',
                    iconURL: 'https://cdn.discordapp.com/emojis/763415718271385610.gif',
                })
                .setTitle(`${track.title}`)
                .setDescription(`
🎧 **Title:** [${track.title}](${track.uri})
👤 **Author:** ${track.author}
⏱️ **Length:** ${track.isStream ? '🔴 Live Stream' : formatDuration(track.length)}
🙋 **Requester:** ${track.requester?.username || 'Unknown'}
📺 **Source:** ${track.sourceName || 'youtube'}

🎮 **Progress:** ${progressBar} \`${currentTime} / ${totalTime}\`
                `)
                .setThumbnail(track.thumbnail || 'https://via.placeholder.com/200x200.png?text=🎵')
                .setFooter({
                    text: '💜 Music Player • ' + new Date().toLocaleTimeString('en-US', { hour12: false }),
                    iconURL: client.user.displayAvatarURL()
                });
        }

        // Create control buttons
        function createControlButtons() {
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_loop')
                        .setLabel('Loop')
                        .setEmoji('🔄')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_skip')
                        .setLabel('Skip')
                        .setEmoji('⏭️')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('music_lyrics')
                        .setLabel('Lyrics')
                        .setEmoji('🎵')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_clear')
                        .setLabel('Clear')
                        .setEmoji('🗑️')
                        .setStyle(ButtonStyle.Danger)
                );

            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_stop')
                        .setLabel('Stop')
                        .setEmoji('⏹️')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('music_pause')
                        .setLabel('Pause')
                        .setEmoji('⏸️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_resume')
                        .setLabel('Resume')
                        .setEmoji('▶️')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('music_volup')
                        .setLabel('Vol +')
                        .setEmoji('🔊')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_voldown')
                        .setLabel('Vol -')
                        .setEmoji('🔇')
                        .setStyle(ButtonStyle.Secondary)
                );

            return [row1, row2];
        }

        try {
            const buttons = createControlButtons();
            const message = await channel.send({
                embeds: [createEmbed(0)],
                components: buttons
            });
            player.nowPlayingMessage = message;
            player.startTime = Date.now();

            // Update web interface with current track
            currentWebTrack = {
                title: track.title,
                author: track.author,
                length: track.length,
                thumbnail: track.thumbnail,
                startTime: player.startTime,
                isStream: track.isStream,
                status: 'playing'
            };

            console.log(`🎶 Enhanced now playing embed with controls sent for: ${track.title}`);

            // Start progress bar animation (update every 1 second)
            if (!track.isStream) {
                player.progressInterval = setInterval(async () => {
                    try {
                        if (!player.playing || !player.nowPlayingMessage) {
                            clearInterval(player.progressInterval);
                            return;
                        }

                        const elapsed = Date.now() - player.startTime;
                        const updatedEmbed = createEmbed(elapsed);
                        const buttons = createControlButtons();

                        await player.nowPlayingMessage.edit({
                            embeds: [updatedEmbed],
                            components: buttons
                        });
                    } catch (error) {
                        console.error('❌ Failed to update progress bar:', error);
                        clearInterval(player.progressInterval);
                    }
                }, 1000); // Update every 1 second
            }
        } catch (error) {
            console.error('❌ Failed to send enhanced now playing embed:', error);
            await channel.send(`🎶 Now playing: **${track.title}** by ${track.author}`);
        }
    });

    client.manager.on('playerEmpty', async (player) => {
        console.log(`📭 Queue empty for guild: ${player.guildId}`);

        const channel = client.channels.cache.get(player.textId);
        if (channel) {
            await channel.send('👋 Queue ended. Add more songs or I\'ll disconnect in 2 minutes...');
        }

        // Clean up progress interval
        if (player.progressInterval) {
            clearInterval(player.progressInterval);
            player.progressInterval = null;
        }

        // Don't immediately delete the now playing message, let it stay for a bit

        // Set a longer timeout to prevent immediate disconnection
        if (player.emptyTimeout) {
            clearTimeout(player.emptyTimeout);
        }

        player.emptyTimeout = setTimeout(async () => {
            try {
                const currentPlayer = client.manager.players.get(player.guildId);
                if (currentPlayer && currentPlayer.queue.length === 0 && !currentPlayer.playing) {
                    console.log(`🔌 Auto-disconnect after queue empty timeout: ${player.guildId}`);

                    // Clean up now playing message before destroying
                    if (currentPlayer.nowPlayingMessage) {
                        try {
                            await currentPlayer.nowPlayingMessage.delete();
                        } catch (error) {
                            console.log('Could not delete now playing message:', error);
                        }
                        currentPlayer.nowPlayingMessage = null;
                    }

                    await currentPlayer.destroy();
                }
            } catch (error) {
                console.error('❌ Error in playerEmpty timeout:', error);
            }
        }, 120000); // 2 minutes instead of 15 seconds
    });

} catch (error) {
    console.log('⚠️ Lavalink dependencies not found, music features will be disabled');
}

// Initialize collections
client.commands = new Collection();
client.config = config;
client.logChannels = logChannels;
client.warnings = warnings;

// Load submissions
try {
    client.submissions = JSON.parse(fs.readFileSync('./config/submissions.json', 'utf8'));
} catch (error) {
    console.log('Creating new submissions file...');
    client.submissions = {};
}

// Load user data
try {
    client.userData = JSON.parse(fs.readFileSync('./config/user_data.json', 'utf8'));
} catch (error) {
    console.log('Creating new user data file...');
    client.userData = {};
}

// Global configuration and constants
global.VIOLATION_REASONS = {
    'ping_spam': 'excessive mentions detected',
    'link_spam': 'suspicious link posting behavior',
    'adult_site': 'posting adult/inappropriate content',
    'adult_invite': 'posting invite to adult/NSFW server',
    'blocked_keyword': 'using blocked/inappropriate language',
    'cross_channel_spam': 'posting the same message across multiple channels',
    'bypass_attempt': 'attempting to bypass word filters',
    'suspicious_formatting': 'suspicious text formatting patterns',
    'high_threat': 'high threat content detected',
    'rapid_posting': 'posting messages too rapidly',
    'account_too_new': 'new account suspicious activity'
};

global.SPAM_TIMEOUT_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

// Initialize appeal notification system
global.sendAppealButtonToUser = async function(user, guildId, client) {
    try {
        const { sendTimeoutAppealButton } = require('./utils/appealNotification');
        return await sendTimeoutAppealButton(user, guildId, 'general_violation', client);
    } catch (error) {
        console.error('Error in global appeal function:', error);
        return false;
    }
};

// Initialize global variables for various systems
global.afkUsers = new Map();
global.messageSniperData = [];
global.appealedUsers = new Set();
global.userMessages = new Map();
global.rateLimitCache = new Map();
global.verificationPending = new Map();

// Configuration constants
const SPAM_TIMEOUT_DURATION = 600000; // 10 minutes in milliseconds
const MAX_LINKS = 3;
const WINDOW_SECONDS = 30;
const DUP_WINDOW_SECONDS = 60;
const DUP_CHANNEL_THRESHOLD = 3;

// Violation reasons mapping
const VIOLATION_REASONS = {
    'ping_spam': 'excessive pings/mentions',
    'link_by_edit': 'adding a link in an edit',
    'blocked_keyword': 'posting a blocked keyword',
    'adult_site': 'linking to an adult site'
};

// Export for use in other files
global.VIOLATION_REASONS = VIOLATION_REASONS;
global.SPAM_TIMEOUT_DURATION = SPAM_TIMEOUT_DURATION;
global.MAX_LINKS = MAX_LINKS;
global.WINDOW_SECONDS = WINDOW_SECONDS;
global.DUP_WINDOW_SECONDS = DUP_WINDOW_SECONDS;
global.DUP_CHANNEL_THRESHOLD = DUP_CHANNEL_THRESHOLD;

// Load commands (with error handling)
try {
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
    console.log(`📋 Loading ${commandFiles.length} command files...`);

    for (const file of commandFiles) {
        try {
            // Clear require cache to avoid caching issues
            delete require.cache[require.resolve(`./commands/${file}`)];
            const command = require(`./commands/${file}`);

            // Enhanced validation
            if (!command.data) {
                console.warn(`⚠️ Skipping ${file}: Missing 'data' property`);
                continue;
            }

            if (!command.execute) {
                console.warn(`⚠️ Skipping ${file}: Missing 'execute' function`);
                continue;
            }

            if (typeof command.data.toJSON !== 'function') {
                console.warn(`⚠️ Skipping ${file}: Invalid SlashCommandBuilder`);
                continue;
            }

            // Test command structure
            try {
                const testData = command.data.toJSON();
                if (!testData.name || !testData.description) {
                    console.warn(`⚠️ Skipping ${file}: Invalid command structure`);
                    continue;
                }
            } catch (structureError) {
                console.warn(`⚠️ Skipping ${file}: Command structure validation failed - ${structureError.message}`);
                continue;
            }

            client.commands.set(command.data.name, command);
            console.log(`✅ Loaded command: ${command.data.name}`);

        } catch (error) {
            console.error(`❌ Error loading command ${file}:`, error.message);
        }
    }

    console.log(`📊 Successfully loaded ${client.commands.size} commands`);
} catch (error) {
    console.log('📁 Commands directory not found, skipping command loading');
}

// Load events (with error handling)
try {
    const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        try {
            const event = require(`./events/${file}`);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
        } catch (error) {
            console.error(`❌ Error loading event ${file}:`, error);
        }
    }
} catch (error) {
    console.log('📁 Events directory not found, skipping event loading');
}

const { AIPersonality } = require('./components/aiPersonality');
const AutomationHandler = require('./components/automationHandler');


// Ready event
// When the client is ready, run this code (only once)
client.once('ready', async () => {
    try {
        console.log(`✅ Ready! Logged in as ${client.user.tag}`);

        // Initialize config validation system
        const { initializeConfigSystem } = require('./utils/configManager');
        await initializeConfigSystem(client);

        // Set startup flag to prevent config writes during initialization
        process.env.BOT_STARTING = 'true';

        // Store client globally for warning system logging
        global.client = client;

        // Validate and initialize configurations
        console.log('🔧 Validating configuration files...');

        if (!configManager.validateConfigs()) {
            console.log('⚠️ Some config files are missing, creating them...');
        }

        // Load bot configuration
        const configPath = path.join(__dirname, 'config', 'config.json');
        if (fs.existsSync(configPath)) {
            try {
                const fileContent = fs.readFileSync(configPath, 'utf8').trim();
                if (fileContent) {
                    client.config = JSON.parse(fileContent);
                } else {
                    console.log('⚠️ Config file is empty, creating default...');
                    client.config = null;
                }
            } catch (parseError) {
                console.log('⚠️ Config file corrupted, creating default...');
                client.config = null;
            }
        } else {
            client.config = null;
        }

        if (!client.config) {
            console.log('⚠️ Config file not found, creating default...');
            client.config = {
                allowed_link_channel: null,
                max_mentions: 5,
                welcome_channel: {},
                goodbye_channel: {},
                welcome_message: {},
                goodbye_message: {},
                welcome_banner: {},
                goodbye_banner: {},
                lavalink: {
                    name: "MCK",
                    password: "tungtung",
                    host: "160.191.77.60",
                    port: 4272,
                    secure: false
                }
            };
            fs.writeFileSync(configPath, JSON.stringify(client.config, null, 2));
        }

        // Initialize configurations for existing servers if needed
        console.log('🔍 Checking configurations for existing servers...');
        for (const guild of client.guilds.cache.values()) {
            try {
                await configManager.initializeServerConfig(guild);
            } catch (error) {
                console.error(`Error initializing config for ${guild.name}:`, error);
            }
        }
        console.log(`📊 Serving ${client.guilds.cache.size} servers`);
        console.log(`👥 Total users: ${client.users.cache.size}`);
        console.log(`🏠 Serving ${client.guilds.cache.size} guilds`);
        console.log(`✅ Logged in as ${client.user.tag}`);

        // Clear startup flag - initialization complete
        delete process.env.BOT_STARTING;

        // Initialize AI personality system
        client.aiPersonality = new AIPersonality();
        console.log('🤖 AI personality system initialized');

        // Set up cleanup interval for AI personality
        setInterval(() => {
            if (client.aiPersonality) {
                client.aiPersonality.cleanup();
            }
        }, 30 * 60 * 1000); // Clean up every 30 minutes

        // Initialize raid protection system
        const { initializeRaidProtection } = require('./components/raidProtection');
        initializeRaidProtection(client);

        // Initialize captcha system
        const { initializeCaptchaSystem } = require('./components/captchaSystem');
        console.log(`🔐 Captcha system ${captchaConfig.enabled ? 'enabled' : 'disabled'}`);

        // Sync slash commands
        try {
            console.log('🔄 Starting global command sync...');

            // Enhanced command validation
            const validCommands = new Map();
            const invalidCommands = [];

            for (const [name, command] of client.commands.entries()) {
                try {
                    // Check if command has required properties
                    if (!command.data) {
                        invalidCommands.push({ name, reason: 'Missing data property' });
                        continue;
                    }

                    if (typeof command.data.toJSON !== 'function') {
                        invalidCommands.push({ name, reason: 'Invalid SlashCommandBuilder' });
                        continue;
                    }

                    // Test JSON serialization
                    const commandData = command.data.toJSON();

                    // Validate required fields
                    if (!commandData.name || commandData.name.length < 1 || commandData.name.length > 32) {
                        invalidCommands.push({ name, reason: 'Invalid command name' });
                        continue;
                    }

                    if (!commandData.description || commandData.description.length < 1 || commandData.description.length > 100) {
                        invalidCommands.push({ name, reason: 'Invalid description length' });
                        continue;
                    }

                    // Validate options ordering (required before optional)
                    if (commandData.options) {
                        let foundOptional = false;
                        for (const option of commandData.options) {
                            if (option.required === false || option.required === undefined) {
                                foundOptional = true;
                            } else if (foundOptional && option.required === true) {
                                invalidCommands.push({ name, reason: 'Required options must come before optional ones' });
                                break;
                            }
                        }
                    }

                    // If we get here, command is valid
                    validCommands.set(name, commandData);

                } catch (err) {
                    invalidCommands.push({ name, reason: err.message });
                }
            }

            // Log validation results
            if (invalidCommands.length > 0) {
                console.warn(`⚠️ Found ${invalidCommands.length} invalid commands:`);
                invalidCommands.forEach(({ name, reason }) => {
                    console.warn(`   - ${name}: ${reason}`);
                });
            }

            console.log(`📝 Syncing ${validCommands.size} valid commands...`);

            if (validCommands.size === 0) {
                console.warn('⚠️ No valid commands to sync!');
                return;
            }

            const commandsToSync = Array.from(validCommands.values());

            await client.application.commands.set(commandsToSync);
            console.log(`✅ Successfully synced ${commandsToSync.length} application (/) commands globally.`);

        } catch (error) {
            console.error('❌ Error during global command sync:', error);
            // Enhanced error reporting
            if (error.code === 50035) {
                console.error('💡 Discord API Validation Error:');
                if (error.errors) {
                    console.error('   Detailed errors:', JSON.stringify(error.errors, null, 2));
                }
                console.error('   Common fixes:');
                console.error('   - Ensure command names are lowercase, 1-32 characters');
                console.error('   - Ensure descriptions are 1-100 characters');
                console.error('   - Required options must come before optional ones');
                console.error('   - Choice values must be strings for string options');
            } else if (error.code === 50001) {
                console.error('💡 Missing Access - Bot may lack application.commands scope');
            } else if (error.code === 429) {
                console.error('💡 Rate Limited - Too many command updates');
            }

            // Don't crash the bot on command sync failure
            console.error('🔄 Bot will continue without command sync...');
        }

        try {
            const { WarningCleanupTask } = require('./tasks/warningCleanup');
            const cleanupTask = new WarningCleanupTask(client);
            cleanupTask.start();
            console.log('🧹 Warning cleanup task started');
        } catch (error) {
            console.log('⚠️ Warning cleanup task not loaded (optional feature)');
        }

        initializeCaptchaSystem(client);

        // Check music service availability
        setTimeout(() => {
            const connectedNodes = client.manager?.shoukaku?.nodes?.size || 0;
            if (connectedNodes === 0) {
                console.log('ℹ️ Music services are currently unavailable');
                console.log('ℹ️ Music commands will be disabled until Lavalink server is running');
            } else {
                console.log(`🎵 Music services ready with ${connectedNodes} node(s)`);
            }
        }, 5000);

        // Initialize admin panel handlers
        const { handleAdminPanelInteraction } = require('./components/adminPanelHandler');
        client.handleAdminPanelInteraction = handleAdminPanelInteraction;

        // Initialize automation handler
        const automationHandler = new AutomationHandler();
        client.automationHandler = automationHandler;

    } catch (error) {
        console.error('❌ Critical error during client ready event:', error);
        // Attempt to shut down if critical error occurs during startup
        if (client && typeof client.destroy === 'function') {
            client.destroy();
        }
        process.exit(1);
    }
});

// Single comprehensive interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // Enhanced interaction validation
        if (!interaction.isRepliable()) {
            console.log(`ℹ️ Non-repliable interaction from ${interaction.user?.tag || 'Unknown'}`);
            return;
        }

        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 2500) {
            console.log(`ℹ️ Stale interaction (${interactionAge}ms) from ${interaction.user?.tag || 'Unknown'}`);
            return;
        }

        // Handle Slash Command Interactions
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.warn(`⚠️ Unknown command: ${interaction.commandName} by ${interaction.user?.tag || 'Unknown'}`);

                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: '❌ **Error**: Command not found. Please try again later.',
                            flags: 64
                        });
                    }
                } catch (replyError) {
                    console.error('❌ Failed to reply to unknown command:', replyError.message);
                }
                return;
            }

            try {
                console.log(`📝 Executing command: ${interaction.commandName} by ${interaction.user?.tag || 'Unknown'}`);

                // Add command execution timeout
                await Promise.race([
                    command.execute(interaction),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Command execution timeout')), 2500)
                    )
                ]);
            } catch (error) {
                console.error(`❌ Command error [${interaction.commandName}]:`, error.message);

                // Enhanced error handling
                const skipErrors = [40060, 10062, 10008, 50013];
                if (!skipErrors.includes(error.code) && error.message !== 'Command execution timeout') {
                    try {
                        const errorMessage = '❌ **Error**: Command failed. Please try again.';

                        if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                            await interaction.reply({ content: errorMessage, flags: 64 });
                        } else if (interaction.deferred && !interaction.replied) {
                            await interaction.editReply({ content: errorMessage });
                        }
                    } catch (replyError) {
                        console.error('❌ Failed to send error reply:', replyError.message);
                    }
                }
            }
            return;
        }

        // Handle Button Interactions
        if (interaction.isButton()) {
            const { customId } = interaction;

            // Warning System Buttons
            if (customId.startsWith('warn_') || customId.startsWith('export_')) {
                const { handleWarningButtons } = require('./components/warningButtons');
                await handleWarningButtons(interaction);
                return;
            }

            // Appeal Button Interactions
            if (customId.startsWith('appeal|timeout|')) {
                console.log(`🔘 Appeal button interaction from ${interaction.user.tag}`);
                await handleAppealButton(interaction);
                return;
            }

            // Appeal decision button interactions (approve/deny)
            if (customId.startsWith('appeal|approve|') || customId.startsWith('appeal|deny|')) {
                console.log(`⚖️ Appeal decision button clicked by ${interaction.user.tag}: ${customId}`);
                await handleAppealDecision(interaction);
                return;
            }
            // Warning Appeal Button Interactions
            if (customId.startsWith('warning_appeal|')) {
                const { handleWarningAppealButton } = require('./components/appealView');
                await handleWarningAppealButton(interaction);
                return;
            }

            // Warning Appeal decision button interactions (approve/deny)
            if (customId.startsWith('warning_appeal_approve|') || customId.startsWith('warning_appeal_deny|')) {
                const { handleWarningAppealDecision } = require('./components/appealView');
                await handleWarningAppealDecision(interaction);
                return;
            }

            // Initialize missing appeal systems if needed
            if (!global.pendingWarningAppeals) {
                global.pendingWarningAppeals = new Map();
            }
            // Poll vote button interactions
            if (customId.startsWith('poll_vote|')) {
                const { handlePollVote } = require('./components/votingHandlers');
                await handlePollVote(interaction);
                return;
            }

            // Music control button interactions
            if (customId.startsWith('music_')) {
                console.log(`🎵 Music control button clicked by ${interaction.user.tag}: ${customId}`);
                await handleMusicControls(interaction);
                return;
            }

            // Minecraft integration button interactions
            if (customId.startsWith('mc_')) {
                const { MinecraftBridge } = require('./components/minecraftBridge');
                const bridge = new MinecraftBridge(client);
                await handleMinecraftButtons(interaction, bridge);
                return;
            }

            // Feedback button interactions
            if (customId.startsWith('feedback_')) {
                const targetUserId = customId.split('_')[1];

                const modal = new ModalBuilder()
                    .setCustomId(`feedback_modal_${targetUserId}_${interaction.user.id}`)
                    .setTitle('Send Feedback to Submitter');

                const feedbackInput = new TextInputBuilder()
                    .setCustomId('feedbackContent')
                    .setLabel('Your feedback')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Write your feedback here…')
                    .setRequired(true);

                const identityInput = new TextInputBuilder()
                    .setCustomId('revealIdentity')
                    .setLabel('Reveal your identity? (yes / no)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('yes or no')
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(feedbackInput),
                    new ActionRowBuilder().addComponents(identityInput)
                );

                await interaction.showModal(modal);
                return;
            }
        }

        // Handle Modal Submissions
        if (interaction.isModalSubmit()) {
            const { customId } = interaction;

            // Warning System Modals
            if (customId.startsWith('warn_modal_') || customId.startsWith('export_')) {
                const { handleWarningModals } = require('./components/warningModals');
                await handleWarningModals(interaction);
                return;
            }

            // Appeal Modal Submissions
            if (customId.startsWith('appeal|modal|')) {
                console.log(`📝 Appeal modal submission from ${interaction.user.tag}`);
                await handleAppealModal(interaction);
                return;
            }
             // Warning Appeal Modal Submissions
            if (customId.startsWith('warning_appeal_modal|')) {
                const { handleWarningAppealModal } = require('./components/appealView');
                await handleWarningAppealModal(interaction);
                return;
            }
            // Poll options modal submissions
            if (customId.startsWith('poll_options|')) {
                const { handlePollCreation } = require('./components/votingHandlers');
                await handlePollCreation(interaction);
                return;
            }

            // Feedback modal submissions
            if (customId.startsWith('feedback_modal_')) {
                const [, , targetUserId, modId] = customId.split('_');
                const feedback = interaction.fields.getTextInputValue('feedbackContent');
                const reveal = interaction.fields.getTextInputValue('revealIdentity').toLowerCase() === 'yes';

                const user = await client.users.fetch(targetUserId).catch(() => null);
                if (!user) {
                    await interaction.reply({ content: '❌ Couldn\'t find that user.', flags: 64 });
                    return;
                }

                const dmEmbed = new EmbedBuilder()
                    .setTitle('📬 You\'ve received feedback!')
                    .setDescription(feedback)
                    .setFooter({
                        text: reveal ? `From: ${interaction.user.tag}` : 'From: Mod team',
                    })
                    .setTimestamp();

                await user.send({ embeds: [dmEmbed] }).catch(() => {
                    /* user DMs closed */
                });

                await interaction.reply({ content: '✅ Feedback sent!', flags: 64 });
                return;
            }
        }

        // Handle admin panel interactions
        if (interaction.customId?.startsWith('admin_')) {
            await client.handleAdminPanelInteraction(interaction);
            return;
        }

        // Handle server management interactions
        if (await handleServerManagementInteractions(interaction)) {
            return;
        }

        // Handle automation interactions
        if (interaction.customId?.startsWith('automation_')) {
            await automationHandler.handleAutomationInteraction(interaction);
            return;
        }

        // Handle interactive entertainment interactions
        if (interaction.customId?.startsWith('story_') || interaction.customId?.startsWith('drawing_') ||
            interaction.customId?.startsWith('pet_') || interaction.customId?.startsWith('escape_')) {
            const { InteractiveSystem } = require('./components/interactiveSystem');
            const interactiveSystem = new InteractiveSystem();

            if (interaction.isButton()) {
                await interactiveSystem.handleInteractiveButtons(interaction);
            } else if (interaction.isModalSubmit()) {
                await interactiveSystem.handleInteractiveModals(interaction);
            }
            return;
        }

    } catch (error) {
        console.error('❌ Unhandled interaction error:', error);

        try {
            const errorMessage = '❌ **Error**: Something went wrong processing your request. Please try again later.';

            // Skip error reply for expired/unknown interactions or already acknowledged
            if (error.code !== 10062 && error.code !== 40060) {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: errorMessage, flags: 64 });
                } else if (interaction.deferred && !interaction.replied) {
                    await interaction.editReply({ content: errorMessage });
                }
            } else {
                console.log(`ℹ️ Skipping error reply due to interaction state (code: ${error.code})`);
            }
        } catch (replyError) {
            console.error('❌ Failed to send error message:', replyError);
        }
    }
});

// Enhanced error handling for the client
client.on('error', (error) => {
    console.error('❌ Discord.js client error:', error);
});

client.on('warn', (info) => {
    console.warn('⚠️ Discord.js warning:', info);
});

// Initialize captcha system when ready
client.once('ready', () => {
    try {
        const { initializeCaptchaSystem } = require('./components/captchaSystem');
        initializeCaptchaSystem(client);

        // Initialize stats if not present
        if (!client.captchaStats) {
            client.captchaStats = {
                totalVerifications: 0,
                successfulVerifications: 0,
                failedVerifications: 0,
                pendingVerifications: 0,
                totalAttempts: 0
            };
        }
    } catch (error) {
        console.error('❌ Error initializing captcha system:', error);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('❌ Reason:', reason?.message || reason);

    // Log stack trace for debugging
    if (reason?.stack) {
        console.error('❌ Stack:', reason.stack);
    }

    // Don't crash on unhandled rejections
    if (process.env.NODE_ENV !== 'production') {
        console.error('Full error details:', reason);
    }
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    console.error('❌ Stack:', error.stack);

    // Try to gracefully shut down
    try {
        if (client && typeof client.destroy === 'function') {
            console.log('🔄 Attempting graceful shutdown...');
            client.destroy();
        }
    } catch (shutdownError) {
        console.error('❌ Error during shutdown:', shutdownError.message);
    }

    // Force exit after cleanup attempt
    setTimeout(() => {
        console.log('🚪 Forcing process exit...');
        process.exit(1);
    }, 2000);
});

// Add graceful shutdown handling
process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    if (client && typeof client.destroy === 'function') {
        client.destroy();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    if (client && typeof client.destroy === 'function') {
        client.destroy();
    }
    process.exit(0);
});

// Enhanced logging event handlers
const { logAction } = require('./utils/loggingSystem');

// Role update logging
client.on('roleCreate', async (role) => {
    try {
        await logAction(role.guild, 'role_change', {
            role: role,
            action: 'created',
            moderator: null // System action
        });
    } catch (error) {
        console.error('❌ Error logging role create:', error);
    }
});

client.on('roleDelete', async (role) => {
    try {
        await logAction(role.guild, 'role_change', {
            role: role,
            action: 'deleted',
            moderator: null // System action
        });
    } catch (error) {
        console.error('❌ Error logging role delete:', error);
    }
});

client.on('roleUpdate', async (oldRole, newRole) => {
    try {
        await logAction(newRole.guild, 'role_change', {
            role: newRole,
            action: 'updated',
            oldRole: oldRole,
            moderator: null // System action
        });
    } catch (error) {
        console.error('❌ Error logging role update:', error);
    }
});

// Channel logging
client.on('channelCreate', async (channel) => {
    try {
        if (channel.guild) {
            await logAction(channel.guild, 'channel_change', {
                channel: channel,
                action: 'created',
                moderator: null
            });
        }
    } catch (error) {
        console.error('❌ Error logging channel create:', error);
    }
});

client.on('channelDelete', async (channel) => {
    try {
        if (channel.guild) {
            await logAction(channel.guild, 'channel_change', {
                channel: channel,
                action: 'deleted',
                moderator: null
            });
        }
    } catch (error) {
        console.error('❌ Error logging channel delete:', error);
    }
});

client.on('channelUpdate', async (oldChannel, newChannel) => {
    try {
        if (newChannel.guild) {
            await logAction(newChannel.guild, 'channel_change', {
                channel: newChannel,
                action: 'updated',
                oldChannel: oldChannel,
                moderator: null
            });
        }
    } catch (error) {
        console.error('❌ Error logging channel update:', error);
    }
});

// Voice state logging
client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        if (!newState.guild) return;

        if (!oldState.channel && newState.channel) {
            // User joined voice
            await logAction(newState.guild, 'voice_join', {
                member: newState.member,
                channel: newState.channel
            }, newState.member.user);
        } else if (oldState.channel && !newState.channel) {
            // User left voice
            await logAction(oldState.guild, 'voice_leave', {
                member: oldState.member,
                channel: oldState.channel,
                sessionDuration: Date.now() - (oldState.member.voiceJoinedAt || Date.now())
            }, oldState.member.user);
        } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            // User moved channels
            await logAction(newState.guild, 'voice_move', {
                member: newState.member,
                oldChannel: oldState.channel,
                newChannel: newState.channel
            }, newState.member.user);
        }
    } catch (error) {
        console.error('❌ Error logging voice state update:', error);
    }
});

// User update logging
client.on('userUpdate', async (oldUser, newUser) => {
    try {
        // Check for avatar changes
        if (oldUser.avatar !== newUser.avatar) {
            for (const guild of client.guilds.cache.values()) {
                if (guild.members.cache.has(newUser.id)) {
                    await logAction(guild, 'avatar_change', {
                        user: newUser,
                        oldAvatar: oldUser.displayAvatarURL(),
                        newAvatar: newUser.displayAvatarURL()
                    }, newUser);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error logging user update:', error);
    }
});

// Guild member update logging
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
        // Check for nickname changes
        if (oldMember.nickname !== newMember.nickname) {
            await logAction(newMember.guild, 'nickname_change', {
                member: newMember,
                oldNickname: oldMember.nickname,
                newNickname: newMember.nickname
            }, newMember.user);
        }

        // Check for role changes
        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        if (oldRoles.size !== newRoles.size || !oldRoles.every(role => newRoles.has(role.id))) {
            const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
            const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

            if (addedRoles.size > 0 || removedRoles.size > 0) {
                await logAction(newMember.guild, 'role_change', {
                    member: newMember,
                    addedRoles: addedRoles.map(r => r.name),
                    removedRoles: removedRoles.map(r => r.name),
                    action: 'member_roles_updated'
                }, newMember.user);
            }
        }
    } catch (error) {
        console.error('❌ Error logging guild member update:', error);
    }
});

// Ban/Unban logging
client.on('guildBanAdd', async (ban) => {
    try {
        await logAction(ban.guild, 'ban', {
            user: ban.user,
            reason: ban.reason || 'No reason provided',
            moderator: null // Would need audit log to get moderator
        }, ban.user);
    } catch (error) {
        console.error('❌ Error logging ban:', error);
    }
});

client.on('guildBanRemove', async (ban) => {
    try {
        await logAction(ban.guild, 'ban', {
            user: ban.user,
            action: 'unbanned',
            moderator: null // Would need audit log to get moderator
        }, ban.user);
    } catch (error) {
        console.error('❌ Error logging unban:', error);
    }
});

// Emoji logging
client.on('emojiCreate', async (emoji) => {
    try {
        await logAction(emoji.guild, 'emoji_create', {
            emoji: emoji,
            name: emoji.name,
            id: emoji.id
        });
    } catch (error) {
        console.error('❌ Error logging emoji create:', error);
    }
});

client.on('emojiDelete', async (emoji) => {
    try {
        await logAction(emoji.guild, 'emoji_delete', {
            emoji: emoji,
            name: emoji.name,
            id: emoji.id
        });
    } catch (error) {
        console.error('❌ Error logging emoji delete:', error);
    }
});

client.on('emojiUpdate', async (oldEmoji, newEmoji) => {
    try {
        await logAction(newEmoji.guild, 'emoji_update', {
            emoji: newEmoji,
            oldName: oldEmoji.name,
            newName: newEmoji.name
        });
    } catch (error) {
        console.error('❌ Error logging emoji update:', error);
    }
});

// Thread logging
client.on('threadCreate', async (thread) => {
    try {
        await logAction(thread.guild, 'thread_create', {
            thread: thread,
            name: thread.name,
            parent: thread.parent
        });
    } catch (error) {
        console.error('❌ Error logging thread create:', error);
    }
});

client.on('threadDelete', async (thread) => {
    try {
        await logAction(thread.guild, 'thread_delete', {
            thread: thread,
            name: thread.name,
            parent: thread.parent
        });
    } catch (error) {
        console.error('❌ Error logging thread delete:', error);
    }
});

// Invite logging
client.on('inviteCreate', async (invite) => {
    try {
        await logAction(invite.guild, 'invite_create', {
            invite: invite,
            inviter: invite.inviter,
            channel: invite.channel,
            code: invite.code
        });
    } catch (error) {
        console.error('❌ Error logging invite create:', error);
    }
});

client.on('inviteDelete', async (invite) => {
    try {
        await logAction(invite.guild, 'invite_delete', {
            invite: invite,
            channel: invite.channel,
            code: invite.code
        });
    } catch (error) {
        console.error('❌ Error logging invite delete:', error);
    }
});

// Add additional music event handlers if Lavalink is available
if (kazagumoInitialized) {
    client.manager.on('playerStart', (player, track) => {
        console.log(`✅ playerStart triggered: ${track.title}`);
    });

    client.manager.on('playerEnd', (player) => {
        console.log(`⏹️ playerEnd triggered`);

        // Clean up progress interval
        if (player.progressInterval) {
            clearInterval(player.progressInterval);
            player.progressInterval = null;
        }

        // Clean up now playing message on track end
        if (player.nowPlayingMessage) {
            try {
                player.nowPlayingMessage.delete().catch(() => {});
            } catch (error) {
                console.log('Could not delete now playing message:', error);
            }
            player.nowPlayingMessage = null;
        }
    });

    client.manager.on('trackStart', (player, track) => {
        console.log(`🎶 trackStart: ${track.title}`);
    });

    client.manager.on('trackEnd', (player, track) => {
        console.log(`🏁 trackEnd: ${track.title}`);
    });

    // Load voice utilities if available
    try {
        const { registerKazagumoEvents } = require('./utils/voice');
        registerKazagumoEvents(client);
    } catch (error) {
        console.log('📁 Voice utilities not found, skipping voice event registration');
    }
}

// Utility functions
function saveConfig() {
    try {
        // Ensure config directory exists
        if (!fs.existsSync('./config')) {
            fs.mkdirSync('./config');
        }
        fs.writeFileSync('./config/config.json', JSON.stringify(client.config, null, 4));
        console.log('💾 Config saved successfully');
    } catch (error) {
        console.error('❌ Error saving config:', error);
    }
}

function saveLogChannels() {
    try {
        if (!fs.existsSync('./config')) {
            fs.mkdirSync('./config');
        }
        fs.writeFileSync('./config/log_channels.json', JSON.stringify(client.logChannels, null, 4));
        console.log('💾 Log channels saved successfully');
    } catch (error) {
        console.error('❌ Error saving log channels:', error);
    }
}

function saveWarnings() {
    try {
        if (!fs.existsSync('./config')) {
            fs.mkdirSync('./config');
        }
        fs.writeFileSync('./config/warnings.json', JSON.stringify(client.warnings, null, 4));
        console.log('💾 Warnings saved successfully');
    } catch (error) {
        console.error('❌ Error saving warnings:', error);
    }
}

// Music control handler function
async function handleMusicControls(interaction) {
    const player = interaction.client.manager.players.get(interaction.guild.id);

    if (!player) {
        return interaction.reply({
            content: '❌ No active music player found!',
            flags: 64
        });
    }

    const { customId } = interaction;

    try {
        switch (customId) {
            case 'music_pause':
                if (player.playing) {
                    // Store pause time to maintain accurate progress tracking
                    player.pausedAt = Date.now();
                    player.pause(true);

                    // Clear the progress interval
                    if (player.progressInterval) {
                        clearInterval(player.progressInterval);
                        player.progressInterval = null;
                    }

                    // Update web interface
                    if (currentWebTrack) {
                        currentWebTrack.status = 'paused';
                    }

                    await interaction.reply({
                        content: '⏸️ Music paused!',
                        flags: 64
                    });
                } else {
                    await interaction.reply({
                        content: '❌ Music is already paused!',
                        flags: 64
                    });
                }
                break;

            case 'music_resume':
                if (player.paused) {
                    // Calculate total elapsed time before pause and adjust start time
                    if (player.pausedAt && player.startTime) {
                        const pausedDuration = player.pausedAt - player.startTime;
                        player.startTime = Date.now() - pausedDuration;
                    }
                    player.pausedAt = null;

                    player.pause(false);

                    // Restart progress tracking
                    const track = player.queue.current;
                    if (track && !track.isStream && player.nowPlayingMessage) {
                        player.progressInterval = setInterval(async () => {
                            try {
                                if (!player.playing || !player.nowPlayingMessage) {
                                    clearInterval(player.progressInterval);
                                    return;
                                }

                                const elapsed = Date.now() - player.startTime;
                                const updatedEmbed = createEmbed(elapsed);
                                const buttons = createControlButtons();

                                await player.nowPlayingMessage.edit({
                                    embeds: [updatedEmbed],
                                    components: buttons
                                });
                            } catch (error) {
                                console.error('❌ Failed to update progress bar:', error);
                                clearInterval(player.progressInterval);
                            }
                        }, 1000);
                    }

                    // Update web interface
                    if (currentWebTrack) {
                        currentWebTrack.status = 'playing';
                        currentWebTrack.startTime = player.startTime;
                    }

                    await interaction.reply({
                        content: '▶️ Music resumed!',
                        flags: 64
                    });
                } else {
                    await interaction.reply({
                        content: '❌ Music is already playing!',
                        flags: 64
                    });
                }
                break;

            case 'music_stop':
                if (player.progressInterval) {
                    clearInterval(player.progressInterval);
                    player.progressInterval = null;
                }
                if (player.nowPlayingMessage) {
                    try {
                        await player.nowPlayingMessage.delete();
                    } catch (error) {
                        console.log('Could not delete now playing message:', error);
                    }
                }

                // Clear web interface
                currentWebTrack = null;

                await player.destroy();
                await interaction.reply({
                    content: '⏹️ Music stopped and disconnected!',
                    flags: 64
                });
                break;

            case 'music_skip':
                if (player.queue.current) {
                    const skipped = player.queue.current;
                    player.skip();
                    await interaction.reply({
                        content: `⏭️ Skipped: **${skipped?.title || 'current track'}**`,
                        flags: 64
                    });
                } else {
                    await interaction.reply({
                        content: '❌ No track currently playing to skip!',
                        flags: 64
                    });
                }
                break;

            case 'music_loop':
                // Toggle loop mode
                if (player.loop === 'none') {
                    player.setLoop('track');
                    await interaction.reply({
                        content: '🔄 Loop mode: **Track** - Current song will repeat!',
                        flags: 64
                    });
                } else if (player.loop === 'track') {
                    player.setLoop('queue');
                    await interaction.reply({
                        content: '🔄 Loop mode: **Queue** - All songs will repeat!',
                        flags: 64
                    });
                } else {
                    player.setLoop('none');
                    await interaction.reply({
                        content: '🔄 Loop mode: **Off** - No repeating!',
                        flags: 64
                    });
                }
                break;

            case 'music_clear':
                if (player.queue.size > 0) {
                    player.queue.clear();
                    await interaction.reply({
                        content: '🗑️ Queue cleared!',
                        flags: 64
                    });
                } else {
                    await interaction.reply({
                        content: '❌ Queue is already empty!',
                        flags: 64
                    });
                }
                break;

            case 'music_volup':
                const currentVol = player.volume ?? 100;
                const newVolUp = Math.min(currentVol + 10, 200);
                await player.setVolume(newVolUp);
                await interaction.reply({
                    content: `🔊 Volume increased to ${newVolUp}%`,
                    flags: 64
                });
                break;

            case 'music_voldown':
                const currentVolDown = player.volume ?? 100;
                const newVolDown = Math.max(currentVolDown - 10, 0);
                await player.setVolume(newVolDown);
                await interaction.reply({
                    content: `🔇 Volume decreased to ${newVolDown}%`,
                    flags: 64
                });
                break;

            case 'music_lyrics':
                const currentTrack = player.queue.current;
                if (!currentTrack) {
                    await interaction.reply({
                        content: '❌ No track currently playing!',
                        flags: 64
                    });
                    break;
                }

                try {
                    await interaction.reply({
                        content: '🎵 Searching for lyrics...',
                        flags: 64
                    });

                    // Use a simple lyrics API approach
                    const lyricsEmbed = new EmbedBuilder()
                        .setColor('#FF6B35')
                        .setTitle(`🎵 Lyrics: ${currentTrack.title}`)
                        .setDescription(`**Author:** ${currentTrack.author}\n\n📝 Lyrics search feature is under development!\n\nFor now, you can search for lyrics manually:\n🔍 **Google:** "${currentTrack.title} ${currentTrack.author} lyrics"\n🎵 **Genius:** genius.com\n🎶 **AZLyrics:** azlyrics.com`)
                        .setThumbnail(currentTrack.thumbnail)
                        .setFooter({
                            text: 'Lyrics • Developed by Senpai',
                            iconURL: 'https://cdn.discordapp.com/emojis/865916418909536276.gif'
                        });

                    await interaction.editReply({
                        content: '',
                        embeds: [lyricsEmbed]
                    });
                } catch (error) {
                    console.error('❌ Error fetching lyrics:', error);
                    await interaction.editReply({
                        content: '❌ Failed to fetch lyrics. Please try again later.'
                    });
                }
                break;

            default:
                await interaction.reply({
                    content: '❌ Unknown control!',
                    flags: 64
                });
        }
    } catch (error) {
        console.error('❌ Error handling music control:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ Error executing music control!',
                flags: 64
            });
        }
    }
}

// Files to copy for integration
const filesToCopy = [
    'components/warningSystem.js',
    'components/warningButtons.js',
    'components/warningModals.js',
    'commands/warnings.js',
    'tasks/warningCleanup.js',
    'config/config.json',
    'deploy-guild-commands.js'
];

// Initialize captcha system
// Already imported above for 'ready' event, ensure no duplication if this block is moved.
// const { initializeCaptchaSystem, handleMemberJoin, handleCaptchaInteraction } = require('./components/captchaSystem');
let captchaConfig;

// Load captcha config with error handling
try {
    captchaConfig = require('./config/captcha_config.json');
} catch (error) {
    console.log('📝 Creating default captcha_config.json...');
    captchaConfig = {
        enabled: true,
        difficulty: 'medium',
        timeoutMinutes: 10,
        maxAttempts: 3,
        verificationChannelId: null,
        unverifiedRoleId: null,
        verifiedRoleId: null,
        requireManualReview: false,
        logVerifications: true,
        dmVerification: true
    };
    const fs = require('fs');
    const path = require('path');
    const configDir = path.join(__dirname, 'config');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(path.join(configDir, 'captcha_config.json'), JSON.stringify(captchaConfig, null, 2));
}


webApp.use(cors());
webApp.use(express.json());
webApp.use(express.static(path.join(__dirname, 'web')));


webApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'progress.html'));
});

// Add captcha status endpoint
webApp.get('/captcha', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'captcha-status.html'));
});

// Add admin dashboard endpoint
webApp.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'dashboard.html'));
});

webApp.post('/api/track', (req, res) => {
    currentWebTrack = req.body;
    console.log('📊 Web track data updated');
    res.json({ success: true });
});

webApp.get('/api/track', (req, res) => {
    res.json(currentWebTrack || { status: 'no_track' });
});

// Add captcha stats endpoint
webApp.get('/api/captcha-stats', (req, res) => {
    const stats = client.captchaStats || {
        totalVerifications: 0,
        successfulVerifications: 0,
        failedVerifications: 0,
        pendingVerifications: 0,
        totalAttempts: 0
    };
    res.json(stats);
});

webApp.listen(8000, '0.0.0.0', () => {
    console.log('🌐 Real-time progress web server running at http://0.0.0.0:8000');
    console.log('🔐 Captcha status available at http://0.0.0.0:8000/captcha');
    console.log('👨‍💼 Admin dashboard available at http://0.0.0.0:8000/dashboard');
});

client.on(Events.GuildMemberAdd, async member => {
    console.log(`👤 New member joined: ${member.user.tag} (${member.id})`);

    // Handle captcha verification for new members
    if (captchaConfig.enabled) {
        // Load and execute captcha verification
        try {
            const { handleMemberJoin } = require('./components/captchaSystem');
            if (typeof handleMemberJoin === 'function') {
                await handleMemberJoin(member, member.client);
            } else {
                console.error('❌ handleMemberJoin is not a function');
            }
        } catch (error) {
            console.error('❌ Error loading captcha system:', error);
        }
    }

    // Handle welcome system
    try {
        const { loadWelcomeConfig, formatMessage } = require('./commands/welcomer');
        const welcomeConfig = loadWelcomeConfig();
        const guildConfig = welcomeConfig[member.guild.id];

        if (guildConfig) {
            // Send welcome message
            if (guildConfig.welcome && guildConfig.welcome.enabled) {
                const welcomeChannel = member.guild.channels.cache.get(guildConfig.welcome.channelId);
                if (welcomeChannel) {
                    const welcomeMessage = formatMessage(guildConfig.welcome.message, member, member.guild);
                    const welcomeEmbed = new EmbedBuilder()
                        .setTitle(guildConfig.welcome.title)
                        .setDescription(welcomeMessage)
                        .setColor(guildConfig.welcome.color)
                        .setThumbnail(member.user.displayAvatarURL())
                        .setTimestamp();

                    await welcomeChannel.send({ embeds: [welcomeEmbed] });
                }
            }

            // Assign auto role
            if (guildConfig.autoRole && guildConfig.autoRole.enabled) {
                const autoRole = member.guild.roles.cache.get(guildConfig.autoRole.roleId);
                if (autoRole) {
                    await member.roles.add(autoRole).catch(console.error);
                }
            }

            // Send DM message
            if (guildConfig.dm && guildConfig.dm.enabled) {
                const dmMessage = formatMessage(guildConfig.dm.message, member, member.guild);
                await member.send(dmMessage).catch(() => {
                    console.log(`Could not send DM to ${member.user.tag}`);
                });
            }
        }
    } catch (error) {
        console.error('❌ Error in welcome system:', error);
    }

    // Log the join event
    const logChannel = client.channels.cache.get(logChannels[member.guild.id]);
    if (logChannel) {
        const joinEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('👤 Member Joined')
            .setDescription(`${member.user.tag} joined the server`)
            .addFields(
                { name: 'User ID', value: member.id, inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Captcha Required', value: captchaConfig.enabled ? 'Yes' : 'No', inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        await logChannel.send({ embeds: [joinEmbed] });
    }
});


// Function to copy files
//function copyWarningSystem(targetDirectory) {
//    console.log('📁 Copying Warning System files...\n');
//
//    if (!fs.existsSync(targetDirectory)) {
//        console.log(`❌ Target directory "${targetDirectory}" does not exist!`);
//        return;
//    }
//
//    let copiedCount = 0;
//
//    filesToCopy.forEach(file => {
//        const sourcePath = path.join(__dirname, file);
//        const targetPath = path.join(targetDirectory, file);
//
//        if (fs.existsSync(sourcePath)) {
//            // Create directory if it doesn't exist
//            const targetDir = path.dirname(targetPath);
//            if (!fs.existsSync(targetDir)) {
//                fs.mkdirSync(targetDir, { recursive: true });
//                console.log(`📁 Created directory: ${targetDir}`);
//            }
//
//            // Copy file
//            fs.copyFileSync(sourcePath, targetPath);
//            console.log(`✅ Copied: ${file}`);
//            copiedCount++;
//        } else {
//            console.log(`⚠️  File not found: ${file}`);
//        }
//    });
//
//    console.log(`\n🎉 Successfully copied ${copiedCount} files!`);
//    console.log(`\n📋 Next steps:`);
//    console.log(`1. Add interaction handlers to your main bot file (see INTEGRATION_GUIDE.md)`);
//    console.log(`2. Run: node deploy-guild-commands.js`);
//    console.log(`3. Test with /warn command in Discord`);
//}

// Get target directory from command line argument
//const targetDir = process.argv[2];

//if (!targetDir) {
//    console.log('❌ Please provide target directory path');
//    console.log('Usage: node copy-to-main-bot.js /path/to/your/main/bot');
//    process.exit(1);
//}

//copyWarningSystem(targetDir);

// Export utility functions
global.saveConfig = saveConfig;
global.saveLogChannels = saveLogChannels;
global.saveWarnings = saveWarnings;
global.sendAppealButtonToUser = sendAppealButtonToUser;

// Handle server management interactions
async function handleServerManagementInteractions(interaction) {
    // This function should handle server management related interactions
    // Currently returning false to indicate no handling
    return false;
}

// Export utility functions
module.exports = {
    saveConfig,
    saveLogChannels,
    saveWarnings,
    handleMusicControls
};


// Login to Discord with token
const token = process.env.DISCORD_TOKEN || 'token';

// Make client globally available for web dashboard
global.discordClient = client;

client.login(token).catch(error => {
    console.error('❌ Failed to login to Discord:', error);
    process.exit(1);
});

// Minecraft button handler function
async function handleMinecraftButtons(interaction, bridge) {
    const { customId } = interaction;

    try {
        if (customId.startsWith('mc_refresh_')) {
            const serverName = customId.replace('mc_refresh_', '');
            const server = bridge.config.servers[interaction.guild.id]?.[serverName];

            if (!server) {
                return interaction.reply({ content: '❌ Server not found!', flags: 64 });
            }

            await interaction.deferUpdate();

            const status = await bridge.getServerStatus(server.host, server.port);
            const embed = bridge.createStatusEmbed(serverName, status, server.host, server.port);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mc_refresh_${serverName}`)
                        .setLabel('Refresh')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`mc_players_${serverName}`)
                        .setLabel('Players')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({ embeds: [embed], components: [row] });

        } else if (customId.startsWith('mc_players_')) {
            const serverName = customId.replace('mc_players_', '');
            const server = bridge.config.servers[interaction.guild.id]?.[serverName];

            if (!server) {
                return interaction.reply({ content: '❌ Server not found!', flags: 64 });
            }

            if (!server.rconPort || !server.rconPassword) {
                return interaction.reply({
                    content: '❌ RCON not configured for player list!',
                    flags: 64
                });
            }

            await interaction.deferReply({ flags: 64 });

            const connected = await bridge.connectRcon(server.host, server.rconPort, server.rconPassword);
            if (!connected) {
                return interaction.editReply({ content: '❌ RCON connection failed!' });
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

        } else if (customId === 'mc_toggle_integration') {
            bridge.config.enabled = !bridge.config.enabled;
            bridge.saveConfig();

            await interaction.reply({
                content: `🎮 Minecraft integration ${bridge.config.enabled ? 'enabled' : 'disabled'}!`,
                flags: 64
            });

        } else if (customId === 'mc_toggle_chat') {
            bridge.config.chatBridge.enabled = !bridge.config.chatBridge.enabled;
            bridge.saveConfig();

            await interaction.reply({
                content: `💬 Chat bridge ${bridge.config.chatBridge.enabled ? 'enabled' : 'disabled'}!`,
                flags: 64
            });
        }
    } catch (error) {
        console.error('❌ Error handling Minecraft button:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Error processing request!', flags: 64 });
        }
    }
}