const { Events, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/loggingSystem');
const { initializeCaptchaVerification } = require('../components/captchaSystem');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            console.log(`👋 Member joined: ${member.user.tag} in ${member.guild.name}`);

            // Initialize captcha verification if enabled
            try {
                await initializeCaptchaVerification(member);
            } catch (captchaError) {
                console.error('❌ Error initializing captcha verification:', captchaError);
            }

            // Log member join
            try {
                const logData = {
                    member: member,
                    user: member.user,
                    guild: member.guild,
                    memberCount: member.guild.memberCount,
                    accountCreated: member.user.createdAt,
                    joinedAt: new Date()
                };

                const logSuccess = await logAction(member.guild, 'member_join', logData, member.user);
                if (logSuccess) {
                    console.log(`✅ Successfully logged member join for ${member.user.tag}`);
                } else {
                    console.log(`⚠️ Failed to log member join for ${member.user.tag}`);
                }
            } catch (logError) {
                console.error('❌ Error logging member join:', logError);
            }

        } catch (error) {
            console.error('❌ Error in guildMemberAdd event:', error);
        }
    }
};