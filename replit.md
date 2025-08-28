# Discord Bot - Moderation & Utility Bot

## Overview

This is a comprehensive Discord bot built with Node.js and Discord.js v14 that provides moderation capabilities, spam detection, welcome/goodbye messages, and utility features including AI integration. The bot implements automated content filtering, timeout appeals, and various administrative tools for Discord server management.

**Recent Update**: Successfully converted from Python to JavaScript with all features preserved and working, including DNA profile features, Pokemon lookup, role management, and advanced moderation tools.

**Latest Fixes**: Auto-moderation and logging systems are now fully operational with comprehensive message tracking, edit logging, and deletion monitoring. All permission checks and user handling have been optimized.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Architecture
- **Runtime**: Node.js with Discord.js v14
- **Data Storage**: JSON-based configuration files for settings and user data
- **Memory Management**: In-memory collections and global variables for real-time tracking
- **Event-Driven**: Discord event handlers for real-time message processing
- **Modular Design**: Separate modules for commands, events, utilities, and components

### Key Components

#### 1. Main Application (`index.js`)
- Discord client initialization with necessary intents
- Global state management for spam tracking and appeals
- Configuration loading from JSON files
- Collection management for commands and settings

#### 2. Command System
- **Moderation Commands** (`commands/moderation.js`): Purge, warn, kick, ban functionality
- **Utility Commands** (`commands/utility.js`): Currency conversion, AI interactions, server info
- **Welcome Commands** (`commands/welcome.js`): Welcome/goodbye message configuration

#### 3. Event Handlers
- **Message Creation** (`events/messageCreate.js`): Content filtering, spam detection, violation handling
- **Message Updates** (`events/messageUpdate.js`): Edit monitoring for link additions
- **Member Events**: Welcome (`events/guildMemberAdd.js`) and goodbye (`events/guildMemberRemove.js`) handling

#### 4. Utility Modules
- **Content Filtering** (`utils/helpers.js`): Adult site detection, keyword filtering, URL validation
- **Spam Detection** (`utils/spam.js`): Rate limiting and cross-channel spam detection
- **AI Integration** (`utils/gemini.js`): Google Gemini API integration for AI responses and sentiment analysis

#### 5. Interactive Components
- **Appeal System** (`components/appealView.js`): Timeout appeal handling with button interactions

## Data Flow

### Message Processing Pipeline
1. **Message Receipt**: Discord message events trigger processing
2. **Content Analysis**: Check for blocked keywords, excessive mentions, and URLs
3. **Spam Detection**: Track user posting patterns and cross-channel duplicates
4. **Violation Handling**: Apply timeouts, log violations, and notify moderators
5. **Appeal Process**: Allow users to appeal timeouts with moderator review

### Configuration Management
- Server-specific settings stored in JSON files
- Real-time configuration updates through slash commands
- Guild-based isolation for multi-server support

## External Dependencies

### Core Dependencies
- **discord.js**: Discord API interaction and event handling
- **@google/genai**: Google Gemini AI API integration
- **axios**: HTTP client for external API calls (currency conversion)

### API Integrations
- **Google Gemini API**: AI responses and sentiment analysis
- **Currency Exchange API**: Real-time currency conversion rates

## Deployment Strategy

### Configuration Requirements
- **Environment Variables**: `GEMINI_API_KEY` for AI functionality
- **Discord Bot Token**: Required for Discord API authentication
- **File Permissions**: Read/write access for JSON configuration files

### Runtime Requirements
- Node.js 16.11.0 or higher
- Persistent file system for configuration storage
- Internet connectivity for Discord API and external services

### Scaling Considerations
- In-memory data structures require persistent storage solution for production
- Rate limiting implemented for spam detection
- Modular architecture allows for easy feature additions

## Key Features

### Automated Moderation
- Keyword filtering with explicit and partial word matching
- Adult site detection and blocking
- Spam prevention with configurable thresholds
- Cross-channel duplicate message detection

### User Management
- Timeout appeals with moderator review
- Warning system with persistent storage
- Automated violation logging

### Server Customization
- Configurable welcome/goodbye messages
- Custom banner support
- Channel-specific link permissions

### AI Integration
- Natural language processing for user queries
- Sentiment analysis for message content
- Configurable response parameters

This architecture provides a robust foundation for Discord server moderation while maintaining flexibility for future enhancements and customization.