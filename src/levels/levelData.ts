import { CollectibleItem, CraftSkin, LevelDefinition, LevelObstacle } from '../types/game';

export const TRACK_FLOOR_Y = 0;
export const TRACK_CEILING_Y = 12;
export const PLAY_MIN_Y = 0.55;
export const PLAY_MAX_Y = 11.45;
export const WAVE_ANGLE_DEG = 42;
export const WAVE_SLOPE = Math.tan((WAVE_ANGLE_DEG * Math.PI) / 180); // ~0.9004

export const CRAFT_SKINS: CraftSkin[] = [
  {
    id: 'cyan-pulse',
    name: 'Gyro Orb',
    shape: 'gyro',
    role: 'defense',
    coreColor: 0x00f5d4,
    trailColor: 0x22d3ee,
    cssSwatch: '#22d3ee',
    unlockGold: 0,
    powerType: 'shield',
    powerName: 'Phase Shield',
    powerDescription: 'Deploys an energy barrier that absorbs 1 hazard hit with a shockwave burst.',
    powerDuration: 8.0,
  },
  {
    id: 'solar-amber',
    name: 'Solar Dart',
    shape: 'dart',
    role: 'utility',
    coreColor: 0xfbbf24,
    trailColor: 0xf59e0b,
    cssSwatch: '#f59e0b',
    unlockGold: 0,
    powerType: 'magnet',
    powerName: 'Magnet Surge',
    powerDescription: 'Draws nearby gold cubes and stars straight into the craft for 6.0s.',
    powerDuration: 6.0,
  },
  {
    id: 'volt-shuriken',
    name: 'Volt Shuriken',
    shape: 'shuriken',
    role: 'offense',
    coreColor: 0x818cf8,
    trailColor: 0x6366f1,
    cssSwatch: '#818cf8',
    unlockGold: 0,
    powerType: 'pulse',
    powerName: 'Shockwave Pulse',
    powerDescription: 'Fires an EMP blast that shatters nearby hazards into gold and shields for 3.2s.',
    powerDuration: 3.2,
  },
  {
    id: 'cobalt-viper',
    name: 'Cobalt Viper',
    shape: 'viper',
    role: 'utility',
    coreColor: 0x38bdf8,
    trailColor: 0x0284c7,
    cssSwatch: '#38bdf8',
    unlockGold: 600,
    powerType: 'warp',
    powerName: 'Hyper Warp',
    powerDescription: 'Surges forward at 1.42x speed while phasing through hazards and magnetizing gold.',
    powerDuration: 3.0,
  },
  {
    id: 'aegis-bulwark',
    name: 'Aegis Bulwark',
    shape: 'aegis',
    role: 'defense',
    coreColor: 0x2dd4bf,
    trailColor: 0x0d9488,
    cssSwatch: '#2dd4bf',
    unlockGold: 950,
    powerType: 'aegis',
    powerName: 'Aegis Fortress',
    powerDescription: 'Deploys a 2-hit armored barrier for 10.0s that shatters colliding hazards with a shockwave.',
    powerDuration: 10.0,
  },
  {
    id: 'hyper-violet',
    name: 'Prism Star',
    shape: 'prism',
    role: 'defense',
    coreColor: 0xe879f9,
    trailColor: 0xc026d3,
    cssSwatch: '#e879f9',
    unlockGold: 1200,
    powerType: 'slowmo',
    powerName: 'Chrono Slow',
    powerDescription: 'Dilates trench speed to 0.62x for 4.2s for pinpoint defensive threading.',
    powerDuration: 4.2,
  },
  {
    id: 'inferno-reaper',
    name: 'Inferno Reaper',
    shape: 'reaper',
    role: 'offense',
    coreColor: 0xf97316,
    trailColor: 0xef4444,
    cssSwatch: '#f97316',
    unlockGold: 1600,
    powerType: 'barrage',
    powerName: 'Plasma Barrage',
    powerDescription: 'Fires rapid homing plasma rockets for 4.2s that obliterate obstacles ahead for +100 Gold.',
    powerDuration: 4.2,
  },
  {
    id: 'chrono-bastion',
    name: 'Chrono Bastion',
    shape: 'bastion',
    role: 'defense',
    coreColor: 0x60a5fa,
    trailColor: 0x2563eb,
    cssSwatch: '#60a5fa',
    unlockGold: 2200,
    powerType: 'stasis',
    powerName: 'Stasis Field',
    powerDescription: 'Slows trench velocity to 0.56x while projecting a 1-hit emergency shield for 5.5s.',
    powerDuration: 5.5,
  },
  {
    id: 'crimson-apex',
    name: 'Apex Scythe',
    shape: 'scythe',
    role: 'offense',
    coreColor: 0xfb7185,
    trailColor: 0xf43f5e,
    cssSwatch: '#fb7185',
    unlockGold: 2800,
    powerType: 'breaker',
    powerName: 'Laser Breaker',
    powerDescription: 'Projects a forward plasma lance that shatters obstacles ahead for 3.6s.',
    powerDuration: 3.6,
  },
  {
    id: 'sentinel-ward',
    name: 'Sentinel Ward',
    shape: 'sentinel',
    role: 'defense',
    coreColor: 0x38bdf8,
    trailColor: 0x4f46e5,
    cssSwatch: '#4f46e5',
    unlockGold: 3400,
    powerType: 'deflect',
    powerName: 'Mirror Deflector',
    powerDescription: 'Absorbs 1 hit and vaporizes nearby hazards within 3.0m into +125 Gold for 7.5s.',
    powerDuration: 7.5,
  },
  {
    id: 'crimson-lotus',
    name: 'Crimson Lotus',
    shape: 'lotus',
    role: 'utility',
    coreColor: 0xf472b6,
    trailColor: 0xdb2777,
    cssSwatch: '#f472b6',
    unlockGold: 3800,
    powerType: 'vortex',
    powerName: 'Gold Vortex',
    powerDescription: 'Vacuums gold & stars across the full trench height with 2.0x gold value for 5.5s.',
    powerDuration: 5.5,
  },
  {
    id: 'void-annihilator',
    name: 'Void Annihilator',
    shape: 'annihilator',
    role: 'offense',
    coreColor: 0xc084fc,
    trailColor: 0x9333ea,
    cssSwatch: '#c084fc',
    unlockGold: 4800,
    powerType: 'smash',
    powerName: 'Meteor Smash',
    powerDescription: 'Encases craft in a 2.2m demolition aura for 3.8s, shattering ALL hazards including spikes.',
    powerDuration: 3.8,
  },
  {
    id: 'emerald-phantom',
    name: 'Jade Phantom',
    shape: 'phantom',
    role: 'defense',
    coreColor: 0x34d399,
    trailColor: 0x10b981,
    cssSwatch: '#34d399',
    unlockGold: 5500,
    powerType: 'phase',
    powerName: 'Phase Blink',
    powerDescription: 'Turns the craft intangible for 2.8s, passing safely through all hazards.',
    powerDuration: 2.8,
  },
  {
    id: 'phoenix-core',
    name: 'Phoenix Core',
    shape: 'phoenix',
    role: 'defense',
    coreColor: 0xfb7185,
    trailColor: 0xf59e0b,
    cssSwatch: '#fb923c',
    unlockGold: 6400,
    powerType: 'revive',
    powerName: 'Second Wind',
    powerDescription: 'Arms a 12.0s revival matrix: fatal impact erupts in a 9.5m blast clearing all hazards.',
    powerDuration: 12.0,
  },
  {
    id: 'obsidian-titan',
    name: 'Obsidian Titan',
    shape: 'titan',
    role: 'offense',
    coreColor: 0xfb923c,
    trailColor: 0xea580c,
    cssSwatch: '#ea580c',
    unlockGold: 7200,
    powerType: 'pulse',
    powerName: 'Titan EMP',
    powerDescription: 'Heavy EMP pulse shatters surrounding obstacles and projects a 4.2s breaker field.',
    powerDuration: 4.2,
  },
  {
    id: 'nova-crown',
    name: 'Nova Crown',
    shape: 'nova',
    role: 'utility',
    coreColor: 0xfef08a,
    trailColor: 0x38bdf8,
    cssSwatch: '#fde047',
    unlockGold: 9000,
    powerType: 'overdrive',
    powerName: 'Score Overdrive',
    powerDescription: 'Grants 2.5x gold multiplier plus a wide magnetic aura for 5.0s.',
    powerDuration: 5.0,
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
      // Spatial X-displacement warp gate after checkpoint
      { id: 'l1_wg1', type: 'warpGate', z: 150, warpEffect: 'shiftRight', duration: 3.8 },
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
      // Section 2: X-axis warp + twin offset saws
      { id: 'l2_wg1', type: 'warpGate', z: 130, warpEffect: 'shiftLeft', duration: 4.0 },
      { id: 'l2_saw2', type: 'saw', z: 144, y: 4.2, radius: 1.7, spinSpeed: -4.0 },
      { id: 'l2_saw3', type: 'saw', z: 164, y: 8.2, radius: 1.7, spinSpeed: 4.0 },
      // Narrow gate window
      { id: 'l2_g1_t', type: 'block', z: 188, y: 10.3, width: 4.2, height: 3.4, shape: 'rect' },
      { id: 'l2_g1_b', type: 'block', z: 188, y: 1.7, width: 4.2, height: 3.4, shape: 'rect' },
      // Center block split
      { id: 'l2_mid', type: 'block', z: 218, y: 6.0, width: 5.2, height: 3.4, shape: 'rect' },
      { id: 'l2_sp3', type: 'spikes', zStart: 212, zEnd: 226, placement: 'floor', height: 1.4 },
      // Section 3: Flank mirror warp + Patrol drone & star mine
      { id: 'l2_wg2', type: 'warpGate', z: 248, warpEffect: 'mirrorCam', duration: 4.0 },
      { id: 'l2_pd1', type: 'patrolDrone', z: 258, baseY: 6.0, ampY: 2.8, speed: 2.2, radius: 1.2 },
      { id: 'l2_sm1', type: 'starMine', z: 274, y: 6.0, radius: 1.55, spinSpeed: 3.2 },
      { id: 'l2_sp4', type: 'spikes', zStart: 290, zEnd: 314, placement: 'ceiling', height: 1.6 },
      { id: 'l2_b3', type: 'block', z: 302, y: 2.3, width: 4.8, height: 4.2, shape: 'tBottom' },
      { id: 'l2_saw4', type: 'saw', z: 334, y: 7.5, radius: 1.75, spinSpeed: -4.2 },
      { id: 'l2_saw5', type: 'saw', z: 334, y: 2.4, radius: 1.35, spinSpeed: 4.2 },
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
      // Overdrive speed gate (1.25x) + Inverted camera warp
      { id: 'l3_sg1', type: 'speedGate', z: 162, multiplier: 1.25 },
      { id: 'l3_wg1', type: 'warpGate', z: 169, warpEffect: 'invertCam', duration: 4.2 },
      // Angled laser chute + patrol drone
      { id: 'l3_lb1', type: 'laserBar', z1: 178, y1: 11.2, z2: 186, y2: 6.8, thickness: 0.24 },
      { id: 'l3_b2', type: 'block', z: 196, y: 2.2, width: 4.5, height: 4.2, shape: 'rect' },
      { id: 'l3_b3', type: 'block', z: 220, y: 9.8, width: 4.5, height: 4.2, shape: 'rect' },
      { id: 'l3_pd1', type: 'patrolDrone', z: 244, baseY: 6.0, ampY: 3.0, speed: 2.5, radius: 1.25 },
      { id: 'l3_sp2', type: 'spikes', zStart: 262, zEnd: 282, placement: 'ceiling', height: 1.7 },
      // Normalize speed at checkpoint 2 + X-shift warp
      { id: 'l3_sg2', type: 'speedGate', z: 298, multiplier: 1.0 },
      { id: 'l3_wg2', type: 'warpGate', z: 306, warpEffect: 'shiftRight', duration: 4.2 },
      // Precision T-gate weave + Binary Orbit Mine
      { id: 'l3_b4', type: 'block', z: 324, y: 9.0, width: 5.8, height: 4.6, shape: 'tTop' },
      { id: 'l3_sp3', type: 'spikes', zStart: 318, zEnd: 338, placement: 'floor', height: 1.4 },
      { id: 'l3_om1', type: 'orbitMine', z: 356, y: 6.0, orbitRadius: 2.4, mineRadius: 0.78, spinSpeed: 2.6 },
      { id: 'l3_sm5', type: 'starMine', z: 384, y: 8.4, radius: 1.7, spinSpeed: -4.5 },
      { id: 'l3_g_t', type: 'block', z: 408, y: 10.1, width: 4.0, height: 3.8, shape: 'rect' },
      { id: 'l3_g_b', type: 'block', z: 408, y: 1.9, width: 4.0, height: 3.8, shape: 'rect' },
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
      { id: 'l4_rg1', type: 'rotaryGate', z: 104, y: 6.0, armLength: 3.8, blades: 2, spinSpeed: 2.3 },
      // Sector 2: X-shift warp + Double star mines + diagonal laser barrier
      { id: 'l4_wg1', type: 'warpGate', z: 134, warpEffect: 'shiftLeft', duration: 4.4 },
      { id: 'l4_sm1', type: 'starMine', z: 152, y: 8.6, radius: 1.65, spinSpeed: 4.0 },
      { id: 'l4_sm2', type: 'starMine', z: 152, y: 3.4, radius: 1.65, spinSpeed: -4.0 },
      { id: 'l4_b3', type: 'block', z: 184, y: 6.0, width: 6.0, height: 3.6, shape: 'rect' },
      { id: 'l4_sp3', type: 'spikes', zStart: 198, zEnd: 226, placement: 'floor', height: 1.65 },
      { id: 'l4_saw2', type: 'saw', z: 212, y: 8.8, radius: 1.6, spinSpeed: -4.4 },
      { id: 'l4_lb1', type: 'laserBar', z1: 234, y1: 0.9, z2: 242, y2: 5.0, thickness: 0.24 },
      // Sector 3: Overdrive rush + patrol drone + orbit mine
      { id: 'l4_sg1', type: 'speedGate', z: 270, multiplier: 1.3 },
      { id: 'l4_pd1', type: 'patrolDrone', z: 298, baseY: 6.0, ampY: 3.1, speed: 2.7, radius: 1.3 },
      { id: 'l4_om1', type: 'orbitMine', z: 332, y: 6.0, orbitRadius: 2.55, mineRadius: 0.8, spinSpeed: -3.0 },
      { id: 'l4_b4', type: 'block', z: 360, y: 2.0, width: 4.8, height: 4.0, shape: 'rect' },
      { id: 'l4_sg2', type: 'speedGate', z: 378, multiplier: 1.0 },
      // Sector 4: Inverted camera finale gauntlet
      { id: 'l4_wg2', type: 'warpGate', z: 390, warpEffect: 'invertCam', duration: 4.4 },
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
      { id: 'l5_pd1', type: 'patrolDrone', z: 124, baseY: 6.0, ampY: 3.2, speed: 2.9, radius: 1.3 },
      // Sector 2: Mirror flank warp + T-block tunnel + 3-Blade Rotary Turbine
      { id: 'l5_wg1', type: 'warpGate', z: 150, warpEffect: 'mirrorCam', duration: 4.5 },
      { id: 'l5_sg1', type: 'speedGate', z: 158, multiplier: 1.35 },
      { id: 'l5_b2', type: 'block', z: 186, y: 9.5, width: 5.2, height: 4.4, shape: 'tTop' },
      { id: 'l5_b3', type: 'block', z: 214, y: 2.5, width: 5.2, height: 4.4, shape: 'tBottom' },
      { id: 'l5_rg1', type: 'rotaryGate', z: 244, y: 6.0, armLength: 3.9, blades: 3, spinSpeed: -2.2 },
      { id: 'l5_sp2', type: 'spikes', zStart: 264, zEnd: 282, placement: 'ceiling', height: 1.75 },
      // Sector 3: Inverted camera warp + Dual saws + diagonal laser barrier
      { id: 'l5_sg2', type: 'speedGate', z: 295, multiplier: 1.1 },
      { id: 'l5_wg2', type: 'warpGate', z: 304, warpEffect: 'invertCam', duration: 4.5 },
      { id: 'l5_saw3', type: 'saw', z: 322, y: 8.7, radius: 1.75, spinSpeed: 5.0 },
      { id: 'l5_saw4', type: 'saw', z: 322, y: 3.3, radius: 1.75, spinSpeed: -5.0 },
      { id: 'l5_b4', type: 'block', z: 356, y: 6.0, width: 6.4, height: 3.6, shape: 'rect' },
      { id: 'l5_sp3', type: 'spikes', zStart: 350, zEnd: 364, placement: 'floor', height: 1.4 },
      { id: 'l5_lb1', type: 'laserBar', z1: 382, y1: 11.2, z2: 391, y2: 6.6, thickness: 0.25 },
      { id: 'l5_sm4', type: 'starMine', z: 414, y: 3.8, radius: 1.75, spinSpeed: -4.8 },
      // Sector 4: Final sprint + Binary Orbit Mine
      { id: 'l5_sg3', type: 'speedGate', z: 448, multiplier: 1.35 },
      { id: 'l5_g1_t', type: 'block', z: 476, y: 10.1, width: 4.4, height: 3.8, shape: 'rect' },
      { id: 'l5_g1_b', type: 'block', z: 476, y: 1.9, width: 4.4, height: 3.8, shape: 'rect' },
      { id: 'l5_om1', type: 'orbitMine', z: 506, y: 6.0, orbitRadius: 2.65, mineRadius: 0.84, spinSpeed: 3.2 },
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

export const ENDLESS_CHUNK_LENGTH = 90;

export const ENDLESS_LEVEL_BASE: LevelDefinition = {
  id: 'endless-trench',
  number: 0,
  name: 'Infinity Mode',
  subtitle: 'Infinite procedural cyber-canyon with 250m sector milestones & escalating speed',
  difficulty: 'Overdrive',
  baseSpeed: 13.8,
  length: 100000,
  theme: {
    accentHex: 0x06b6d4,
    hazardHex: 0xf43f5e,
    trenchGlowHex: 0x38bdf8,
    fogHex: 0x06091b,
    label: 'Infinity Trench',
  },
  obstacles: [],
  collectibles: [],
  checkpoints: [],
};

export interface EndlessAdaptiveParams {
  sawSpacingMult: number;
  sawVelocityMult: number;
}

export function generateEndlessChunk(
  chunkIndex: number,
  zStart: number,
  adaptive: EndlessAdaptiveParams = { sawSpacingMult: 1.0, sawVelocityMult: 1.0 }
): { obstacles: LevelObstacle[]; collectibles: CollectibleItem[] } {
  const obstacles: LevelObstacle[] = [];
  const collectibles: CollectibleItem[] = [];
  const pattern = chunkIndex % 8;

  const spacingMult = Math.max(0.8, Math.min(1.28, adaptive.sawSpacingMult));
  const velocityMult = Math.max(0.72, Math.min(1.38, adaptive.sawVelocityMult));
  const spinBase = (3.6 + Math.min(2.6, chunkIndex * 0.12)) * velocityMult;
  const motionScale = Math.max(0, Math.min(1.35, (velocityMult - 0.68) * 1.45));
  const sawDriftSpeed = (1.35 + Math.min(1.1, chunkIndex * 0.05)) * velocityMult;

  if (pattern === 0) {
    // T-Block Slalom + Adaptive Spinning Saw + Gold Zigzag
    const sawZ = zStart + 74 + (spacingMult - 1.0) * 10;
    obstacles.push(
      { id: nextId('eb'), type: 'block', z: zStart + 22, y: 9.4, width: 5.2, height: 4.5, shape: 'tTop' },
      { id: nextId('eb'), type: 'block', z: zStart + 50, y: 2.6, width: 5.2, height: 4.5, shape: 'tBottom' },
      {
        id: nextId('esaw'),
        type: 'saw',
        z: sawZ,
        y: 6.0,
        radius: 1.65,
        spinSpeed: spinBase,
        driftAmpY: 0.95 * motionScale,
        driftAmpZ: 0.65 * motionScale,
        driftSpeed: sawDriftSpeed,
        driftPhase: chunkIndex * 0.9,
      }
    );
    collectibles.push(
      ...goldLine(zStart + 14, 4.0, zStart + 30, 4.0, 4, 120),
      ...goldLine(zStart + 42, 8.0, zStart + 58, 8.0, 4, 120),
      ...goldDiamond(sawZ, 9.4, 1.5, 1.1, 140)
    );
  } else if (pattern === 1) {
    // Diagonal Laser Chute + Patrol Drone
    obstacles.push(
      { id: nextId('elb'), type: 'laserBar', z1: zStart + 16, y1: 11.2, z2: zStart + 24, y2: 6.8, thickness: 0.24 },
      { id: nextId('elb'), type: 'laserBar', z1: zStart + 36, y1: 0.8, z2: zStart + 44, y2: 5.2, thickness: 0.24 },
      { id: nextId('epd'), type: 'patrolDrone', z: zStart + 68, baseY: 6.0, ampY: 3.1, speed: 2.3 + Math.min(1.4, chunkIndex * 0.08), phase: chunkIndex * 0.7, radius: 1.25 }
    );
    collectibles.push(
      ...goldLine(zStart + 14, 3.8, zStart + 26, 3.8, 4, 130),
      ...goldLine(zStart + 34, 8.2, zStart + 46, 8.2, 4, 130),
      ...goldDiamond(zStart + 68, 6.0, 1.6, 1.2, 150)
    );
  } else if (pattern === 2) {
    // Spatial Warp Gate + Gate Thread + Adaptive Saw + Ceiling Spikes
    const warpEffects: Array<'shiftLeft' | 'invertCam' | 'shiftRight' | 'mirrorCam'> = [
      'shiftLeft',
      'invertCam',
      'shiftRight',
      'mirrorCam',
    ];
    const warpEffect = warpEffects[Math.floor(chunkIndex / 8) % warpEffects.length];
    const sawY = Math.max(2.3, 3.4 - (spacingMult - 1.0) * 1.1);
    obstacles.push(
      { id: nextId('ewg'), type: 'warpGate', z: zStart + 8, warpEffect, duration: 4.2 },
      { id: nextId('eb'), type: 'block', z: zStart + 26, y: 10.2, width: 4.2, height: 3.6, shape: 'rect' },
      { id: nextId('eb'), type: 'block', z: zStart + 26, y: 1.8, width: 4.2, height: 3.6, shape: 'rect' },
      { id: nextId('esp'), type: 'spikes', zStart: zStart + 44, zEnd: zStart + 66, placement: 'ceiling', height: 1.65 },
      {
        id: nextId('esaw'),
        type: 'saw',
        z: zStart + 55,
        y: sawY,
        radius: 1.55,
        spinSpeed: -spinBase,
        driftAmpY: 0.7 * motionScale,
        driftAmpZ: 0.8 * motionScale,
        driftSpeed: sawDriftSpeed * 0.9,
        driftPhase: chunkIndex * 1.3,
      },
      { id: nextId('eb'), type: 'block', z: zStart + 80, y: 6.0, width: 5.0, height: 3.4, shape: 'rect' }
    );
    collectibles.push(
      ...goldLine(zStart + 16, 6.0, zStart + 32, 6.0, 4, 130),
      ...goldLine(zStart + 46, 6.8, zStart + 64, 6.8, 4, 130),
      ...goldDiamond(zStart + 80, 9.5, 1.4, 1.0, 150)
    );
  } else if (pattern === 3) {
    // Rotary Turbine + Gold Triangle + Star Mine
    const blades: 2 | 3 | 4 = chunkIndex >= 14 ? 4 : chunkIndex >= 6 ? 3 : 2;
    obstacles.push(
      { id: nextId('erg'), type: 'rotaryGate', z: zStart + 28, y: 6.0, armLength: 3.9, blades, spinSpeed: (chunkIndex % 2 === 0 ? 1 : -1) * (2.0 + Math.min(1.4, chunkIndex * 0.06)) },
      { id: nextId('esm'), type: 'starMine', z: zStart + 58, y: 4.2, radius: 1.65, spinSpeed: spinBase },
      { id: nextId('esp'), type: 'spikes', zStart: zStart + 68, zEnd: zStart + 84, placement: 'floor', height: 1.6 }
    );
    collectibles.push(
      ...goldTriangle(zStart + 44, 6.0, true, 140),
      ...goldLine(zStart + 68, 7.6, zStart + 84, 7.6, 4, 140)
    );
  } else if (pattern === 4) {
    // Speed Boost Surge + Adaptive Twin Saws + Patrol Drone
    const boost = 1.15 + Math.min(0.25, chunkIndex * 0.02);
    const halfGap = Math.max(2.15, Math.min(3.35, 2.6 * spacingMult));
    const zStagger = spacingMult > 1.02 ? (spacingMult - 1.0) * 14 : 0;
    obstacles.push(
      { id: nextId('esg'), type: 'speedGate', z: zStart + 12, multiplier: boost },
      {
        id: nextId('esaw'),
        type: 'saw',
        z: zStart + 38 - zStagger,
        y: 6.0 + halfGap,
        radius: 1.7,
        spinSpeed: spinBase,
        driftAmpY: 0.45 * motionScale,
        driftAmpZ: 0.95 * motionScale,
        driftSpeed: sawDriftSpeed,
        driftPhase: chunkIndex * 0.6,
        pairRole: 'upper',
      },
      {
        id: nextId('esaw'),
        type: 'saw',
        z: zStart + 38 + zStagger,
        y: 6.0 - halfGap,
        radius: 1.7,
        spinSpeed: -spinBase,
        driftAmpY: 0.45 * motionScale,
        driftAmpZ: 0.95 * motionScale,
        driftSpeed: sawDriftSpeed,
        driftPhase: chunkIndex * 0.6 + Math.PI,
        pairRole: 'lower',
      },
      { id: nextId('epd'), type: 'patrolDrone', z: zStart + 68, baseY: 6.0, ampY: 3.2, speed: 2.7, radius: 1.3 }
    );
    collectibles.push(
      ...goldLine(zStart + 26, 6.0, zStart + 50, 6.0, 5, 140),
      ...goldTriangle(zStart + 68, 9.2, false, 150)
    );
  } else if (pattern === 5) {
    // Binary Orbit Mine Gauntlet + Diagonal Laser Bar
    obstacles.push(
      { id: nextId('eom'), type: 'orbitMine', z: zStart + 28, y: 6.0, orbitRadius: 2.55, mineRadius: 0.82, spinSpeed: 2.6 + Math.min(1.8, chunkIndex * 0.07) },
      { id: nextId('elb'), type: 'laserBar', z1: zStart + 52, y1: 11.2, z2: zStart + 62, y2: 6.4, thickness: 0.25 },
      { id: nextId('esm'), type: 'starMine', z: zStart + 76, y: 3.8, radius: 1.65, spinSpeed: -spinBase }
    );
    collectibles.push(
      ...goldLine(zStart + 18, 6.0, zStart + 38, 6.0, 5, 150),
      ...goldLine(zStart + 50, 3.6, zStart + 64, 3.6, 4, 140),
      ...goldDiamond(zStart + 76, 8.6, 1.4, 1.0, 150)
    );
  } else if (pattern === 6) {
    // Secondary Warp Gate + Alternating Saw Weave + Floor Spikes + Laser Bar
    const warpEffects: Array<'mirrorCam' | 'shiftRight' | 'invertCam' | 'shiftLeft'> = [
      'mirrorCam',
      'shiftRight',
      'invertCam',
      'shiftLeft',
    ];
    const warpEffect = warpEffects[Math.floor(chunkIndex / 8) % warpEffects.length];
    const sawCenterZ = zStart + 35;
    const sawSpanZ = 11 * spacingMult;
    obstacles.push(
      { id: nextId('ewg'), type: 'warpGate', z: zStart + 8, warpEffect, duration: 4.2 },
      {
        id: nextId('esaw'),
        type: 'saw',
        z: sawCenterZ - sawSpanZ,
        y: 4.2,
        radius: 1.55,
        spinSpeed: spinBase,
        driftAmpY: 0.65 * motionScale,
        driftSpeed: sawDriftSpeed,
        driftPhase: chunkIndex * 0.5,
      },
      {
        id: nextId('esaw'),
        type: 'saw',
        z: sawCenterZ + sawSpanZ,
        y: 8.1,
        radius: 1.55,
        spinSpeed: -spinBase,
        driftAmpY: 0.65 * motionScale,
        driftSpeed: sawDriftSpeed,
        driftPhase: chunkIndex * 0.5 + Math.PI * 0.5,
      },
      { id: nextId('esp'), type: 'spikes', zStart: zStart + 60, zEnd: zStart + 82, placement: 'floor', height: 1.6 },
      { id: nextId('elb'), type: 'laserBar', z1: zStart + 66, y1: 11.2, z2: zStart + 74, y2: 7.4, thickness: 0.24 }
    );
    collectibles.push(
      ...goldLine(zStart + 14, 8.2, zStart + 28, 8.2, 4, 130),
      ...goldLine(zStart + 38, 3.8, zStart + 52, 3.8, 4, 130),
      ...goldLine(zStart + 62, 4.8, zStart + 80, 4.8, 4, 150)
    );
  } else {
    // Dual Spikes Tunnel + Orbit Mine + Normalizer
    obstacles.push(
      { id: nextId('esp'), type: 'spikes', zStart: zStart + 16, zEnd: zStart + 40, placement: 'floor', height: 1.65 },
      { id: nextId('esp'), type: 'spikes', zStart: zStart + 16, zEnd: zStart + 40, placement: 'ceiling', height: 1.65 },
      { id: nextId('eom'), type: 'orbitMine', z: zStart + 62, y: 6.0, orbitRadius: 2.5, mineRadius: 0.8, spinSpeed: -2.8 },
      { id: nextId('esg'), type: 'speedGate', z: zStart + 84, multiplier: 1.0 + Math.min(0.2, chunkIndex * 0.015) }
    );
    collectibles.push(
      ...goldDiamond(zStart + 28, 6.0, 2.0, 1.5, 160),
      ...goldLine(zStart + 52, 6.0, zStart + 74, 6.0, 5, 150)
    );
  }

  return { obstacles, collectibles };
}


