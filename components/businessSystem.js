
const { getUserData, updateUserData } = require('./economySystem');
const fs = require('fs');
const path = require('path');

const BUSINESS_FILE = path.join(__dirname, '../config/businesses.json');

// Initialize business file
function initializeBusinessFile() {
    if (!fs.existsSync(BUSINESS_FILE)) {
        fs.writeFileSync(BUSINESS_FILE, JSON.stringify({}, null, 2));
    }
}

initializeBusinessFile();

function loadBusinessData() {
    try {
        return JSON.parse(fs.readFileSync(BUSINESS_FILE, 'utf8'));
    } catch (error) {
        return {};
    }
}

function saveBusinessData(data) {
    fs.writeFileSync(BUSINESS_FILE, JSON.stringify(data, null, 2));
}

const BUSINESS_TYPES = {
    cafe: {
        name: 'Cozy Cafe',
        emoji: '☕',
        startupCost: 1000,
        dailyIncome: 150,
        description: 'A warm place for coffee lovers'
    },
    tech: {
        name: 'Tech Startup',
        emoji: '💻',
        startupCost: 5000,
        dailyIncome: 800,
        description: 'Innovation-driven technology company'
    },
    restaurant: {
        name: 'Fine Restaurant',
        emoji: '🍽️',
        startupCost: 3000,
        dailyIncome: 400,
        description: 'Exquisite dining experience'
    },
    retail: {
        name: 'Retail Store',
        emoji: '🛍️',
        startupCost: 2000,
        dailyIncome: 250,
        description: 'Popular shopping destination'
    },
    mining: {
        name: 'Mining Operation',
        emoji: '⛏️',
        startupCost: 8000,
        dailyIncome: 1200,
        description: 'Extract valuable resources'
    }
};

async function startBusiness(userId, businessType) {
    const user = getUserData(userId);
    const businessData = loadBusinessData();
    
    if (!BUSINESS_TYPES[businessType]) {
        return { success: false, message: 'Invalid business type!' };
    }
    
    const businessTemplate = BUSINESS_TYPES[businessType];
    
    if (user.coins < businessTemplate.startupCost) {
        return { success: false, message: 'Insufficient funds to start this business!' };
    }
    
    // Check if user already has 5 businesses (limit)
    if (!businessData[userId]) {
        businessData[userId] = [];
    }
    
    if (businessData[userId].length >= 5) {
        return { success: false, message: 'You can only own up to 5 businesses!' };
    }
    
    const business = {
        id: Date.now().toString(),
        type: businessType,
        name: businessTemplate.name,
        emoji: businessTemplate.emoji,
        level: 1,
        dailyIncome: businessTemplate.dailyIncome,
        employees: 0,
        lastCollection: Date.now(),
        totalInvested: businessTemplate.startupCost,
        upgrades: {
            equipment: 0,
            marketing: 0,
            efficiency: 0
        }
    };
    
    businessData[userId].push(business);
    saveBusinessData(businessData);
    
    const newBalance = user.coins - businessTemplate.startupCost;
    updateUserData(userId, { coins: newBalance });
    
    return {
        success: true,
        business: {
            ...business,
            startupCost: businessTemplate.startupCost
        },
        newBalance
    };
}

async function getUserBusinesses(userId) {
    const businessData = loadBusinessData();
    return businessData[userId] || [];
}

async function investInBusiness(userId, amount) {
    const user = getUserData(userId);
    const businesses = await getUserBusinesses(userId);
    
    if (businesses.length === 0) {
        return { success: false, message: 'You don\'t own any businesses!' };
    }
    
    if (user.coins < amount) {
        return { success: false, message: 'Insufficient funds!' };
    }
    
    // Distribute investment across all businesses
    const perBusinessInvestment = Math.floor(amount / businesses.length);
    const businessData = loadBusinessData();
    
    businessData[userId].forEach(business => {
        business.totalInvested += perBusinessInvestment;
        // Investment increases daily income by 5% of investment
        business.dailyIncome += Math.floor(perBusinessInvestment * 0.05);
    });
    
    saveBusinessData(businessData);
    
    const newBalance = user.coins - amount;
    updateUserData(userId, { coins: newBalance });
    
    return {
        success: true,
        expectedROI: 15, // 15% expected return
        newBalance
    };
}

async function collectBusinessProfits(userId) {
    const businesses = await getUserBusinesses(userId);
    
    if (businesses.length === 0) {
        return { success: false, message: 'You don\'t own any businesses!' };
    }
    
    let totalCollected = 0;
    const bonuses = [];
    const businessData = loadBusinessData();
    const now = Date.now();
    
    businessData[userId].forEach(business => {
        const timeSinceLastCollection = now - business.lastCollection;
        const daysPassed = Math.floor(timeSinceLastCollection / (24 * 60 * 60 * 1000));
        
        if (daysPassed > 0) {
            let profit = business.dailyIncome * daysPassed;
            
            // Apply bonuses
            if (business.employees > 0) {
                const employeeBonus = Math.floor(profit * (business.employees * 0.1));
                profit += employeeBonus;
                bonuses.push(`👥 Employee bonus: +${employeeBonus} coins`);
            }
            
            // Weekend bonus (if it's weekend)
            const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
            if (isWeekend) {
                const weekendBonus = Math.floor(profit * 0.2);
                profit += weekendBonus;
                bonuses.push(`🎉 Weekend bonus: +${weekendBonus} coins`);
            }
            
            totalCollected += profit;
            business.lastCollection = now;
        }
    });
    
    if (totalCollected === 0) {
        return { success: false, message: 'No profits ready for collection yet!' };
    }
    
    saveBusinessData(businessData);
    
    const user = getUserData(userId);
    const newBalance = user.coins + totalCollected;
    updateUserData(userId, { 
        coins: newBalance,
        totalEarned: user.totalEarned + totalCollected
    });
    
    return {
        success: true,
        totalCollected,
        businessCount: businesses.length,
        newBalance,
        bonuses
    };
}

async function getUpgradeOptions(userId) {
    const user = getUserData(userId);
    const businesses = await getUserBusinesses(userId);
    const options = [];
    
    businesses.forEach(business => {
        // Equipment upgrade
        const equipmentLevel = business.upgrades.equipment;
        const equipmentCost = (equipmentLevel + 1) * 500;
        if (user.coins >= equipmentCost) {
            options.push({
                id: `equipment_${business.id}`,
                name: `${business.name} - Equipment`,
                emoji: '🔧',
                cost: equipmentCost,
                benefit: '+20% daily income',
                currentLevel: equipmentLevel
            });
        }
        
        // Marketing upgrade
        const marketingLevel = business.upgrades.marketing;
        const marketingCost = (marketingLevel + 1) * 300;
        if (user.coins >= marketingCost) {
            options.push({
                id: `marketing_${business.id}`,
                name: `${business.name} - Marketing`,
                emoji: '📢',
                cost: marketingCost,
                benefit: '+15% daily income',
                currentLevel: marketingLevel
            });
        }
        
        // Efficiency upgrade
        const efficiencyLevel = business.upgrades.efficiency;
        const efficiencyCost = (efficiencyLevel + 1) * 800;
        if (user.coins >= efficiencyCost) {
            options.push({
                id: `efficiency_${business.id}`,
                name: `${business.name} - Efficiency`,
                emoji: '⚡',
                cost: efficiencyCost,
                benefit: '+25% daily income',
                currentLevel: efficiencyLevel
            });
        }
    });
    
    return options;
}

async function getMarketData() {
    const trends = ['Bull Market 📈', 'Bear Market 📉', 'Stable Market ➡️', 'Volatile Market 📊'];
    const currentTrend = trends[Math.floor(Math.random() * trends.length)];
    
    const opportunities = [
        {
            emoji: '🏪',
            name: 'Pop-up Store',
            cost: 1500,
            profit: 200,
            risk: 'Low'
        },
        {
            emoji: '🚚',
            name: 'Delivery Service',
            cost: 3000,
            profit: 450,
            risk: 'Medium'
        },
        {
            emoji: '🏭',
            name: 'Manufacturing Plant',
            cost: 10000,
            profit: 1500,
            risk: 'High'
        }
    ];
    
    return {
        trend: currentTrend,
        averageProfit: 350,
        topBusinessType: 'Tech Startup',
        opportunities
    };
}

module.exports = {
    startBusiness,
    getUserBusinesses,
    investInBusiness,
    collectBusinessProfits,
    getUpgradeOptions,
    getMarketData
};
