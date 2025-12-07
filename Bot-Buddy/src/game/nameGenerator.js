const prefixes = [
  'Aer', 'Bel', 'Cad', 'Dor', 'Eld', 'Fae', 'Gor', 'Hal', 'Ith', 'Jor',
  'Kel', 'Lor', 'Mal', 'Nor', 'Orn', 'Pel', 'Qar', 'Ral', 'Sar', 'Tal',
  'Uth', 'Val', 'Wor', 'Xan', 'Yar', 'Zor', 'Ash', 'Bor', 'Cor', 'Dun',
  'Fen', 'Grim', 'Hel', 'Ir', 'Jar', 'Kra', 'Lun', 'Mor', 'Nex', 'Orl',
  'Pyr', 'Rav', 'Syl', 'Thr', 'Uro', 'Vex', 'Wyl', 'Xyr', 'Yor', 'Zal',
  'Arn', 'Bry', 'Cyn', 'Dra', 'Eth', 'Fyn', 'Gal', 'Hyr', 'Isk', 'Jyn',
  'Kar', 'Lyn', 'Myr', 'Nyl', 'Oph', 'Pax', 'Ryn', 'Sev', 'Tor', 'Ulf'
];

const middles = [
  'an', 'en', 'in', 'on', 'ar', 'er', 'ir', 'or', 'al', 'el', 'il', 'ol',
  'as', 'es', 'is', 'os', 'ath', 'eth', 'ith', 'oth', 'ax', 'ex', 'ix', 'ox',
  'ad', 'ed', 'id', 'od', 'ak', 'ek', 'ik', 'ok', 'am', 'em', 'im', 'om',
  'av', 'ev', 'iv', 'ov', 'az', 'ez', 'iz', 'oz', 'aer', 'eer', 'ier', 'oer',
  '', '', '', ''
];

const suffixes = [
  'thor', 'mir', 'win', 'dor', 'ric', 'dan', 'gor', 'wyn', 'mund', 'vald',
  'sten', 'gard', 'helm', 'rik', 'born', 'heim', 'dal', 'gar', 'nir', 'ros',
  'ius', 'ael', 'ian', 'eon', 'ion', 'ius', 'ael', 'ias', 'ous', 'orn',
  'ak', 'uk', 'ik', 'ok', 'ash', 'ush', 'esh', 'osh', 'ax', 'ux', 'ex', 'ox',
  'ra', 're', 'ri', 'ro', 'la', 'le', 'li', 'lo', 'na', 'ne', 'ni', 'no',
  'wyn', 'wen', 'wyr', 'war', 'thas', 'this', 'thus', 'thon', 'drak', 'drek'
];

const racePrefixes = {
  human: ['Sir', 'Lord', 'Lady', 'Baron', ''],
  undead: ['Grave', 'Bone', 'Death', 'Shadow', 'Rot', ''],
  ork: ['Grom', 'Throk', 'Mok', 'Gul', 'Zug', ''],
  dwarf: ['Stone', 'Iron', 'Gold', 'Hammer', 'Forge', ''],
  druid: ['Oak', 'Thorn', 'Moss', 'Fern', 'Root', ''],
  spirit: ['Mist', 'Echo', 'Wisp', 'Shade', 'Aura', '']
};

const raceSuffixes = {
  human: ['the Brave', 'the Just', 'the Bold', ''],
  undead: ['bane', 'wraith', 'shade', 'hollow', ''],
  ork: ['skull', 'fang', 'claw', 'maw', ''],
  dwarf: ['beard', 'hammer', 'anvil', 'pick', ''],
  druid: ['leaf', 'branch', 'grove', 'bloom', ''],
  spirit: ['essence', 'void', 'ether', 'veil', '']
};

const offensivePatterns = [
  /nig/i, /fag/i, /cunt/i, /shit/i, /fuck/i, /cock/i, /dick/i, /pussy/i,
  /ass(?!h)/i, /bitch/i, /whore/i, /slut/i, /rape/i, /nazi/i, /kike/i,
  /spic/i, /chink/i, /gook/i, /wetback/i, /beaner/i, /cracker/i, /honky/i,
  /jap(?!an)/i, /retard/i, /tard/i, /sperg/i, /autis/i, /mongo/i,
  /pedo/i, /molest/i, /incest/i, /bestiality/i, /necro/i
];

function isOffensive(name) {
  const lowerName = name.toLowerCase().replace(/[^a-z]/g, '');
  return offensivePatterns.some(pattern => pattern.test(lowerName));
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateCharacterName(race) {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    const prefix = randomElement(prefixes);
    const middle = randomElement(middles);
    const suffix = randomElement(suffixes);
    
    let baseName = prefix + middle + suffix;
    baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    
    const racePrefix = randomElement(racePrefixes[race] || ['']);
    const raceSuffix = randomElement(raceSuffixes[race] || ['']);
    
    let fullName = baseName;
    if (racePrefix) {
      fullName = racePrefix + ' ' + baseName;
    }
    if (raceSuffix && !raceSuffix.startsWith('the')) {
      fullName = fullName + raceSuffix;
    } else if (raceSuffix) {
      fullName = fullName + ' ' + raceSuffix;
    }
    
    if (!isOffensive(fullName)) {
      return fullName;
    }
  }
  
  return `Adventurer${Math.floor(Math.random() * 10000)}`;
}

export const RACES = ['human', 'undead', 'ork', 'dwarf', 'druid', 'spirit'];

export const RACE_DESCRIPTIONS = {
  human: 'Versatile and adaptable, humans excel in all pursuits.',
  undead: 'Risen from death, the undead possess dark resilience.',
  ork: 'Fierce warriors with unmatched strength and brutality.',
  dwarf: 'Stout and hardy, masters of mining and craftsmanship.',
  druid: 'One with nature, wielding the power of the wild.',
  spirit: 'Ethereal beings with mystical magical abilities.'
};

export const COMBAT_STATS = [
  'health', 'attack', 'strength', 'defense', 'range', 'magic', 'prayer', 'stamina', 'luck'
];

export const SKILL_LIST = [
  'mining', 'blacksmithing', 'crafting', 'woodcutting', 'woodworking',
  'fishing', 'cooking', 'exploring', 'summoning', 'construction'
];
