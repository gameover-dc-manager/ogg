
const { callGemini } = require('../utils/gemini');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

class AIPersonality {
    constructor() {
        this.conversationHistory = new Map();
        this.guildConfigs = new Map();
        this.userCooldowns = new Map();
        this.conversationStates = new Map(); // Track conversation context
        this.moodSystem = new Map(); // Dynamic mood tracking
        
        this.personality = {
            name: "Manager",
            traits: [
                "friendly and helpful",
                "slightly sarcastic but caring",
                "knowledgeable about Discord and gaming",
                "enjoys casual conversation",
                "protective of the server community",
                "remembers context well"
            ],
            interests: [
                "gaming", "technology", "Discord moderation", 
                "helping users", "memes", "community building",
                "learning about users", "casual conversations"
            ],
            responseStyle: "casual but informative",
            moods: ["helpful", "playful", "focused", "relaxed", "excited"]
        };
        
        this.loadConfigurations();
        this.initializeMoodSystem();
        
        // Enhanced conversation patterns
        this.conversationPatterns = {
            greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup', 'whats up', 'howdy', 'yo'],
            question: ['what', 'how', 'why', 'when', 'where', 'who', 'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does', '?'],
            emotional: ['love', 'hate', 'sad', 'happy', 'angry', 'excited', 'worried', 'stressed', 'tired', 'bored', 'confused'],
            casual: ['lol', 'haha', 'omg', 'wow', 'nice', 'cool', 'awesome', 'bruh', 'fr', 'ngl', 'lmao', 'xd', 'oof'],
            gaming: ['game', 'play', 'gaming', 'stream', 'twitch', 'discord', 'server', 'raid', 'clan', 'minecraft', 'valorant'],
            social: ['thanks', 'thank you', 'please', 'sorry', 'welcome', 'congrats', 'good luck', 'good job']
        };
    }

    initializeMoodSystem() {
        // Initialize with default mood
        this.currentMood = "helpful";
        this.moodLastChanged = Date.now();
        this.moodDuration = 30 * 60 * 1000; // 30 minutes
    }

    loadConfigurations() {
        try {
            const configPath = path.join(__dirname, '../config/ai_chat_config.json');
            
            if (fs.existsSync(configPath)) {
                const configs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                for (const [guildId, config] of Object.entries(configs)) {
                    if (!config.personality) {
                        config.personality = { ...this.personality };
                    }
                    // Enhanced personality with mood system
                    if (!config.personality.moods) {
                        config.personality.moods = this.personality.moods;
                    }
                    this.guildConfigs.set(guildId, config);
                }
                console.log('🤖 Enhanced AI configurations loaded for', Object.keys(configs).length, 'guilds');
            }
        } catch (error) {
            console.error('❌ Error loading AI chat configurations:', error);
        }
    }

    getGuildConfig(guildId) {
        return this.guildConfigs.get(guildId) || {
            enabled: false,
            channels: [],
            dedicatedChannel: null,
            settings: {
                responseChance: 8, // Increased default
                cooldown: 2, // Reduced default
                mentionRequired: false,
                contextMemory: true, // New feature
                moodSystem: true // New feature
            },
            personality: this.personality
        };
    }

    updateConfig(guildId, config) {
        this.guildConfigs.set(guildId, config);
        console.log('🤖 AI config updated for guild:', guildId);
    }

    updatePersonality(guildId, personality) {
        const config = this.getGuildConfig(guildId);
        config.personality = { ...personality };
        if (!config.personality.moods) {
            config.personality.moods = this.personality.moods;
        }
        this.guildConfigs.set(guildId, config);
        console.log('🤖 AI personality updated for guild:', guildId, 'Name:', personality.name);
    }

    reloadConfigurations() {
        this.loadConfigurations();
    }

    // Enhanced response determination
    shouldRespond(message) {
        if (message.author.bot) return false;
        
        const guildConfig = this.getGuildConfig(message.guild.id);
        
        if (!guildConfig.enabled || !guildConfig.channels.includes(message.channel.id)) {
            return false;
        }
        
        if (guildConfig.settings.mentionRequired && !message.mentions.has(message.client.user)) {
            return false;
        }

        const content = message.content.toLowerCase();
        
        // Always respond if mentioned
        if (message.mentions.has(message.client.user)) return true;
        
        // Check for conversation patterns
        const hasGreeting = this.conversationPatterns.greeting.some(g => content.includes(g));
        const hasQuestion = this.conversationPatterns.question.some(q => content.includes(q));
        const hasEmotional = this.conversationPatterns.emotional.some(e => content.includes(e));
        const hasCasual = this.conversationPatterns.casual.some(c => content.includes(c));
        const hasGaming = this.conversationPatterns.gaming.some(g => content.includes(g));
        
        // Enhanced conversation detection
        const isInConversation = this.isInActiveConversation(message.author.id);
        const isReplyToBot = message.reference && this.wasLastMessageFromBot(message.channel.id);
        
        // Calculate response probability
        let responseChance = guildConfig.settings.responseChance / 100;
        
        // Boost chances for specific patterns
        if (hasGreeting) responseChance += 0.4;
        if (hasQuestion) responseChance += 0.5;
        if (hasEmotional) responseChance += 0.2;
        if (hasCasual) responseChance += 0.1;
        if (hasGaming) responseChance += 0.15;
        if (isInConversation) responseChance += 0.3;
        if (isReplyToBot) responseChance += 0.6;
        
        // Dedicated channel gets higher base chance
        if (message.channel.id === guildConfig.dedicatedChannel) {
            responseChance += 0.2;
        }
        
        // Cap at 100%
        responseChance = Math.min(1.0, responseChance);
        
        return Math.random() < responseChance;
    }

    isInActiveConversation(userId) {
        const state = this.conversationStates.get(userId);
        if (!state) return false;
        
        const timeSinceLastMessage = Date.now() - state.lastMessageTime;
        return timeSinceLastMessage < 180000; // 3 minutes
    }

    wasLastMessageFromBot(channelId) {
        // This would ideally check the last message in the channel
        // For now, we'll use a simple heuristic
        return false; // Simplified for this implementation
    }

    checkRateLimit(userId, guildId) {
        const lastResponse = this.userCooldowns.get(userId);
        if (!lastResponse) return false;
        
        const guildConfig = this.getGuildConfig(guildId);
        const cooldownTime = guildConfig.settings.cooldown * 1000;
        
        return Date.now() - lastResponse < cooldownTime;
    }

    updateConversationState(userId, content, isBot = false) {
        if (!this.conversationStates.has(userId)) {
            this.conversationStates.set(userId, {
                messageCount: 0,
                topics: [],
                mood: "neutral",
                lastMessageTime: Date.now()
            });
        }
        
        const state = this.conversationStates.get(userId);
        state.messageCount++;
        state.lastMessageTime = Date.now();
        
        // Extract topics from message
        const topics = this.extractTopics(content);
        state.topics = [...new Set([...state.topics, ...topics])].slice(-10); // Keep last 10 topics
        
        // Update mood based on content
        if (!isBot) {
            state.mood = this.detectMessageMood(content);
        }
    }

    extractTopics(content) {
        const topics = [];
        const lowerContent = content.toLowerCase();
        
        // Check for gaming topics
        if (this.conversationPatterns.gaming.some(g => lowerContent.includes(g))) {
            topics.push('gaming');
        }
        
        // Check for emotional topics
        if (this.conversationPatterns.emotional.some(e => lowerContent.includes(e))) {
            topics.push('emotional');
        }
        
        // Add more topic extraction logic here
        return topics;
    }

    detectMessageMood(content) {
        const lowerContent = content.toLowerCase();
        
        if (lowerContent.includes('!') || lowerContent.includes('excited') || lowerContent.includes('awesome')) {
            return 'excited';
        } else if (lowerContent.includes('?') || lowerContent.includes('help')) {
            return 'curious';
        } else if (lowerContent.includes('sad') || lowerContent.includes('worried')) {
            return 'concerned';
        } else if (this.conversationPatterns.casual.some(c => lowerContent.includes(c))) {
            return 'playful';
        }
        
        return 'neutral';
    }

    addToHistory(userId, content, isBot = false) {
        if (!this.conversationHistory.has(userId)) {
            this.conversationHistory.set(userId, []);
        }
        
        const history = this.conversationHistory.get(userId);
        history.push({
            content,
            isBot,
            timestamp: Date.now(),
            mood: this.detectMessageMood(content)
        });
        
        // Keep only last 15 messages per user
        if (history.length > 15) {
            history.shift();
        }
        
        // Update conversation state
        this.updateConversationState(userId, content, isBot);
    }

    getCurrentMood(guildId) {
        const guildConfig = this.getGuildConfig(guildId);
        if (!guildConfig.settings || !guildConfig.settings.moodSystem) {
            return 'helpful';
        }
        
        // Check if mood should change based on server activity
        const now = Date.now();
        const serverActivity = this.conversationHistory.size;
        
        // Dynamic mood duration based on activity
        let baseDuration = 30 * 60 * 1000; // 30 minutes base
        if (serverActivity > 10) baseDuration *= 0.7; // More active = faster mood changes
        if (serverActivity > 20) baseDuration *= 0.5; 
        
        if (now - this.moodLastChanged > this.moodDuration) {
            const moods = guildConfig.personality.moods || this.personality.moods;
            const oldMood = this.currentMood;
            
            // Avoid repeating the same mood
            let availableMoods = moods.filter(mood => mood !== oldMood);
            if (availableMoods.length === 0) availableMoods = moods;
            
            this.currentMood = availableMoods[Math.floor(Math.random() * availableMoods.length)];
            this.moodLastChanged = now;
            this.moodDuration = baseDuration + (Math.random() * baseDuration); // Variable duration
            
            console.log(`🎭 Mood changed from ${oldMood} to ${this.currentMood} for guild ${guildId}`);
        }
        
        return this.currentMood;
    }

    async generateResponse(message) {
        try {
            if (this.checkRateLimit(message.author.id, message.guild.id)) {
                return null;
            }

            // Analyze conversation context first
            const userHistory = this.conversationHistory.get(message.author.id) || [];
            const contextClues = this.analyzeConversationContext(message, userHistory);
            
            // Check for special topics first
            const specialResponse = this.handleSpecialTopics(message, contextClues);
            if (specialResponse) {
                this.addToHistory(message.author.id, message.content, false);
                this.addToHistory(message.author.id, specialResponse, true);
                this.userCooldowns.set(message.author.id, Date.now());
                return specialResponse;
            }

            this.reloadConfigurations();
            
            const guildConfig = this.getGuildConfig(message.guild.id);
            const personality = guildConfig.personality || this.personality;
            const currentMood = this.getCurrentMood(message.guild.id);

            // Get conversation context
            const conversationState = this.conversationStates.get(message.author.id);
            const recentHistory = userHistory.slice(-8);

            // Build enhanced context
            let context = `You are ${personality.name}, a friendly Discord server assistant. 

Key traits: ${personality.traits.slice(0, 3).join(', ')}
Current mood: ${currentMood}
Main interests: ${personality.interests.slice(0, 4).join(', ')}

Rules:
- Keep responses under 150 characters
- Be ${currentMood} and ${personality.responseStyle}
- Use emojis sparingly (1-2 max)
- Stay helpful and engaging`;

            // Add conversation context if available
            if (conversationState) {
                context += `\n\nConversation Context:
- User's apparent mood: ${conversationState.mood}
- Recent topics discussed: ${conversationState.topics.join(', ') || 'none yet'}
- Messages exchanged: ${conversationState.messageCount}`;
            }

            // Add recent conversation context (last 3 messages max)
            if (recentHistory.length > 0) {
                context += `\n\nRecent chat:`;
                recentHistory.slice(-3).forEach(msg => {
                    const speaker = msg.isBot ? 'You' : message.author.username;
                    context += `\n${speaker}: ${msg.content.substring(0, 100)}`;
                });
            }

            context += `\n\n${message.author.username}: ${message.content}`;
            
            // Add simple mood instruction
            const moodInstructions = this.getMoodInstructions(currentMood);
            context += `\n\n${moodInstructions} Respond naturally and briefly.`;

            const response = await callGemini(context, 150);
            
            if (response && response.trim()) {
                // Clean up response
                let cleanResponse = response.trim();
                
                // Remove common AI artifacts
                cleanResponse = cleanResponse.replace(/^(Here's|Here is|I'll|Let me).*?:\s*/i, '');
                cleanResponse = cleanResponse.replace(/^(As|Being).*?,\s*/i, '');
                
                // Ensure it's not too long
                if (cleanResponse.length > 200) {
                    cleanResponse = cleanResponse.substring(0, 197) + '...';
                }
                
                this.addToHistory(message.author.id, message.content, false);
                this.addToHistory(message.author.id, cleanResponse, true);
                this.userCooldowns.set(message.author.id, Date.now());
                
                console.log(`🤖 ${personality.name} responded in ${currentMood} mood to ${message.author.username}`);
                return cleanResponse;
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error generating AI response:', error);
            
            // Return mood-based fallback responses
            const fallbacks = {
                helpful: "I'm here to help! What can I assist you with? 🤝",
                playful: "Hey there! Something fun on your mind? 😄",
                focused: "What's up? I'm ready to help you out! 💪",
                relaxed: "Hey! Just chillin' here, what's going on? 😎",
                excited: "Hi there! I'm so pumped to chat with you! ✨"
            };
            
            const fallback = fallbacks[currentMood] || "Hey! How can I help you today? 😊";
            
            this.addToHistory(message.author.id, message.content, false);
            this.addToHistory(message.author.id, fallback, true);
            this.userCooldowns.set(message.author.id, Date.now());
            
            return fallback;
        }
    }

    getMoodInstructions(mood) {
        const instructions = {
            helpful: "Be extra helpful and informative. Offer assistance and useful information.",
            playful: "Be more casual and fun. Use light humor and be a bit more relaxed.",
            focused: "Be direct and to-the-point. Focus on solving problems efficiently.",
            relaxed: "Be chill and laid-back. Take your time with responses and be conversational.",
            excited: "Show enthusiasm! Use more energy and express genuine interest in topics."
        };
        
        return instructions[mood] || instructions.helpful;
    }

    handleSpecialTopics(message, contextClues) {
        const content = message.content.toLowerCase();
        const guildConfig = this.getGuildConfig(message.guild.id);
        const personality = guildConfig.personality || this.personality;
        const currentMood = this.getCurrentMood(message.guild.id);
        
        // Enhanced special topic handling with context awareness
        if (content.includes('server info') || content.includes('about server')) {
            return `This awesome server has ${message.guild.memberCount} members! I'm ${personality.name}, and I help keep things running smoothly. What would you like to know? 🎮`;
        }
        
        if (content.includes('about you') || content.includes('who are you')) {
            return `Hey! I'm ${personality.name}, your ${currentMood} server assistant! I can help with moderation, answer questions, and just chat. Currently feeling pretty ${currentMood}! What's up? 🤖`;
        }
        
        if (content.includes('mood') || content.includes('how are you feeling')) {
            return `I'm feeling quite ${currentMood} right now! My mood changes throughout the day to keep things interesting. How are you doing? 😊`;
        }
        
        if (contextClues.needsHelp) {
            const helpResponses = {
                'helpful': "I'm here to help! What do you need assistance with? I can help with server questions, general chat, or anything else! 💬",
                'playful': "Need help? I got you covered! Hit me with your questions and let's figure it out together! 😄",
                'focused': "What specific help do you need? I'm ready to assist you efficiently.",
                'excited': "Ooh, I love helping! What can I do for you? I'm super ready to assist! ✨"
            };
            return helpResponses[currentMood] || helpResponses['helpful'];
        }
        
        if (contextClues.isCompliment) {
            const complimentResponses = {
                'helpful': "Thank you so much! That really means a lot to me 😊",
                'playful': "Aww, you're making me blush! Thanks! 😄",
                'excited': "OMG thank you!! You're awesome too! 🌟"
            };
            return complimentResponses[currentMood] || "Thank you! That's very kind of you to say 😊";
        }
        
        return null;
    }

    // New method: Smart context analysis
    analyzeConversationContext(message, userHistory) {
        const content = message.content.toLowerCase();
        const contextClues = {
            isQuestion: content.includes('?') || this.conversationPatterns.question.some(q => content.includes(q)),
            isGreeting: this.conversationPatterns.greeting.some(g => content.includes(g)),
            isEmotional: this.conversationPatterns.emotional.some(e => content.includes(e)),
            isGaming: this.conversationPatterns.gaming.some(g => content.includes(g)),
            needsHelp: content.includes('help') || content.includes('assist') || content.includes('support'),
            isCompliment: content.includes('good') || content.includes('nice') || content.includes('awesome') || content.includes('great'),
            isCriticism: content.includes('bad') || content.includes('wrong') || content.includes('terrible'),
            referencesBot: message.mentions.has(message.client.user) || content.includes('bot') || content.includes('ai'),
            followsUpPrevious: userHistory.length > 0 && Date.now() - userHistory[userHistory.length - 1].timestamp < 60000
        };
        
        return contextClues;
    }

    // Enhanced response type selection
    selectResponseType(contextClues, mood) {
        if (contextClues.needsHelp) return 'helpful';
        if (contextClues.isCompliment) return 'grateful';
        if (contextClues.isCriticism) return 'apologetic';
        if (contextClues.isGreeting) return 'friendly';
        if (contextClues.isQuestion) return 'informative';
        if (contextClues.isEmotional) return 'empathetic';
        if (contextClues.isGaming) return 'enthusiastic';
        if (mood === 'playful') return 'casual';
        return 'default';
    }

    // Enhanced cleanup with conversation state management
    cleanup() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        // Clean conversation history
        for (const [userId, history] of this.conversationHistory.entries()) {
            const filtered = history.filter(msg => now - msg.timestamp < maxAge);
            if (filtered.length === 0) {
                this.conversationHistory.delete(userId);
            } else {
                this.conversationHistory.set(userId, filtered);
            }
        }
        
        // Clean conversation states
        for (const [userId, state] of this.conversationStates.entries()) {
            if (now - state.lastMessageTime > maxAge) {
                this.conversationStates.delete(userId);
            }
        }
        
        // Clean cooldowns
        for (const [userId, timestamp] of this.userCooldowns.entries()) {
            if (now - timestamp > 10 * 60 * 1000) { // 10 minutes
                this.userCooldowns.delete(userId);
            }
        }

        console.log('🧹 AI Personality cleanup completed');
    }

    // Get conversation stats for debugging
    getStats() {
        return {
            activeConversations: this.conversationHistory.size,
            conversationStates: this.conversationStates.size,
            currentMood: this.currentMood,
            moodChangesIn: Math.round((this.moodDuration - (Date.now() - this.moodLastChanged)) / 60000),
            guildsConfigured: this.guildConfigs.size
        };
    }
}

module.exports = { AIPersonality };
