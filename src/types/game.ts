export type GamePhase = 'ready' | 'playing' | 'crashed' | 'completed';

export type CameraMode = 'isometric' | 'chase';

export type GameMode = 'classic' | 'inverted' | 'hardcore' | 'endless';

export type SpecialPowerType =
  | 'shield'
  | 'magnet'
  | 'slowmo'
  | 'breaker'
  | 'phase'
  | 'overdrive'
  | 'pulse'
  | 'warp'
  | 'vortex'
  | 'barrage'
  | 'smash'
  | 'aegis'
  | 'stasis'
  | 'deflect'
  | 'revive';

export type AvatarShape =
  | 'gyro'
  | 'dart'
  | 'prism'
  | 'scythe'
  | 'phantom'
  | 'nova'
  | 'shuriken'
  | 'viper'
  | 'lotus'
  | 'titan'
  | 'reaper'
  | 'annihilator'
  | 'aegis'
  | 'bastion'
  | 'sentinel'
  | 'phoenix';

export type AvatarRole = 'defense' | 'offense' | 'utility';

export type EnvEventType = 'glitchStorm' | 'gravityShift' | 'solarFlare' | 'magTurbulence';

export type EnvEventPhase = 'idle' | 'warning' | 'active';

export interface SawObstacle {
  id: string;
  type: 'saw';
  z: number;
  y: number;
  radius: number;
  spinSpeed?: number;
  driftAmpY?: number;
  driftAmpZ?: number;
  driftSpeed?: number;
  driftPhase?: number;
  pairRole?: 'upper' | 'lower';
}

export interface StarMineObstacle {
  id: string;
  type: 'starMine';
  z: number;
  y: number;
  radius: number;
  spinSpeed?: number;
}

export interface SpikeClusterObstacle {
  id: string;
  type: 'spikes';
  zStart: number;
  zEnd: number;
  placement: 'floor' | 'ceiling';
  height: number;
}

export interface BlockObstacle {
  id: string;
  type: 'block';
  z: number;
  y: number; // Center Y
  width: number; // Span along Z
  height: number; // Span along Y
  shape: 'rect' | 'tTop' | 'tBottom';
}

export interface SpeedGateObstacle {
  id: string;
  type: 'speedGate';
  z: number;
  multiplier: number;
}

export interface LaserBarObstacle {
  id: string;
  type: 'laserBar';
  z1: number;
  y1: number;
  z2: number;
  y2: number;
  thickness?: number;
}

export interface PatrolDroneObstacle {
  id: string;
  type: 'patrolDrone';
  z: number;
  baseY: number;
  ampY: number;
  speed: number;
  phase?: number;
  radius: number;
}

export interface RotaryGateObstacle {
  id: string;
  type: 'rotaryGate';
  z: number;
  y: number;
  armLength: number;
  blades?: 2 | 3 | 4;
  spinSpeed: number;
}

export interface OrbitMineObstacle {
  id: string;
  type: 'orbitMine';
  z: number;
  y: number;
  orbitRadius: number;
  mineRadius: number;
  spinSpeed: number;
}

export type WarpEffectType = 'shiftLeft' | 'shiftRight' | 'invertCam' | 'mirrorCam';

export interface WarpGateObstacle {
  id: string;
  type: 'warpGate';
  z: number;
  warpEffect: WarpEffectType;
  duration?: number;
}

export type LevelObstacle =
  | SawObstacle
  | StarMineObstacle
  | SpikeClusterObstacle
  | BlockObstacle
  | SpeedGateObstacle
  | LaserBarObstacle
  | PatrolDroneObstacle
  | RotaryGateObstacle
  | OrbitMineObstacle
  | WarpGateObstacle;

export interface CollectibleItem {
  id: string;
  type: 'gold' | 'star';
  z: number;
  y: number;
  value: number;
  starIndex?: 0 | 1 | 2;
}

export interface CheckpointMarker {
  id: string;
  z: number;
  safeY: number;
}

export interface LevelTheme {
  accentHex: number;
  hazardHex: number;
  trenchGlowHex: number;
  fogHex: number;
  label: string;
}

export interface LevelDefinition {
  id: string;
  number: number;
  name: string;
  subtitle: string;
  difficulty: 'Initiate' | 'Adept' | 'Expert' | 'Master' | 'Overdrive';
  baseSpeed: number;
  length: number;
  theme: LevelTheme;
  obstacles: LevelObstacle[];
  collectibles: CollectibleItem[];
  checkpoints: CheckpointMarker[];
}

export interface CraftSkin {
  id: string;
  name: string;
  shape: AvatarShape;
  role: AvatarRole;
  coreColor: number;
  trailColor: number;
  cssSwatch: string;
  unlockGold: number;
  powerType: SpecialPowerType;
  powerName: string;
  powerDescription: string;
  powerDuration: number;
}

export interface LevelProgressRecord {
  bestPercent: number;
  starsEarned: [boolean, boolean, boolean];
  bestScore: number;
  completed: boolean;
}

export interface HudSnapshot {
  phase: GamePhase;
  mode: GameMode;
  percent: number;
  distance: number;
  sector: number;
  score: number;
  streakMultiplier: number;
  nearMissCount: number;
  calloutText: string | null;
  stars: [boolean, boolean, boolean];
  attempts: number;
  activeSpeedMultiplier: number;
  hasCheckpoint: boolean;
  checkpointPercent: number;
  powerCharge: number; // 0..100
  powerActiveRemaining: number;
  powerDuration: number;
  shieldActive: boolean;
  shieldCharges: number;
  musicIntensity: number;
  activeWarpEffect: WarpEffectType | null;
  activeWarpRemaining: number;
  envEventType: EnvEventType | null;
  envEventPhase: EnvEventPhase;
  envEventRemaining: number;
}

export type DailyChallengeType =
  | 'collect_gold'
  | 'infinity_sectors'
  | 'infinity_distance'
  | 'near_misses'
  | 'activate_powers'
  | 'complete_course'
  | 'collect_stars'
  | 'special_mode_clear';

export interface DailyChallengeTask {
  id: string;
  type: DailyChallengeType;
  title: string;
  description: string;
  target: number;
  rewardGold: number;
  unitLabel?: string;
}

export interface DailyChallengeState {
  dateKey: string;
  tasks: DailyChallengeTask[];
  progress: Record<string, number>;
  claimedIds: string[];
}

export interface ChallengeEvent {
  goldEarned?: number;
  nearMisses?: number;
  powersActivated?: number;
  starsCollected?: number;
  sectorsClearedInRun?: number;
  infinityDistanceInRun?: number;
  courseCompletedMode?: GameMode;
  eventsSurvived?: number;
  warpGatesCleared?: number;
  shieldsAbsorbed?: number;
  hazardsShattered?: number;
}

export type UpgradeId = 'capacitor' | 'plating' | 'collector' | 'stabilizer';

export type UpgradeLevels = Record<UpgradeId, number>;

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  effectPerLevel: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
}

export type AdvancementCategory = 'flight' | 'defense' | 'mastery' | 'tech';

export interface AdvancementDefinition {
  id: string;
  title: string;
  description: string;
  category: AdvancementCategory;
  target: number;
  rewardGold: number;
  unitLabel?: string;
}

export interface CareerStats {
  coursesCompleted: number;
  specialModeClears: number;
  starsCollected: number;
  nearMisses: number;
  eventsSurvived: number;
  warpGatesCleared: number;
  shieldsAbsorbed: number;
  hazardsShattered: number;
  bestEndlessSector: number;
  maxUpgradeLevel: number;
}

export interface AdvancementsState {
  stats: CareerStats;
  claimedIds: string[];
}
