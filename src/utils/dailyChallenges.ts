import { ChallengeEvent, DailyChallengeState, DailyChallengeTask } from '../types/game';

const DAILY_STORAGE_KEY = 'cyber_trench_daily_v1';

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function nextRand(state: { seed: number }): number {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

const BUCKET_ECONOMY: Omit<DailyChallengeTask, 'id'>[] = [
  {
    type: 'collect_gold',
    title: 'Gold Rush',
    description: 'Collect 500 gold across any runs today.',
    target: 500,
    rewardGold: 350,
  },
  {
    type: 'collect_gold',
    title: 'Neon Vault',
    description: 'Collect 1,200 gold across any runs today.',
    target: 1200,
    rewardGold: 600,
  },
  {
    type: 'activate_powers',
    title: 'Overclocked Core',
    description: 'Activate special avatar powers 3 times.',
    target: 3,
    rewardGold: 350,
  },
  {
    type: 'collect_stars',
    title: 'Star Seeker',
    description: 'Collect 3 Sector Stars in handcrafted courses.',
    target: 3,
    rewardGold: 450,
  },
];

const BUCKET_PRECISION: Omit<DailyChallengeTask, 'id'>[] = [
  {
    type: 'infinity_sectors',
    title: 'Unbroken Surge',
    description: 'Clear 2 sectors without crashing in Infinity Mode.',
    target: 2,
    rewardGold: 650,
    unitLabel: 'sectors',
  },
  {
    type: 'near_misses',
    title: "Razor's Edge",
    description: 'Trigger 5 Near-Miss adrenaline bonuses.',
    target: 5,
    rewardGold: 450,
  },
  {
    type: 'infinity_distance',
    title: 'Deep Trench Runner',
    description: 'Reach 350m in a single Infinity Mode run.',
    target: 350,
    rewardGold: 500,
    unitLabel: 'm',
  },
];

const BUCKET_MASTERY: Omit<DailyChallengeTask, 'id'>[] = [
  {
    type: 'complete_course',
    title: 'Course Finisher',
    description: 'Complete 1 handcrafted course in any mode.',
    target: 1,
    rewardGold: 400,
  },
  {
    type: 'complete_course',
    title: 'Double Circuit',
    description: 'Complete 2 handcrafted courses today.',
    target: 2,
    rewardGold: 650,
  },
  {
    type: 'special_mode_clear',
    title: 'Gravity & Grit',
    description: 'Complete a course in Gravity Flip or Hardcore mode.',
    target: 1,
    rewardGold: 750,
  },
];

export function generateDailyTasks(dateKey: string): DailyChallengeTask[] {
  const rng = { seed: hashSeed(`cyber_trench_${dateKey}`) };

  const pick = (pool: Omit<DailyChallengeTask, 'id'>[], slot: number): DailyChallengeTask => {
    const idx = Math.floor(nextRand(rng) * pool.length);
    const chosen = pool[idx];
    return {
      ...chosen,
      id: `${dateKey}_slot${slot}_${chosen.type}`,
    };
  };

  return [
    pick(BUCKET_ECONOMY, 0),
    pick(BUCKET_PRECISION, 1),
    pick(BUCKET_MASTERY, 2),
  ];
}

export function loadOrCreateDailyState(dateKey = getLocalDateKey()): DailyChallengeState {
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DailyChallengeState>;
      if (parsed.dateKey === dateKey && Array.isArray(parsed.tasks) && parsed.tasks.length === 3) {
        return {
          dateKey,
          tasks: parsed.tasks,
          progress: parsed.progress ?? {},
          claimedIds: Array.isArray(parsed.claimedIds) ? parsed.claimedIds : [],
        };
      }
    }
  } catch {
    // Ignore storage parse failures
  }

  const fresh: DailyChallengeState = {
    dateKey,
    tasks: generateDailyTasks(dateKey),
    progress: {},
    claimedIds: [],
  };
  saveDailyState(fresh);
  return fresh;
}

export function saveDailyState(state: DailyChallengeState): void {
  try {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function applyChallengeEvent(
  state: DailyChallengeState,
  event: ChallengeEvent
): { nextState: DailyChallengeState; newlyCompleted: DailyChallengeTask[] } {
  const today = getLocalDateKey();
  const base = state.dateKey === today ? state : loadOrCreateDailyState(today);

  let changed = false;
  const nextProgress = { ...base.progress };
  const newlyCompleted: DailyChallengeTask[] = [];

  for (const task of base.tasks) {
    const prevVal = nextProgress[task.id] ?? 0;
    if (prevVal >= task.target) continue;

    let updatedVal = prevVal;

    switch (task.type) {
      case 'collect_gold':
        if (event.goldEarned && event.goldEarned > 0) {
          updatedVal = Math.min(task.target, prevVal + event.goldEarned);
        }
        break;
      case 'near_misses':
        if (event.nearMisses && event.nearMisses > 0) {
          updatedVal = Math.min(task.target, prevVal + event.nearMisses);
        }
        break;
      case 'activate_powers':
        if (event.powersActivated && event.powersActivated > 0) {
          updatedVal = Math.min(task.target, prevVal + event.powersActivated);
        }
        break;
      case 'collect_stars':
        if (event.starsCollected && event.starsCollected > 0) {
          updatedVal = Math.min(task.target, prevVal + event.starsCollected);
        }
        break;
      case 'infinity_sectors':
        if (event.sectorsClearedInRun && event.sectorsClearedInRun > prevVal) {
          updatedVal = Math.min(task.target, event.sectorsClearedInRun);
        }
        break;
      case 'infinity_distance':
        if (event.infinityDistanceInRun && event.infinityDistanceInRun > prevVal) {
          updatedVal = Math.min(task.target, event.infinityDistanceInRun);
        }
        break;
      case 'complete_course':
        if (event.courseCompletedMode) {
          updatedVal = Math.min(task.target, prevVal + 1);
        }
        break;
      case 'special_mode_clear':
        if (
          event.courseCompletedMode === 'inverted' ||
          event.courseCompletedMode === 'hardcore'
        ) {
          updatedVal = Math.min(task.target, prevVal + 1);
        }
        break;
    }

    if (updatedVal !== prevVal) {
      nextProgress[task.id] = updatedVal;
      changed = true;
      if (updatedVal >= task.target) {
        newlyCompleted.push(task);
      }
    }
  }

  if (!changed) {
    return { nextState: base, newlyCompleted: [] };
  }

  const nextState: DailyChallengeState = {
    ...base,
    progress: nextProgress,
  };
  saveDailyState(nextState);
  return { nextState, newlyCompleted };
}
