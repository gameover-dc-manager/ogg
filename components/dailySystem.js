
const fs = require('fs');
const path = require('path');

const dailyDir = path.join(__dirname, '../config');
const dailyFile = path.join(dailyDir, 'daily_rewards.json');

if (!fs.existsSync(dailyDir)) {
    fs.mkdirSync(dailyDir, { recursive: true });
}

function loadDailyData() {
    try {
        if (!fs.existsSync(dailyFile)) {
            return {};
        }
        const data = fs.readFileSync(dailyFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading daily data:', error);
        return {};
    }
}

function saveDailyData(data) {
    try {
        fs.writeFileSync(dailyFile, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving daily data:', error);
        return false;
    }
}

function isNewDay(lastClaim) {
    if (!lastClaim) return true;
    
    const today = new Date();
    const lastClaimDate = new Date(lastClaim);
    
    return today.toDateString() !== lastClaimDate.toDateString();
}

function getStreakMultiplier(streak) {
    if (streak >= 30) return 3;
    if (streak >= 14) return 2.5;
    if (streak >= 7) return 2;
    if (streak >= 3) return 1.5;
    return 1;
}

async function claimDailyReward(userId) {
    const dailyData = loadDailyData();
    
    if (!dailyData[userId]) {
        dailyData[userId] = {
            currentStreak: 0,
            bestStreak: 0,
            lastClaim: null,
            totalClaims: 0,
            totalPoints: 0
        };
    }
    
    const user = dailyData[userId];
    
    if (!isNewDay(user.lastClaim)) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        return {
            success: false,
            nextClaimTime: tomorrow.getTime()
        };
    }
    
    // Check if streak should continue or reset
    if (user.lastClaim) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const lastClaimDate = new Date(user.lastClaim);
        
        if (yesterday.toDateString() === lastClaimDate.toDateString()) {
            user.currentStreak++;
        } else {
            user.currentStreak = 1;
        }
    } else {
        user.currentStreak = 1;
    }
    
    user.bestStreak = Math.max(user.bestStreak, user.currentStreak);
    user.lastClaim = Date.now();
    user.totalClaims++;
    
    const baseReward = 10;
    const streakMultiplier = getStreakMultiplier(user.currentStreak);
    const streakBonus = Math.floor(baseReward * (streakMultiplier - 1));
    const totalReward = baseReward + streakBonus;
    
    user.totalPoints += totalReward;
    
    saveDailyData(dailyData);
    
    return {
        success: true,
        points: baseReward,
        streakBonus,
        streak: user.currentStreak,
        totalPoints: user.totalPoints
    };
}

async function getDailyChallenge(userId) {
    const challenges = [
        {
            type: 'Play Games',
            description: 'Play 3 different games today',
            target: 3,
            reward: 25
        },
        {
            type: 'Win Streak',
            description: 'Win 2 games in a row',
            target: 2,
            reward: 30
        },
        {
            type: 'Trivia Master',
            description: 'Answer 5 trivia questions correctly',
            target: 5,
            reward: 20
        },
        {
            type: 'Social Butterfly',
            description: 'Send 10 messages in different channels',
            target: 10,
            reward: 15
        }
    ];
    
    // Simple daily challenge selection based on day
    const today = new Date().getDate();
    const challenge = challenges[today % challenges.length];
    
    // In a real implementation, you'd track progress
    return {
        ...challenge,
        progress: Math.floor(Math.random() * challenge.target),
        completed: Math.random() > 0.7
    };
}

async function getUserDailyStats(userId) {
    const dailyData = loadDailyData();
    
    return dailyData[userId] || {
        currentStreak: 0,
        bestStreak: 0,
        lastClaim: null,
        totalClaims: 0,
        totalPoints: 0
    };
}

async function getDailyLeaderboard(guildId, client) {
    const dailyData = loadDailyData();
    
    const leaderboard = [];
    
    for (const [userId, stats] of Object.entries(dailyData)) {
        try {
            // Try to get guild member first for more accurate info
            let username = `User ${userId.slice(-4)}`;
            
            try {
                const guild = await client.guilds.fetch(guildId);
                const member = await guild.members.fetch(userId);
                username = member.user.username;
            } catch (memberError) {
                // Fallback to fetching user directly
                try {
                    const user = await client.users.fetch(userId);
                    username = user.username;
                } catch (userError) {
                    // Keep fallback username
                }
            }
            
            leaderboard.push({
                userId,
                username,
                currentStreak: stats.currentStreak,
                bestStreak: stats.bestStreak,
                totalPoints: stats.totalPoints,
                totalClaims: stats.totalClaims
            });
        } catch (error) {
            console.error(`Error fetching user data for ${userId}:`, error);
            // Use fallback data
            leaderboard.push({
                userId,
                username: `User ${userId.slice(-4)}`,
                currentStreak: stats.currentStreak,
                bestStreak: stats.bestStreak,
                totalPoints: stats.totalPoints,
                totalClaims: stats.totalClaims
            });
        }
    }
    
    return leaderboard.sort((a, b) => b.currentStreak - a.currentStreak || b.totalPoints - a.totalPoints);
}

module.exports = {
    claimDailyReward,
    getDailyChallenge,
    getUserDailyStats,
    getDailyLeaderboard
};
