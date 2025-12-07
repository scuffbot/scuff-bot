import { db } from '../db/index.js';
import { players, skills, inventory } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { generateCharacterName, SKILL_LIST } from './nameGenerator.js';

const BASE_SKILLS = SKILL_LIST;

export function getExpForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function getLevelFromExp(exp) {
  let level = 1;
  let totalExp = 0;
  while (totalExp + getExpForLevel(level) <= exp) {
    totalExp += getExpForLevel(level);
    level++;
  }
  return level;
}

export function getExpProgress(totalExp, level) {
  let cumulativeExp = 0;
  for (let i = 1; i < level; i++) {
    cumulativeExp += getExpForLevel(i);
  }
  const currentLevelExp = totalExp - cumulativeExp;
  const neededForNext = getExpForLevel(level);
  return { current: currentLevelExp, needed: neededForNext };
}

export async function getOrCreatePlayer(discordId, username) {
  let player = await db.select().from(players).where(eq(players.discordId, discordId)).limit(1);
  
  if (player.length === 0) {
    return null;
  }
  
  return player[0];
}

export async function createNewPlayer(discordId, username, race) {
  const characterName = generateCharacterName(race);
  
  const [newPlayer] = await db.insert(players).values({
    discordId,
    username,
    characterName,
    race,
    health: 100,
    maxHealth: 100,
    attack: 1,
    strength: 1,
    defense: 1,
    range: 1,
    magic: 1,
    prayer: 1,
    stamina: 1,
    luck: 1,
  }).returning();
  
  for (const skillName of BASE_SKILLS) {
    await db.insert(skills).values({
      playerId: newPlayer.id,
      skillName,
      level: 1,
      experience: 0,
    });
  }
  
  return newPlayer;
}

export async function getPlayer(discordId) {
  const player = await db.select().from(players).where(eq(players.discordId, discordId)).limit(1);
  return player[0] || null;
}

export async function updatePlayer(discordId, updates) {
  await db.update(players).set(updates).where(eq(players.discordId, discordId));
  return getPlayer(discordId);
}

export async function addExperience(discordId, amount) {
  const player = await getPlayer(discordId);
  if (!player) return null;
  
  const newExp = player.experience + amount;
  const newLevel = getLevelFromExp(newExp);
  
  const updates = { experience: newExp };
  
  if (newLevel > player.level) {
    updates.level = newLevel;
    updates.maxHealth = 100 + (newLevel - 1) * 10;
    updates.health = updates.maxHealth;
    updates.attack = 10 + (newLevel - 1) * 2;
    updates.defense = 5 + newLevel;
  }
  
  return updatePlayer(discordId, updates);
}

export async function getPlayerSkills(playerId) {
  return db.select().from(skills).where(eq(skills.playerId, playerId));
}

export async function getPlayerSkill(playerId, skillName) {
  const skill = await db.select().from(skills).where(
    and(eq(skills.playerId, playerId), eq(skills.skillName, skillName))
  ).limit(1);
  return skill[0] || null;
}

export async function addSkillExperience(playerId, skillName, amount) {
  const skill = await getPlayerSkill(playerId, skillName);
  if (!skill) return null;
  
  const newExp = skill.experience + amount;
  const newLevel = getLevelFromExp(newExp);
  
  await db.update(skills).set({
    experience: newExp,
    level: newLevel,
  }).where(and(eq(skills.playerId, playerId), eq(skills.skillName, skillName)));
  
  return { ...skill, experience: newExp, level: newLevel, leveledUp: newLevel > skill.level };
}

export async function getPlayerInventory(playerId) {
  return db.select().from(inventory).where(eq(inventory.playerId, playerId));
}

export async function getInventoryItem(playerId, itemId) {
  const item = await db.select().from(inventory).where(
    and(eq(inventory.playerId, playerId), eq(inventory.itemId, itemId))
  ).limit(1);
  return item[0] || null;
}

export async function addItem(playerId, itemId, quantity = 1) {
  const existing = await getInventoryItem(playerId, itemId);
  
  if (existing) {
    await db.update(inventory).set({
      quantity: existing.quantity + quantity,
    }).where(and(eq(inventory.playerId, playerId), eq(inventory.itemId, itemId)));
  } else {
    await db.insert(inventory).values({
      playerId,
      itemId,
      quantity,
    });
  }
}

export async function removeItem(playerId, itemId, quantity = 1) {
  const existing = await getInventoryItem(playerId, itemId);
  
  if (!existing || existing.quantity < quantity) {
    return false;
  }
  
  if (existing.quantity === quantity) {
    await db.delete(inventory).where(
      and(eq(inventory.playerId, playerId), eq(inventory.itemId, itemId))
    );
  } else {
    await db.update(inventory).set({
      quantity: existing.quantity - quantity,
    }).where(and(eq(inventory.playerId, playerId), eq(inventory.itemId, itemId)));
  }
  
  return true;
}

export async function healPlayer(discordId, amount) {
  const player = await getPlayer(discordId);
  if (!player) return null;
  
  const newHealth = Math.min(player.health + amount, player.maxHealth);
  return updatePlayer(discordId, { health: newHealth });
}

export async function damagePlayer(discordId, amount) {
  const player = await getPlayer(discordId);
  if (!player) return null;
  
  const newHealth = Math.max(player.health - amount, 0);
  return updatePlayer(discordId, { health: newHealth });
}

export async function addGold(discordId, amount) {
  const player = await getPlayer(discordId);
  if (!player) return null;
  
  return updatePlayer(discordId, { gold: player.gold + amount });
}

export async function removeGold(discordId, amount) {
  const player = await getPlayer(discordId);
  if (!player || player.gold < amount) return null;
  
  return updatePlayer(discordId, { gold: player.gold - amount });
}

export async function updateLastActivity(discordId) {
  return updatePlayer(discordId, { lastActivity: new Date() });
}

export async function calculateIdleRewards(discordId) {
  const player = await getPlayer(discordId);
  if (!player) return null;
  
  const now = new Date();
  const lastReward = new Date(player.lastIdleReward);
  const hoursPassed = Math.floor((now - lastReward) / (1000 * 60 * 60));
  
  if (hoursPassed < 1) return { gold: 0, exp: 0, hours: 0 };
  
  const cappedHours = Math.min(hoursPassed, 24);
  const goldReward = cappedHours * player.level * 5;
  const expReward = cappedHours * player.level * 2;
  
  await updatePlayer(discordId, { lastIdleReward: now });
  await addGold(discordId, goldReward);
  await addExperience(discordId, expReward);
  
  return { gold: goldReward, exp: expReward, hours: cappedHours };
}
