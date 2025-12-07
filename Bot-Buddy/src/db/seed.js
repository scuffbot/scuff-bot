import { db } from './index.js';
import { items, enemies, gatheringNodes, recipes } from './schema.js';

export async function seedDatabase() {
  const existingItems = await db.select().from(items).limit(1);
  if (existingItems.length > 0) {
    console.log('Database already seeded.');
    return;
  }

  console.log('Seeding database...');

  await db.insert(items).values([
    { id: 'wood', name: 'Wood', description: 'Basic crafting material', type: 'material', rarity: 'common', value: 5 },
    { id: 'stone', name: 'Stone', description: 'Sturdy crafting material', type: 'material', rarity: 'common', value: 5 },
    { id: 'iron_ore', name: 'Iron Ore', description: 'Raw iron material', type: 'material', rarity: 'uncommon', value: 15 },
    { id: 'gold_ore', name: 'Gold Ore', description: 'Precious gold ore', type: 'material', rarity: 'rare', value: 50 },
    { id: 'fish', name: 'Fish', description: 'Fresh fish from the waters', type: 'material', rarity: 'common', value: 8 },
    { id: 'herb', name: 'Herb', description: 'Medicinal herb', type: 'material', rarity: 'common', value: 10 },
    { id: 'wooden_sword', name: 'Wooden Sword', description: 'A basic wooden sword', type: 'weapon', rarity: 'common', value: 25, stats: { attack: 5 } },
    { id: 'iron_sword', name: 'Iron Sword', description: 'A sturdy iron sword', type: 'weapon', rarity: 'uncommon', value: 100, stats: { attack: 15 } },
    { id: 'wooden_shield', name: 'Wooden Shield', description: 'Basic protection', type: 'armor', rarity: 'common', value: 20, stats: { defense: 3 } },
    { id: 'iron_shield', name: 'Iron Shield', description: 'Strong protection', type: 'armor', rarity: 'uncommon', value: 80, stats: { defense: 8 } },
    { id: 'health_potion', name: 'Health Potion', description: 'Restores 50 HP', type: 'consumable', rarity: 'common', value: 30, stats: { heal: 50 } },
    { id: 'cooked_fish', name: 'Cooked Fish', description: 'Restores 25 HP', type: 'consumable', rarity: 'common', value: 15, stats: { heal: 25 } },
  ]);

  await db.insert(enemies).values([
    { id: 'slime', name: 'Slime', level: 1, health: 30, attack: 3, defense: 1, experienceReward: 10, goldReward: 5, drops: [{ itemId: 'herb', chance: 0.3 }] },
    { id: 'goblin', name: 'Goblin', level: 3, health: 50, attack: 8, defense: 3, experienceReward: 25, goldReward: 15, drops: [{ itemId: 'gold_ore', chance: 0.1 }, { itemId: 'wood', chance: 0.5 }] },
    { id: 'wolf', name: 'Wolf', level: 5, health: 80, attack: 12, defense: 5, experienceReward: 40, goldReward: 20, drops: [{ itemId: 'herb', chance: 0.4 }] },
    { id: 'bandit', name: 'Bandit', level: 8, health: 120, attack: 18, defense: 8, experienceReward: 70, goldReward: 50, drops: [{ itemId: 'iron_ore', chance: 0.3 }, { itemId: 'health_potion', chance: 0.2 }] },
    { id: 'troll', name: 'Troll', level: 12, health: 200, attack: 25, defense: 12, experienceReward: 120, goldReward: 80, drops: [{ itemId: 'gold_ore', chance: 0.3 }, { itemId: 'iron_ore', chance: 0.5 }] },
  ]);

  await db.insert(gatheringNodes).values([
    { id: 'tree', name: 'Tree', type: 'woodcutting', requiredSkill: 'woodcutting', requiredLevel: 1, itemDrops: [{ itemId: 'wood', min: 1, max: 3 }], experienceReward: 5 },
    { id: 'rock', name: 'Rock', type: 'mining', requiredSkill: 'mining', requiredLevel: 1, itemDrops: [{ itemId: 'stone', min: 1, max: 3 }], experienceReward: 5 },
    { id: 'iron_vein', name: 'Iron Vein', type: 'mining', requiredSkill: 'mining', requiredLevel: 10, itemDrops: [{ itemId: 'iron_ore', min: 1, max: 2 }], experienceReward: 15 },
    { id: 'gold_vein', name: 'Gold Vein', type: 'mining', requiredSkill: 'mining', requiredLevel: 25, itemDrops: [{ itemId: 'gold_ore', min: 1, max: 2 }], experienceReward: 30 },
    { id: 'fishing_spot', name: 'Fishing Spot', type: 'fishing', requiredSkill: 'fishing', requiredLevel: 1, itemDrops: [{ itemId: 'fish', min: 1, max: 2 }], experienceReward: 8 },
    { id: 'herb_patch', name: 'Herb Patch', type: 'foraging', requiredSkill: 'foraging', requiredLevel: 1, itemDrops: [{ itemId: 'herb', min: 1, max: 2 }], experienceReward: 6 },
  ]);

  await db.insert(recipes).values([
    { id: 'wooden_sword', name: 'Wooden Sword', resultItemId: 'wooden_sword', resultQuantity: 1, requiredSkill: 'crafting', requiredLevel: 1, ingredients: [{ itemId: 'wood', quantity: 5 }], experienceReward: 15 },
    { id: 'wooden_shield', name: 'Wooden Shield', resultItemId: 'wooden_shield', resultQuantity: 1, requiredSkill: 'crafting', requiredLevel: 3, ingredients: [{ itemId: 'wood', quantity: 8 }], experienceReward: 20 },
    { id: 'iron_sword', name: 'Iron Sword', resultItemId: 'iron_sword', resultQuantity: 1, requiredSkill: 'crafting', requiredLevel: 15, ingredients: [{ itemId: 'iron_ore', quantity: 5 }, { itemId: 'wood', quantity: 2 }], experienceReward: 50 },
    { id: 'iron_shield', name: 'Iron Shield', resultItemId: 'iron_shield', resultQuantity: 1, requiredSkill: 'crafting', requiredLevel: 18, ingredients: [{ itemId: 'iron_ore', quantity: 8 }], experienceReward: 60 },
    { id: 'health_potion', name: 'Health Potion', resultItemId: 'health_potion', resultQuantity: 1, requiredSkill: 'crafting', requiredLevel: 5, ingredients: [{ itemId: 'herb', quantity: 3 }], experienceReward: 25 },
    { id: 'cooked_fish', name: 'Cooked Fish', resultItemId: 'cooked_fish', resultQuantity: 1, requiredSkill: 'cooking', requiredLevel: 1, ingredients: [{ itemId: 'fish', quantity: 1 }], experienceReward: 10 },
  ]);

  console.log('Database seeded successfully!');
}
