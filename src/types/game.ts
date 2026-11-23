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
  | 'vortex';

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
  | 'titan';

export interface SawObstacle {
  id: string;
  type: 'saw';
  z: number;
  y: number;
  radius: number;
  spinSpeed?: number;
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

export type LevelObstacle =
  | SawObstacle
  | StarMineObstacle
  | SpikeClusterObstacle
  | BlockObstacle
  | SpeedGateObstacle;

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
  musicIntensity: number;
}
