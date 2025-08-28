
const fs = require('fs').promises;
const path = require('path');

class AnalyticsTracker {
    constructor() {
        this.analyticsPath = path.join(__dirname, '../config/analytics_data.json');
        this.commandPath = path.join(__dirname, '../config/command_analytics.json');
        this.cache = new Map();
    }

    async trackMessage(guild, channel, user) {
        if (!guild || user.bot) return;

        try {
            const data = await this.loadAnalyticsData(guild.id);
            const now = new Date();
            const hour = now.getHours();
            const day = now.getDay();

            // Update message counts
            data.messages.total = (data.messages.total || 0) + 1;
            data.messages.today = (data.messages.today || 0) + 1;
            data.messages.week = (data.messages.week || 0) + 1;

            // Update hourly activity
            if (!data.hourlyActivity) data.hourlyActivity = {};
            data.hourlyActivity[hour] = (data.hourlyActivity[hour] || 0) + 1;

            // Update daily activity
            if (!data.dailyActivity) data.dailyActivity = {};
            data.dailyActivity[day] = (data.dailyActivity[day] || 0) + 1;

            // Update channel activity
            if (!data.channelActivity) data.channelActivity = {};
            data.channelActivity[channel.id] = {
                name: channel.name,
                count: (data.channelActivity[channel.id]?.count || 0) + 1
            };

            // Track active users
            if (!data.activeUserIds) data.activeUserIds = new Set();
            data.activeUserIds.add(user.id);

            data.lastUpdated = now.toISOString();
            await this.saveAnalyticsData(guild.id, data);

        } catch (error) {
            console.error('Error tracking message analytics:', error);
        }
    }

    async trackCommand(guild, commandName, user, responseTime = 0) {
        if (!guild || user.bot) return;

        try {
            const data = await this.loadCommandData(guild.id);
            const now = new Date();

            if (!data[commandName]) {
                data[commandName] = {
                    uses: 0,
                    today: 0,
                    week: 0,
                    month: 0,
                    averageResponseTime: 0,
                    errors: 0,
                    lastUsed: null
                };
            }

            // Update usage counts
            data[commandName].uses++;
            data[commandName].today++;
            data[commandName].week++;
            data[commandName].month++;

            // Update response time
            const currentAvg = data[commandName].averageResponseTime || 0;
            const totalUses = data[commandName].uses;
            data[commandName].averageResponseTime = Math.round(
                ((currentAvg * (totalUses - 1)) + responseTime) / totalUses
            );

            data[commandName].lastUsed = now.toISOString();
            await this.saveCommandData(guild.id, data);

        } catch (error) {
            console.error('Error tracking command analytics:', error);
        }
    }

    async trackUserJoin(guild, user) {
        if (!guild || user.bot) return;

        try {
            const data = await this.loadAnalyticsData(guild.id);
            
            if (!data.users) data.users = {};
            data.users.new = (data.users.new || 0) + 1;
            
            // Track join patterns
            if (!data.joinPatterns) data.joinPatterns = {};
            const hour = new Date().getHours();
            data.joinPatterns[hour] = (data.joinPatterns[hour] || 0) + 1;

            await this.saveAnalyticsData(guild.id, data);

        } catch (error) {
            console.error('Error tracking user join analytics:', error);
        }
    }

    async trackVoiceActivity(guild, user, duration) {
        if (!guild || user.bot) return;

        try {
            const data = await this.loadAnalyticsData(guild.id);
            
            if (!data.voice) data.voice = {};
            data.voice.totalMinutes = (data.voice.totalMinutes || 0) + Math.round(duration / 60000);
            data.voice.sessions = (data.voice.sessions || 0) + 1;

            await this.saveAnalyticsData(guild.id, data);

        } catch (error) {
            console.error('Error tracking voice analytics:', error);
        }
    }

    async loadAnalyticsData(guildId) {
        const cacheKey = `analytics_${guildId}`;
        
        if (this.cache.has(cacheKey)) {
            return { ...this.cache.get(cacheKey) };
        }

        try {
            const data = await fs.readFile(this.analyticsPath, 'utf8');
            const analytics = JSON.parse(data);
            const guildData = analytics[guildId] || this.getDefaultAnalyticsData();
            
            this.cache.set(cacheKey, guildData);
            return { ...guildData };
        } catch (error) {
            const defaultData = this.getDefaultAnalyticsData();
            this.cache.set(cacheKey, defaultData);
            return { ...defaultData };
        }
    }

    async loadCommandData(guildId) {
        const cacheKey = `commands_${guildId}`;
        
        if (this.cache.has(cacheKey)) {
            return { ...this.cache.get(cacheKey) };
        }

        try {
            const data = await fs.readFile(this.commandPath, 'utf8');
            const commands = JSON.parse(data);
            const guildData = commands[guildId] || {};
            
            this.cache.set(cacheKey, guildData);
            return { ...guildData };
        } catch (error) {
            const defaultData = {};
            this.cache.set(cacheKey, defaultData);
            return { ...defaultData };
        }
    }

    async saveAnalyticsData(guildId, data) {
        try {
            let analytics = {};
            try {
                const existing = await fs.readFile(this.analyticsPath, 'utf8');
                analytics = JSON.parse(existing);
            } catch (error) {
                // File doesn't exist, start fresh
            }

            analytics[guildId] = data;
            await fs.writeFile(this.analyticsPath, JSON.stringify(analytics, null, 2));
            
            // Update cache
            this.cache.set(`analytics_${guildId}`, data);

        } catch (error) {
            console.error('Error saving analytics data:', error);
        }
    }

    async saveCommandData(guildId, data) {
        try {
            let commands = {};
            try {
                const existing = await fs.readFile(this.commandPath, 'utf8');
                commands = JSON.parse(existing);
            } catch (error) {
                // File doesn't exist, start fresh
            }

            commands[guildId] = data;
            await fs.writeFile(this.commandPath, JSON.stringify(commands, null, 2));
            
            // Update cache
            this.cache.set(`commands_${guildId}`, data);

        } catch (error) {
            console.error('Error saving command data:', error);
        }
    }

    getDefaultAnalyticsData() {
        return {
            messages: { total: 0, today: 0, week: 0, month: 0 },
            users: { active: 0, new: 0, returning: 0 },
            engagement: { score: 0, reactions: 0, voiceMinutes: 0 },
            hourlyActivity: {},
            dailyActivity: {},
            channelActivity: {},
            voice: { totalMinutes: 0, sessions: 0 },
            joinPatterns: {},
            lastUpdated: new Date().toISOString()
        };
    }

    // Daily reset function
    async resetDailyCounters() {
        console.log('🔄 Resetting daily analytics counters...');
        
        for (const [key, data] of this.cache.entries()) {
            if (key.startsWith('analytics_')) {
                data.messages.today = 0;
                if (data.users) data.users.new = 0;
            } else if (key.startsWith('commands_')) {
                Object.keys(data).forEach(cmd => {
                    if (data[cmd].today !== undefined) {
                        data[cmd].today = 0;
                    }
                });
            }
        }
        
        console.log('✅ Daily counters reset completed');
    }
}

module.exports = new AnalyticsTracker();
