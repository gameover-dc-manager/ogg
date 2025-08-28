
// Initialize global message storage
if (!global.deletedMessages) {
    global.deletedMessages = {};
}

if (!global.editedMessages) {
    global.editedMessages = {};
}

// Maximum messages to store per channel
const MAX_STORED_MESSAGES = 50;

function storeDeletedMessage(message) {
    if (message.author.bot) return; // Skip bot messages
    
    const channelId = message.channel.id;
    
    if (!global.deletedMessages[channelId]) {
        global.deletedMessages[channelId] = [];
    }
    
    global.deletedMessages[channelId].push({
        content: message.content || '[No content]',
        author: message.author.tag,
        authorId: message.author.id,
        messageId: message.id,
        deletedAt: Date.now(),
        attachments: message.attachments.map(att => att.url)
    });
    
    // Keep only the last MAX_STORED_MESSAGES
    if (global.deletedMessages[channelId].length > MAX_STORED_MESSAGES) {
        global.deletedMessages[channelId] = global.deletedMessages[channelId].slice(-MAX_STORED_MESSAGES);
    }
}

function storeEditedMessage(oldMessage, newMessage) {
    if (newMessage.author.bot) return; // Skip bot messages
    
    const channelId = newMessage.channel.id;
    
    if (!global.editedMessages[channelId]) {
        global.editedMessages[channelId] = [];
    }
    
    global.editedMessages[channelId].push({
        oldContent: oldMessage.content || '[No content]',
        newContent: newMessage.content || '[No content]',
        author: newMessage.author.tag,
        authorId: newMessage.author.id,
        messageId: newMessage.id,
        editedAt: Date.now()
    });
    
    // Keep only the last MAX_STORED_MESSAGES
    if (global.editedMessages[channelId].length > MAX_STORED_MESSAGES) {
        global.editedMessages[channelId] = global.editedMessages[channelId].slice(-MAX_STORED_MESSAGES);
    }
}

module.exports = {
    storeDeletedMessage,
    storeEditedMessage
};
