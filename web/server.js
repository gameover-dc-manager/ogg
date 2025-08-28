const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const app = express();
const PORT = 5000;

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Discord OAuth2 strategy
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID || '1360994536104661062',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || process.env.DISCORD_TOKEN?.split('.')[0] || 'temp-secret',
    callbackURL: process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}/auth/discord/callback` : `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.repl.co/auth/discord/callback`,
    scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
    // Store tokens for API calls
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Authentication required' });
}

// Check if user is admin in specific guild
async function checkGuildAdmin(req, res, next) {
    const guildId = req.params.guildId;
    const userId = req.user.id;

    try {
        // Get client reference
        const client = require('../index.js');
        const guild = client.guilds.cache.get(guildId);

        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
            return res.status(403).json({ error: 'You are not a member of this server' });
        }

        // Check if user has administrator permission
        if (!member.permissions.has('Administrator')) {
            return res.status(403).json({ error: 'Administrator permission required' });
        }

        req.guild = guild;
        req.member = member;
        next();
    } catch (error) {
        console.error('Error checking guild admin:', error);
        res.status(500).json({ error: 'Failed to verify permissions' });
    }
}

// Routes

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'progress.html'));
});

// Captcha status page
app.get('/captcha', (req, res) => {
    res.sendFile(path.join(__dirname, 'captcha-status.html'));
});

// Redirect old dashboard routes to simple dashboard
app.get('/dashboard', (req, res) => {
    res.redirect('/simple-dashboard');
});

// Redirect old auth routes to simple dashboard
app.get('/auth/discord', (req, res) => {
    res.redirect('/simple-dashboard');
});

app.get('/auth/discord/callback', (req, res) => {
    res.redirect('/simple-dashboard');
});

app.get('/auth/logout', (req, res) => {
    res.redirect('/simple-dashboard');
});

// API Routes

// Check authentication status
app.get('/api/auth/user', requireAuth, (req, res) => {
    res.json({
        id: req.user.id,
        username: req.user.username,
        discriminator: req.user.discriminator,
        avatar: req.user.avatar
    });
});

// Get user's guilds where they have admin permissions
app.get('/api/user/guilds', requireAuth, async (req, res) => {
    try {
        const client = require('../index.js');
        const userGuilds = [];

        // Get all guilds the bot is in
        for (const [guildId, guild] of client.guilds.cache) {
            try {
                const member = await guild.members.fetch(req.user.id).catch(() => null);
                if (member && member.permissions.has('Administrator')) {
                    userGuilds.push({
                        id: guild.id,
                        name: guild.name,
                        icon: guild.iconURL(),
                        memberCount: guild.memberCount
                    });
                }
            } catch (error) {
                console.error(`Error checking user in guild ${guild.name}:`, error);
            }
        }

        res.json(userGuilds);
    } catch (error) {
        console.error('Error fetching user guilds:', error);
        res.status(500).json({ error: 'Failed to fetch guilds' });
    }
});

// Get guild statistics
app.get('/api/guild/:guildId/stats', requireAuth, checkGuildAdmin, async (req, res) => {
    try {
        const { getWarningStats } = require('../components/warningSystem');
        const { getCaptchaStats } = require('../components/captchaSystem');

        const guild = req.guild;
        const warningStats = await getWarningStats(guild.id);
        const captchaStats = getCaptchaStats();

        res.json({
            memberCount: guild.memberCount,
            totalWarnings: warningStats.total || 0,
            activeWarnings: warningStats.active || 0,
            successfulVerifications: captchaStats.successfulVerifications || 0,
            failedVerifications: captchaStats.failedVerifications || 0,
            moderationActions: warningStats.total + (captchaStats.successfulVerifications || 0)
        });
    } catch (error) {
        console.error('Error fetching guild stats:', error);
        res.status(500).json({ error: 'Failed to fetch guild statistics' });
    }
});

// Get guild warnings
app.get('/api/guild/:guildId/warnings', requireAuth, checkGuildAdmin, async (req, res) => {
    try {
        const { getAllWarnings } = require('../components/warningSystem');
        const warnings = await getAllWarnings(req.params.guildId);

        // Get user information for warnings
        const client = require('../index.js');
        const warningsWithUsers = await Promise.all(
            warnings.slice(0, 50).map(async (warning) => {
                try {
                    const user = await client.users.fetch(warning.userId).catch(() => null);
                    return {
                        ...warning,
                        username: user ? user.username : 'Unknown User'
                    };
                } catch (error) {
                    return {
                        ...warning,
                        username: 'Unknown User'
                    };
                }
            })
        );

        res.json(warningsWithUsers);
    } catch (error) {
        console.error('Error fetching guild warnings:', error);
        res.status(500).json({ error: 'Failed to fetch warnings' });
    }
});

// Get guild captcha stats
app.get('/api/guild/:guildId/captcha', requireAuth, checkGuildAdmin, (req, res) => {
    try {
        const client = require('../index.js');
        const stats = {
            enabled: true,
            successfulVerifications: client.captchaStats?.successfulVerifications || 0,
            failedVerifications: client.captchaStats?.failedVerifications || 0,
            totalAttempts: (client.captchaStats?.successfulVerifications || 0) + (client.captchaStats?.failedVerifications || 0),
            pendingVerifications: client.pendingVerifications?.size || 0
        };
        res.json(stats);
    } catch (error) {
        console.error('Error fetching captcha stats:', error);
        res.json({
            enabled: false,
            successfulVerifications: 0,
            failedVerifications: 0,
            totalAttempts: 0,
            pendingVerifications: 0
        });
    }
});

// Delete warning
app.delete('/api/guild/:guildId/warnings/:warningId', requireAuth, checkGuildAdmin, async (req, res) => {
    try {
        const { removeWarning } = require('../components/warningSystem');
        const { warningId } = req.params;

        // Find the warning to get user ID
        const { loadWarnings } = require('../components/warningSystem');
        const warnings = loadWarnings();
        let userId = null;

        // Search through all warnings to find the one with matching ID
        Object.keys(warnings).forEach(key => {
            if (key.startsWith(`${req.params.guildId}_`)) {
                const userWarnings = warnings[key];
                const warning = userWarnings.find(w => w.id === warningId);
                if (warning) {
                    userId = warning.userId;
                }
            }
        });

        if (!userId) {
            return res.status(404).json({ error: 'Warning not found' });
        }

        const success = await removeWarning(req.params.guildId, userId, warningId);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Warning not found' });
        }
    } catch (error) {
        console.error('Error removing warning:', error);
        res.status(500).json({ error: 'Failed to remove warning' });
    }
});

// Save guild configuration
app.post('/api/guild/:guildId/config', requireAuth, checkGuildAdmin, async (req, res) => {
    try {
        const { logChannelId, welcomeChannelId, verificationChannelId } = req.body;
        const guildId = req.params.guildId;

        // Save to config (you might want to implement a proper config system)
        const client = require('../index.js');

        // Update log channels
        if (logChannelId) {
            client.logChannels = client.logChannels || {};
            client.logChannels[guildId] = logChannelId;
            global.saveLogChannels();
        }

        // Update captcha config if verification channel is set
        if (verificationChannelId) {
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(__dirname, '../config/captcha_config.json');

            try {
                const captchaConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                captchaConfig.verificationChannelId = verificationChannelId;
                fs.writeFileSync(configPath, JSON.stringify(captchaConfig, null, 2));
            } catch (error) {
                console.error('Error updating captcha config:', error);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving guild config:', error);
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});

// Original API routes for backward compatibility
let currentTrackData = null;

app.post('/api/track', (req, res) => {
    currentTrackData = req.body;
    console.log('📊 Track data updated:', currentTrackData);
    res.json({ success: true });
});

app.get('/api/track', (req, res) => {
    res.json(currentTrackData || { status: 'no_track' });
});

// Simple Dashboard Route
app.get('/simple-dashboard', (req, res) => {
    console.log('📊 Simple dashboard accessed');
    res.sendFile(path.join(__dirname, 'simple-dashboard.html'));
});

// Simple Authentication API
app.post('/api/simple-auth', async (req, res) => {
    const { serverId, password } = req.body;

    try {
        const credentialsPath = path.join(__dirname, '../config/dashboard_credentials.json');

        if (!require('fs').existsSync(credentialsPath)) {
            return res.status(401).json({ error: 'No dashboard credentials configured' });
        }

        const credentials = JSON.parse(require('fs').readFileSync(credentialsPath, 'utf8'));

        if (!credentials[serverId]) {
            return res.status(401).json({ error: 'Invalid server ID' });
        }

        if (credentials[serverId].password !== password) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Get server info
        const client = require('../index.js');
        const guild = client.guilds.cache.get(serverId);

        if (!guild) {
            return res.status(404).json({ error: 'Server not found' });
        }

        res.json({
            success: true,
            server: {
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount
            }
        });

    } catch (error) {
        console.error('Simple auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Simple Dashboard Data API
app.get('/api/simple-dashboard/:serverId', async (req, res) => {
    const { serverId } = req.params;

    try {
        const client = require('../index.js');
        const guild = client.guilds.cache.get(serverId);

        if (!guild) {
            return res.status(404).json({ error: 'Server not found' });
        }

        // Get warning stats
        let warningCount = 0;
        let warnings = [];

        try {
            const { getWarningStats, getAllWarnings } = require('../components/warningSystem');
            const stats = await getWarningStats(serverId);
            const allWarnings = await getAllWarnings(serverId);

            warningCount = stats.total || 0;

            // Get recent warnings with usernames
            warnings = await Promise.all(
                allWarnings.slice(0, 10).map(async (warning) => {
                    try {
                        const user = await client.users.fetch(warning.userId).catch(() => null);
                        return {
                            ...warning,
                            username: user ? user.username : 'Unknown User'
                        };
                    } catch {
                        return {
                            ...warning,
                            username: 'Unknown User'
                        };
                    }
                })
            );
        } catch (error) {
            console.log('Warning system not available:', error.message);
        }

        // Get captcha stats
        let captchaCount = 0;
        try {
            const { getCaptchaStats } = require('../components/captchaSystem');
            const captchaStats = getCaptchaStats();
            captchaCount = captchaStats.successfulVerifications || 0;
        } catch (error) {
            console.log('Captcha system not available:', error.message);
        }

        res.json({
            memberCount: guild.memberCount,
            warningCount,
            captchaCount,
            warnings,
            serverName: guild.name
        });

    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Original captcha stats endpoint
app.get('/api/captcha/stats', (req, res) => {
    try {
        let client = null;
        let captchaStats = null;
        let pendingVerifications = null;

        // Safely get client reference
        try {
            client = require('../index.js');
            if (client && client.captchaStats) {
                captchaStats = client.captchaStats;
            }
            if (client && client.pendingVerifications) {
                pendingVerifications = client.pendingVerifications;
            }
        } catch (clientError) {
            console.log('ℹ️ Client not available for captcha stats');
        }

        // Try to get captcha system stats
        try {
            const { getCaptchaStats } = require('../components/captchaSystem');
            const systemStats = getCaptchaStats(client);

            const stats = {
                pendingVerifications: systemStats.pendingVerifications || 0,
                successfulVerifications: systemStats.successfulVerifications || 0,
                failedVerifications: systemStats.failedVerifications || 0,
                totalAttempts: systemStats.totalAttempts || 0,
                totalVerifications: systemStats.successfulVerifications || 0,
                failedAttempts: systemStats.failedVerifications || 0,
                enabled: systemStats.enabled || false,
                difficulty: systemStats.difficulty || 'medium',
                timeoutMinutes: systemStats.timeoutMinutes || 10
            };

            res.json(stats);
        } catch (systemError) {
            // Fallback stats
            const stats = {
                pendingVerifications: pendingVerifications?.size || 0,
                successfulVerifications: captchaStats?.successfulVerifications || 0,
                failedVerifications: captchaStats?.failedVerifications || 0,
                totalAttempts: (captchaStats?.successfulVerifications || 0) + (captchaStats?.failedVerifications || 0),
                totalVerifications: captchaStats?.successfulVerifications || 0,
                failedAttempts: captchaStats?.failedVerifications || 0,
                enabled: client ? true : false,
                difficulty: 'medium',
                timeoutMinutes: 10
            };

            res.json(stats);
        }
    } catch (error) {
        console.error('❌ Error fetching captcha stats:', error);
        res.status(200).json({
            pendingVerifications: 0,
            successfulVerifications: 0,
            failedVerifications: 0,
            totalAttempts: 0,
            totalVerifications: 0,
            failedAttempts: 0,
            enabled: false,
            difficulty: 'medium',
            timeoutMinutes: 10,
            error: 'Stats unavailable'
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Progress bar server running at http://0.0.0.0:${PORT}`);
    console.log(`📊 Real-time music progress available at the URL above`);
    console.log(`🔐 Captcha status available at http://0.0.0.0:${PORT}/captcha`);
    console.log(`👨‍💼 Admin dashboard available at http://0.0.0.0:${PORT}/dashboard`);
});

module.exports = app;