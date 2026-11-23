import { CollectibleItem, CraftSkin, LevelDefinition } from '../types/game';

export const TRACK_FLOOR_Y = 0;
export const TRACK_CEILING_Y = 12;
export const PLAY_MIN_Y = 0.55;
export const PLAY_MAX_Y = 11.45;
export const WAVE_ANGLE_DEG = 42;
export const WAVE_SLOPE = Math.tan((WAVE_ANGLE_DEG * Math.PI) / 180); // ~0.9004

export const CRAFT_SKINS: CraftSkin[] = [
  {
    id: 'cyan-pulse',
    name: 'Cyan Core',
    coreColor: 0x00f5d4,
    trailColor: 0x22d3ee,
    cssSwatch: '#22d3ee',
    unlockGold: 0,
  },
  {
    id: 'solar-amber',
    name: 'Solar Flare',
    coreColor: 0xfbbf24,
    trailColor: 0xf59e0b,
    cssSwatch: '#f59e0b',
    unlockGold: 2500,
  },
  {
    id: 'hyper-violet',
    name: 'Prism Violet',
    coreColor: 0xe879f9,
    trailColor: 0xc026d3,
    cssSwatch: '#e879f9',
    unlockGold: 6000,
  },
  {
    id: 'crimson-apex',
    name: 'Apex Nova',
    coreColor: 0xfb7185,
    trailColor: 0xf43f5e,
    cssSwatch: '#fb7185',
    unlockGold: 11000,
  },
];

let uid = 0;
function nextId(prefix: string): string {
  uid += 1;
  return `${prefix}_${uid}`;
}

function goldLine(zStart: number, yStart: number, zEnd: number, yEnd: number, count: number, value = 100): CollectibleItem[] {
  const items: CollectibleItem[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    items.push({
      id: nextId('g'),
      type: 'gold',
      z: zStart + (zEnd - zStart) * t,
      y: yStart + (yEnd - yStart) * t,
      value,
    });
  }
  return items;
}

function goldDiamond(zCenter: number, yCenter: number, spreadZ = 1.6, spreadY = 1.3, value = 120): CollectibleItem[] {
  return [
    { id: nextId('g'), type: 'gold', z: zCenter - spreadZ, y: yCenter, value },
    { id: nextId('g'), type: 'gold', z: zCenter, y: yCenter + spreadY, value },
    { id: nextId('g'), type: 'gold', z: zCenter + spreadZ, y: yCenter, value },
    { id: nextId('g'), type: 'gold', z: zCenter, y: yCenter - spreadY, value },
    { id: nextId('g'), type: 'gold', z: zCenter, y: yCenter, value: value * 1.5 },
  ];
}

function goldTriangle(zCenter: number, yBase: number, pointingUp = true, value = 110): CollectibleItem[] {
  const dir = pointingUp ? 1 : -1;
  return [
    { id: nextId('g'), type: 'gold', z: zCenter - 1.5, y: yBase, value },
    { id: nextId('g'), type: 'gold', z: zCenter, y: yBase, value },
    { id: nextId('g'), type: 'gold', z: zCenter + 1.5, y: yBase, value },
    { id: nextId('g'), type: 'gold', z: zCenter - 0.75, y: yBase + 1.15 * dir, value },
    { id: nextId('g'), type: 'gold', z: zCenter + 0.75, y: yBase + 1.15 * dir, value },
    { id: nextId('g'), type: 'gold', z: zCenter, y: yBase + 2.3 * dir, value: value * 1.5 },
  ];
}

function goldZigzag(zStart: number, yLow: number, yHigh: number, stepZ: number, peaks: number, value = 100): CollectibleItem[] {
  const items: CollectibleItem[] = [];
  for (let i = 0; i < peaks; i++) {
    const zA = zStart + i * stepZ * 2;
    const zB = zA + stepZ;
    const zC = zB + stepZ;
    items.push(...goldLine(zA, yLow, zB, yHigh, 3, value));
    if (i < peaks - 1) {
      items.push(...goldLine(zB + stepZ * 0.33, yHigh - (yHigh - yLow) * 0.33, zC - stepZ * 0.33, yLow + (yHigh - yLow) * 0.33, 2, value));
    }
  }
  return items;
}

export const LEVELS: LevelDefinition[] = [
  {
    id: 'level-1',
    number: 1,
    name: 'Neon Horizon',
    subtitle: 'Learn the 42° ascent and dive rhythm',
    difficulty: 'Initiate',
    baseSpeed: 13.0,
    length: 285,
    theme: {
      accentHex: 0x06b6d4,
      hazardHex: 0xf43f5e,
      trenchGlowHex: 0x38bdf8,
      fogHex: 0x070c22,
      label: 'Cyan Trench',
    },
    checkpoints: [
      { id: 'cp1_1', z: 145, safeY: 6.0 },
    ],
    obstacles: [
      // Warmup lower block -> climb over
      { id: 'l1_b1', type: 'block', z: 38, y: 2.3, width: 4.0, height: 4.6, shape: 'rect' },
      // Upper T-block -> dive under
      { id: 'l1_b2', type: 'block', z: 68, y: 9.2, width: 6.0, height: 4.6, shape: 'tTop' },
      // Floor spikes section with clear upper lane
      { id: 'l1_s1', type: 'spikes', zStart: 88, zEnd: 108, placement: 'floor', height: 1.5 },
      // Mid spinning saw -> choose upper or lower lane
      { id: 'l1_saw1', type: 'saw', z: 126, y: 6.0, radius: 1.65, spinSpeed: 3.2 },
      // Ceiling spikes after checkpoint
      { id: 'l1_s2', type: 'spikes', zStart: 162, zEnd: 184, placement: 'ceiling', height: 1.5 },
      // Twin gate blocks (wide 4.8-unit center window)
      { id: 'l1_g1_top', type: 'block', z: 202, y: 10.2, width: 3.8, height: 3.6, shape: 'rect' },
      { id: 'l1_g1_bot', type: 'block', z: 202, y: 1.8, width: 3.8, height: 3.6, shape: 'rect' },
      // Staggered saws near finish
      { id: 'l1_saw2', type: 'saw', z: 232, y: 8.4, radius: 1.5, spinSpeed: -3.5 },
      { id: 'l1_saw3', type: 'saw', z: 252, y: 3.6, radius: 1.5, spinSpeed: 3.5 },
    ],
    collectibles: [
      ...goldLine(14, 5.5, 24, 9.2, 5),
      ...goldTriangle(38, 6.2, true),
      ...goldLine(52, 8.2, 62, 4.4, 4),
      { id: 'l1_star1', type: 'star', z: 68, y: 3.2, value: 500, starIndex: 0 },
      ...goldLine(88, 6.8, 108, 6.8, 6),
      ...goldDiamond(126, 9.4),
      { id: 'l1_star2', type: 'star', z: 173, y: 8.8, value: 500, starIndex: 1 },
      ...goldLine(190, 6.0, 214, 6.0, 5),
      ...goldTriangle(232, 3.0, true),
      { id: 'l1_star3', type: 'star', z: 252, y: 8.4, value: 500, starIndex: 2 },
      ...goldLine(262, 6.0, 276, 6.0, 4, 150),
    ],
  },

  {
    id: 'level-2',
    number: 2,
    name: 'Cyber Trench',
    subtitle: 'Alternating sawtooth walls and T-block slaloms',
    difficulty: 'Adept',
    baseSpeed: 13.8,
    length: 365,
    theme: {
      accentHex: 0x3b82f6,
      hazardHex: 0xec4899,
      trenchGlowHex: 0x60a5fa,
      fogHex: 0x070a24,
      label: 'Cobalt Canyon',
    },
    checkpoints: [
      { id: 'cp2_1', z: 122, safeY: 6.0 },
      { id: 'cp2_2', z: 244, safeY: 6.0 },
    ],
    obstacles: [
      // Opening slalom T-blocks
      { id: 'l2_b1', type: 'block', z: 32, y: 9.4, width: 5.5, height: 4.6, shape: 'tTop' },
      { id: 'l2_b2', type: 'block', z: 54, y: 2.6, width: 5.5, height: 4.6, shape: 'tBottom' },
      // Floor + ceiling alternating spikes with middle saw
      { id: 'l2_sp1', type: 'spikes', zStart: 72, zEnd: 94, placement: 'floor', height: 1.6 },
      { id: 'l2_saw1', type: 'saw', z: 83, y: 8.8, radius: 1.55, spinSpeed: 3.8 },
      { id: 'l2_sp2', type: 'spikes', zStart: 98, zEnd: 114, placement: 'ceiling', height: 1.6 },
      // Section 2: Twin offset saws
      { id: 'l2_saw2', type: 'saw', z: 144, y: 4.2, radius: 1.7, spinSpeed: -4.0 },
      { id: 'l2_saw3', type: 'saw', z: 164, y: 8.2, radius: 1.7, spinSpeed: 4.0 },
      // Narrow gate window
      { id: 'l2_g1_t', type: 'block', z: 188, y: 10.3, width: 4.2, height: 3.4, shape: 'rect' },
      { id: 'l2_g1_b', type: 'block', z: 188, y: 1.7, width: 4.2, height: 3.4, shape: 'rect' },
      // Center block split
      { id: 'l2_mid', type: 'block', z: 218, y: 6.0, width: 5.2, height: 3.4, shape: 'rect' },
      { id: 'l2_sp3', type: 'spikes', zStart: 212, zEnd: 226, placement: 'floor', height: 1.4 },
      // Section 3: Star mine debut + final saw corridor
      { id: 'l2_sm1', type: 'starMine', z: 268, y: 6.0, radius: 1.6, spinSpeed: 3.2 },
      { id: 'l2_sp4', type: 'spikes', zStart: 286, zEnd: 312, placement: 'ceiling', height: 1.6 },
      { id: 'l2_b3', type: 'block', z: 299, y: 2.3, width: 4.8, height: 4.2, shape: 'tBottom' },
      { id: 'l2_saw4', type: 'saw', z: 332, y: 7.5, radius: 1.75, spinSpeed: -4.2 },
      { id: 'l2_saw5', type: 'saw', z: 332, y: 2.4, radius: 1.35, spinSpeed: 4.2 },
    ],
    collectibles: [
      ...goldLine(16, 4.5, 28, 3.0, 4),
      ...goldLine(38, 3.5, 50, 8.2, 4),
      { id: 'l2_star1', type: 'star', z: 83, y: 4.2, value: 600, starIndex: 0 },
      ...goldDiamond(106, 5.2),
      ...goldZigzag(136, 3.5, 8.8, 12, 2),
      ...goldLine(176, 6.0, 200, 6.0, 5),
      { id: 'l2_star2', type: 'star', z: 218, y: 9.8, value: 600, starIndex: 1 },
      ...goldTriangle(268, 8.6, false),
      ...goldLine(288, 6.8, 310, 6.8, 5),
      { id: 'l2_star3', type: 'star', z: 332, y: 4.9, value: 600, starIndex: 2 },
      ...goldLine(344, 6.0, 358, 6.0, 4, 150),
    ],
  },

  {
    id: 'level-3',
    number: 3,
    name: 'Shuriken Canyon',
    subtitle: '4-point star mines and Overdrive speed gate',
    difficulty: 'Expert',
    baseSpeed: 14.2,
    length: 440,
    theme: {
      accentHex: 0xa855f7,
      hazardHex: 0xf43f5e,
      trenchGlowHex: 0xc084fc,
      fogHex: 0x0b0824,
      label: 'Violet Void',
    },
    checkpoints: [
      { id: 'cp3_1', z: 145, safeY: 6.0 },
      { id: 'cp3_2', z: 295, safeY: 6.0 },
    ],
    obstacles: [
      // Star mine wave field
      { id: 'l3_sm1', type: 'starMine', z: 34, y: 4.5, radius: 1.6, spinSpeed: 3.6 },
      { id: 'l3_sm2', type: 'starMine', z: 54, y: 8.2, radius: 1.6, spinSpeed: -3.6 },
      { id: 'l3_sm3', type: 'starMine', z: 74, y: 4.0, radius: 1.6, spinSpeed: 3.6 },
      // Floor & ceiling pinch with upper gap
      { id: 'l3_sp1', type: 'spikes', zStart: 92, zEnd: 120, placement: 'floor', height: 1.7 },
      { id: 'l3_b1', type: 'block', z: 106, y: 9.8, width: 5.5, height: 3.6, shape: 'tTop' },
      { id: 'l3_saw1', type: 'saw', z: 128, y: 6.0, radius: 1.65, spinSpeed: 4.0 },
      // Overdrive speed gate (1.25x)
      { id: 'l3_sg1', type: 'speedGate', z: 162, multiplier: 1.25 },
      // Fast overdrive wide-flow obstacles
      { id: 'l3_b2', type: 'block', z: 190, y: 2.2, width: 4.5, height: 4.4, shape: 'rect' },
      { id: 'l3_b3', type: 'block', z: 218, y: 9.8, width: 4.5, height: 4.4, shape: 'rect' },
      { id: 'l3_sm4', type: 'starMine', z: 246, y: 5.8, radius: 1.75, spinSpeed: -4.2 },
      { id: 'l3_sp2', type: 'spikes', zStart: 262, zEnd: 282, placement: 'ceiling', height: 1.7 },
      // Normalize speed at checkpoint 2
      { id: 'l3_sg2', type: 'speedGate', z: 298, multiplier: 1.0 },
      // Precision T-gate weave
      { id: 'l3_b4', type: 'block', z: 326, y: 9.0, width: 6.0, height: 4.8, shape: 'tTop' },
      { id: 'l3_sp3', type: 'spikes', zStart: 320, zEnd: 342, placement: 'floor', height: 1.4 },
      { id: 'l3_saw2', type: 'saw', z: 360, y: 4.2, radius: 1.75, spinSpeed: 4.5 },
      { id: 'l3_sm5', type: 'starMine', z: 382, y: 8.4, radius: 1.7, spinSpeed: -4.5 },
      { id: 'l3_g_t', type: 'block', z: 406, y: 10.1, width: 4.0, height: 3.8, shape: 'rect' },
      { id: 'l3_g_b', type: 'block', z: 406, y: 1.9, width: 4.0, height: 3.8, shape: 'rect' },
    ],
    collectibles: [
      ...goldLine(24, 7.5, 44, 7.5, 4),
      ...goldLine(48, 3.8, 66, 3.8, 4),
      { id: 'l3_star1', type: 'star', z: 74, y: 9.0, value: 750, starIndex: 0 },
      ...goldDiamond(106, 4.8),
      ...goldLine(170, 6.0, 188, 8.2, 4),
      ...goldLine(196, 7.6, 214, 4.0, 4),
      { id: 'l3_star2', type: 'star', z: 246, y: 9.5, value: 750, starIndex: 1 },
      ...goldTriangle(272, 3.2, true),
      ...goldLine(318, 4.4, 336, 4.4, 4),
      { id: 'l3_star3', type: 'star', z: 382, y: 3.5, value: 750, starIndex: 2 },
      ...goldLine(396, 6.0, 428, 6.0, 6, 160),
    ],
  },

  {
    id: 'level-4',
    number: 4,
    name: 'Prism Gauntlet',
    subtitle: 'High-precision wave threading & dual star-mine corridors',
    difficulty: 'Master',
    baseSpeed: 14.6,
    length: 510,
    theme: {
      accentHex: 0x10b981,
      hazardHex: 0xf97316,
      trenchGlowHex: 0x34d399,
      fogHex: 0x05141c,
      label: 'Emerald Reactor',
    },
    checkpoints: [
      { id: 'cp4_1', z: 128, safeY: 6.0 },
      { id: 'cp4_2', z: 256, safeY: 6.0 },
      { id: 'cp4_3', z: 384, safeY: 6.0 },
    ],
    obstacles: [
      // Sector 1: Tight T-block rhythm
      { id: 'l4_b1', type: 'block', z: 30, y: 9.5, width: 5.2, height: 4.5, shape: 'tTop' },
      { id: 'l4_sp1', type: 'spikes', zStart: 25, zEnd: 46, placement: 'floor', height: 1.5 },
      { id: 'l4_b2', type: 'block', z: 62, y: 2.5, width: 5.2, height: 4.5, shape: 'tBottom' },
      { id: 'l4_sp2', type: 'spikes', zStart: 56, zEnd: 76, placement: 'ceiling', height: 1.5 },
      { id: 'l4_saw1', type: 'saw', z: 96, y: 6.0, radius: 1.9, spinSpeed: 4.6 },
      // Sector 2: Double star mines
      { id: 'l4_sm1', type: 'starMine', z: 152, y: 8.6, radius: 1.65, spinSpeed: 4.0 },
      { id: 'l4_sm2', type: 'starMine', z: 152, y: 3.4, radius: 1.65, spinSpeed: -4.0 },
      { id: 'l4_b3', type: 'block', z: 184, y: 6.0, width: 6.0, height: 3.6, shape: 'rect' },
      { id: 'l4_sp3', type: 'spikes', zStart: 198, zEnd: 230, placement: 'floor', height: 1.65 },
      { id: 'l4_saw2', type: 'saw', z: 214, y: 8.8, radius: 1.6, spinSpeed: -4.4 },
      // Sector 3: Overdrive rush
      { id: 'l4_sg1', type: 'speedGate', z: 270, multiplier: 1.3 },
      { id: 'l4_sm3', type: 'starMine', z: 298, y: 4.5, radius: 1.7, spinSpeed: 4.8 },
      { id: 'l4_sm4', type: 'starMine', z: 326, y: 7.8, radius: 1.7, spinSpeed: -4.8 },
      { id: 'l4_b4', type: 'block', z: 356, y: 2.0, width: 4.8, height: 4.0, shape: 'rect' },
      { id: 'l4_sg2', type: 'speedGate', z: 378, multiplier: 1.0 },
      // Sector 4: Final gauntlet
      { id: 'l4_sp4', type: 'spikes', zStart: 400, zEnd: 432, placement: 'ceiling', height: 1.7 },
      { id: 'l4_saw3', type: 'saw', z: 416, y: 3.2, radius: 1.65, spinSpeed: 4.6 },
      { id: 'l4_g_t', type: 'block', z: 446, y: 10.2, width: 4.4, height: 3.6, shape: 'rect' },
      { id: 'l4_g_b', type: 'block', z: 446, y: 1.8, width: 4.4, height: 3.6, shape: 'rect' },
      { id: 'l4_sm5', type: 'starMine', z: 478, y: 6.0, radius: 1.85, spinSpeed: -5.0 },
    ],
    collectibles: [
      ...goldLine(24, 4.4, 38, 4.4, 4),
      ...goldLine(56, 7.6, 70, 7.6, 4),
      { id: 'l4_star1', type: 'star', z: 96, y: 9.6, value: 900, starIndex: 0 },
      ...goldLine(142, 6.0, 162, 6.0, 5),
      ...goldDiamond(184, 9.6),
      { id: 'l4_star2', type: 'star', z: 214, y: 4.2, value: 900, starIndex: 1 },
      ...goldZigzag(284, 4.2, 8.8, 14, 2),
      ...goldLine(406, 6.8, 426, 6.8, 5),
      { id: 'l4_star3', type: 'star', z: 478, y: 9.7, value: 900, starIndex: 2 },
      ...goldLine(488, 6.0, 502, 6.0, 4, 180),
    ],
  },

  {
    id: 'level-5',
    number: 5,
    name: 'Hyperdrive Core',
    subtitle: 'Full-speed cyber-canyon finale',
    difficulty: 'Overdrive',
    baseSpeed: 15.0,
    length: 580,
    theme: {
      accentHex: 0xf59e0b,
      hazardHex: 0xf43f5e,
      trenchGlowHex: 0xfbbf24,
      fogHex: 0x12081e,
      label: 'Solar Abyss',
    },
    checkpoints: [
      { id: 'cp5_1', z: 145, safeY: 6.0 },
      { id: 'cp5_2', z: 290, safeY: 6.0 },
      { id: 'cp5_3', z: 435, safeY: 6.0 },
    ],
    obstacles: [
      // Sector 1: Fast opening saws & spikes
      { id: 'l5_saw1', type: 'saw', z: 34, y: 7.8, radius: 1.7, spinSpeed: 4.8 },
      { id: 'l5_saw2', type: 'saw', z: 58, y: 4.2, radius: 1.7, spinSpeed: -4.8 },
      { id: 'l5_sp1', type: 'spikes', zStart: 78, zEnd: 108, placement: 'floor', height: 1.75 },
      { id: 'l5_b1', type: 'block', z: 93, y: 9.6, width: 5.5, height: 4.0, shape: 'tTop' },
      { id: 'l5_sm1', type: 'starMine', z: 126, y: 6.0, radius: 1.75, spinSpeed: 4.5 },
      // Sector 2: T-block tunnel + Overdrive
      { id: 'l5_sg1', type: 'speedGate', z: 158, multiplier: 1.35 },
      { id: 'l5_b2', type: 'block', z: 186, y: 9.5, width: 5.2, height: 4.4, shape: 'tTop' },
      { id: 'l5_b3', type: 'block', z: 218, y: 2.5, width: 5.2, height: 4.4, shape: 'tBottom' },
      { id: 'l5_sm2', type: 'starMine', z: 248, y: 6.2, radius: 1.8, spinSpeed: -5.2 },
      { id: 'l5_sp2', type: 'spikes', zStart: 262, zEnd: 282, placement: 'ceiling', height: 1.75 },
      // Sector 3: Dual saws + center split
      { id: 'l5_sg2', type: 'speedGate', z: 295, multiplier: 1.1 },
      { id: 'l5_saw3', type: 'saw', z: 322, y: 8.7, radius: 1.75, spinSpeed: 5.0 },
      { id: 'l5_saw4', type: 'saw', z: 322, y: 3.3, radius: 1.75, spinSpeed: -5.0 },
      { id: 'l5_b4', type: 'block', z: 356, y: 6.0, width: 6.4, height: 3.6, shape: 'rect' },
      { id: 'l5_sp3', type: 'spikes', zStart: 350, zEnd: 364, placement: 'floor', height: 1.4 },
      { id: 'l5_sm3', type: 'starMine', z: 392, y: 4.0, radius: 1.75, spinSpeed: 4.8 },
      { id: 'l5_sm4', type: 'starMine', z: 414, y: 8.2, radius: 1.75, spinSpeed: -4.8 },
      // Sector 4: Final sprint
      { id: 'l5_sg3', type: 'speedGate', z: 448, multiplier: 1.35 },
      { id: 'l5_g1_t', type: 'block', z: 478, y: 10.1, width: 4.4, height: 3.8, shape: 'rect' },
      { id: 'l5_g1_b', type: 'block', z: 478, y: 1.9, width: 4.4, height: 3.8, shape: 'rect' },
      { id: 'l5_saw5', type: 'saw', z: 512, y: 6.0, radius: 1.95, spinSpeed: 5.5 },
      { id: 'l5_sp4', type: 'spikes', zStart: 530, zEnd: 554, placement: 'floor', height: 1.75 },
      { id: 'l5_sp5', type: 'spikes', zStart: 530, zEnd: 554, placement: 'ceiling', height: 1.75 },
    ],
    collectibles: [
      ...goldLine(24, 3.8, 44, 3.8, 4),
      ...goldLine(50, 8.2, 68, 8.2, 4),
      { id: 'l5_star1', type: 'star', z: 93, y: 4.4, value: 1000, starIndex: 0 },
      ...goldDiamond(126, 9.6),
      ...goldLine(176, 4.2, 196, 4.2, 4),
      ...goldLine(208, 7.8, 228, 7.8, 4),
      { id: 'l5_star2', type: 'star', z: 248, y: 9.8, value: 1000, starIndex: 1 },
      ...goldLine(312, 6.0, 332, 6.0, 5),
      ...goldTriangle(356, 9.0, false),
      { id: 'l5_star3', type: 'star', z: 414, y: 3.2, value: 1000, starIndex: 2 },
      ...goldLine(466, 6.0, 490, 6.0, 5),
      ...goldDiamond(542, 6.0),
      ...goldLine(560, 6.0, 572, 6.0, 4, 220),
    ],
  },
];
