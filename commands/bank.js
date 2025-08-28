
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Banking system for server economy')
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Check your bank balance'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('deposit')
                .setDescription('Deposit coins to your bank account')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to deposit')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('withdraw')
                .setDescription('Withdraw coins from your bank account')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to withdraw')
                        .setRequired(true)
                        .setMinValue(1))),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'balance':
                const embed = new EmbedBuilder()
                    .setTitle('🏦 Bank Balance')
                    .setDescription('💰 Balance: **0** coins\n💳 Interest Rate: **2%** daily')
                    .setColor('#00FF00')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                break;
                
            case 'deposit':
                const depositAmount = interaction.options.getInteger('amount');
                await interaction.reply({
                    content: `🏦 Banking system is under development! Would deposit ${depositAmount} coins.`,
                    ephemeral: true
                });
                break;
                
            case 'withdraw':
                const withdrawAmount = interaction.options.getInteger('amount');
                await interaction.reply({
                    content: `🏦 Banking system is under development! Would withdraw ${withdrawAmount} coins.`,
                    ephemeral: true
                });
                break;
        }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Banking system for secure coin storage!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('deposit')
                .setDescription('Deposit coins into your bank account')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to deposit (or "all")')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('withdraw')
                .setDescription('Withdraw coins from your bank account')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to withdraw')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('loan')
                .setDescription('Apply for a loan')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Loan amount')
                        .setRequired(true)
                        .setMinValue(100)
                        .setMaxValue(10000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('repay')
                .setDescription('Repay your loan')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to repay')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('interest')
                .setDescription('Claim daily bank interest'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('account')
                .setDescription('View your bank account details')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'deposit':
                    await handleDeposit(interaction);
                    break;
                case 'withdraw':
                    await handleWithdraw(interaction);
                    break;
                case 'loan':
                    await handleLoan(interaction);
                    break;
                case 'repay':
                    await handleRepay(interaction);
                    break;
                case 'interest':
                    await handleInterest(interaction);
                    break;
                case 'account':
                    await handleAccount(interaction);
                    break;
            }
        } catch (error) {
            console.error('❌ Error in bank command:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ **Error**: Banking system temporarily unavailable.',
                    flags: 64
                });
            }
        }
    }
};

async function handleDeposit(interaction) {
    const { depositToBank } = require('../components/bankingSystem');
    
    const amount = interaction.options.getInteger('amount');
    const result = await depositToBank(interaction.user.id, amount);
    
    if (!result.success) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Deposit Failed')
            .setDescription(result.message)
            .setColor('#FF0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], flags: 64 });
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🏦 Deposit Successful!')
        .setDescription(`Successfully deposited ${amount} coins into your bank account.`)
        .addFields(
            { name: '💰 Deposited', value: `${amount} coins`, inline: true },
            { name: '🏦 Bank Balance', value: `${result.newBankBalance} coins`, inline: true },
            { name: '💳 Wallet Balance', value: `${result.newWalletBalance} coins`, inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleWithdraw(interaction) {
    const { withdrawFromBank } = require('../components/bankingSystem');
    
    const amount = interaction.options.getInteger('amount');
    const result = await withdrawFromBank(interaction.user.id, amount);
    
    if (!result.success) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Withdrawal Failed')
            .setDescription(result.message)
            .setColor('#FF0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], flags: 64 });
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🏦 Withdrawal Successful!')
        .setDescription(`Successfully withdrew ${amount} coins from your bank account.`)
        .addFields(
            { name: '💸 Withdrawn', value: `${amount} coins`, inline: true },
            { name: '🏦 Bank Balance', value: `${result.newBankBalance} coins`, inline: true },
            { name: '💳 Wallet Balance', value: `${result.newWalletBalance} coins`, inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleLoan(interaction) {
    const { applyForLoan } = require('../components/bankingSystem');
    
    const amount = interaction.options.getInteger('amount');
    const result = await applyForLoan(interaction.user.id, amount);
    
    if (!result.success) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Loan Application Denied')
            .setDescription(result.message)
            .setColor('#FF0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], flags: 64 });
    }
    
    const embed = new EmbedBuilder()
        .setTitle('✅ Loan Approved!')
        .setDescription(`Your loan application has been approved!`)
        .addFields(
            { name: '💰 Loan Amount', value: `${amount} coins`, inline: true },
            { name: '📈 Interest Rate', value: `${result.interestRate}%`, inline: true },
            { name: '💳 Total to Repay', value: `${result.totalOwed} coins`, inline: true },
            { name: '⏰ Due Date', value: `<t:${Math.floor(result.dueDate / 1000)}:R>`, inline: true },
            { name: '🏦 Credit Score', value: result.newCreditScore.toString(), inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleRepay(interaction) {
    const { repayLoan } = require('../components/bankingSystem');
    
    const amount = interaction.options.getInteger('amount');
    const result = await repayLoan(interaction.user.id, amount);
    
    if (!result.success) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Repayment Failed')
            .setDescription(result.message)
            .setColor('#FF0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], flags: 64 });
    }
    
    const embed = new EmbedBuilder()
        .setTitle('💳 Loan Repayment')
        .setDescription(result.paidOff ? 'Congratulations! Your loan is fully paid off!' : 'Payment processed successfully!')
        .addFields(
            { name: '💰 Payment', value: `${amount} coins`, inline: true },
            { name: '📉 Remaining Debt', value: `${result.remainingDebt} coins`, inline: true },
            { name: '🏦 Credit Score', value: result.newCreditScore.toString(), inline: true }
        )
        .setColor(result.paidOff ? '#00FF00' : '#FFA500')
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleInterest(interaction) {
    const { claimInterest } = require('../components/bankingSystem');
    
    const result = await claimInterest(interaction.user.id);
    
    if (!result.success) {
        const timeLeft = Math.ceil((result.nextClaimTime - Date.now()) / (1000 * 60 * 60));
        
        const embed = new EmbedBuilder()
            .setTitle('⏰ Interest Already Claimed')
            .setDescription(`You've already claimed today's interest!\nCome back in ${timeLeft} hours.`)
            .setColor('#FFA500')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], flags: 64 });
    }
    
    const embed = new EmbedBuilder()
        .setTitle('💰 Interest Claimed!')
        .setDescription('You earned interest on your bank balance!')
        .addFields(
            { name: '🏦 Bank Balance', value: `${result.bankBalance} coins`, inline: true },
            { name: '📈 Interest Rate', value: `${result.interestRate}%`, inline: true },
            { name: '💰 Interest Earned', value: `${result.interestEarned} coins`, inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleAccount(interaction) {
    const { getBankAccount } = require('../components/bankingSystem');
    
    const account = await getBankAccount(interaction.user.id);
    
    const embed = new EmbedBuilder()
        .setTitle('🏦 Bank Account Details')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '💰 Wallet Balance', value: `${account.coins} coins`, inline: true },
            { name: '🏦 Bank Balance', value: `${account.bank} coins`, inline: true },
            { name: '📊 Net Worth', value: `${account.coins + account.bank} coins`, inline: true },
            { name: '🏦 Credit Score', value: account.creditScore.toString(), inline: true },
            { name: '📈 Interest Rate', value: `${account.interestRate}%`, inline: true },
            { name: '💳 Account Level', value: account.accountLevel, inline: true }
        )
        .setColor('#4A90E2')
        .setTimestamp();
    
    if (account.activeLoan) {
        embed.addFields(
            { name: '💸 Active Loan', value: `${account.loanAmount} coins`, inline: true },
            { name: '⏰ Due Date', value: `<t:${Math.floor(account.loanDueDate / 1000)}:R>`, inline: true }
        );
    }
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('bank_quick_deposit')
                .setLabel('💰 Quick Deposit')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('bank_quick_withdraw')
                .setLabel('💸 Quick Withdraw')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('bank_loan_calculator')
                .setLabel('🧮 Loan Calculator')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.reply({ embeds: [embed], components: [row] });
}
