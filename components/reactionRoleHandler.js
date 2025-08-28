
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { musicIcons } = require('../musicIcons/musicIcons.js');

// File paths
const configPath = path.join(__dirname, '../config/reaction_roles.json');
const cooldownPath = path.join(__dirname, '../config/rr_cooldowns.json');

// Load configuration
let reactionRoles = {};
let cooldowns = {};

try {
    if (fs.existsSync(configPath)) {
        reactionRoles = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    if (fs.existsSync(cooldownPath)) {
        cooldowns = JSON.parse(fs.readFileSync(cooldownPath, 'utf8'));
    }
} catch (error) {
    console.error('❌ Error loading reaction role configs:', error);
}

// Save functions
function saveReactionRoles() {
    try {
        fs.writeFileSync(configPath, JSON.stringify(reactionRoles, null, 2));
    } catch (error) {
        console.error('❌ Error saving reaction roles:', error);
    }
}

function saveCooldowns() {
    try {
        fs.writeFileSync(cooldownPath, JSON.stringify(cooldowns, null, 2));
    } catch (error) {
        console.error('❌ Error saving cooldowns:', error);
    }
}

// Cooldown management
function isOnCooldown(userId, guildId, panelId) {
    const key = `${userId}_${guildId}_${panelId}`;
    const now = Date.now();
    
    if (cooldowns[key] && cooldowns[key] > now) {
        return cooldowns[key] - now;
    }
    return false;
}

function setCooldown(userId, guildId, panelId, duration = 3000) {
    const key = `${userId}_${guildId}_${panelId}`;
    cooldowns[key] = Date.now() + duration;
    saveCooldowns();
}

// Enhanced reaction role handler
async function handleReactionRoleInteraction(interaction) {
    try {
        const { customId, user, guild, member } = interaction;
        
        // Parse custom ID
        const [type, action, ...params] = customId.split('_');
        
        if (type !== 'rr') return false;
        
        // Check if guild has reaction role setup
        if (!reactionRoles[guild.id]) {
            reactionRoles[guild.id] = { panels: {}, settings: { allowMultiple: false, cooldown: 3000 } };
            saveReactionRoles();
        }
        
        switch (action) {
            case 'toggle':
                await handleRoleToggle(interaction, params);
                break;
            case 'select':
                await handleRoleSelect(interaction, params);
                break;
            case 'manage':
                await handlePanelManage(interaction, params);
                break;
            case 'config':
                await handleConfigPanel(interaction, params);
                break;
            default:
                return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error in reaction role handler:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: `${musicIcons.alertIcon} An error occurred while processing your request. Please try again.`, 
                ephemeral: true 
            });
        }
        return true;
    }
}

async function handleRoleToggle(interaction, params) {
    const [panelId, roleId] = params;
    const { user, guild, member } = interaction;
    
    // Check cooldown
    const cooldownTime = isOnCooldown(user.id, guild.id, panelId);
    if (cooldownTime) {
        return await interaction.reply({
            content: `${musicIcons.pauseresumeIcon} Please wait ${Math.ceil(cooldownTime / 1000)} seconds before using this again.`,
            ephemeral: true
        });
    }
    
    // Get panel configuration
    const panelConfig = reactionRoles[guild.id]?.panels?.[panelId];
    if (!panelConfig) {
        return await interaction.reply({
            content: `${musicIcons.alertIcon} Reaction role panel not found.`,
            ephemeral: true
        });
    }
    
    // Find role configuration
    const roleConfig = panelConfig.roles.find(r => r.id === roleId);
    if (!roleConfig) {
        return await interaction.reply({
            content: `${musicIcons.alertIcon} Role configuration not found.`,
            ephemeral: true
        });
    }
    
    // Get role object
    const role = guild.roles.cache.get(roleId);
    if (!role) {
        return await interaction.reply({
            content: `${musicIcons.alertIcon} Role no longer exists in this server.`,
            ephemeral: true
        });
    }
    
    // Check if role is manageable
    if (!role.editable || role.comparePositionTo(guild.members.me.roles.highest) >= 0) {
        return await interaction.reply({
            content: `${musicIcons.alertIcon} I cannot manage this role. Please check role hierarchy and permissions.`,
            ephemeral: true
        });
    }
    
    // Toggle role
    const hasRole = member.roles.cache.has(roleId);
    const action = hasRole ? 'remove' : 'add';
    
    try {
        if (hasRole) {
            await member.roles.remove(role, `Reaction Role: ${panelConfig.name}`);
        } else {
            // Check if this is a single-select panel and user has other roles
            if (panelConfig.type === 'single') {
                const userRoles = panelConfig.roles.filter(r => member.roles.cache.has(r.id));
                if (userRoles.length > 0) {
                    // Remove other roles from this panel
                    for (const otherRole of userRoles) {
                        const otherRoleObj = guild.roles.cache.get(otherRole.id);
                        if (otherRoleObj && otherRoleObj.editable) {
                            await member.roles.remove(otherRoleObj, `Single-select panel: ${panelConfig.name}`);
                        }
                    }
                }
            }
            
            await member.roles.add(role, `Reaction Role: ${panelConfig.name}`);
        }
        
        // Set cooldown
        setCooldown(user.id, guild.id, panelId, panelConfig.cooldown || 3000);
        
        // Create success embed
        const embed = new EmbedBuilder()
            .setTitle(`${musicIcons.CheckmarkIcon} Role ${action === 'add' ? 'Added' : 'Removed'}`)
            .setDescription(`${musicIcons.MusicIcon} Successfully **${action}ed** the **${role.name}** role`)
            .addFields(
                { name: `${musicIcons.correctIcon} Action`, value: action === 'add' ? 'Role Added' : 'Role Removed', inline: true },
                { name: `${musicIcons.beatsIcon} Role`, value: role.name, inline: true },
                { name: `${musicIcons.heartIcon} Panel`, value: panelConfig.name, inline: true }
            )
            .setColor(action === 'add' ? '#00FF00' : '#FF6B35')
            .setFooter({ text: `Enhanced Reaction Role System`, iconURL: musicIcons.footerIcon })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        // Log the action
        try {
            const { logAction } = require('../utils/loggingSystem');
            await logAction(guild, 'role_toggle', {
                user: user,
                role: role,
                action: action,
                panel: panelConfig.name,
                panelId: panelId
            }, user);
        } catch (logError) {
            console.error('❌ Error logging role toggle:', logError);
        }
        
    } catch (error) {
        console.error('❌ Error toggling role:', error);
        await interaction.reply({
            content: `${musicIcons.alertIcon} Failed to ${action} role. Please check permissions and try again.`,
            ephemeral: true
        });
    }
}

async function handleRoleSelect(interaction, params) {
    const [panelId] = params;
    const { values, user, guild, member } = interaction;
    
    if (!values || values.length === 0) {
        return await interaction.reply({
            content: `${musicIcons.alertIcon} No roles selected.`,
            ephemeral: true
        });
    }
    
    // Check cooldown
    const cooldownTime = isOnCooldown(user.id, guild.id, panelId);
    if (cooldownTime) {
        return await interaction.reply({
            content: `${musicIcons.pauseresumeIcon} Please wait ${Math.ceil(cooldownTime / 1000)} seconds before using this again.`,
            ephemeral: true
        });
    }
    
    // Get panel configuration
    const panelConfig = reactionRoles[guild.id]?.panels?.[panelId];
    if (!panelConfig) {
        return await interaction.reply({
            content: `${musicIcons.alertIcon} Reaction role panel not found.`,
            ephemeral: true
        });
    }
    
    let added = [];
    let removed = [];
    let errors = [];
    
    try {
        // Process selected roles
        for (const roleId of values) {
            const role = guild.roles.cache.get(roleId);
            if (!role) {
                errors.push(`Role ID ${roleId} not found`);
                continue;
            }
            
            if (!role.editable || role.comparePositionTo(guild.members.me.roles.highest) >= 0) {
                errors.push(`Cannot manage ${role.name} - insufficient permissions`);
                continue;
            }
            
            const hasRole = member.roles.cache.has(roleId);
            
            try {
                if (!hasRole) {
                    await member.roles.add(role, `Reaction Role Select: ${panelConfig.name}`);
                    added.push(role.name);
                }
            } catch (roleError) {
                errors.push(`Failed to add ${role.name}: ${roleError.message}`);
            }
        }
        
        // Remove roles not selected (for single/limited select)
        if (panelConfig.type === 'single' || panelConfig.maxRoles) {
            const panelRoleIds = panelConfig.roles.map(r => r.id);
            const currentPanelRoles = member.roles.cache.filter(r => panelRoleIds.includes(r.id));
            
            for (const [roleId, role] of currentPanelRoles) {
                if (!values.includes(roleId)) {
                    try {
                        await member.roles.remove(role, `Reaction Role Deselect: ${panelConfig.name}`);
                        removed.push(role.name);
                    } catch (roleError) {
                        errors.push(`Failed to remove ${role.name}: ${roleError.message}`);
                    }
                }
            }
        }
        
        // Set cooldown
        setCooldown(user.id, guild.id, panelId, panelConfig.cooldown || 3000);
        
        // Create response embed
        const embed = new EmbedBuilder()
            .setTitle(`${musicIcons.CheckmarkIcon} Roles Updated`)
            .setDescription(`${musicIcons.MusicIcon} Your roles have been updated for **${panelConfig.name}**`)
            .setColor('#5865F2')
            .setFooter({ text: `Enhanced Reaction Role System`, iconURL: musicIcons.footerIcon })
            .setTimestamp();
        
        if (added.length > 0) {
            embed.addFields({ name: `${musicIcons.correctIcon} Added Roles`, value: added.map(r => `• ${r}`).join('\n'), inline: true });
        }
        
        if (removed.length > 0) {
            embed.addFields({ name: `${musicIcons.stopIcon} Removed Roles`, value: removed.map(r => `• ${r}`).join('\n'), inline: true });
        }
        
        if (errors.length > 0) {
            embed.addFields({ name: `${musicIcons.alertIcon} Errors`, value: errors.slice(0, 5).map(e => `• ${e}`).join('\n'), inline: false });
        }
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        // Log the action
        try {
            const { logAction } = require('../utils/loggingSystem');
            await logAction(guild, 'role_select', {
                user: user,
                panel: panelConfig.name,
                panelId: panelId,
                added: added,
                removed: removed,
                errors: errors.length
            }, user);
        } catch (logError) {
            console.error('❌ Error logging role select:', logError);
        }
        
    } catch (error) {
        console.error('❌ Error in role select:', error);
        await interaction.reply({
            content: `${musicIcons.alertIcon} An error occurred while updating your roles.`,
            ephemeral: true
        });
    }
}

async function handlePanelManage(interaction, params) {
    const [panelId, action] = params;
    
    // Check permissions
    if (!interaction.member.permissions.has('ManageRoles')) {
        return await interaction.reply({
            content: `${musicIcons.alertIcon} You need the "Manage Roles" permission to manage reaction role panels.`,
            ephemeral: true
        });
    }
    
    switch (action) {
        case 'edit':
            await showPanelEditModal(interaction, panelId);
            break;
        case 'delete':
            await confirmPanelDelete(interaction, panelId);
            break;
        case 'toggle':
            await togglePanelStatus(interaction, panelId);
            break;
        case 'stats':
            await showPanelStats(interaction, panelId);
            break;
        default:
            await interaction.reply({
                content: `${musicIcons.alertIcon} Unknown management action.`,
                ephemeral: true
            });
    }
}

async function showPanelEditModal(interaction, panelId) {
    const panelConfig = reactionRoles[interaction.guild.id]?.panels?.[panelId];
    if (!panelConfig) {
        return await interaction.reply({
            content: `${musicIcons.alertIcon} Panel not found.`,
            ephemeral: true
        });
    }
    
    const modal = new ModalBuilder()
        .setCustomId(`rr_edit_${panelId}`)
        .setTitle(`${musicIcons.beatsIcon} Edit Reaction Role Panel`);
    
    const nameInput = new TextInputBuilder()
        .setCustomId('panel_name')
        .setLabel('Panel Name')
        .setStyle(TextInputStyle.Short)
        .setValue(panelConfig.name)
        .setMaxLength(100)
        .setRequired(true);
    
    const descriptionInput = new TextInputBuilder()
        .setCustomId('panel_description')
        .setLabel('Panel Description')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(panelConfig.description || '')
        .setMaxLength(1000)
        .setRequired(false);
    
    const cooldownInput = new TextInputBuilder()
        .setCustomId('panel_cooldown')
        .setLabel('Cooldown (milliseconds)')
        .setStyle(TextInputStyle.Short)
        .setValue((panelConfig.cooldown || 3000).toString())
        .setMaxLength(10)
        .setRequired(false);
    
    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(cooldownInput)
    );
    
    await interaction.showModal(modal);
}

// Export functions
module.exports = {
    handleReactionRoleInteraction,
    reactionRoles,
    saveReactionRoles,
    isOnCooldown,
    setCooldown
};
