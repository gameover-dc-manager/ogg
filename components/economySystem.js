
const fs = require('fs');
const path = require('path');

const ECONOMY_FILE = path.join(__dirname, '../config/economy.json');
const SHOP_FILE = path.join(__dirname, '../config/shop_items.json');
const QUESTS_FILE = path.join(__dirname, '../config/quests.json');

// Initialize files if they don't exist
function initializeEconomyFiles() {
    if (!fs.existsSync(ECONOMY_FILE)) {
        fs.writeFileSync(ECONOMY_FILE, JSON.stringify({}, null, 2));
    }
    if (!fs.existsSync(SHOP_FILE)) {
        const defaultShop = {
            "items": [
                {
                    "id": "coffee",
                    "name": "Coffee",
                    "emoji": "☕",
                    "price": 50,
                    "description": "Gives you energy for work",
                    "type": "consumable",
                    "effect": "work_bonus"
                },
                {
                    "id": "lucky_charm",
                    "name": "Lucky Charm",
                    "emoji": "🍀",
                    "price": 200,
                    "description": "Increases gambling luck",
                    "type": "consumable",
                    "effect": "gambling_bonus"
                },
                {
                    "id": "vip_pass",
                    "name": "VIP Pass",
                    "emoji": "🎫",
                    "price": 1000,
                    "description": "Permanent VIP status",
                    "type": "permanent",
                    "effect": "vip_status"
                },
                {
                    "id": "fishing_rod",
                    "name": "Fishing Rod",
                    "emoji": "🎣",
                    "price": 300,
                    "description": "Allows you to fish for coins",
                    "type": "tool",
                    "effect": "fishing_unlock"
                },
                {
                    "id": "diamond_pickaxe",
                    "name": "Diamond Pickaxe",
                    "emoji": "⛏️",
                    "price": 800,
                    "description": "Better mining rewards",
                    "type": "tool",
                    "effect": "mining_upgrade"
                }
            ]
        };
        fs.writeFileSync(SHOP_FILE, JSON.stringify(defaultShop, null, 2));
    }
    if (!fs.existsSync(QUESTS_FILE)) {
        const defaultQuests = {
            "daily": [
                {
                    "id": "work_quest",
                    "name": "Hard Worker",
                    "emoji": "💼",
                    "description": "Work 5 times",
                    "requirement": 5,
                    "reward": 500,
                    "type": "work"
                },
                {
                    "id": "gamble_quest",
                    "name": "Risk Taker",
                    "emoji": "🎲",
                    "description": "Gamble 1000 coins total",
                    "requirement": 1000,
                    "reward": 300,
                    "type": "gamble"
                },
                {
                    "id": "social_quest",
                    "name": "Socializer",
                    "emoji": "💬",
                    "description": "Send 50 messages",
                    "requirement": 50,
                    "reward": 200,
                    "type": "messages"
                }
            ]
        };
        fs.writeFileSync(QUESTS_FILE, JSON.stringify(defaultQuests, null, 2));
    }
}

initializeEconomyFiles();

// Load data functions
function loadEconomyData() {
    try {
        return JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf8'));
    } catch (error) {
        return {};
    }
}

function saveEconomyData(data) {
    fs.writeFileSync(ECONOMY_FILE, JSON.stringify(data, null, 2));
}

function loadShopData() {
    try {
        return JSON.parse(fs.readFileSync(SHOP_FILE, 'utf8'));
    } catch (error) {
        return { items: [] };
    }
}

function loadQuestData() {
    try {
        return JSON.parse(fs.readFileSync(QUESTS_FILE, 'utf8'));
    } catch (error) {
        return { daily: [] };
    }
}

// User data management
function getUserData(userId) {
    const data = loadEconomyData();
    if (!data[userId]) {
        data[userId] = {
            coins: 100,
            gems: 0,
            bank: 0,
            level: 1,
            experience: 0,
            creditScore: 500,
            inventory: [],
            lastWork: 0,
            lastCrime: 0,
            lastMine: 0,
            lastRob: 0,
            workStreak: 0,
            totalEarned: 0,
            totalSpent: 0,
            questProgress: {},
            achievements: [],
            tools: [],
            effects: []
        };
        saveEconomyData(data);
    }
    return data[userId];
}

function updateUserData(userId, updates) {
    const data = loadEconomyData();
    data[userId] = { ...data[userId], ...updates };
    saveEconomyData(data);
    return data[userId];
}

// Economy functions
async function getUserBalance(userId) {
    return getUserData(userId);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat().format(amount);
}

async function workForCoins(userId) {
    const user = getUserData(userId);
    const now = Date.now();
    const cooldownTime = 30 * 60 * 1000; // 30 minutes
    
    if (now - user.lastWork < cooldownTime) {
        return {
            success: false,
            nextWorkTime: user.lastWork + cooldownTime
        };
    }
    
    const jobs = [
        { name: "Pizza Delivery", description: "You delivered pizzas around town!", base: 50, max: 150 },
        { name: "Dog Walker", description: "You walked some adorable dogs!", base: 30, max: 100 },
        { name: "Freelancer", description: "You completed a programming project!", base: 80, max: 250 },
        { name: "Cashier", description: "You worked at a busy store!", base: 40, max: 120 },
        { name: "Tutor", description: "You helped students with their homework!", base: 60, max: 180 },
        { name: "Street Performer", description: "Your performance impressed the crowd!", base: 20, max: 300 }
    ];
    
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    const baseEarned = Math.floor(Math.random() * (job.max - job.base + 1)) + job.base;
    
    // Calculate bonuses
    let bonus = 0;
    let streakBonus = Math.min(user.workStreak * 5, 50);
    let levelBonus = Math.floor(user.level * 2);
    
    // Check for coffee effect
    if (user.effects.some(e => e.type === 'work_bonus' && e.expires > now)) {
        bonus += Math.floor(baseEarned * 0.5);
    }
    
    const totalEarned = baseEarned + bonus + streakBonus + levelBonus;
    const experience = Math.floor(totalEarned / 10);
    
    // Update user data
    const newCoins = user.coins + totalEarned;
    const newExperience = user.experience + experience;
    const newLevel = Math.floor(newExperience / 1000) + 1;
    const levelUp = newLevel > user.level;
    
    updateUserData(userId, {
        coins: newCoins,
        experience: newExperience,
        level: newLevel,
        lastWork: now,
        workStreak: user.workStreak + 1,
        totalEarned: user.totalEarned + totalEarned
    });
    
    return {
        success: true,
        job: job.name,
        description: job.description,
        earned: baseEarned,
        bonus: bonus + streakBonus + levelBonus,
        experience,
        levelUp,
        newLevel
    };
}

async function getShopItems() {
    const shop = loadShopData();
    return shop.items;
}

async function buyItem(userId, itemId) {
    const user = getUserData(userId);
    const shop = loadShopData();
    const item = shop.items.find(i => i.id === itemId);
    
    if (!item) {
        return { success: false, message: 'Item not found!' };
    }
    
    if (user.coins < item.price) {
        return { success: false, message: 'Insufficient coins!' };
    }
    
    // Update user inventory
    const existingItem = user.inventory.find(i => i.id === itemId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        user.inventory.push({
            id: itemId,
            name: item.name,
            emoji: item.emoji,
            quantity: 1,
            value: item.price,
            type: item.type
        });
    }
    
    // Apply item effects
    if (item.effect === 'work_bonus') {
        user.effects.push({
            type: 'work_bonus',
            expires: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
        });
    } else if (item.effect === 'gambling_bonus') {
        user.effects.push({
            type: 'gambling_bonus',
            expires: Date.now() + (1 * 60 * 60 * 1000) // 1 hour
        });
    } else if (item.type === 'tool') {
        if (!user.tools.includes(itemId)) {
            user.tools.push(itemId);
        }
    }
    
    const newBalance = user.coins - item.price;
    updateUserData(userId, {
        coins: newBalance,
        inventory: user.inventory,
        effects: user.effects,
        tools: user.tools,
        totalSpent: user.totalSpent + item.price
    });
    
    return {
        success: true,
        item,
        newBalance
    };
}

async function getUserInventory(userId) {
    const user = getUserData(userId);
    return user.inventory;
}

async function transferCoins(fromUserId, toUserId, amount) {
    const fromUser = getUserData(fromUserId);
    const toUser = getUserData(toUserId);
    
    if (fromUser.coins < amount) {
        return { success: false, message: 'Insufficient coins!' };
    }
    
    const fee = Math.floor(amount * 0.05); // 5% transfer fee
    const transferAmount = amount - fee;
    
    updateUserData(fromUserId, {
        coins: fromUser.coins - amount
    });
    
    updateUserData(toUserId, {
        coins: toUser.coins + transferAmount
    });
    
    return {
        success: true,
        newBalance: fromUser.coins - amount,
        fee
    };
}

async function playGamblingGame(userId, game, bet) {
    const user = getUserData(userId);
    
    if (user.coins < bet) {
        return { success: false, message: 'Insufficient coins!' };
    }
    
    let won = false;
    let payout = 0;
    let description = '';
    
    // Check for lucky charm effect
    const hasLuckyCharm = user.effects.some(e => e.type === 'gambling_bonus' && e.expires > Date.now());
    const luckBonus = hasLuckyCharm ? 0.1 : 0; // 10% better odds
    
    switch (game) {
        case 'coinflip':
            const coinResult = Math.random() + luckBonus > 0.5;
            won = coinResult;
            payout = won ? bet : -bet;
            description = `The coin landed on **${coinResult ? 'Heads' : 'Tails'}**!`;
            break;
            
        case 'dice':
            const diceRoll = Math.floor(Math.random() * 6) + 1;
            const winNumber = Math.floor(Math.random() * 6) + 1;
            won = diceRoll >= 4 || hasLuckyCharm && diceRoll >= 3;
            payout = won ? Math.floor(bet * 1.5) : -bet;
            description = `You rolled a **${diceRoll}**! ${won ? 'Lucky!' : 'Better luck next time!'}`;
            break;
            
        case 'slots':
            const symbols = ['🍎', '🍌', '🍒', '🍇', '🍊', '💎'];
            const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
            const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
            const reel3 = symbols[Math.floor(Math.random() * symbols.length)];
            
            if (reel1 === reel2 && reel2 === reel3) {
                won = true;
                payout = reel1 === '💎' ? bet * 10 : bet * 3;
            } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
                won = true;
                payout = Math.floor(bet * 0.5);
            } else {
                won = false;
                payout = -bet;
            }
            
            description = `${reel1} | ${reel2} | ${reel3}\n${won ? 'You won!' : 'No match!'}`;
            break;
            
        case 'blackjack':
            // Simplified blackjack
            const playerTotal = Math.floor(Math.random() * 11) + 15; // 15-25
            const dealerTotal = Math.floor(Math.random() * 11) + 15; // 15-25
            
            if (playerTotal > 21) {
                won = false;
                payout = -bet;
                description = `You: ${playerTotal} (Bust!)\nDealer: ${dealerTotal}`;
            } else if (dealerTotal > 21) {
                won = true;
                payout = bet * 2;
                description = `You: ${playerTotal}\nDealer: ${dealerTotal} (Bust!)`;
            } else {
                won = playerTotal > dealerTotal;
                payout = won ? bet * 2 : -bet;
                description = `You: ${playerTotal}\nDealer: ${dealerTotal}`;
            }
            break;
    }
    
    const newBalance = user.coins + payout;
    updateUserData(userId, {
        coins: newBalance,
        totalEarned: won ? user.totalEarned + Math.abs(payout) : user.totalEarned
    });
    
    return {
        success: true,
        game: game.charAt(0).toUpperCase() + game.slice(1),
        won,
        payout,
        description,
        newBalance
    };
}

async function getEconomyLeaderboard(guildId, client) {
    const data = loadEconomyData();
    const leaderboard = [];
    
    for (const [userId, userData] of Object.entries(data)) {
        try {
            const user = await client.users.fetch(userId);
            const netWorth = userData.coins + userData.bank + (userData.gems * 10);
            
            leaderboard.push({
                userId,
                username: user.username,
                netWorth,
                level: userData.level,
                coins: userData.coins
            });
        } catch (error) {
            // User not found, skip
        }
    }
    
    return leaderboard.sort((a, b) => b.netWorth - a.netWorth);
}

async function commitCrime(userId) {
    const user = getUserData(userId);
    const now = Date.now();
    const cooldownTime = 60 * 60 * 1000; // 1 hour
    
    if (now - user.lastCrime < cooldownTime) {
        return {
            success: false,
            nextCrimeTime: user.lastCrime + cooldownTime
        };
    }
    
    const crimes = [
        { name: "Pickpocketing", successRate: 70, reward: 100, fine: 200 },
        { name: "Bank Heist", successRate: 30, reward: 500, fine: 800 },
        { name: "Art Theft", successRate: 40, reward: 300, fine: 600 },
        { name: "Cyber Crime", successRate: 60, reward: 250, fine: 400 },
        { name: "Identity Fraud", successRate: 50, reward: 200, fine: 350 }
    ];
    
    const crime = crimes[Math.floor(Math.random() * crimes.length)];
    const success = Math.random() * 100 < crime.successRate;
    const caught = !success;
    
    let payout = success ? crime.reward : -crime.fine;
    const newBalance = Math.max(0, user.coins + payout);
    
    updateUserData(userId, {
        coins: newBalance,
        lastCrime: now,
        totalEarned: success ? user.totalEarned + crime.reward : user.totalEarned
    });
    
    return {
        success: true,
        crime: crime.name,
        description: success ? 
            `You successfully pulled off the ${crime.name.toLowerCase()}!` : 
            `You got caught during the ${crime.name.toLowerCase()}!`,
        caught,
        payout: Math.abs(payout),
        successRate: crime.successRate,
        newBalance
    };
}

async function robUser(robberId, targetId) {
    const robber = getUserData(robberId);
    const target = getUserData(targetId);
    const now = Date.now();
    const cooldownTime = 2 * 60 * 60 * 1000; // 2 hours
    
    if (now - robber.lastRob < cooldownTime) {
        return {
            success: false,
            message: 'You need to wait before robbing again!'
        };
    }
    
    if (target.coins < 100) {
        return {
            success: false,
            message: 'Target doesn\'t have enough coins to rob!'
        };
    }
    
    const successRate = Math.max(20, 70 - (target.level * 5)); // Higher level = harder to rob
    const successful = Math.random() * 100 < successRate;
    
    let amount = 0;
    let newBalance = robber.coins;
    
    if (successful) {
        amount = Math.floor(Math.random() * Math.min(target.coins * 0.3, 500)) + 50;
        newBalance = robber.coins + amount;
        
        updateUserData(targetId, {
            coins: target.coins - amount
        });
        
        updateUserData(robberId, {
            coins: newBalance,
            lastRob: now,
            totalEarned: robber.totalEarned + amount
        });
        
        return {
            success: true,
            successful: true,
            amount,
            newBalance,
            description: `You successfully robbed ${amount} coins!`
        };
    } else {
        // Failed robbery - pay fine
        const fine = Math.floor(Math.random() * 200) + 100;
        amount = Math.min(fine, robber.coins);
        newBalance = robber.coins - amount;
        
        updateUserData(robberId, {
            coins: newBalance,
            lastRob: now
        });
        
        return {
            success: true,
            successful: false,
            amount,
            newBalance,
            description: `You got caught and paid a ${amount} coin fine!`
        };
    }
}

async function getAvailableQuests(userId) {
    const user = getUserData(userId);
    const questData = loadQuestData();
    const quests = [];
    
    questData.daily.forEach(quest => {
        const progress = user.questProgress[quest.id] || 0;
        quests.push({
            ...quest,
            progress,
            completed: progress >= quest.requirement
        });
    });
    
    return quests;
}

async function mineResources(userId) {
    const user = getUserData(userId);
    const now = Date.now();
    const cooldownTime = 45 * 60 * 1000; // 45 minutes
    
    if (now - user.lastMine < cooldownTime) {
        return {
            success: false,
            nextMineTime: user.lastMine + cooldownTime
        };
    }
    
    const locations = [
        { name: "Copper Mine", baseReward: 30 },
        { name: "Iron Quarry", baseReward: 50 },
        { name: "Gold Cavern", baseReward: 80 },
        { name: "Diamond Depths", baseReward: 150 }
    ];
    
    const resources = [
        { name: "Coal", emoji: "⚫", value: 10 },
        { name: "Iron", emoji: "⚪", value: 25 },
        { name: "Gold", emoji: "🟡", value: 50 },
        { name: "Diamond", emoji: "💎", value: 100 },
        { name: "Emerald", emoji: "🟢", value: 75 }
    ];
    
    const location = locations[Math.floor(Math.random() * locations.length)];
    const foundResources = [];
    const numResources = Math.floor(Math.random() * 3) + 1;
    
    let totalValue = location.baseReward;
    
    for (let i = 0; i < numResources; i++) {
        const resource = resources[Math.floor(Math.random() * resources.length)];
        const amount = Math.floor(Math.random() * 3) + 1;
        
        foundResources.push({
            ...resource,
            amount
        });
        
        totalValue += resource.value * amount;
    }
    
    // Diamond pickaxe bonus
    if (user.tools.includes('diamond_pickaxe')) {
        totalValue = Math.floor(totalValue * 1.5);
    }
    
    const experience = Math.floor(totalValue / 5);
    const rareFind = Math.random() < 0.1 ? "You discovered a rare gem vein!" : null;
    
    if (rareFind) {
        totalValue += 200;
    }
    
    updateUserData(userId, {
        coins: user.coins + totalValue,
        experience: user.experience + experience,
        lastMine: now,
        totalEarned: user.totalEarned + totalValue
    });
    
    return {
        success: true,
        location: location.name,
        description: `You spent time mining in the dangerous depths!`,
        resources: foundResources,
        totalValue,
        experience,
        rareFind
    };
}

module.exports = {
    getUserBalance,
    formatCurrency,
    workForCoins,
    getShopItems,
    buyItem,
    getUserInventory,
    transferCoins,
    playGamblingGame,
    getEconomyLeaderboard,
    commitCrime,
    robUser,
    getAvailableQuests,
    mineResources,
    getUserData,
    updateUserData,
    loadEconomyData
};
