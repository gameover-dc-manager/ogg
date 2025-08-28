const { Events } = require('discord.js');
const { storeDeletedMessage } = require('../components/messageSniper');

module.exports = {
    name: 'messageDelete',
    async execute(message) {
        // Store message for sniping
        storeDeletedMessage(message);
        try {
            // Ignore partial messages
            if (message.partial) return;

            // Ignore DMs
            if (!message.guild) return;

            // Ignore if no content and no author
            if (!message.content && !message.author) return;

            console.log(`📝 Message deleted in ${message.guild.name} by ${message.author ? message.author.tag : 'Unknown'}`);

            // Log message deletion using the enhanced logging system
            const { logAction } = require('../utils/loggingSystem');
            const logResult = await logAction(message.guild, 'message_delete', {
                author: message.author,
                channel: message.channel,
                messageId: message.id,
                content: message.content || '*No content*',
                attachments: message.attachments ? message.attachments.size : 0
            }, message.author);

            if (!logResult) {
                console.log(`❌ Failed to log message deletion for ${message.author ? message.author.tag : 'Unknown'}`);
            }
        } catch (error) {
            console.error('❌ Error in messageDelete event:', error);
        }
    }
};