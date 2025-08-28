
const { logAction } = require('../utils/loggingSystem');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        try {
            console.log(`👋 Member left: ${member.user.tag} from ${member.guild.name}`);

            // Log member leave
            try {
                const logData = {
                    member: member,
                    user: member.user,
                    guild: member.guild,
                    memberCount: member.guild.memberCount,
                    roles: member.roles.cache.map(role => ({ name: role.name, id: role.id })),
                    joinedAt: member.joinedAt,
                    leftAt: new Date(),
                    accountAge: member.user.createdAt ? Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24)) : 'Unknown'
                };

                const logSuccess = await logAction(member.guild, 'member_leave', logData, member.user);
                if (logSuccess) {
                    console.log(`✅ Successfully logged member leave for ${member.user.tag}`);
                } else {
                    console.log(`⚠️ Failed to log member leave for ${member.user.tag}`);
                }
            } catch (logError) {
                console.error('❌ Error logging member leave:', logError);
            }

        } catch (error) {
            console.error('❌ Error in guildMemberRemove event:', error);
        }
    }
};
