
const fs = require('fs');
const path = require('path');

class ConfigManager {
    constructor() {
        this.configDir = path.join(__dirname, '..', 'config');
        this.ensureConfigDir();
    }

    ensureConfigDir() {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    async initializeServerConfig(guild) {
        console.log(`🔧 Initializing configuration for new server: ${guild.name} (${guild.id})`);
        
        try {
            // Initialize main config
            await this.initializeMainConfig(guild.id);
            
            // Initialize logging config
            await this.initializeLoggingConfig(guild.id);
            
            // Initialize AI chat config
            await this.initializeAiChatConfig(guild.id);
            
            // Initialize other required configs
            await this.initializeOtherConfigs(guild.id);
            
            console.log(`✅ Configuration initialized successfully for ${guild.name}`);
            return true;
        } catch (error) {
            console.error(`❌ Error initializing config for ${guild.name}:`, error);
            return false;
        }
    }

    async initializeMainConfig(guildId) {
        const configPath = path.join(this.configDir, 'config.json');
        let config = {};
        
        if (fs.existsSync(configPath)) {
            try {
                const fileContent = fs.readFileSync(configPath, 'utf8').trim();
                if (fileContent) {
                    config = JSON.parse(fileContent);
                } else {
                    console.log('📝 Config file is empty, creating default config...');
                    config = {};
                }
            } catch (parseError) {
                console.log('📝 Config file corrupted, creating new default config...');
                config = {};
            }
        } else {
            config = {
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
        }

        // Add guild-specific defaults if not present
        let configChanged = false;
        
        if (!config.welcome_channel[guildId]) {
            config.welcome_channel[guildId] = null;
            configChanged = true;
        }
        if (!config.goodbye_channel[guildId]) {
            config.goodbye_channel[guildId] = null;
            configChanged = true;
        }
        if (!config.welcome_message[guildId]) {
            config.welcome_message[guildId] = null;
            configChanged = true;
        }
        if (!config.goodbye_message[guildId]) {
            config.goodbye_message[guildId] = null;
            configChanged = true;
        }
        if (!config.welcome_banner[guildId]) {
            config.welcome_banner[guildId] = null;
            configChanged = true;
        }
        if (!config.goodbye_banner[guildId]) {
            config.goodbye_banner[guildId] = null;
            configChanged = true;
        }

        // Only write if something actually changed
        if (configChanged) {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }
    }

    async initializeLoggingConfig(guildId) {
        const configPath = path.join(this.configDir, 'logging_config.json');
        let config = {};
        
        if (fs.existsSync(configPath)) {
            try {
                const fileContent = fs.readFileSync(configPath, 'utf8').trim();
                if (fileContent) {
                    config = JSON.parse(fileContent);
                } else {
                    config = {};
                }
            } catch (parseError) {
                console.log(`📝 Logging config corrupted for ${guildId}, creating new...`);
                config = {};
            }
        }

        if (!config[guildId]) {
            config[guildId] = {
                enabled: true,
                log_bot_messages: false,
                log_message_edits: true,
                log_message_deletes: true,
                log_member_joins: true,
                log_member_leaves: true,
                log_warnings: true,
                log_bans: true,
                log_kicks: true,
                log_timeouts: true,
                log_role_changes: true,
                log_channel_changes: true,
                log_admin_actions: true,
                ignore_admin_actions: false,
                ignore_owner_actions: false,
                log_automod_actions: true
            };

            // Only write if not in startup phase
            if (!process.env.BOT_STARTING) {
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            }
        }
    }

    async initializeAiChatConfig(guildId) {
        const configPath = path.join(this.configDir, 'ai_chat_config.json');
        let config = {};
        
        if (fs.existsSync(configPath)) {
            try {
                const fileContent = fs.readFileSync(configPath, 'utf8').trim();
                if (fileContent) {
                    config = JSON.parse(fileContent);
                } else {
                    config = {};
                }
            } catch (parseError) {
                console.log(`📝 AI chat config corrupted for ${guildId}, creating new...`);
                config = {};
            }
        }

        if (!config[guildId]) {
            config[guildId] = {
                enabled: false,
                channels: [],
                dedicatedChannel: null,
                settings: {
                    responseChance: 100,
                    cooldown: 1,
                    mentionRequired: false
                },
                personality: {
                    name: "Assistant",
                    traits: ["helpful", "friendly"],
                    interests: ["gaming", "technology"],
                    responseStyle: "casual"
                }
            };

            // Only write if not in startup phase
            if (!process.env.BOT_STARTING) {
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            }
        }
    }

    async initializeOtherConfigs(guildId) {
        // Initialize empty files that may be needed
        const configs = [
            { file: 'admin_roles.json', default: {} },
            { file: 'afk_status.json', default: {} },
            { file: 'appeal_feedback.json', default: {} },
            { file: 'backups.json', default: {} },
            { file: 'blocked_domains.json', default: {} },
            { file: 'blocked_words.json', default: {} },
            { file: 'captcha_config.json', default: {} },
            { file: 'counting.json', default: {} },
            { file: 'daily_challenges.json', default: {} },
            { file: 'daily_rewards.json', default: {} },
            { file: 'dashboard_credentials.json', default: {} },
            { file: 'discord_oauth.json', default: {} },
            { file: 'leaderboard.json', default: {} },
            { file: 'log_channels.json', default: {} },
            { file: 'minecraft_config.json', default: {
                enabled: false,
                servers: {},
                chatBridge: {
                    enabled: false,
                    discordToMinecraft: true,
                    minecraftToDiscord: true,
                    formatDiscordMessages: true
                },
                statusChannel: null,
                updateInterval: 60000
            }},
            { file: 'personal_notes.json', default: {} },
            { file: 'raid_protection.json', default: {
                JOIN_THRESHOLD: 4,
                JOIN_WINDOW: 20,
                MESSAGE_THRESHOLD: 8,
                MESSAGE_WINDOW: 10,
                DUPLICATE_MESSAGE_THRESHOLD: 2,
                BOT_ACCOUNT_THRESHOLD: 2,
                BOT_ACCOUNT_WINDOW: 30,
                AVATAR_SIMILARITY_THRESHOLD: 0.8,
                USERNAME_PATTERN_THRESHOLD: 3,
                SUSPICIOUS_ACCOUNT_AGE: 604800000,
                VERY_NEW_ACCOUNT_AGE: 86400000,
                NEW_ACCOUNT_THRESHOLD: 2,
                RAPID_MESSAGE_THRESHOLD: 5,
                RAPID_MESSAGE_WINDOW: 5,
                COORDINATED_ACTION_THRESHOLD: 3,
                AUTO_LOCKDOWN: true,
                AUTO_KICK_RAIDERS: true,
                AUTO_BAN_PERSISTENT: true,
                AUTO_DELETE_SPAM: true,
                QUARANTINE_NEW_ACCOUNTS: true,
                AUTO_ROLE_VERIFICATION: true,
                CHANNEL_SLOWMODE_ON_RAID: true,
                RAID_COOLDOWN: 180000,
                ANALYSIS_WINDOW: 600000
            }},
            { file: 'raid_whitelist.json', default: {} },
            { file: 'reaction_roles.json', default: {} },
            { file: 'rr_cooldowns.json', default: {} },
            { file: 'submissions.json', default: {} },
            { file: 'user_data.json', default: {} },
            { file: 'warning_feedback.json', default: {} },
            { file: 'warnings.json', default: {} },
            { file: 'welcome_config.json', default: {} },
            { file: 'wordchain.json', default: {} }
        ];

        for (const configInfo of configs) {
            const configPath = path.join(this.configDir, configInfo.file);
            
            if (!fs.existsSync(configPath)) {
                fs.writeFileSync(configPath, JSON.stringify(configInfo.default, null, 2));
                console.log(`📄 Created ${configInfo.file}`);
            }
        }
    }

    // Utility method to ensure a config file exists with default content
    ensureConfigFile(filename, defaultContent = {}) {
        const configPath = path.join(this.configDir, filename);
        
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, JSON.stringify(defaultContent, null, 2));
            console.log(`📄 Created missing config file: ${filename}`);
            return true;
        }
        return false;
    }

    // Method to validate all required configs exist
    validateConfigs() {
        const requiredConfigs = [
            'config.json',
            'logging_config.json',
            'ai_chat_config.json',
            'minecraft_config.json',
            'raid_protection.json',
            'reaction_roles.json'
        ];

        let allValid = true;
        for (const config of requiredConfigs) {
            const configPath = path.join(this.configDir, config);
            if (!fs.existsSync(configPath)) {
                console.log(`⚠️ Missing required config: ${config}`);
                allValid = false;
            }
        }

        return allValid;
    }
}

// Initialize config system function
async function initializeConfigSystem(client) {
    console.log('🔧 Initializing configuration system...');
    
    try {
        const configManager = new ConfigManager();
        
        // Validate all configs exist
        if (!configManager.validateConfigs()) {
            console.log('⚠️ Some config files are missing, creating them...');
        }
        
        // Initialize configurations for all existing guilds
        for (const guild of client.guilds.cache.values()) {
            try {
                await configManager.initializeServerConfig(guild);
            } catch (error) {
                console.error(`Error initializing config for ${guild.name}:`, error);
            }
        }
        
        console.log('✅ Configuration system initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Error initializing configuration system:', error);
        return false;
    }
}

module.exports = ConfigManager;
module.exports.initializeConfigSystem = initializeConfigSystem;
