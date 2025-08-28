
const fs = require('fs').promises;
const path = require('path');

class CustomCommandLogger {
    constructor() {
        this.logPath = path.join(__dirname, '../config/custom_command_logs.json');
    }

    async logCommand(guildId, commandName, userId, userName, action, details = {}) {
        try {
            let logs = {};
            
            try {
                const data = await fs.readFile(this.logPath, 'utf8');
                logs = JSON.parse(data);
            } catch (error) {
                logs = {};
            }

            if (!logs[guildId]) {
                logs[guildId] = [];
            }

            const logEntry = {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                commandName,
                userId,
                userName,
                action, // 'created', 'used', 'edited', 'deleted', 'toggled'
                details,
                timestamp: Date.now(),
                date: new Date().toISOString()
            };

            logs[guildId].push(logEntry);

            // Keep only last 1000 logs per guild
            if (logs[guildId].length > 1000) {
                logs[guildId] = logs[guildId].slice(-1000);
            }

            await fs.writeFile(this.logPath, JSON.stringify(logs, null, 2));
            
            console.log(`[CUSTOM-COMMANDS] Logged action: ${action} for command "${commandName}" by ${userName} (${userId})`);
            
            return logEntry;
        } catch (error) {
            console.error('❌ Error logging custom command action:', error);
        }
    }

    async getGuildLogs(guildId, limit = 50) {
        try {
            const data = await fs.readFile(this.logPath, 'utf8');
            const logs = JSON.parse(data);
            
            if (!logs[guildId]) return [];
            
            return logs[guildId]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, limit);
        } catch (error) {
            console.error('❌ Error retrieving custom command logs:', error);
            return [];
        }
    }

    async getCommandLogs(guildId, commandName, limit = 20) {
        try {
            const allLogs = await this.getGuildLogs(guildId, 1000);
            return allLogs
                .filter(log => log.commandName === commandName)
                .slice(0, limit);
        } catch (error) {
            console.error('❌ Error retrieving command-specific logs:', error);
            return [];
        }
    }

    async getUserCommandUsage(guildId, userId, limit = 50) {
        try {
            const allLogs = await this.getGuildLogs(guildId, 1000);
            return allLogs
                .filter(log => log.userId === userId && log.action === 'used')
                .slice(0, limit);
        } catch (error) {
            console.error('❌ Error retrieving user command usage:', error);
            return [];
        }
    }
}

module.exports = new CustomCommandLogger();
