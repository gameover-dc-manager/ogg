
const { getUserData, updateUserData } = require('./economySystem');

async function depositToBank(userId, amount) {
    const user = getUserData(userId);
    
    if (amount === 'all') {
        amount = user.coins;
    }
    
    if (user.coins < amount) {
        return { success: false, message: 'Insufficient coins in wallet!' };
    }
    
    const newWalletBalance = user.coins - amount;
    const newBankBalance = user.bank + amount;
    
    updateUserData(userId, {
        coins: newWalletBalance,
        bank: newBankBalance
    });
    
    return {
        success: true,
        newWalletBalance,
        newBankBalance
    };
}

async function withdrawFromBank(userId, amount) {
    const user = getUserData(userId);
    
    if (user.bank < amount) {
        return { success: false, message: 'Insufficient funds in bank!' };
    }
    
    const newBankBalance = user.bank - amount;
    const newWalletBalance = user.coins + amount;
    
    updateUserData(userId, {
        coins: newWalletBalance,
        bank: newBankBalance
    });
    
    return {
        success: true,
        newWalletBalance,
        newBankBalance
    };
}

async function applyForLoan(userId, amount) {
    const user = getUserData(userId);
    
    if (user.activeLoan) {
        return { success: false, message: 'You already have an active loan!' };
    }
    
    // Credit score affects loan approval and interest rate
    const minCreditScore = 300;
    if (user.creditScore < minCreditScore) {
        return { success: false, message: 'Credit score too low for loan approval!' };
    }
    
    // Calculate interest rate based on credit score
    const baseRate = 10;
    const creditBonus = Math.floor((user.creditScore - 300) / 50);
    const interestRate = Math.max(5, baseRate - creditBonus);
    
    const totalOwed = Math.floor(amount * (1 + interestRate / 100));
    const dueDate = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
    
    const newCreditScore = Math.max(200, user.creditScore - 20); // Loan lowers credit score temporarily
    
    updateUserData(userId, {
        coins: user.coins + amount,
        activeLoan: true,
        loanAmount: totalOwed,
        loanDueDate: dueDate,
        creditScore: newCreditScore
    });
    
    return {
        success: true,
        interestRate,
        totalOwed,
        dueDate,
        newCreditScore
    };
}

async function repayLoan(userId, amount) {
    const user = getUserData(userId);
    
    if (!user.activeLoan) {
        return { success: false, message: 'You don\'t have an active loan!' };
    }
    
    if (user.coins < amount) {
        return { success: false, message: 'Insufficient coins!' };
    }
    
    const remainingDebt = Math.max(0, user.loanAmount - amount);
    const paidOff = remainingDebt === 0;
    
    let newCreditScore = user.creditScore;
    if (paidOff) {
        newCreditScore = Math.min(850, user.creditScore + 50); // Boost credit score
    } else {
        newCreditScore = Math.min(850, user.creditScore + 10); // Small boost for payment
    }
    
    updateUserData(userId, {
        coins: user.coins - amount,
        loanAmount: remainingDebt,
        activeLoan: !paidOff,
        loanDueDate: paidOff ? null : user.loanDueDate,
        creditScore: newCreditScore
    });
    
    return {
        success: true,
        remainingDebt,
        paidOff,
        newCreditScore
    };
}

async function claimInterest(userId) {
    const user = getUserData(userId);
    const now = Date.now();
    const cooldownTime = 24 * 60 * 60 * 1000; // 24 hours
    
    if (user.lastInterest && now - user.lastInterest < cooldownTime) {
        return {
            success: false,
            nextClaimTime: user.lastInterest + cooldownTime
        };
    }
    
    if (user.bank < 100) {
        return { success: false, message: 'Minimum 100 coins required in bank for interest!' };
    }
    
    // Interest rate based on credit score and account level
    const baseRate = 2; // 2%
    const creditBonus = Math.floor(user.creditScore / 200); // Up to 4% bonus
    const levelBonus = Math.floor(user.level / 10); // Level bonus
    
    const interestRate = baseRate + creditBonus + levelBonus;
    const interestEarned = Math.floor(user.bank * (interestRate / 100));
    
    updateUserData(userId, {
        bank: user.bank + interestEarned,
        lastInterest: now,
        totalEarned: user.totalEarned + interestEarned
    });
    
    return {
        success: true,
        bankBalance: user.bank,
        interestRate,
        interestEarned
    };
}

async function getBankAccount(userId) {
    const user = getUserData(userId);
    
    // Determine account level based on total money
    const totalMoney = user.coins + user.bank;
    let accountLevel = 'Bronze';
    
    if (totalMoney >= 10000) accountLevel = 'Platinum';
    else if (totalMoney >= 5000) accountLevel = 'Gold';
    else if (totalMoney >= 1000) accountLevel = 'Silver';
    
    // Calculate interest rate
    const baseRate = 2;
    const creditBonus = Math.floor(user.creditScore / 200);
    const levelBonus = Math.floor(user.level / 10);
    const interestRate = baseRate + creditBonus + levelBonus;
    
    return {
        ...user,
        accountLevel,
        interestRate
    };
}

module.exports = {
    depositToBank,
    withdrawFromBank,
    applyForLoan,
    repayLoan,
    claimInterest,
    getBankAccount
};
