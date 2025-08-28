const { EmbedBuilder } = require('discord.js');
const { URL } = require('url');

const fs = require('fs');
const path = require('path');

// Suspicion score calculation
function calculateSuspicionScore(content, author) {
    let score = 0;

    // Check for excessive capitals
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5) score += 10;

    // Check for excessive punctuation
    const punctRatio = (content.match(/[!@#$%^&*()_+=\[\]{}|;':",./<>?]/g) || []).length / content.length;
    if (punctRatio > 0.3) score += 8;

    // Check for repeated characters
    if (/(.)\1{4,}/.test(content)) score += 12;

    // Check for suspicious keywords
    const suspiciousKeywords = ['discord.gg', 'nitro', 'free', 'click', 'virus', 'hack'];
    for (const keyword of suspiciousKeywords) {
        if (content.toLowerCase().includes(keyword)) score += 5;
    }

    // Check account age if available
    if (author.createdTimestamp) {
        const accountAge = Date.now() - author.createdTimestamp;
        const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 1) score += 15;
        else if (daysSinceCreation < 7) score += 8;
    }

    return Math.min(score, 100); // Cap at 100
}

// Import the logging manager
const { manager: loggingManager } = require('./loggingSystem');

// Remove circular dependency - sendAppealButtonToUser is now available globally
// Enhanced blocked words with bypass variations
const BLOCKED_WORDS = [
   "porn", "pornography", "xxx", "nude", "naked", "hardcore", "erotic", "erotica",
   "fetish", "bdsm", "bondage", "threesome", "orgy", "cum", "cock", "dick",
   "pussy", "vagina", "penis", "anal", "blowjob", "handjob", "tit", "tits",
   "boobs", "ass", "butt", "creampie", "slut", "whore", "cumshot", "masturbate", "masturbation",
   "nsfw", "18+", "adult", "mature", "x-rated", "r-rated", "softcore", "semi-nude",
   "undressing", "strip", "undressed", "topless", "bottomless", "bare", "nudity",
   "sensorial", "intimate", "sexual", "sensual", "sex", "onlyfans", "chaturbate",
   "xvideos", "pornhub", "brazzers", "milf", "dildo", "vibrator", "escort",
   "camgirl", "camboy", "webcam", "livecam", "sexchat", "cybersex", "sextoy"
];

// Enhanced bypass detection patterns
const BYPASS_PATTERNS = [
   /p[o0*@][r*][n*]/gi,
   /s[e3*@][x*]/gi,
   /n[u*@][d*][e3*@]/gi,
   /[a@4][s$5][s$5]/gi,
   /d[i1*@][c*k]/gi,
   /p[u*@][s$5][s$5][y*]/gi,
   /t[i1*@][t+]/gi,
   /f[u*@][c*k]/gi,
   /b[i1*@][t+][c*h]/gi,
   /[w*][h*][o0*][r*][e3*]/gi
];

// Zero-width character detection
const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\u200E\u200F\uFEFF]/g;

// Excessive formatting detection
const FORMATTING_SPAM = /(\*{3,}|_{3,}|`{3,}|~{3,})/g;

const half = Math.floor(BLOCKED_WORDS.length / 2);
const EXPLICIT = BLOCKED_WORDS.slice(0, half);
const PARTIAL = BLOCKED_WORDS.slice(half);

// Regex patterns
const URL_REGEX = /(https?:\/\/\S+|www\.\S+)/gi;
const INVITE_REGEX = /(?:https?:\/\/)?(?:canary\.|ptb\.)?(?:discord(?:app)?\.com\/invite|discord\.gg)\/([A-Za-z0-9\-]+)/gi;
const KEYWORD_REGEX = new RegExp(`\\b(${EXPLICIT.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
const PARTIAL_REGEX = new RegExp(`\\b(${PARTIAL.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');

// Enhanced content analysis functions
function normalizeText(text) {
   return text
       .replace(ZERO_WIDTH_CHARS, '') // Remove zero-width characters
       .replace(/[^\w\s]/g, '') // Remove special characters except word chars and spaces
       .replace(/\s+/g, ' ') // Normalize whitespace
       .toLowerCase()
       .trim();
}

function detectBypassAttempts(text) {
   const normalized = normalizeText(text);

   // Only check for obvious bypass patterns - be less aggressive
   const obviousBypassPatterns = [
       /p[o0*@][r*][n*]/gi,
       /s[e3*@][x*]/gi,
       /f[u*@][c*k]/gi
   ];

   // Check for obvious bypass patterns only
   for (const pattern of obviousBypassPatterns) {
       if (pattern.test(normalized)) {
           return true;
       }
   }

   // Check for character substitution bypasses with stricter criteria
   const substitutionThreshold = 3; // Require at least 3 substitutions to be suspicious
   let substitutionCount = 0;

   for (const word of BLOCKED_WORDS) {
       if (word.length < 4) continue; // Skip short words to reduce false positives

       let pattern = word;
       const commonSubstitutions = {
           'a': '[a@4]',
           'e': '[e3]',
           'i': '[i1]',
           'o': '[o0]',
           's': '[s$5]'
       };

       for (const [char, substitute] of Object.entries(commonSubstitutions)) {
           if (pattern.includes(char)) {
               pattern = pattern.replace(new RegExp(char, 'g'), substitute);
               substitutionCount++;
           }
       }

       if (substitutionCount >= substitutionThreshold) {
           const regex = new RegExp(pattern, 'gi');
           if (regex.test(normalized)) {
               return true;
           }
       }
       substitutionCount = 0;
   }

   return false;
}

function detectSuspiciousFormatting(text) {
   // Check for excessive formatting (spam technique)
   if (FORMATTING_SPAM.test(text)) {
       return true;
   }

   // Check for suspicious spacing patterns
   const spacingPattern = /\w\s{3,}\w/g;
   if (spacingPattern.test(text)) {
       return true;
   }

   // Check for mixed scripts (potential obfuscation)
   const cyrillicCount = (text.match(/[\u0400-\u04FF]/g) || []).length;
   const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
   if (cyrillicCount > 0 && latinCount > 0 && text.length < 50) {
       return true;
   }

   return false;
}

function calculateSuspicionScore(text, author) {
   let score = 0;

   // Base content checks - more conservative scoring
   if (KEYWORD_REGEX.test(text)) score += 20; // Increase for actual blocked keywords
   if (PARTIAL_REGEX.test(text)) score += 8;
   if (detectBypassAttempts(text)) score += 25; // High score for actual bypass attempts
   if (detectSuspiciousFormatting(text)) score += 12;

   // URL density check - be more lenient
   const urls = text.match(URL_REGEX) || [];
   if (urls.length > 5) score += 8; // Increased threshold
   if (urls.length > 2 && text.length < 50) score += 5; // Stricter length requirement

   // Excessive caps - be more lenient with short messages
   if (text.length > 20) {
       const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
       if (capsRatio > 0.8) score += 6;
   }

   // Repetitive characters - ignore common patterns
   const repeatingPattern = /(.)\1{6,}/g; // Increased threshold
   if (repeatingPattern.test(text) && !/[.!?]{3,}/.test(text)) score += 4; // Ignore punctuation repetition

   // Account age factor - more balanced
   if (author && author.createdTimestamp) {
       const accountAge = Date.now() - author.createdTimestamp;
       const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
       if (daysSinceCreation < 3) score += 8; // Only very new accounts
       if (daysSinceCreation < 0.5) score += 15; // Less than 12 hours old
   }

   // Reduce score for normal conversational patterns
   if (text.length > 10 && text.includes(' ') && !text.includes('http')) {
       score = Math.max(0, score - 3); // Slight reduction for normal text
   }

   return score;
}

function getModLogChannel(guild) {
   try {
       if (!guild) {
           console.log('❌ No guild provided to getModLogChannel');
           return null;
       }

       // Use the new logging manager
       const channel = loggingManager.getLogChannel(guild);
       if (channel) {
           console.log(`✅ Found log channel: ${channel.name} (${channel.id}) for guild ${guild.name}`);
           return channel;
       }

       console.log(`❌ No log channel configured for guild: ${guild.name} (${guild.id})`);
       return null;
   } catch (error) {
       console.error('❌ Error in getModLogChannel:', error);
       return null;
   }
}

function domainOf(url) {
   try {
       const parsed = new URL(url);
       return parsed.hostname.toLowerCase();
   } catch {
       return '';
   }
}

// Adult site detection
const ADULT_DOMAINS = new Set([
   'pornhub.com', 'xvideos.com', 'redtube.com', 'youporn.com', 
   'tube8.com', 'spankbang.com', 'xhamster.com', 'sex.com',
   'porn.com', 'thumbzilla.com', 'pornmd.com', 'eporner.com',
   'gotporn.com', 'drtuber.com', 'pornhd.com', 'txxx.com',
   'beeg.com', 'fapality.com', 'nuvid.com', 'sunporno.com'
]);

function isAdultSite(url) {
   const domain = domainOf(url);
   return Array.from(ADULT_DOMAINS).some(bad => 
       domain === bad || domain.endsWith(`.${bad}`)
   );
}

// Phishing site detection
const PHISHING_DOMAINS = new Set([
   'discord-nitro.com', 'discord-nitro.ru', 'discrod.com',
   'discordapp.ru', 'discord-gift.com', 'steam-community.com',
   'steamcommunitty.com', 'steancommunity.com'
]);

function isPhishingSite(url) {
   const domain = domainOf(url);
   return Array.from(PHISHING_DOMAINS).some(bad => 
       domain === bad || domain.endsWith(`.${bad}`)
   );
}

// Malware site detection
const MALWARE_DOMAINS = new Set([
   'malware.com', 'virus.com', 'trojan.com'
]);

function isMalwareSite(url) {
   const domain = domainOf(url);
   return Array.from(MALWARE_DOMAINS).some(bad => 
       domain === bad || domain.endsWith(`.${bad}`)
   );
}

function isSuspiciousUrl(url) {
   return isAdultSite(url) || isPhishingSite(url) || isMalwareSite(url);
}

// Utility functions
function formatDuration(milliseconds) {
   const seconds = Math.floor(milliseconds / 1000);
   const minutes = Math.floor(seconds / 60);
   const hours = Math.floor(minutes / 60);
   const days = Math.floor(hours / 24);

   if (days > 0) return `${days}d ${hours % 24}h`;
   if (hours > 0) return `${hours}h ${minutes % 60}m`;
   if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
   return `${seconds}s`;
}

function parseTimeString(timeStr) {
   const units = {
       's': 1000,
       'm': 60 * 1000,
       'h': 60 * 60 * 1000,
       'd': 24 * 60 * 60 * 1000,
       'w': 7 * 24 * 60 * 60 * 1000
   };

   let total = 0;
   const regex = /(\d+)([smhdw])/g;
   let match;

   while ((match = regex.exec(timeStr.toLowerCase())) !== null) {
       const value = parseInt(match[1]);
       const unit = match[2];
       total += value * (units[unit] || 0);
   }

   return total;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function truncateText(text, maxLength = 2000) {
   if (text.length <= maxLength) return text;
   return text.substring(0, maxLength - 3) + '...';
}

function validatePermissions(member, requiredPermissions) {
   if (!member || !member.permissions) return false;

   if (Array.isArray(requiredPermissions)) {
       return requiredPermissions.every(perm => member.permissions.has(perm));
   }

   return member.permissions.has(requiredPermissions);
}

// Enhanced logging helper
async function logToChannel(guild, actionType, data, user = null) {
   try {
       return await loggingManager.logAction(guild, actionType, data, user);
   } catch (error) {
       console.error(`❌ Error logging to channel:`, error);
       return false;
   }
}

// Configuration file helper
function readConfig(filePath, defaultValue = {}) {
   try {
       if (fs.existsSync(filePath)) {
           const data = fs.readFileSync(filePath, 'utf8');
           return JSON.parse(data);
       }
       return defaultValue;
   } catch (error) {
       console.error(`❌ Error reading config file ${filePath}:`, error);
       return defaultValue;
   }
}

function writeConfig(filePath, data) {
   try {
       const dir = path.dirname(filePath);
       if (!fs.existsSync(dir)) {
           fs.mkdirSync(dir, { recursive: true });
       }
       fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
       return true;
   } catch (error) {
       console.error(`❌ Error writing config file ${filePath}:`, error);
       return false;
   }
}

module.exports = {
   getModLogChannel,
   domainOf,
   isAdultSite,
   isPhishingSite,
   isMalwareSite,
   isSuspiciousUrl,
   formatDuration,
   parseTimeString,
   escapeRegex,
   truncateText,
   validatePermissions,
   logToChannel,
   readConfig,
   writeConfig
};