import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { db } from '../db/index.js';
import { enemies, gatheringNodes, recipes, items } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import * as playerManager from '../game/playerManager.js';
import { getExpProgress } from '../game/playerManager.js';
import * as combatManager from '../game/combatManager.js';
import { RACES, RACE_DESCRIPTIONS, COMBAT_STATS, SKILL_LIST } from '../game/nameGenerator.js';

export const gameCommands = [
  {
    data: new SlashCommandBuilder()
      .setName('startadventure')
      .setDescription('Begin your adventure and create your character')
      .addStringOption(option =>
        option.setName('race')
          .setDescription('Choose your race')
          .setRequired(true)
          .addChoices(
            { name: 'Human - Versatile and adaptable', value: 'human' },
            { name: 'Undead - Dark resilience from beyond', value: 'undead' },
            { name: 'Ork - Fierce warriors with unmatched strength', value: 'ork' },
            { name: 'Dwarf - Stout masters of mining and craft', value: 'dwarf' },
            { name: 'Druid - One with nature and the wild', value: 'druid' },
            { name: 'Spirit - Ethereal beings with mystical power', value: 'spirit' }
          )),
    async execute(interaction) {
      const existing = await playerManager.getPlayer(interaction.user.id);
      if (existing) {
        return interaction.reply({ content: 'You already have a character! Use `/playercard` to view them.', ephemeral: true });
      }

      const race = interaction.options.getString('race');
      const player = await playerManager.createNewPlayer(interaction.user.id, interaction.user.username, race);
      
      const raceEmoji = {
        human: ':person_standing:',
        undead: ':skull:',
        ork: ':japanese_ogre:',
        dwarf: ':hammer:',
        druid: ':deciduous_tree:',
        spirit: ':ghost:'
      };
      
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`${raceEmoji[race]} Welcome, Adventurer!`)
        .setDescription(`A new hero rises...\n\n**${player.characterName}**\n*${capitalize(race)} Adventurer*`)
        .addFields(
          { name: 'Race', value: capitalize(race), inline: true },
          { name: 'Level', value: `${player.level}`, inline: true },
          { name: 'Gold', value: `${player.gold}`, inline: true },
          { name: '\u200B', value: '**Combat Stats**', inline: false },
          { name: 'Health', value: `${player.health}/${player.maxHealth}`, inline: true },
          { name: 'Attack', value: `${player.attack}`, inline: true },
          { name: 'Strength', value: `${player.strength}`, inline: true },
          { name: 'Defense', value: `${player.defense}`, inline: true },
          { name: 'Range', value: `${player.range}`, inline: true },
          { name: 'Magic', value: `${player.magic}`, inline: true },
          { name: 'Prayer', value: `${player.prayer}`, inline: true },
          { name: 'Stamina', value: `${player.stamina}`, inline: true },
          { name: 'Luck', value: `${player.luck}`, inline: true }
        )
        .setFooter({ text: 'Use /playercard to view your full stats, /gamehelp for commands' });

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('playercard')
      .setDescription('View your complete character card with all stats'),
    async execute(interaction) {
      const player = await playerManager.getPlayer(interaction.user.id);
      if (!player) {
        return interaction.reply({ content: 'You need to use `/startadventure` first!', ephemeral: true });
      }

      const skills = await playerManager.getPlayerSkills(player.id);
      const idleRewards = await playerManager.calculateIdleRewards(interaction.user.id);
      const updatedPlayer = await playerManager.getPlayer(interaction.user.id);
      const expProgress = getExpProgress(updatedPlayer.experience, updatedPlayer.level);
      
      const raceEmoji = {
        human: ':person_standing:',
        undead: ':skull:',
        ork: ':japanese_ogre:',
        dwarf: ':hammer:',
        druid: ':deciduous_tree:',
        spirit: ':ghost:'
      };
      
      const embed = new EmbedBuilder()
        .setColor(getRaceColor(updatedPlayer.race))
        .setTitle(`${raceEmoji[updatedPlayer.race] || ':crossed_swords:'} ${updatedPlayer.characterName}`)
        .setDescription(`*${capitalize(updatedPlayer.race)} Adventurer*\n**Level ${updatedPlayer.level}** | ${expProgress.current}/${expProgress.needed} XP`)
        .addFields(
          { name: ':moneybag: Gold', value: `${updatedPlayer.gold}`, inline: true },
          { name: ':heart: Health', value: `${updatedPlayer.health}/${updatedPlayer.maxHealth}`, inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: '\u200B', value: '**:crossed_swords: Combat Stats**', inline: false },
          { name: 'Attack', value: `${updatedPlayer.attack}`, inline: true },
          { name: 'Strength', value: `${updatedPlayer.strength}`, inline: true },
          { name: 'Defense', value: `${updatedPlayer.defense}`, inline: true },
          { name: 'Range', value: `${updatedPlayer.range}`, inline: true },
          { name: 'Magic', value: `${updatedPlayer.magic}`, inline: true },
          { name: 'Prayer', value: `${updatedPlayer.prayer}`, inline: true },
          { name: 'Stamina', value: `${updatedPlayer.stamina}`, inline: true },
          { name: 'Luck', value: `${updatedPlayer.luck}`, inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: '\u200B', value: '**:tools: Skills**', inline: false }
        );

      const skillText = skills.map(s => {
        const skillProgress = getExpProgress(s.experience, s.level);
        const bar = createProgressBar(skillProgress.current, skillProgress.needed, 6);
        return `**${capitalize(s.skillName)}** Lv.${s.level} ${bar}`;
      }).join('\n');

      embed.addFields({ name: '\u200B', value: skillText || 'No skills yet', inline: false });

      if (idleRewards && idleRewards.hours > 0) {
        embed.addFields({
          name: ':zzz: Idle Rewards Collected!',
          value: `+${idleRewards.gold} gold, +${idleRewards.exp} exp (${idleRewards.hours}h idle)`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('profile')
      .setDescription('View your character profile'),
    async execute(interaction) {
      const player = await playerManager.getPlayer(interaction.user.id);
      if (!player) {
        return interaction.reply({ content: 'You need to use `/startadventure` first!', ephemeral: true });
      }

      const idleRewards = await playerManager.calculateIdleRewards(interaction.user.id);
      const updatedPlayer = await playerManager.getPlayer(interaction.user.id);
      const expProgress = getExpProgress(updatedPlayer.experience, updatedPlayer.level);
      
      const embed = new EmbedBuilder()
        .setColor(getRaceColor(updatedPlayer.race))
        .setTitle(`${updatedPlayer.characterName}`)
        .setDescription(`*${capitalize(updatedPlayer.race)} Adventurer*`)
        .addFields(
          { name: 'Level', value: `${updatedPlayer.level}`, inline: true },
          { name: 'Experience', value: `${expProgress.current}/${expProgress.needed}`, inline: true },
          { name: 'Health', value: `${updatedPlayer.health}/${updatedPlayer.maxHealth}`, inline: true },
          { name: 'Attack', value: `${updatedPlayer.attack}`, inline: true },
          { name: 'Defense', value: `${updatedPlayer.defense}`, inline: true },
          { name: 'Gold', value: `${updatedPlayer.gold}`, inline: true }
        );

      if (idleRewards.hours > 0) {
        embed.addFields({
          name: 'Idle Rewards Collected!',
          value: `+${idleRewards.gold} gold, +${idleRewards.exp} exp (${idleRewards.hours}h idle)`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('skills')
      .setDescription('View your skill levels'),
    async execute(interaction) {
      const player = await playerManager.getPlayer(interaction.user.id);
      if (!player) {
        return interaction.reply({ content: 'You need to use `/startadventure` first!', ephemeral: true });
      }

      const skills = await playerManager.getPlayerSkills(player.id);
      
      const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle(`${player.characterName}'s Skills`)
        .setDescription(
          skills.map(s => {
            const skillProgress = getExpProgress(s.experience, s.level);
            const bar = createProgressBar(skillProgress.current, skillProgress.needed);
            return `**${capitalize(s.skillName)}** Lv.${s.level}\n${bar} ${skillProgress.current}/${skillProgress.needed}`;
          }).join('\n\n')
        );

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('inventory')
      .setDescription('View your inventory'),
    async execute(interaction) {
      const player = await playerManager.getPlayer(interaction.user.id);
      if (!player) {
        return interaction.reply({ content: 'You need to use `/startadventure` first!', ephemeral: true });
      }

      const inv = await playerManager.getPlayerInventory(player.id);
      
      if (inv.length === 0) {
        return interaction.reply({ content: 'Your inventory is empty!', ephemeral: true });
      }

      const itemDetails = await Promise.all(
        inv.map(async i => {
          const [item] = await db.select().from(items).where(eq(items.id, i.itemId)).limit(1);
          return { ...i, item };
        })
      );

      const embed = new EmbedBuilder()
        .setColor(0x8b4513)
        .setTitle(`${player.username}'s Inventory`)
        .setDescription(
          itemDetails.map(i => {
            const rarity = getRarityEmoji(i.item?.rarity);
            return `${rarity} **${i.item?.name || i.itemId}** x${i.quantity}`;
          }).join('\n')
        );

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('hunt')
      .setDescription('Hunt enemies to gain experience and loot')
      .addStringOption(option =>
        option.setName('enemy')
          .setDescription('Enemy to hunt (leave empty for random)')
          .setRequired(false)),
    async execute(interaction) {
      const player = await playerManager.getPlayer(interaction.user.id);
      if (!player) {
        return interaction.reply({ content: 'You need to use `/startadventure` first!', ephemeral: true });
      }

      if (player.health <= 0) {
        return interaction.reply({ content: 'You are defeated! Use /rest to recover.', ephemeral: true });
      }

      const existingBattle = await combatManager.getActiveBattle(player.id);
      if (existingBattle) {
        return interaction.reply({ content: 'You are already in a battle! Use /attack or /flee.', ephemeral: true });
      }

      const enemyName = interaction.options.getString('enemy');
      let enemy;

      if (enemyName) {
        const [found] = await db.select().from(enemies).where(eq(enemies.name, enemyName)).limit(1);
        enemy = found;
      }

      if (!enemy) {
        const allEnemies = await db.select().from(enemies);
        const availableEnemies = allEnemies.filter(e => e.level <= player.level + 3);
        enemy = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
      }

      if (!enemy) {
        return interaction.reply({ content: 'No enemies found!', ephemeral: true });
      }

      await combatManager.startBattle(player.id, enemy.id, enemy.health, player.health);

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Battle Started!')
        .setDescription(`A wild **${enemy.name}** (Lv.${enemy.level}) appears!`)
        .addFields(
          { name: 'Enemy HP', value: `${enemy.health}/${enemy.health}`, inline: true },
          { name: 'Your HP', value: `${player.health}/${player.maxHealth}`, inline: true }
        )
        .setFooter({ text: 'Use /attack to fight or /flee to escape' });

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('attack')
      .setDescription('Attack the enemy in battle'),
    async execute(interaction) {
      const player = await playerManager.getPlayer(interaction.user.id);
      if (!player) {
        return interaction.reply({ content: 'You need to use `/startadventure` first!', ephemeral: true });
      }

      const result = await combatManager.processCombatTurn(player);
      
      if (!result) {
        return interaction.reply({ content: 'You are not in a battle! Use /hunt to start one.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('Combat')
        .addFields(
          { name: 'Your Attack', value: `You deal ${result.playerDamage} damage!`, inline: false },
          { name: 'Enemy Attack', value: result.battleEnded ? 'Enemy defeated!' : `${result.enemy.name} deals ${result.enemyDamage} damage!`, inline: false },
          { name: 'Enemy HP', value: `${result.enemyHealth}/${result.enemy.health}`, inline: true },
          { name: 'Your HP', value: `${result.playerHealth}/${player.maxHealth}`, inline: true }
        );

      if (result.battleEnded) {
        if (result.victory) {
          embed.setColor(0x00ff00);
          embed.setDescription(`Victory! You defeated the **${result.enemy.name}**!`);
          embed.addFields(
            { name: 'Rewards', value: `+${result.expGained} EXP, +${result.goldGained} Gold`, inline: false }
          );
          if (result.loot.length > 0) {
            embed.addFields({
              name: 'Loot',
              value: result.loot.map(l => `${l.name} x${l.quantity}`).join(', '),
              inline: false
            });
          }
          if (result.levelUp) {
            embed.addFields({ name: 'Level Up!', value: `You are now level ${result.newLevel}!`, inline: false });
          }
        } else {
          embed.setColor(0x000000);
          embed.setDescription(`Defeat! The **${result.enemy.name}** was too strong!`);
          embed.addFields({ name: 'Hint', value: 'Use /rest to recover your health.', inline: false });
        }
      } else {
        embed.setColor(0xffaa00);
      }

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('flee')
      .setDescription('Flee from the current battle'),
    async execute(interaction) {
      const player = await playerManager.getPlayer(interaction.user.id);
      if (!player) {
        return interaction.reply({ content: 'You need to use `/startadventure` first!', ephemeral: true });
      }

      const fled = await combatManager.fleeBattle(player.id);
      
      if (fled) {
        await interaction.reply({ content: 'You fled from battle!' });
      } else {
        await interaction.reply({ content: 'You are not in a battle!', ephemeral: true });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('gather')
      .setDescription('Gather resources from nodes')
      .addStringOption(option =>
        option.setName('resource')
          .setDescription('Resource to gather')
          .setRequired(true)
          .addChoices(
            { name: 'Wood (Woodcutting)', value: 'tree' },
            { name: 'Stone (Mining)', value: 'rock' },
            { name: 'Iron (Mining Lv.10)', value: 'iron_vein' },
            { name: 'Gold (Mining Lv.25)', value: 'gold_vein' },
            { name: 'Fish (Fishing)', value: 'fishing_spot' },
            { name: 'Herbs (Foraging)', value: 'herb_patch' }
          )),
    async execute(interaction) {
      const player = await playerManager.getPlayer(interaction.user.id);
      if (!player) {
        return interaction.reply({ content: 'You need to use `/startadventure` first!', ephemeral: true });
      }

      const nodeId = interaction.options.getString('resource');
      const [node] = await db.select().from(gatheringNodes).where(eq(gatheringNodes.id, nodeId)).limit(1);

      if (!node) {
        return interaction.reply({ content: 'Invalid resource!', ephemeral: true });
      }

      const skill = await playerManager.getPlayerSkill(player.id, node.requiredSkill);
      
      if (!skill || skill.level < node.requiredLevel) {
        return interaction.reply({ 
          content: `You need ${capitalize(node.requiredSkill)} level ${node.requiredLevel} to gather here!`, 
          ephemeral: true 
        });
      }

      const drops = node.itemDrops;
      const gatheredItems = [];

      for (const drop of drops) {
        const quantity = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
        await playerManager.addItem(player.id, drop.itemId, quantity);
        const [item] = await db.select().from(items).where(eq(items.id, drop.itemId)).limit(1);
        gatheredItems.push({ name: item?.name || drop.itemId, quantity });
      }

      const skillResult = await playerManager.addSkillExperience(player.id, node.requiredSkill, node.experienceReward);

      const embed = new EmbedBuilder()
        .setColor(0x228b22)
        .setTitle(`Gathered from ${node.name}`)
        .setDescription(gatheredItems.map(i => `+${i.quantity} ${i.name}`).join('\n'))
        .addFields(
          { name: `${capitalize(node.requiredSkill)} XP`, value: `+${node.experienceReward}`, inline: true }
        );

      if (skillResult?.leveledUp) {
        embed.addFields({ name: 'Level Up!', value: `${capitalize(node.requiredSkill)} is now level ${skillResult.level}!`, inline: false });
      }

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('craft')
      .setDescription('Craft items using materials')
      .addStringOption(option =>
        option.setName('item')
          .setDescription('Item to craft')
          .setRequired(true)),
    async execute(interaction) {
      const player = await playerManager.getPlayer(interaction.user.id);
      if (!player) {
        return interaction.reply({ content: 'You need to use `/startadventure` first!', ephemeral: true });
      }

      const itemName = interaction.options.getString('item').toLowerCase();
      const allRecipes = await db.select().from(recipes);
      const recipe = allRecipes.find(r => r.name.toLowerCase().includes(itemName));

      if (!recipe) {
        const recipeList = allRecipes.map(r => r.name).join(', ');
        return interaction.reply({ content: `Recipe not found! Available: ${recipeList}`, ephemeral: true });
      }

      if (recipe.requiredSkill) {
        const skill = await playerManager.getPlayerSkill(player.id, recipe.requiredSkill);
        if (!skill || skill.level < recipe.requiredLevel) {
          return interaction.reply({
            content: `You need ${capitalize(recipe.requiredSkill)} level ${recipe.requiredLevel} to craft this!`,
            ephemeral: true
          });
        }
      }

      const ingredients = recipe.ingredients;
      for (const ing of ingredients) {
        const invItem = await playerManager.getInventoryItem(player.id, ing.itemId);
        if (!invItem || invItem.quantity < ing.quantity) {
          const [item] = await db.select().from(items).where(eq(items.id, ing.itemId)).limit(1);
          return interaction.reply({
            content: `You need ${ing.quantity}x ${item?.name || ing.itemId} to craft this!`,
            ephemeral: true
          });
        }
      }

      for (const ing of ingredients) {
        await playerManager.removeItem(player.id, ing.itemId, ing.quantity);
      }

      await playerManager.addItem(player.id, recipe.resultItemId, recipe.resultQuantity);

      const [resultItem] = await db.select().from(items).where(eq(items.id, recipe.resultItemId)).limit(1);
      
      let skillResult = null;
      if (recipe.requiredSkill) {
        skillResult = await playerManager.addSkillExperience(player.id, recipe.requiredSkill, recipe.experienceReward);
      }

      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle('Crafting Success!')
        .setDescription(`You crafted ${recipe.resultQuantity}x **${resultItem?.name || recipe.resultItemId}**!`)
        .addFields(
          { name: 'Materials Used', value: ingredients.map(i => `${i.quantity}x ${i.itemId}`).join(', '), inline: false }
        );

      if (skillResult) {
        embed.addFields({ name: `${capitalize(recipe.requiredSkill)} XP`, value: `+${recipe.experienceReward}`, inline: true });
        if (skillResult.leveledUp) {
          embed.addFields({ name: 'Level Up!', value: `${capitalize(recipe.requiredSkill)} is now level ${skillResult.level}!`, inline: false });
        }
      }

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('recipes')
      .setDescription('View available crafting recipes'),
    async execute(interaction) {
      const allRecipes = await db.select().from(recipes);
      
      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle('Crafting Recipes')
        .setDescription(
          allRecipes.map(r => {
            const ings = r.ingredients.map(i => `${i.quantity}x ${i.itemId}`).join(' + ');
            const req = r.requiredSkill ? ` (${capitalize(r.requiredSkill)} Lv.${r.requiredLevel})` : '';
            return `**${r.name}**${req}\n${ings} => ${r.resultQuantity}x ${r.resultItemId}`;
          }).join('\n\n')
        );

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('rest')
      .setDescription('Rest to recover health (costs 10 gold)'),
    async execute(interaction) {
      const player = await playerManager.getPlayer(interaction.user.id);
      if (!player) {
        return interaction.reply({ content: 'You need to use `/startadventure` first!', ephemeral: true });
      }

      if (player.health >= player.maxHealth) {
        return interaction.reply({ content: 'You are already at full health!', ephemeral: true });
      }

      if (player.gold < 10) {
        return interaction.reply({ content: 'You need 10 gold to rest!', ephemeral: true });
      }

      await playerManager.removeGold(interaction.user.id, 10);
      await playerManager.healPlayer(interaction.user.id, player.maxHealth);

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('Rested!')
        .setDescription(`You rested and recovered to full health.\n-10 gold`);

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('use')
      .setDescription('Use a consumable item')
      .addStringOption(option =>
        option.setName('item')
          .setDescription('Item to use')
          .setRequired(true)),
    async execute(interaction) {
      const player = await playerManager.getPlayer(interaction.user.id);
      if (!player) {
        return interaction.reply({ content: 'You need to use `/startadventure` first!', ephemeral: true });
      }

      const itemName = interaction.options.getString('item').toLowerCase();
      const inv = await playerManager.getPlayerInventory(player.id);
      
      let foundItem = null;
      let foundInv = null;

      for (const invItem of inv) {
        const [item] = await db.select().from(items).where(eq(items.id, invItem.itemId)).limit(1);
        if (item && item.name.toLowerCase().includes(itemName) && item.type === 'consumable') {
          foundItem = item;
          foundInv = invItem;
          break;
        }
      }

      if (!foundItem) {
        return interaction.reply({ content: 'Consumable item not found in inventory!', ephemeral: true });
      }

      await playerManager.removeItem(player.id, foundItem.id, 1);

      let effect = '';
      if (foundItem.stats?.heal) {
        await playerManager.healPlayer(interaction.user.id, foundItem.stats.heal);
        effect = `Restored ${foundItem.stats.heal} HP`;
      }

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`Used ${foundItem.name}`)
        .setDescription(effect || 'Item used!');

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('enemies')
      .setDescription('View available enemies to hunt'),
    async execute(interaction) {
      const allEnemies = await db.select().from(enemies);
      
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Enemies')
        .setDescription(
          allEnemies.map(e => 
            `**${e.name}** (Lv.${e.level})\nHP: ${e.health} | ATK: ${e.attack} | DEF: ${e.defense}\nRewards: ${e.experienceReward} XP, ${e.goldReward} Gold`
          ).join('\n\n')
        );

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('gamehelp')
      .setDescription('View all game commands'),
    async execute(interaction) {
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Game Commands')
        .addFields(
          { name: 'Getting Started', value: '`/startadventure` - Create your character (choose race)\n`/playercard` - View complete character stats', inline: false },
          { name: 'Character', value: '`/profile` - Quick view of stats\n`/skills` - View skill levels\n`/inventory` - View items', inline: false },
          { name: 'Combat', value: '`/hunt [enemy]` - Fight enemies\n`/attack` - Attack in battle\n`/flee` - Escape battle\n`/enemies` - List enemies', inline: false },
          { name: 'Gathering', value: '`/gather <resource>` - Collect materials', inline: false },
          { name: 'Crafting', value: '`/craft <item>` - Craft items\n`/recipes` - View recipes', inline: false },
          { name: 'Other', value: '`/rest` - Recover HP (10g)\n`/use <item>` - Use consumable', inline: false }
        )
        .setFooter({ text: 'Idle rewards accumulate while offline (up to 24h)!' });

      await interaction.reply({ embeds: [embed] });
    },
  },
];

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function createProgressBar(current, max, length = 10) {
  const filled = Math.round((current / max) * length);
  const empty = length - filled;
  return '[' + '='.repeat(filled) + '-'.repeat(empty) + ']';
}

function getRarityEmoji(rarity) {
  const emojis = {
    common: '⚪',
    uncommon: '🟢',
    rare: '🔵',
    epic: '🟣',
    legendary: '🟠',
  };
  return emojis[rarity] || '⚪';
}

function getRaceColor(race) {
  const colors = {
    human: 0x3498db,
    undead: 0x2c3e50,
    ork: 0x27ae60,
    dwarf: 0xd35400,
    druid: 0x16a085,
    spirit: 0x9b59b6,
  };
  return colors[race] || 0x0099ff;
}
