# Discord MMO Music Bot

A Discord bot combining music playback with a semi-idle MMO game featuring skills, combat, gathering, and crafting systems.

## Overview

This bot provides two main features:
1. **Music Player**: Play music from YouTube with queue management and playback controls
2. **Idle MMO Game**: A text-based RPG with skills, combat, gathering, and crafting

## Project Structure

```
src/
├── index.js           # Main bot entry point
├── db/
│   ├── schema.js      # Database schema (Drizzle ORM)
│   ├── index.js       # Database connection
│   └── seed.js        # Initial game data seeding
├── commands/
│   ├── music.js       # Music slash commands
│   └── game.js        # Game slash commands
├── music/
│   └── player.js      # Music player and queue management
└── game/
    ├── playerManager.js   # Player data management
    └── combatManager.js   # Combat system
```

## Music Commands

- `/play <query>` - Play a song from YouTube URL or search query
- `/pause` - Pause the current song
- `/resume` - Resume playback
- `/stop` - Stop and clear queue
- `/skip` - Skip to next song
- `/skipback` - Go to previous song
- `/reload` - Restart current song
- `/nowplaying` - Show current song
- `/queue` - Show music queue
- `/disconnect` - Leave voice channel

## Game Commands

### Character
- `/start` - Create your character
- `/profile` - View stats and collect idle rewards
- `/skills` - View skill levels
- `/inventory` - View items

### Combat
- `/hunt [enemy]` - Fight enemies
- `/attack` - Attack in battle
- `/flee` - Escape battle
- `/enemies` - List available enemies

### Gathering
- `/gather <resource>` - Collect materials (wood, stone, iron, gold, fish, herbs)

### Crafting
- `/craft <item>` - Craft items
- `/recipes` - View available recipes

### Other
- `/rest` - Recover HP (10 gold)
- `/use <item>` - Use consumable items
- `/gamehelp` - Show all game commands

## Skills System

- **Combat** - Gained from fighting enemies
- **Mining** - Mine stone, iron, gold
- **Woodcutting** - Chop trees for wood
- **Fishing** - Catch fish
- **Foraging** - Gather herbs
- **Crafting** - Create weapons, armor, potions
- **Cooking** - Cook food for HP restoration

## Idle Progression

Players earn passive gold and experience while offline (up to 24 hours). Rewards are collected automatically when viewing profile.

## Environment Variables

- `DISCORD_BOT_TOKEN` - Discord bot token (required)
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)

## Database

Uses PostgreSQL with Drizzle ORM. Schema includes:
- players - Character data
- skills - Skill levels and XP
- inventory - Player items
- items - Item definitions
- enemies - Enemy definitions
- recipes - Crafting recipes
- gatheringNodes - Resource nodes
- activeBattles - Current combat state

## Development

```bash
npm install        # Install dependencies
npm run db:push    # Push schema to database
npm run start      # Start the bot
```
