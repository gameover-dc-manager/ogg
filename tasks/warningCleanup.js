const { cleanupExpiredWarnings, loadWarnings, saveWarnings, markWarningAsExpired } = require('../components/warningSystem');
const fs = require('fs');
const path = require('path');

// Cleanup task configuration
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Run every hour
const OLD_WARNING_THRESHOLD = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
const MAX_WARNINGS_PER_USER = 50; // Maximum warnings to keep per user

class WarningCleanupTask {
    constructor(client) {
        this.client = client;
        this.isRunning = false;
        this.lastRun = 0;
        this.stats = {
            expiredCount: 0,
            cleanedCount: 0,
            archiveCount: 0,
            totalRuns: 0
        };
    }

    /**
     * Start the cleanup task
     */
    start() {
        console.log('🧹 Starting warning cleanup task...');

        // Run immediately on start
        this.runCleanup();

        // Set up interval
        this.interval = setInterval(() => {
            this.runCleanup();
        }, CLEANUP_INTERVAL);

        console.log(`✅ Warning cleanup task started (interval: ${CLEANUP_INTERVAL / 1000 / 60} minutes)`);
    }

    /**
     * Stop the cleanup task
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        console.log('🛑 Warning cleanup task stopped');
    }

    /**
     * Run the cleanup process
     */
    async runCleanup() {
        if (this.isRunning) {
            console.log('⏳ Warning cleanup already in progress, skipping...');
            return;
        }

        this.isRunning = true;
        this.lastRun = Date.now();
        console.log('🧹 Running warning cleanup task...');

        try {
            // Step 1: Mark expired warnings
            const expiredCount = await this.markExpiredWarnings();

            // Step 2: Archive old warnings
            const archivedCount = await this.archiveOldWarnings();

            // Step 3: Trim excessive warnings per user
            const trimmedCount = await this.trimExcessiveWarnings();

            // Step 4: Clean up empty user entries
            const cleanedUsers = await this.cleanupEmptyUsers();

            // Update stats
            this.stats.expiredCount += expiredCount;
            this.stats.archiveCount += archivedCount;
            this.stats.cleanedCount += trimmedCount;
            this.stats.totalRuns++;

            console.log(`✅ Warning cleanup completed:
  📊 Expired warnings: ${expiredCount}
  🗃️ Archived warnings: ${archivedCount}
  ✂️ Trimmed warnings: ${trimmedCount}
  👥 Cleaned empty users: ${cleanedUsers}
  📈 Total runs: ${this.stats.totalRuns}`);

        } catch (error) {
            console.error('❌ Error during warning cleanup:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Mark expired warnings
     */
    async markExpiredWarnings() {
        try {
            await cleanupExpiredWarnings();
            return 0; // Placeholder, actual count should be returned by cleanupExpiredWarnings
        } catch (error) {
            console.error('❌ Error marking expired warnings:', error);
            return 0;
        }
    }

    /**
     * Archive old warnings to separate file
     */
    async archiveOldWarnings() {
        const warnings = loadWarnings();
        const now = Date.now();
        let archivedCount = 0;
        const archiveData = [];

        Object.keys(warnings).forEach(key => {
            const userWarnings = warnings[key];
            const oldWarnings = userWarnings.filter(warning => {
                const isOld = (now - warning.timestamp) > OLD_WARNING_THRESHOLD;
                const isResolved = warning.removed || warning.expired;
                return isOld && isResolved;
            });

            if (oldWarnings.length > 0) {
                // Move to archive
                archiveData.push(...oldWarnings.map(w => ({ ...w, archivedAt: now })));

                // Remove from active warnings
                warnings[key] = userWarnings.filter(warning => {
                    const isOld = (now - warning.timestamp) > OLD_WARNING_THRESHOLD;
                    const isResolved = warning.removed || warning.expired;
                    return !(isOld && isResolved);
                });

                archivedCount += oldWarnings.length;
            }
        });

        if (archivedCount > 0) {
            // Save updated warnings
            saveWarnings(warnings);

            // Save archive data
            await this.saveArchiveData(archiveData);

            console.log(`🗃️ Archived ${archivedCount} old warnings`);
        }

        return archivedCount;
    }

    /**
     * Trim excessive warnings per user (keep most recent)
     */
    async trimExcessiveWarnings() {
        const warnings = loadWarnings();
        let trimmedCount = 0;

        Object.keys(warnings).forEach(key => {
            const userWarnings = warnings[key];

            if (userWarnings.length > MAX_WARNINGS_PER_USER) {
                // Sort by timestamp (newest first) and keep only the most recent
                userWarnings.sort((a, b) => b.timestamp - a.timestamp);
                const excessWarnings = userWarnings.splice(MAX_WARNINGS_PER_USER);

                trimmedCount += excessWarnings.length;
                console.log(`✂️ Trimmed ${excessWarnings.length} excess warnings for user ${key}`);
            }
        });

        if (trimmedCount > 0) {
            saveWarnings(warnings);
        }

        return trimmedCount;
    }

    /**
     * Clean up empty user entries
     */
    async cleanupEmptyUsers() {
        const warnings = loadWarnings();
        let cleanedUsers = 0;

        Object.keys(warnings).forEach(key => {
            if (!warnings[key] || warnings[key].length === 0) {
                delete warnings[key];
                cleanedUsers++;
            }
        });

        if (cleanedUsers > 0) {
            saveWarnings(warnings);
            console.log(`👥 Cleaned up ${cleanedUsers} empty user entries`);
        }

        return cleanedUsers;
    }

    /**
     * Save archive data
     */
    async saveArchiveData(archiveData) {
        const archiveDir = path.join(__dirname, '../config/archives');
        const archiveFile = path.join(archiveDir, `warnings_archive_${new Date().getFullYear()}.json`);

        try {
            // Ensure archive directory exists
            if (!fs.existsSync(archiveDir)) {
                fs.mkdirSync(archiveDir, { recursive: true });
            }

            let existingArchive = [];
            if (fs.existsSync(archiveFile)) {
                const data = fs.readFileSync(archiveFile, 'utf8');
                existingArchive = JSON.parse(data);
            }

            // Append new archive data
            existingArchive.push(...archiveData);

            // Save updated archive
            fs.writeFileSync(archiveFile, JSON.stringify(existingArchive, null, 2));

            console.log(`📁 Archive data saved to ${archiveFile}`);
        } catch (error) {
            console.error('❌ Error saving archive data:', error);
        }
    }

    /**
     * Get cleanup statistics
     */
    getStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            lastRun: this.lastRun,
            nextRun: this.lastRun + CLEANUP_INTERVAL,
            uptime: Date.now() - (this.lastRun - CLEANUP_INTERVAL)
        };
    }

    /**
     * Force run cleanup (for manual execution)
     */
    async forceCleanup() {
        console.log('🔧 Manual warning cleanup triggered...');
        await this.runCleanup();
        return this.getStats();
    }

    /**
     * Get archive files list
     */
    getArchiveFiles() {
        const archiveDir = path.join(__dirname, '../config/archives');

        if (!fs.existsSync(archiveDir)) {
            return [];
        }

        try {
            return fs.readdirSync(archiveDir)
                .filter(file => file.startsWith('warnings_archive_') && file.endsWith('.json'))
                .map(file => ({
                    filename: file,
                    path: path.join(archiveDir, file),
                    size: fs.statSync(path.join(archiveDir, file)).size,
                    modified: fs.statSync(path.join(archiveDir, file)).mtime
                }));
        } catch (error) {
            console.error('❌ Error reading archive directory:', error);
            return [];
        }
    }

    /**
     * Load archived warnings
     */
    loadArchivedWarnings(year) {
        const archiveFile = path.join(__dirname, '../config/archives', `warnings_archive_${year}.json`);

        try {
            if (!fs.existsSync(archiveFile)) {
                return [];
            }

            const data = fs.readFileSync(archiveFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`❌ Error loading archived warnings for ${year}:`, error);
            return [];
        }
    }
}

module.exports = { WarningCleanupTask };