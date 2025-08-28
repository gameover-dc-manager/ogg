
const fs = require('fs');
const path = require('path');

const AI_CONFIG_PATH = path.join(__dirname, '../config/ai_chat_config.json');

class AIChatManager {
    constructor() {
        this.configs = new Map();
        this.loadConfigurations();
    }

    loadConfigurations() {
        try {
            if (fs.existsSync(AI_CONFIG_PATH)) {
                const data = JSON.parse(fs.readFileSync(AI_CONFIG_PATH, 'utf8'));
                for (const [guildId, config] of Object.entries(data)) {
                    this.configs.set(guildId, this.validateConfig(config));
                }
                console.log('🤖 AI Chat Manager: Loaded configurations for', Object.keys(data).length, 'guilds');
            }
        } catch (error) {
            console.error('❌ AI Chat Manager: Error loading configurations:', error);
        }
    }

    validateConfig(config) {
        const defaultConfig = {
            enabled: false,
            channels: [],
            dedicatedChannel: null,
            settings: {
                responseChance: 8,
                cooldown: 2,
                mentionRequired: false,
                contextMemory: true,
                moodSystem: true,
                smartResponses: true,
                enhancedContext: true,
                emotionalIntelligence: true,
                conversationTracking: true
            },
            personality: {
                name: "Assistant",
                traits: ["helpful", "friendly", "knowledgeable"],
                interests: ["gaming", "technology", "community"],
                responseStyle: "casual but informative",
                moods: ["helpful", "playful", "focused", "relaxed", "excited"]
            }
        };

        // Merge with defaults
        const mergedConfig = { ...defaultConfig, ...config };
        mergedConfig.settings = { ...defaultConfig.settings, ...config.settings };
        mergedConfig.personality = { ...defaultConfig.personality, ...config.personality };

        return mergedConfig;
    }

    saveConfigurations() {
        try {
            const data = Object.fromEntries(this.configs);
            fs.writeFileSync(AI_CONFIG_PATH, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('❌ AI Chat Manager: Error saving configurations:', error);
            return false;
        }
    }

    getGuildConfig(guildId) {
        return this.configs.get(guildId) || this.validateConfig({});
    }

    updateGuildConfig(guildId, config) {
        this.configs.set(guildId, this.validateConfig(config));
        return this.saveConfigurations();
    }

    enableForGuild(guildId, channelIds = []) {
        const config = this.getGuildConfig(guildId);
        config.enabled = true;
        config.channels = [...new Set([...config.channels, ...channelIds])];
        return this.updateGuildConfig(guildId, config);
    }

    disableForGuild(guildId) {
        const config = this.getGuildConfig(guildId);
        config.enabled = false;
        return this.updateGuildConfig(guildId, config);
    }

    updatePersonality(guildId, personalityData) {
        const config = this.getGuildConfig(guildId);
        config.personality = { ...config.personality, ...personalityData };
        return this.updateGuildConfig(guildId, config);
    }

    getStats() {
        const enabledGuilds = Array.from(this.configs.values()).filter(c => c.enabled).length;
        const totalChannels = Array.from(this.configs.values())
            .reduce((total, config) => total + config.channels.length, 0);

        return {
            totalGuilds: this.configs.size,
            enabledGuilds,
            totalChannels,
            averageChannelsPerGuild: Math.round(totalChannels / Math.max(this.configs.size, 1) * 100) / 100
        };
    }
}

module.exports = { AIChatManager };
