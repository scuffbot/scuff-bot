import { pgTable, serial, text, integer, timestamp, boolean, jsonb, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  discordId: text('discord_id').notNull().unique(),
  username: text('username').notNull(),
  characterName: text('character_name').notNull(),
  race: text('race').notNull(),
  level: integer('level').default(1).notNull(),
  experience: integer('experience').default(0).notNull(),
  gold: integer('gold').default(100).notNull(),
  health: integer('health').default(100).notNull(),
  maxHealth: integer('max_health').default(100).notNull(),
  attack: integer('attack').default(1).notNull(),
  strength: integer('strength').default(1).notNull(),
  defense: integer('defense').default(1).notNull(),
  range: integer('range').default(1).notNull(),
  magic: integer('magic').default(1).notNull(),
  prayer: integer('prayer').default(1).notNull(),
  stamina: integer('stamina').default(1).notNull(),
  luck: integer('luck').default(1).notNull(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  lastIdleReward: timestamp('last_idle_reward').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const skills = pgTable('skills', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id),
  skillName: text('skill_name').notNull(),
  level: integer('level').default(1).notNull(),
  experience: integer('experience').default(0).notNull(),
});

export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id),
  itemId: text('item_id').notNull(),
  quantity: integer('quantity').default(1).notNull(),
});

export const items = pgTable('items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  rarity: text('rarity').default('common').notNull(),
  value: integer('value').default(0).notNull(),
  stats: jsonb('stats'),
});

export const recipes = pgTable('recipes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  resultItemId: text('result_item_id').notNull(),
  resultQuantity: integer('result_quantity').default(1).notNull(),
  requiredSkill: text('required_skill'),
  requiredLevel: integer('required_level').default(1).notNull(),
  ingredients: jsonb('ingredients').notNull(),
  experienceReward: integer('experience_reward').default(10).notNull(),
});

export const enemies = pgTable('enemies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  level: integer('level').default(1).notNull(),
  health: integer('health').default(50).notNull(),
  attack: integer('attack').default(5).notNull(),
  defense: integer('defense').default(2).notNull(),
  experienceReward: integer('experience_reward').default(10).notNull(),
  goldReward: integer('gold_reward').default(5).notNull(),
  drops: jsonb('drops'),
});

export const gatheringNodes = pgTable('gathering_nodes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  requiredSkill: text('required_skill').notNull(),
  requiredLevel: integer('required_level').default(1).notNull(),
  itemDrops: jsonb('item_drops').notNull(),
  experienceReward: integer('experience_reward').default(5).notNull(),
});

export const activeBattles = pgTable('active_battles', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id),
  enemyId: text('enemy_id').notNull(),
  enemyCurrentHealth: integer('enemy_current_health').notNull(),
  playerCurrentHealth: integer('player_current_health').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const playersRelations = relations(players, ({ many }) => ({
  skills: many(skills),
  inventory: many(inventory),
  activeBattles: many(activeBattles),
}));

export const skillsRelations = relations(skills, ({ one }) => ({
  player: one(players, {
    fields: [skills.playerId],
    references: [players.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  player: one(players, {
    fields: [inventory.playerId],
    references: [players.id],
  }),
}));

export const activeBattlesRelations = relations(activeBattles, ({ one }) => ({
  player: one(players, {
    fields: [activeBattles.playerId],
    references: [players.id],
  }),
}));
