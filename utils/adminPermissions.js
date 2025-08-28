
const fs = require('fs').promises;
const path = require('path');

async function hasAdminPermissions(member) {
    try {
        // Check if member exists and has required properties
        if (!member || !member.permissions || !member.guild || !member.id) {
            console.error('Invalid member object passed to hasAdminPermissions');
            return false;
        }

        // Check if user has Administrator permission
        if (member.permissions.has('Administrator')) {
            return true;
        }

        // Check if user is server owner
        if (member.id === member.guild.ownerId) {
            return true;
        }

        // Load admin roles configuration
        const adminRolesPath = path.join(__dirname, '../config/admin_roles.json');
        let adminRoles = {};
        
        try {
            const data = await fs.readFile(adminRolesPath, 'utf8');
            adminRoles = JSON.parse(data);
        } catch (error) {
            return false; // No admin roles file means no additional permissions
        }

        const guildAdminRoles = adminRoles[member.guild.id] || [];
        
        // Check if user has any of the admin roles
        if (!member.roles || !member.roles.cache) {
            return false;
        }
        
        return member.roles.cache.some(role => guildAdminRoles.includes(role.id));
    } catch (error) {
        console.error('Error checking admin permissions:', error);
        return false;
    }
}

async function hasModerationPermissions(member) {
    try {
        // Check if member exists and has required properties
        if (!member || !member.permissions || !member.guild || !member.id) {
            console.error('Invalid member object passed to hasModerationPermissions');
            return false;
        }

        // First check admin permissions (admins can do moderation)
        if (await hasAdminPermissions(member)) {
            return true;
        }

        // Check specific moderation permissions
        const moderationPerms = [
            'ManageMessages',
            'ModerateMembers',
            'KickMembers',
            'BanMembers'
        ];

        return member.permissions.has(moderationPerms, false); // false = needs ANY permission
    } catch (error) {
        console.error('Error checking moderation permissions:', error);
        return false;
    }
}

async function hasUtilityPermissions(member) {
    try {
        // Utility commands can be used by anyone with basic permissions
        // Or admin/moderation roles
        if (await hasAdminPermissions(member)) {
            return true;
        }

        // Basic utility permissions
        return member.permissions.has(['SendMessages', 'UseApplicationCommands']);
    } catch (error) {
        console.error('Error checking utility permissions:', error);
        return false;
    }
}

module.exports = {
    hasAdminPermissions,
    hasModerationPermissions,
    hasUtilityPermissions
};
