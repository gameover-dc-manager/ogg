const fs = require('fs');
const path = require('path');
const { warningService } = require('../server/services/warning-service');

/**
 * Migration utility to convert old warnings.json format to new enhanced format
 */
class WarningMigration {
    
    static async migrateFromOldFormat(filePath = './warnings.json') {
        try {
            if (!fs.existsSync(filePath)) {
                console.log('No existing warnings.json file found. Starting with clean slate.');
                return;
            }

            const oldData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log('Starting migration of warning data...');

            let migratedCount = 0;
            let errorCount = 0;

            for (const [userKey, warnings] of Object.entries(oldData)) {
                // Parse the old format key (guildId_userId)
                const [guildId, userId] = userKey.split('_');
                
                if (!guildId || !userId) {
                    console.warn(`Invalid user key format: ${userKey}`);
                    errorCount++;
                    continue;
                }

                for (const oldWarning of warnings) {
                    try {
                        const migratedWarning = {
                            userId: userId,
                            guildId: guildId,
                            moderatorId: oldWarning.moderator || 'unknown',
                            reason: oldWarning.reason || 'No reason provided',
                            category: this.mapOldCategoryToNew(oldWarning.category) || 'other',
                            severity: this.mapOldSeverityToNew(oldWarning.severity) || 'medium',
                            evidence: oldWarning.evidence || null,
                            moderatorNotes: oldWarning.notes || null,
                            appealStatus: "none",
                            isActive: true,
                            createdAt: new Date(oldWarning.timestamp || Date.now())
                        };

                        // Validate the migrated warning
                        const validation = this.validateWarningData(migratedWarning);
                        if (!validation.isValid) {
                            console.warn(`Invalid warning data for ${userKey}:`, validation.errors);
                            errorCount++;
                            continue;
                        }

                        await warningService.createWarning(migratedWarning);
                        migratedCount++;
                        
                    } catch (error) {
                        console.error(`Error migrating warning for ${userKey}:`, error);
                        errorCount++;
                    }
                }
            }

            console.log(`Migration completed. Migrated: ${migratedCount}, Errors: ${errorCount}`);

            // Create backup of old file
            const backupPath = filePath + '.backup.' + Date.now();
            fs.copyFileSync(filePath, backupPath);
            console.log(`Backup created: ${backupPath}`);

            return { migratedCount, errorCount };

        } catch (error) {
            console.error('Error during migration:', error);
            throw error;
        }
    }

    static mapOldCategoryToNew(oldCategory) {
        const categoryMap = {
            'spam': 'spam',
            'harassment': 'harassment',
            'nsfw': 'inappropriate_content',
            'inappropriate': 'inappropriate_content',
            'rules': 'rule_violation',
            'rule_violation': 'rule_violation',
            'toxic': 'toxic_behavior',
            'toxicity': 'toxic_behavior',
            'other': 'other'
        };

        return categoryMap[oldCategory?.toLowerCase()] || 'other';
    }

    static mapOldSeverityToNew(oldSeverity) {
        const severityMap = {
            'minor': 'low',
            'low': 'low',
            'moderate': 'medium',
            'medium': 'medium',
            'major': 'high',
            'high': 'high',
            'severe': 'critical',
            'critical': 'critical'
        };

        return severityMap[oldSeverity?.toLowerCase()] || 'medium';
    }

    static validateWarningData(data) {
        const errors = [];
        
        if (!data.userId) errors.push("User ID is required");
        if (!data.guildId) errors.push("Guild ID is required");
        if (!data.moderatorId) errors.push("Moderator ID is required");
        if (!data.reason || data.reason.length < 3) errors.push("Reason must be at least 3 characters");
        if (!data.category) errors.push("Category is required");
        if (!data.severity) errors.push("Severity is required");
        
        const validCategories = ["spam", "harassment", "inappropriate_content", "rule_violation", "toxic_behavior", "other"];
        if (data.category && !validCategories.includes(data.category)) {
            errors.push("Invalid category");
        }
        
        const validSeverities = ["low", "medium", "high", "critical"];
        if (data.severity && !validSeverities.includes(data.severity)) {
            errors.push("Invalid severity");
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static async createDefaultTemplates(guildId) {
        const defaultTemplates = [
            {
                guildId,
                name: "Spam Warning",
                reason: "Excessive posting or advertising content",
                category: "spam",
                severity: "low",
                createdBy: "system"
            },
            {
                guildId,
                name: "Harassment Warning",
                reason: "Targeting or bullying other members",
                category: "harassment",
                severity: "high",
                createdBy: "system"
            },
            {
                guildId,
                name: "Inappropriate Content",
                reason: "Posted NSFW or unsuitable content",
                category: "inappropriate_content",
                severity: "medium",
                createdBy: "system"
            },
            {
                guildId,
                name: "Rule Violation",
                reason: "General server rule violation",
                category: "rule_violation",
                severity: "medium",
                createdBy: "system"
            },
            {
                guildId,
                name: "Toxic Behavior",
                reason: "Disruptive or harmful behavior towards community",
                category: "toxic_behavior",
                severity: "high",
                createdBy: "system"
            }
        ];

        let createdCount = 0;
        for (const template of defaultTemplates) {
            try {
                await storage.createWarningTemplate(template);
                createdCount++;
            } catch (error) {
                console.error(`Error creating default template "${template.name}":`, error);
            }
        }

        console.log(`Created ${createdCount} default warning templates for guild ${guildId}`);
        return createdCount;
    }

    static async generateMigrationReport(guildId) {
        try {
            const warnings = await warningService.getWarningsByGuild(guildId, 1, 1000);
            const stats = await warningService.getWarningStats(guildId);

            const report = {
                guildId,
                totalWarnings: warnings.length,
                activeWarnings: warnings.filter(w => w.isActive).length,
                categoryBreakdown: stats.byCategory,
                severityBreakdown: stats.bySeverity,
                oldestWarning: warnings.length > 0 ? warnings[warnings.length - 1].createdAt : null,
                newestWarning: warnings.length > 0 ? warnings[0].createdAt : null
            };

            console.log('Migration Report:');
            console.log('================');
            console.log(`Guild ID: ${report.guildId}`);
            console.log(`Total Warnings: ${report.totalWarnings}`);
            console.log(`Active Warnings: ${report.activeWarnings}`);
            console.log(`Category Breakdown:`, report.categoryBreakdown);
            console.log(`Severity Breakdown:`, report.severityBreakdown);
            
            if (report.oldestWarning) {
                console.log(`Date Range: ${report.oldestWarning} to ${report.newestWarning}`);
            }

            return report;

        } catch (error) {
            console.error('Error generating migration report:', error);
            throw error;
        }
    }
}

module.exports = { WarningMigration };

// Example usage:
// const { WarningMigration } = require('./utils/warning-migration');
// 
// // Migrate existing warnings
// WarningMigration.migrateFromOldFormat('./warnings.json');
// 
// // Create default templates for a guild
// WarningMigration.createDefaultTemplates('1234567890123456789');
// 
// // Generate migration report
// WarningMigration.generateMigrationReport('1234567890123456789');
