function isSpamming(userId, accountAge = null) {
    const now = Date.now();
    const posts = global.userPosts.get(userId) || [];
    
    // Remove old posts outside the window
    const filtered = posts.filter(timestamp => now - timestamp <= global.WINDOW_SECONDS * 1000);
    
    // Add current post
    filtered.push(now);
    global.userPosts.set(userId, filtered);
    
    // Adaptive limits based on account age
    let maxPosts = global.MAX_LINKS;
    if (accountAge !== null) {
        const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 1) maxPosts = Math.max(1, global.MAX_LINKS - 2); // Very new accounts
        else if (daysSinceCreation < 7) maxPosts = Math.max(2, global.MAX_LINKS - 1); // New accounts
    }
    
    console.log(`[SPAM] User ${userId} has ${filtered.length} posts in last ${global.WINDOW_SECONDS}s (limit: ${maxPosts})`);
    
    return filtered.length > maxPosts;
}

function detectRapidPosting(userId) {
    const now = Date.now();
    const posts = global.userPosts.get(userId) || [];
    
    // Check for very rapid posting (less than 2 seconds between messages)
    const recentPosts = posts.filter(timestamp => now - timestamp <= 10000); // Last 10 seconds
    
    if (recentPosts.length >= 5) {
        // Check intervals between posts
        for (let i = 1; i < recentPosts.length; i++) {
            if (recentPosts[i] - recentPosts[i-1] < 2000) { // Less than 2 seconds
                return true;
            }
        }
    }
    
    return false;
}

function isCrossChannelSpam(userId, text, channelId) {
    const now = Date.now();
    const key = `${userId}_${text}`;
    const posts = global.duplicatePosts.get(key) || [];
    
    // Remove old posts outside the window
    const filtered = posts.filter(([timestamp]) => now - timestamp <= global.DUP_WINDOW_SECONDS * 1000);
    
    // Add current post
    filtered.push([now, channelId]);
    global.duplicatePosts.set(key, filtered);
    
    // Count distinct channels
    const distinctChannels = new Set(filtered.map(([, channel]) => channel));
    return distinctChannels.size >= global.DUP_CHANNEL_THRESHOLD;
}

module.exports = {
    isSpamming,
    isCrossChannelSpam,
    detectRapidPosting
};
