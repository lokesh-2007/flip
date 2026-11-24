import {
  AdvancementDefinition,
  AdvancementsState,
  CareerStats,
  ChallengeEvent,
  UpgradeDefinition,
  UpgradeId,
  UpgradeLevels,
} from '../types/game';

const UPGRADES_STORAGE_KEY = 'cyber_trench_upgrades_v1';
const ADVANCEMENTS_STORAGE_KEY = 'cyber_trench_advancements_v1';

export const DEFAULT_UPGRADES: UpgradeLevels = {
  capacitor: 0,
  plating: 0,
  collector: 0,
  stabilizer: 0,
};

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: 'capacitor',
    name: 'Capacitor Overclock',
    description: 'Boosts passive and gold-fueled special power recharge rate.',
    effectPerLevel: '+14% Charge Rate / Lv',
    maxLevel: 5,
    baseCost: 400,
    costMultiplier: 1.75,
  },
  {
    id: 'plating',
    name: 'Reinforced Hull Plating',
    description: 'Extends defensive power durations and post-impact invulnerability windows.',
    effectPerLevel: '+0.7s Shield & +0.25s Invuln / Lv',
    maxLevel: 5,
    baseCost: 450,
    costMultiplier: 1.8,
  },
  {
    id: 'collector',
    name: 'Magnetic Collector Array',
    description: 'Widens passive collectible pickup radius and increases all Gold yields.',
    effectPerLevel: '+0.14m Reach & +8% Gold / Lv',
    maxLevel: 5,
    baseCost: 350,
    costMultiplier: 1.75,
  },
  {
    id: 'stabilizer',
    name: 'Event Stabilizer Core',
    description: 'Shortens disruptive Glitch/Gravity storms and recharges power when storms end.',
    effectPerLevel: '-8% Storm Dur & +15% Charge / Lv',
    maxLevel: 5,
    baseCost: 500,
    costMultiplier: 1.8,
  },
];

export function getUpgradeCost(upgrade: UpgradeDefinition, currentLevel: number): number {
  if (currentLevel >= upgrade.maxLevel) return 0;
  return Math.round((upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel)) / 25) * 25;
}

export function loadUpgradeLevels(): UpgradeLevels {
  try {
    const raw = localStorage.getItem(UPGRADES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UpgradeLevels>;
      return {
        capacitor: clampLv(parsed.capacitor),
        plating: clampLv(parsed.plating),
        collector: clampLv(parsed.collector),
        stabilizer: clampLv(parsed.stabilizer),
      };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...DEFAULT_UPGRADES };
}

function clampLv(val: unknown): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(5, Math.floor(val)));
}

export function saveUpgradeLevels(levels: UpgradeLevels): void {
  try {
    localStorage.setItem(UPGRADES_STORAGE_KEY, JSON.stringify(levels));
  } catch {
    // Ignore storage errors
  }
}

export const ADVANCEMENTS: AdvancementDefinition[] = [
  {
    id: 'adv_first_clear',
    title: 'Trench Initiate',
    description: 'Complete 1 handcrafted course in any mode.',
    category: 'flight',
    target: 1,
    rewardGold: 400,
  },
  {
    id: 'adv_star_hunter',
    title: 'Stellar Harvester',
    description: 'Collect 9 Sector Stars across handcrafted courses.',
    category: 'mastery',
    target: 9,
    rewardGold: 650,
    unitLabel: 'stars',
  },
  {
    id: 'adv_near_miss_pro',
    title: 'Razor Reflex',
    description: 'Trigger 20 Near-Miss adrenaline bonuses.',
    category: 'flight',
    target: 20,
    rewardGold: 600,
  },
  {
    id: 'adv_storm_survivor',
    title: 'Stormproof Pilot',
    description: 'Survive 5 random Environmental Events without crashing.',
    category: 'defense',
    target: 5,
    rewardGold: 750,
    unitLabel: 'events',
  },
  {
    id: 'adv_warp_ace',
    title: 'Spatial Diver',
    description: 'Pass through 10 Warp Gate portals.',
    category: 'flight',
    target: 10,
    rewardGold: 600,
    unitLabel: 'gates',
  },
  {
    id: 'adv_shield_wall',
    title: 'Unbreakable Bulwark',
    description: 'Absorb 5 hazard impacts using Defensive Avatar barriers.',
    category: 'defense',
    target: 5,
    rewardGold: 800,
    unitLabel: 'hits',
  },
  {
    id: 'adv_demolition',
    title: 'Grid Breaker',
    description: 'Shatter 25 hazards using active craft powers.',
    category: 'mastery',
    target: 25,
    rewardGold: 750,
  },
  {
    id: 'adv_infinity_4',
    title: 'Abyssal Voyager',
    description: 'Reach Sector 04 in Infinity Mode.',
    category: 'mastery',
    target: 4,
    rewardGold: 900,
    unitLabel: 'sector',
  },
  {
    id: 'adv_special_mode',
    title: 'Anomaly Master',
    description: 'Complete 2 courses in Gravity Flip or Hardcore mode.',
    category: 'mastery',
    target: 2,
    rewardGold: 1000,
  },
  {
    id: 'adv_tech_master',
    title: 'Chief Engineer',
    description: 'Upgrade any Craft System module to Level 3.',
    category: 'tech',
    target: 3,
    rewardGold: 850,
    unitLabel: 'lv',
  },
];

const DEFAULT_STATS: CareerStats = {
  coursesCompleted: 0,
  specialModeClears: 0,
  starsCollected: 0,
  nearMisses: 0,
  eventsSurvived: 0,
  warpGatesCleared: 0,
  shieldsAbsorbed: 0,
  hazardsShattered: 0,
  bestEndlessSector: 1,
  maxUpgradeLevel: 0,
};

export function loadAdvancementsState(): AdvancementsState {
  try {
    const raw = localStorage.getItem(ADVANCEMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AdvancementsState>;
      return {
        stats: {
          ...DEFAULT_STATS,
          ...(parsed.stats ?? {}),
        },
        claimedIds: Array.isArray(parsed.claimedIds) ? parsed.claimedIds : [],
      };
    }
  } catch {
    // Ignore parse errors
  }
  return {
    stats: { ...DEFAULT_STATS },
    claimedIds: [],
  };
}

export function saveAdvancementsState(state: AdvancementsState): void {
  try {
    localStorage.setItem(ADVANCEMENTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function getStatForAdvancement(adv: AdvancementDefinition, stats: CareerStats): number {
  switch (adv.id) {
    case 'adv_first_clear':
      return stats.coursesCompleted;
    case 'adv_star_hunter':
      return stats.starsCollected;
    case 'adv_near_miss_pro':
      return stats.nearMisses;
    case 'adv_storm_survivor':
      return stats.eventsSurvived;
    case 'adv_warp_ace':
      return stats.warpGatesCleared;
    case 'adv_shield_wall':
      return stats.shieldsAbsorbed;
    case 'adv_demolition':
      return stats.hazardsShattered;
    case 'adv_infinity_4':
      return stats.bestEndlessSector;
    case 'adv_special_mode':
      return stats.specialModeClears;
    case 'adv_tech_master':
      return stats.maxUpgradeLevel;
    default:
      return 0;
  }
}

export function applyCareerEvent(
  prev: AdvancementsState,
  event: ChallengeEvent,
  upgrades: UpgradeLevels
): { nextState: AdvancementsState; newlyUnlocked: AdvancementDefinition[] } {
  const maxUpgrade = Math.max(
    upgrades.capacitor,
    upgrades.plating,
    upgrades.collector,
    upgrades.stabilizer
  );

  const nextStats: CareerStats = {
    coursesCompleted: prev.stats.coursesCompleted + (event.courseCompletedMode ? 1 : 0),
    specialModeClears:
      prev.stats.specialModeClears +
      (event.courseCompletedMode === 'inverted' || event.courseCompletedMode === 'hardcore' ? 1 : 0),
    starsCollected: prev.stats.starsCollected + (event.starsCollected ?? 0),
    nearMisses: prev.stats.nearMisses + (event.nearMisses ?? 0),
    eventsSurvived: prev.stats.eventsSurvived + (event.eventsSurvived ?? 0),
    warpGatesCleared: prev.stats.warpGatesCleared + (event.warpGatesCleared ?? 0),
    shieldsAbsorbed: prev.stats.shieldsAbsorbed + (event.shieldsAbsorbed ?? 0),
    hazardsShattered: prev.stats.hazardsShattered + (event.hazardsShattered ?? 0),
    bestEndlessSector: Math.max(
      prev.stats.bestEndlessSector,
      event.sectorsClearedInRun ? event.sectorsClearedInRun + 1 : 1
    ),
    maxUpgradeLevel: Math.max(prev.stats.maxUpgradeLevel, maxUpgrade),
  };

  const newlyUnlocked: AdvancementDefinition[] = [];
  for (const adv of ADVANCEMENTS) {
    const before = getStatForAdvancement(adv, prev.stats);
    const after = getStatForAdvancement(adv, nextStats);
    if (before < adv.target && after >= adv.target && !prev.claimedIds.includes(adv.id)) {
      newlyUnlocked.push(adv);
    }
  }

  const nextState: AdvancementsState = {
    ...prev,
    stats: nextStats,
  };
  saveAdvancementsState(nextState);
  return { nextState, newlyUnlocked };
}

export function getMaxUpgradeLevel(upgrades: UpgradeLevels): UpgradeId extends never ? number : number {
  return Math.max(upgrades.capacitor, upgrades.plating, upgrades.collector, upgrades.stabilizer);
}
