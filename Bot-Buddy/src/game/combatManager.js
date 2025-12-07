import { db } from '../db/index.js';
import { activeBattles, enemies, items } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import * as playerManager from './playerManager.js';

export async function getActiveBattle(playerId) {
  const [battle] = await db.select().from(activeBattles).where(eq(activeBattles.playerId, playerId)).limit(1);
  return battle || null;
}

export async function startBattle(playerId, enemyId, enemyHealth, playerHealth) {
  await db.delete(activeBattles).where(eq(activeBattles.playerId, playerId));
  
  const [battle] = await db.insert(activeBattles).values({
    playerId,
    enemyId,
    enemyCurrentHealth: enemyHealth,
    playerCurrentHealth: playerHealth,
  }).returning();
  
  return battle;
}

export async function endBattle(playerId) {
  await db.delete(activeBattles).where(eq(activeBattles.playerId, playerId));
}

export async function fleeBattle(playerId) {
  const battle = await getActiveBattle(playerId);
  if (!battle) return false;
  
  await endBattle(playerId);
  return true;
}

export async function processCombatTurn(player) {
  const battle = await getActiveBattle(player.id);
  if (!battle) return null;

  const [enemy] = await db.select().from(enemies).where(eq(enemies.id, battle.enemyId)).limit(1);
  if (!enemy) {
    await endBattle(player.id);
    return null;
  }

  const playerDamage = Math.max(1, player.attack - enemy.defense + Math.floor(Math.random() * 5));
  let newEnemyHealth = battle.enemyCurrentHealth - playerDamage;

  let enemyDamage = 0;
  let newPlayerHealth = battle.playerCurrentHealth;

  if (newEnemyHealth > 0) {
    enemyDamage = Math.max(1, enemy.attack - player.defense + Math.floor(Math.random() * 3));
    newPlayerHealth = battle.playerCurrentHealth - enemyDamage;
  }

  const result = {
    playerDamage,
    enemyDamage,
    enemyHealth: Math.max(0, newEnemyHealth),
    playerHealth: Math.max(0, newPlayerHealth),
    enemy,
    battleEnded: false,
    victory: false,
    expGained: 0,
    goldGained: 0,
    loot: [],
    levelUp: false,
    newLevel: player.level,
  };

  if (newEnemyHealth <= 0) {
    result.battleEnded = true;
    result.victory = true;
    result.expGained = enemy.experienceReward;
    result.goldGained = enemy.goldReward;

    const updatedPlayer = await playerManager.addExperience(player.discordId, enemy.experienceReward);
    await playerManager.addGold(player.discordId, enemy.goldReward);
    
    if (updatedPlayer && updatedPlayer.level > player.level) {
      result.levelUp = true;
      result.newLevel = updatedPlayer.level;
    }

    if (enemy.drops) {
      for (const drop of enemy.drops) {
        if (Math.random() < drop.chance) {
          const quantity = drop.quantity || 1;
          await playerManager.addItem(player.id, drop.itemId, quantity);
          const [item] = await db.select().from(items).where(eq(items.id, drop.itemId)).limit(1);
          result.loot.push({ name: item?.name || drop.itemId, quantity });
        }
      }
    }

    await playerManager.addSkillExperience(player.id, 'combat', Math.floor(enemy.experienceReward / 2));
    await endBattle(player.id);
  } else if (newPlayerHealth <= 0) {
    result.battleEnded = true;
    result.victory = false;
    
    await playerManager.damagePlayer(player.discordId, player.health);
    await endBattle(player.id);
  } else {
    await db.update(activeBattles).set({
      enemyCurrentHealth: newEnemyHealth,
      playerCurrentHealth: newPlayerHealth,
    }).where(eq(activeBattles.playerId, player.id));
    
    await playerManager.updatePlayer(player.discordId, { health: newPlayerHealth });
  }

  return result;
}
