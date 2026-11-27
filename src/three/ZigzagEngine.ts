import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { soundEngine } from '../audio/soundEngine';
import {
  CRAFT_SKINS,
  ENDLESS_CHUNK_LENGTH,
  generateEndlessChunk,
  PLAY_MAX_Y,
  PLAY_MIN_Y,
  TRACK_CEILING_Y,
  TRACK_FLOOR_Y,
  WAVE_SLOPE,
} from '../levels/levelData';
import {
  CameraMode,
  ChallengeEvent,
  CheckpointMarker,
  CollectibleItem,
  CraftSkin,
  EnvEventPhase,
  EnvEventType,
  GameMode,
  GamePhase,
  HudSnapshot,
  LevelDefinition,
  LevelObstacle,
  UpgradeLevels,
  WarpEffectType,
} from '../types/game';
import { DEFAULT_UPGRADES } from '../utils/advancements';
import {
  createBlockObstacle,
  createCheckpointMarker,
  createFinishPortal,
  createGoldCube,
  createLaserBar,
  createOrbitMine,
  createPatrolDrone,
  createPlayerCraft,
  createRotaryGate,
  createSawBlade,
  createSpeedGate,
  createSpikeCluster,
  createStarCollectible,
  createStarMine,
  createWarpGate,
  disposeSharedModelCache,
  getBlockSubBoxes,
  PlayerCraftHandles,
} from './models';
import {
  createCheckerboardTexture,
  createDashedBeamTexture,
  createHorizonGradientTexture,
  createNeonGradientRibbonTexture,
  createTrenchGridTexture,
} from './textures';

// Pre-allocated scratch objects for zero-GC render loop
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _tailColor = new THREE.Color();
const _headColor = new THREE.Color();
const _baseColor = new THREE.Color();
const _hsl = { h: 0, s: 0, l: 0 };
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _camCurrentLook = new THREE.Vector3();

const HITBOX_RADIUS = 0.30;
const NEAR_MISS_MARGIN = 0.36;
const PICKUP_RADIUS = 0.95;
const MAX_TRAIL_POINTS = 320;
const PARTICLE_POOL_SIZE = 112;
const BARRAGE_POOL_SIZE = 14;
const ENDLESS_SLAB_LEN = 264;
const SECTOR_DISTANCE = 250;

function distSqToSegment2D(
  pz: number,
  py: number,
  az: number,
  ay: number,
  bz: number,
  by: number
): number {
  const dz = bz - az;
  const dy = by - ay;
  const lenSq = dz * dz + dy * dy;
  if (lenSq <= 1e-6) {
    const ez = pz - az;
    const ey = py - ay;
    return ez * ez + ey * ey;
  }
  const t = THREE.MathUtils.clamp(((pz - az) * dz + (py - ay) * dy) / lenSq, 0, 1);
  const cz = az + t * dz;
  const cy = ay + t * dy;
  const rz = pz - cz;
  const ry = py - cy;
  return rz * rz + ry * ry;
}

interface TrailVertex {
  x: number;
  z: number;
  y: number;
}

interface ParticleState {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  colorHex: number;
}

interface BarrageProjectile {
  active: boolean;
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  vy: number;
  life: number;
}

interface RuntimeObstacle {
  data: LevelObstacle;
  group: THREE.Group;
  animatedSubgroup?: THREE.Group;
  warpMembraneMat?: THREE.MeshBasicMaterial;
  subBoxes?: Array<{ zMin: number; zMax: number; yMin: number; yMax: number }>;
  sawBaseY?: number;
  sawBaseZ?: number;
  sawMotionPhase?: number;
  sawSpawnVelMult?: number;
  triggered?: boolean;
  destroyed?: boolean;
  nearMissed?: boolean;
}

interface RuntimeCollectible {
  data: CollectibleItem;
  group: THREE.Group;
  collected: boolean;
}

interface RuntimeCheckpoint {
  data: CheckpointMarker;
  group: THREE.Group;
  activate: () => void;
  reset: () => void;
  reached: boolean;
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onLevelComplete: (snapshot: HudSnapshot) => void;
  onChallengeEvent?: (event: ChallengeEvent) => void;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class ZigzagEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private bloomEnabled: boolean = true;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmremGenerator: THREE.PMREMGenerator;
  private envRenderTarget: THREE.WebGLRenderTarget;

  private levelGroup: THREE.Group;
  private craft: PlayerCraftHandles;
  private currentSkin: CraftSkin = CRAFT_SKINS[0];

  // Environment color-shifting material & mesh references
  private floorMat: THREE.MeshStandardMaterial | null = null;
  private railMat: THREE.MeshStandardMaterial | null = null;
  private wallRibbonMat: THREE.MeshBasicMaterial | null = null;
  private wallRibbonTex: THREE.CanvasTexture | null = null;
  private towerMat: THREE.MeshStandardMaterial | null = null;
  private floatMat: THREE.MeshStandardMaterial | null = null;
  private floorMesh: THREE.Mesh | null = null;
  private ceilingMesh: THREE.Mesh | null = null;
  private railMeshes: THREE.Mesh[] = [];
  private wallRibbonMeshes: THREE.Mesh[] = [];
  private horizonMesh: THREE.Mesh | null = null;
  private parallaxTowers: THREE.InstancedMesh | null = null;
  private parallaxFloaters: THREE.InstancedMesh | null = null;
  private baseAccentHue: number = 0.52;
  private baseHazardHue: number = 0.95;
  private baseFogColor = new THREE.Color(0x070c22);
  private smoothedIntensity: number = 0.15;
  private huePhase: number = 0;

  // Dynamic 3D gradient ribbon trail buffers
  private trailMeshA: THREE.Mesh;
  private trailMeshB: THREE.Mesh;
  private trailLine: THREE.Line;
  private trailPositionsA: Float32Array;
  private trailPositionsB: Float32Array;
  private trailColorsA: Float32Array;
  private trailColorsB: Float32Array;
  private trailLinePositions: Float32Array;
  private trailVertices: TrailVertex[] = [];

  // Particle & plasma barrage pools
  private particleMesh: THREE.InstancedMesh;
  private particles: ParticleState[] = [];
  private barrageMesh: THREE.InstancedMesh;
  private barrageProjectiles: BarrageProjectile[] = [];
  private barrageCooldown: number = 0;

  // Level runtime objects
  private currentLevel!: LevelDefinition;
  private gameMode: GameMode = 'classic';
  private runtimeObstacles: RuntimeObstacle[] = [];
  private runtimeCollectibles: RuntimeCollectible[] = [];
  private runtimeCheckpoints: RuntimeCheckpoint[] = [];
  private finishPortalRing: THREE.Mesh | null = null;
  private disposableTextures: THREE.Texture[] = [];
  private disposableGeometries: THREE.BufferGeometry[] = [];
  private disposableMaterials: THREE.Material[] = [];

  // Endless / Infinity streaming state
  private nextEndlessChunkIdx: number = 0;
  private nextEndlessZ: number = 36;
  private endlessGridTileUnit: number = 8;
  private endlessSpanZ: number = 288;
  private nextSectorZ: number = SECTOR_DISTANCE;
  private currentSector: number = 1;
  private lastReportedInfinityDist: number = 0;
  private towerInstances: Array<{ x: number; y: number; z: number; w: number; h: number }> = [];
  private floaterInstances: Array<{ x: number; y: number; z: number; s: number; rx: number; ry: number }> = [];

  // Endless Adaptive Difficulty state
  private nearMissHistory: number[] = [];
  private collisionHistory: Array<{ time: number; weight: number }> = [];
  private adaptiveFlowScore: number = 0;
  private adaptiveSawSpacingMult: number = 1.0;
  private adaptiveSawVelocityMult: number = 1.0;
  private endlessCleanRunTime: number = 0;
  private lastAdjustedSpacingMult: number = 1.0;

  // Gameplay state
  private phase: GamePhase = 'ready';
  private cameraMode: CameraMode = 'isometric';
  private isHolding: boolean = false;
  private playerX: number = 0;
  private lastTrailSampleX: number = 0;
  private playerZ: number = 0;
  private playerY: number = 6.0;
  private craftPitch: number = 0;
  private railState: 'free' | 'floor' | 'ceiling' = 'free';
  private activeSpeedMultiplier: number = 1.0;

  // Spatial Warp Gate state
  private xShiftTimer: number = 0;
  private xShiftTarget: number = 0;
  private invertCamTimer: number = 0;
  private mirrorCamTimer: number = 0;
  private activeWarpEffect: WarpEffectType | null = null;
  private camRollAngle: number = 0;
  private camMirrorBlend: number = 0;
  private lastCheckpoint: CheckpointMarker | null = null;
  private score: number = 0;
  private starsEarned: [boolean, boolean, boolean] = [false, false, false];
  private goldCombo: number = 0;
  private goldComboTimer: number = 0;
  private streakMultiplier: number = 1.0;
  private nearMissCount: number = 0;
  private calloutText: string | null = null;
  private calloutTimer: number = 0;
  private attempts: number = 1;
  private crashTimer: number = 0;
  private cameraTrauma: number = 0;
  private traumaDecayRate: number = 1.65;
  private proximityShake: number = 0;
  private camBasePos = new THREE.Vector3();
  private camShakeOffset = new THREE.Vector3();
  private camImpulseOffset = new THREE.Vector3();
  private camImpulseVel = new THREE.Vector3();
  private reducedMotionQuery: MediaQueryList | null = null;
  private prefersReducedMotion: boolean = false;
  private totalElapsed: number = 0;
  private lastHudEmit: number = 0;

  // Special Power & Upgrades state
  private upgradeLevels: UpgradeLevels = { ...DEFAULT_UPGRADES };
  private powerCharge: number = 100;
  private powerActiveRemaining: number = 0;
  private shieldActive: boolean = false;
  private shieldCharges: number = 0;
  private invulnTimer: number = 0;
  private deflectPulseCooldown: number = 0;
  private currentMusicIntensity: number = 0.15;

  // Environmental Events state
  private envEventType: EnvEventType | null = null;
  private envEventPhase: EnvEventPhase = 'idle';
  private envEventTimer: number = 0;
  private nextEnvEventCooldown: number = 13.0;
  private envParticleTimer: number = 0;
  private envBodyFlipAngle: number = 0;

  // Loop & lifecycle
  private frameId: number = 0;
  private lastTimeMs: number = 0;
  private disposed: boolean = false;
  private paused: boolean = false;

  constructor(
    container: HTMLElement,
    initialLevel: LevelDefinition,
    initialSkin: CraftSkin,
    initialMode: GameMode,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.currentSkin = initialSkin;
    this.gameMode = initialMode;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, width / height, 0.2, 260);

    // Post-processing pipeline with UnrealBloomPass (GPU only per software-WebGL guard)
    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.composer.setSize(width, height);

      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.26, // strength — subtle crisp neon halo without washing out the viewport
        0.22, // radius
        0.86  // threshold — only genuine neon highlights bloom
      );
      this.composer.addPass(this.bloomPass);

      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);
    }

    // Studio environment reflection
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRenderTarget = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRenderTarget.texture;

    // 3-point + Hemisphere lighting rig
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e1b4b, 1.15);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    keyLight.position.set(-18, 28, 12);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.25);
    rimLight.position.set(22, 10, -18);
    this.scene.add(rimLight);

    this.levelGroup = new THREE.Group();
    this.scene.add(this.levelGroup);

    // Player craft
    this.craft = createPlayerCraft(this.currentSkin);
    this.scene.add(this.craft.group);

    // 3D Vertex-Colored Neon Gradient Ribbon Trail
    const maxVerts = MAX_TRAIL_POINTS * 2;
    this.trailPositionsA = new Float32Array(maxVerts * 3);
    this.trailPositionsB = new Float32Array(maxVerts * 3);
    this.trailColorsA = new Float32Array(maxVerts * 3);
    this.trailColorsB = new Float32Array(maxVerts * 3);
    this.trailLinePositions = new Float32Array(MAX_TRAIL_POINTS * 3);

    const indices: number[] = [];
    for (let i = 0; i < MAX_TRAIL_POINTS - 1; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }

    const trailGeoA = new THREE.BufferGeometry();
    trailGeoA.setAttribute('position', new THREE.BufferAttribute(this.trailPositionsA, 3));
    trailGeoA.setAttribute('color', new THREE.BufferAttribute(this.trailColorsA, 3));
    trailGeoA.setIndex(indices);
    trailGeoA.setDrawRange(0, 0);

    const trailGeoB = new THREE.BufferGeometry();
    trailGeoB.setAttribute('position', new THREE.BufferAttribute(this.trailPositionsB, 3));
    trailGeoB.setAttribute('color', new THREE.BufferAttribute(this.trailColorsB, 3));
    trailGeoB.setIndex(indices);
    trailGeoB.setDrawRange(0, 0);

    const trailMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.84,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.trailMeshA = new THREE.Mesh(trailGeoA, trailMat);
    this.trailMeshB = new THREE.Mesh(trailGeoB, trailMat);
    this.trailMeshA.frustumCulled = false;
    this.trailMeshB.frustumCulled = false;
    this.scene.add(this.trailMeshA);
    this.scene.add(this.trailMeshB);

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(this.trailLinePositions, 3));
    lineGeo.setDrawRange(0, 0);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    this.trailLine = new THREE.Line(lineGeo, lineMat);
    this.trailLine.frustumCulled = false;
    this.scene.add(this.trailLine);

    // Particle burst InstancedMesh pool
    const pGeo = new THREE.OctahedronGeometry(0.18, 0);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
    });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, PARTICLE_POOL_SIZE);
    this.particleMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(PARTICLE_POOL_SIZE * 3),
      3
    );
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);

    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 0,
        colorHex: 0xffffff,
      });
      _dummy.position.set(0, -100, 0);
      _dummy.scale.setScalar(0);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, _color.setHex(0xffffff));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;

    // Plasma Barrage projectile InstancedMesh pool
    const bGeo = new THREE.CapsuleGeometry(0.14, 0.56, 4, 8);
    bGeo.rotateX(Math.PI / 2);
    const bMat = new THREE.MeshBasicMaterial({
      color: 0xfb923c,
      transparent: true,
      opacity: 0.96,
    });
    this.barrageMesh = new THREE.InstancedMesh(bGeo, bMat, BARRAGE_POOL_SIZE);
    this.barrageMesh.frustumCulled = false;
    this.scene.add(this.barrageMesh);

    for (let i = 0; i < BARRAGE_POOL_SIZE; i++) {
      this.barrageProjectiles.push({
        active: false,
        x: 0,
        z: 0,
        y: -100,
        vx: 0,
        vz: 0,
        vy: 0,
        life: 0,
      });
      _dummy.position.set(0, -100, 0);
      _dummy.scale.setScalar(0);
      _dummy.updateMatrix();
      this.barrageMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.barrageMesh.instanceMatrix.needsUpdate = true;

    // Load initial level
    this.loadLevel(initialLevel, initialMode);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = this.reducedMotionQuery.matches;
      this.reducedMotionQuery.addEventListener('change', this.handleReducedMotionChange);
    }

    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.lastTimeMs = performance.now();
    this.scheduleNextFrame();
  }

  private handleReducedMotionChange = (e: MediaQueryListEvent): void => {
    this.prefersReducedMotion = e.matches;
  };

  private handleVisibilityChange = (): void => {
    if (!document.hidden) {
      this.lastTimeMs = performance.now();
    }
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const pr = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pr);

    if (this.composer) {
      this.composer.setPixelRatio(pr);
      this.composer.setSize(width, height);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.paused = true;
  };

  private handleContextRestored = (): void => {
    this.paused = false;
    this.lastTimeMs = performance.now();
  };

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) {
      this.lastTimeMs = performance.now();
    }
  }

  public setBloomEnabled(enabled: boolean): void {
    this.bloomEnabled = enabled;
    if (this.bloomPass) {
      this.bloomPass.enabled = enabled;
    }
  }

  public isBloomEnabled(): boolean {
    return this.bloomEnabled;
  }

  public setUpgrades(upgrades: UpgradeLevels): void {
    this.upgradeLevels = { ...upgrades };
  }

  public setSkin(skin: CraftSkin): void {
    this.currentSkin = skin;
    this.craft.setSkin(skin);
    this.powerActiveRemaining = 0;
    this.shieldActive = false;
    this.shieldCharges = 0;
    this.craft.shieldMesh.visible = false;
    this.craft.auraRing.visible = false;
    this.craft.laserBeam.visible = false;
    this.updateTrailGeometry();
    this.emitHud(true);
  }

  public setMode(mode: GameMode, level: LevelDefinition): void {
    this.loadLevel(level, mode);
  }

  public toggleCameraMode(): CameraMode {
    this.cameraMode = this.cameraMode === 'isometric' ? 'chase' : 'isometric';
    return this.cameraMode;
  }

  public getCameraMode(): CameraMode {
    return this.cameraMode;
  }

  private pushCallout(text: string): void {
    this.calloutText = text;
    this.calloutTimer = 1.65;
  }

  public activateSpecialPower(): boolean {
    if (this.paused || this.phase !== 'playing') return false;
    if (this.powerCharge < 100 || this.powerActiveRemaining > 0) return false;

    const pType = this.currentSkin.powerType;
    const isDefensive =
      pType === 'shield' ||
      pType === 'phase' ||
      pType === 'aegis' ||
      pType === 'stasis' ||
      pType === 'deflect' ||
      pType === 'revive' ||
      pType === 'slowmo';

    this.powerCharge = 0;
    this.powerActiveRemaining =
      this.currentSkin.powerDuration + (isDefensive ? this.upgradeLevels.plating * 0.7 : 0);

    this.shieldCharges =
      pType === 'aegis'
        ? 2
        : pType === 'shield' || pType === 'stasis' || pType === 'deflect' || pType === 'revive'
          ? 1
          : 0;
    this.shieldActive = this.shieldCharges > 0;
    this.deflectPulseCooldown = 0;

    soundEngine.playSpecialPower(pType);
    this.spawnBurst(this.playerX, this.playerY, this.playerZ, 18, this.currentSkin.coreColor, 10);
    this.triggerCameraShake(0.28, 0, -0.18);
    this.pushCallout(`${this.currentSkin.powerName} Activated`);
    this.callbacks.onChallengeEvent?.({ powersActivated: 1 });

    if (pType === 'pulse') {
      this.triggerEmpBlast(8.8, 100);
    }

    this.emitHud(true);
    return true;
  }

  private addScore(amount: number): void {
    if (amount <= 0) return;
    this.score += amount;
    this.callbacks.onChallengeEvent?.({ goldEarned: amount });
  }

  private getObstacleCenter(obs: RuntimeObstacle): { z: number; y: number } {
    const d = obs.data;
    if (d.type === 'laserBar') {
      return { z: (d.z1 + d.z2) * 0.5, y: (d.y1 + d.y2) * 0.5 };
    }
    if (d.type === 'patrolDrone') {
      const curY = obs.animatedSubgroup ? obs.animatedSubgroup.position.y : d.baseY;
      return { z: d.z, y: curY };
    }
    if (d.type === 'spikes') {
      return {
        z: (d.zStart + d.zEnd) * 0.5,
        y: d.placement === 'floor' ? d.height * 0.5 : TRACK_CEILING_Y - d.height * 0.5,
      };
    }
    if (d.type === 'speedGate' || d.type === 'warpGate') {
      return { z: d.z, y: 6.0 };
    }
    return { z: d.z, y: d.y };
  }

  private isDestructibleObstacle(obs: RuntimeObstacle, includeSpikes: boolean): boolean {
    const t = obs.data.type;
    if (t === 'speedGate' || t === 'warpGate') return false;
    if (t === 'spikes') return includeSpikes;
    return true;
  }

  private triggerEmpBlast(radius: number, bonusPerTarget: number): void {
    const rSq = radius * radius;
    let hitCount = 0;
    for (const obs of this.runtimeObstacles) {
      if (obs.destroyed || !this.isDestructibleObstacle(obs, false)) continue;
      const center = this.getObstacleCenter(obs);
      const dz = center.z - this.playerZ;
      const dy = center.y - this.playerY;
      if (dz * dz + dy * dy <= rSq) {
        obs.destroyed = true;
        obs.group.visible = false;
        hitCount += 1;
        this.addScore(bonusPerTarget);
        this.spawnBurst(0, center.y, center.z, 18, this.currentSkin.coreColor, 10);
      }
    }
    if (hitCount > 0) {
      this.callbacks.onChallengeEvent?.({ hazardsShattered: hitCount });
      this.triggerCameraShake(Math.min(0.75, 0.28 + hitCount * 0.1), 0, -0.25);
      soundEngine.playCollectGold(5);
      this.pushCallout(`EMP Shattered x${hitCount} (+${hitCount * bonusPerTarget})`);
    }
  }

  private resetBarrageProjectiles(): void {
    this.barrageCooldown = 0;
    for (let i = 0; i < BARRAGE_POOL_SIZE; i++) {
      this.barrageProjectiles[i].active = false;
      _dummy.position.set(0, -100, 0);
      _dummy.scale.setScalar(0);
      _dummy.updateMatrix();
      this.barrageMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.barrageMesh.instanceMatrix.needsUpdate = true;
  }

  public setHolding(holding: boolean): void {
    if (this.paused) return;

    if (this.phase === 'ready') {
      if (holding) {
        this.phase = 'playing';
        this.isHolding = true;
        this.railState = 'free';
        this.trailVertices = [{ x: this.playerX, z: this.playerZ, y: this.playerY }];
        this.lastTrailSampleX = this.playerX;
        soundEngine.playTurn(this.gameMode !== 'inverted');
        this.emitHud(true);
      }
      return;
    }

    if (this.phase === 'crashed') {
      if (holding && this.crashTimer >= 0.25) {
        this.attempts += 1;
        if (this.gameMode === 'endless') {
          this.loadLevel(this.currentLevel, 'endless', true);
        } else {
          this.respawnAtCheckpoint(this.gameMode === 'hardcore');
        }
        this.phase = 'playing';
        this.isHolding = true;
        this.railState = 'free';
        this.trailVertices = [{ x: this.playerX, z: this.playerZ, y: this.playerY }];
        this.lastTrailSampleX = this.playerX;
        soundEngine.playTurn(this.gameMode !== 'inverted');
        this.emitHud(true);
      }
      return;
    }

    if (this.phase !== 'playing') return;

    if (this.isHolding !== holding) {
      this.isHolding = holding;
      this.trailVertices.push({ x: this.playerX, z: this.playerZ, y: this.playerY });
      this.lastTrailSampleX = this.playerX;
      if (this.trailVertices.length > MAX_TRAIL_POINTS - 2) {
        this.trailVertices.shift();
      }
      const ascending = this.gameMode === 'inverted' ? !holding : holding;
      soundEngine.playTurn(ascending);
    }
  }

  public restartFull(): void {
    if (this.gameMode === 'endless') {
      this.attempts += 1;
      this.loadLevel(this.currentLevel, 'endless', true);
      return;
    }

    this.lastCheckpoint = null;
    this.attempts += 1;
    this.score = 0;
    this.starsEarned = [false, false, false];
    this.goldCombo = 0;
    this.goldComboTimer = 0;
    this.streakMultiplier = 1.0;
    this.nearMissCount = 0;
    this.calloutText = null;
    this.calloutTimer = 0;
    this.activeSpeedMultiplier = 1.0;

    for (const item of this.runtimeCollectibles) {
      item.collected = false;
      item.group.visible = true;
    }
    for (const obs of this.runtimeObstacles) {
      obs.triggered = false;
      obs.destroyed = false;
      obs.nearMissed = false;
      obs.group.visible = true;
    }
    for (const cp of this.runtimeCheckpoints) {
      cp.reached = false;
      cp.reset();
    }

    this.respawnAtCheckpoint(true);
  }

  private respawnAtCheckpoint(fullReset = false): void {
    const startZ = !fullReset && this.lastCheckpoint ? this.lastCheckpoint.z : 0;
    const startY = !fullReset && this.lastCheckpoint ? this.lastCheckpoint.safeY : 6.0;

    this.playerX = 0;
    this.lastTrailSampleX = 0;
    this.playerZ = startZ;
    this.playerY = startY;
    this.craftPitch = 0;
    this.isHolding = false;
    this.railState = 'free';
    this.phase = 'ready';
    this.resetCameraShake();
    this.crashTimer = 0;

    this.xShiftTimer = 0;
    this.xShiftTarget = 0;
    this.invertCamTimer = 0;
    this.mirrorCamTimer = 0;
    this.activeWarpEffect = null;
    this.camRollAngle = 0;
    this.camMirrorBlend = 0;

    this.powerCharge = 100;
    this.powerActiveRemaining = 0;
    this.shieldActive = false;
    this.shieldCharges = 0;
    this.invulnTimer = 0;
    this.deflectPulseCooldown = 0;
    this.envEventType = null;
    this.envEventPhase = 'idle';
    this.envEventTimer = 0;
    this.nextEnvEventCooldown = 11.5 + Math.random() * 5.0;
    this.envBodyFlipAngle = 0;
    this.craft.bodyGroup.rotation.z = 0;
    this.craft.shieldMesh.visible = false;
    this.craft.auraRing.visible = false;
    this.craft.laserBeam.visible = false;
    this.resetBarrageProjectiles();

    let mult = 1.0;
    for (const obs of this.runtimeObstacles) {
      if (obs.data.type === 'speedGate' && obs.data.z <= startZ) {
        mult = obs.data.multiplier;
        obs.triggered = true;
      } else if (obs.data.type === 'speedGate' || obs.data.type === 'warpGate') {
        obs.triggered = obs.data.type === 'warpGate' && obs.data.z <= startZ;
      }
    }
    this.activeSpeedMultiplier = mult;

    this.craft.group.visible = true;
    this.craft.group.position.set(0, this.playerY, this.playerZ);
    this.craft.group.rotation.set(0, 0, 0);

    this.trailVertices = [{ x: 0, z: this.playerZ, y: this.playerY }];
    this.updateTrailGeometry();
    this.snapCameraToPlayer();
    this.emitHud(true);
  }

  public loadLevel(
    level: LevelDefinition,
    mode: GameMode = this.gameMode,
    preserveAttempts = false
  ): void {
    const wasEndless = this.gameMode === 'endless';
    this.currentLevel = level;
    this.gameMode = mode;
    this.clearLevelGroup();

    const { theme } = level;
    this.baseFogColor.setHex(theme.fogHex);
    _baseColor.setHex(theme.trenchGlowHex);
    _baseColor.getHSL(_hsl);
    this.baseAccentHue = _hsl.h;

    _baseColor.setHex(theme.hazardHex);
    _baseColor.getHSL(_hsl);
    this.baseHazardHue = _hsl.h;

    this.scene.background = this.baseFogColor.clone();
    this.scene.fog = new THREE.FogExp2(theme.fogHex, 0.0115);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const gridTex = createTrenchGridTexture(theme.trenchGlowHex, theme.hazardHex, maxAniso);
    const ribbonTex = createNeonGradientRibbonTexture(theme.accentHex, theme.hazardHex, maxAniso);
    const horizonTex = createHorizonGradientTexture(theme.accentHex, theme.hazardHex);
    const checkerTex = createCheckerboardTexture(maxAniso);
    const beamTex = createDashedBeamTexture(theme.accentHex);
    this.wallRibbonTex = ribbonTex;
    this.disposableTextures.push(gridTex, ribbonTex, horizonTex, checkerTex, beamTex);

    const isEndless = mode === 'endless';
    const trackStartZ = -24;
    const trackEndZ = isEndless ? ENDLESS_SLAB_LEN : level.length + 60;
    const trackLen = trackEndZ - trackStartZ;
    const trackCenterZ = (trackStartZ + trackEndZ) * 0.5;

    // Floor & Ceiling cyber-trench slabs with neon gradient grid
    gridTex.repeat.set(2, trackLen / 8);
    this.endlessGridTileUnit = 8;
    this.endlessSpanZ = trackLen;
    const slabGeo = new THREE.PlaneGeometry(8.5, trackLen);
    this.disposableGeometries.push(slabGeo);

    this.floorMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      roughness: 0.42,
      metalness: 0.55,
      emissive: theme.trenchGlowHex,
      emissiveMap: gridTex,
      emissiveIntensity: 0.28,
    });
    this.disposableMaterials.push(this.floorMat);

    this.floorMesh = new THREE.Mesh(slabGeo, this.floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.set(0, TRACK_FLOOR_Y, trackCenterZ);
    this.levelGroup.add(this.floorMesh);

    this.ceilingMesh = new THREE.Mesh(slabGeo, this.floorMat);
    this.ceilingMesh.rotation.x = Math.PI / 2;
    this.ceilingMesh.position.set(0, TRACK_CEILING_Y, trackCenterZ);
    this.levelGroup.add(this.ceilingMesh);

    // Glowing boundary prism rails along floor & ceiling
    const railGeo = new THREE.BoxGeometry(0.18, 0.18, trackLen);
    this.railMat = new THREE.MeshStandardMaterial({
      color: theme.accentHex,
      emissive: theme.accentHex,
      emissiveIntensity: 0.85,
      roughness: 0.25,
      metalness: 0.5,
    });
    this.disposableGeometries.push(railGeo);
    this.disposableMaterials.push(this.railMat);

    this.railMeshes = [];
    for (const x of [-4.25, 4.25]) {
      for (const y of [TRACK_FLOOR_Y + 0.09, TRACK_CEILING_Y - 0.09]) {
        const rail = new THREE.Mesh(railGeo, this.railMat);
        rail.position.set(x, y, trackCenterZ);
        this.levelGroup.add(rail);
        this.railMeshes.push(rail);
      }
    }

    // Subtle Flowing Neon Gradient Energy Ribbons along outer trench curbs
    ribbonTex.repeat.set(trackLen / 24, 1);
    const wallRibbonGeo = new THREE.PlaneGeometry(trackLen, 0.52);
    wallRibbonGeo.rotateY(Math.PI / 2);
    this.wallRibbonMat = new THREE.MeshBasicMaterial({
      map: ribbonTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.disposableGeometries.push(wallRibbonGeo);
    this.disposableMaterials.push(this.wallRibbonMat);

    this.wallRibbonMeshes = [];
    for (const x of [-4.32, 4.32]) {
      for (const y of [TRACK_FLOOR_Y + 0.3, TRACK_CEILING_Y - 0.3]) {
        const wallRibbon = new THREE.Mesh(wallRibbonGeo, this.wallRibbonMat);
        wallRibbon.position.set(x, y, trackCenterZ);
        this.levelGroup.add(wallRibbon);
        this.wallRibbonMeshes.push(wallRibbon);
      }
    }

    // Distant Neon Gradient Horizon Backdrop
    const horizonGeo = new THREE.PlaneGeometry(96, 48);
    const horizonMat = new THREE.MeshBasicMaterial({
      map: horizonTex,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.disposableGeometries.push(horizonGeo);
    this.disposableMaterials.push(horizonMat);
    this.horizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
    this.horizonMesh.position.set(8, 6, 155);
    this.horizonMesh.rotation.y = -0.35;
    this.levelGroup.add(this.horizonMesh);

    // Parallax Cyber-Canyon Architecture
    this.buildParallaxCanyon(trackStartZ, trackEndZ, theme.accentHex, theme.hazardHex);

    this.runtimeObstacles = [];
    this.runtimeCollectibles = [];
    this.runtimeCheckpoints = [];
    this.finishPortalRing = null;

    this.resetAdaptiveDifficulty(!(isEndless && preserveAttempts && wasEndless));

    if (isEndless) {
      this.nextEndlessChunkIdx = 0;
      this.nextEndlessZ = 34;
      this.nextSectorZ = SECTOR_DISTANCE;
      this.currentSector = 1;
      this.streamEndlessChunks(0);
    } else {
      for (const obs of level.obstacles) {
        this.addObstacleToScene(obs, theme.accentHex, theme.hazardHex);
      }
      for (const item of level.collectibles) {
        this.addCollectibleToScene(item);
      }
      if (mode !== 'hardcore') {
        for (const cp of level.checkpoints) {
          const marker = createCheckpointMarker(cp.z, beamTex, theme.accentHex);
          this.levelGroup.add(marker.group);
          this.runtimeCheckpoints.push({
            data: cp,
            group: marker.group,
            activate: marker.activate,
            reset: marker.reset,
            reached: false,
          });
        }
      }
      const portal = createFinishPortal(level.length, checkerTex, theme.accentHex);
      this.levelGroup.add(portal.group);
      this.finishPortalRing = portal.ring;
    }

    if (!preserveAttempts) {
      this.attempts = 1;
    }
    this.score = 0;
    this.lastReportedInfinityDist = 0;
    this.starsEarned = [false, false, false];
    this.lastCheckpoint = null;
    this.goldCombo = 0;
    this.goldComboTimer = 0;
    this.streakMultiplier = 1.0;
    this.nearMissCount = 0;
    this.calloutText = null;
    this.calloutTimer = 0;
    this.respawnAtCheckpoint(true);
  }

  private addObstacleToScene(obs: LevelObstacle, accentHex: number, hazardHex: number): void {
    let group: THREE.Group;
    let animatedSubgroup: THREE.Group | undefined;
    let warpMembraneMat: THREE.MeshBasicMaterial | undefined;
    let subBoxes: Array<{ zMin: number; zMax: number; yMin: number; yMax: number }> | undefined;

    if (obs.type === 'saw') {
      group = createSawBlade(obs, hazardHex);
    } else if (obs.type === 'starMine') {
      group = createStarMine(obs, hazardHex);
    } else if (obs.type === 'spikes') {
      group = createSpikeCluster(obs, hazardHex);
    } else if (obs.type === 'block') {
      group = createBlockObstacle(obs, accentHex, hazardHex);
      subBoxes = getBlockSubBoxes(obs);
    } else if (obs.type === 'laserBar') {
      group = createLaserBar(obs, hazardHex);
    } else if (obs.type === 'patrolDrone') {
      const res = createPatrolDrone(obs, accentHex, hazardHex);
      group = res.group;
      animatedSubgroup = res.droneBody;
    } else if (obs.type === 'rotaryGate') {
      const res = createRotaryGate(obs, accentHex, hazardHex);
      group = res.group;
      animatedSubgroup = res.rotor;
    } else if (obs.type === 'orbitMine') {
      const res = createOrbitMine(obs, accentHex, hazardHex);
      group = res.group;
      animatedSubgroup = res.rotor;
    } else if (obs.type === 'warpGate') {
      const res = createWarpGate(obs);
      group = res.group;
      animatedSubgroup = res.rotor;
      warpMembraneMat = res.membraneMat;
    } else {
      group = createSpeedGate(obs.z, obs.multiplier);
    }

    this.levelGroup.add(group);
    this.runtimeObstacles.push({
      data: obs,
      group,
      animatedSubgroup,
      warpMembraneMat,
      subBoxes,
      sawBaseY: obs.type === 'saw' ? obs.y : undefined,
      sawBaseZ: obs.type === 'saw' ? obs.z : undefined,
      sawMotionPhase: obs.type === 'saw' ? (obs.driftPhase ?? 0) : undefined,
      sawSpawnVelMult:
        obs.type === 'saw' && this.gameMode === 'endless'
          ? this.adaptiveSawVelocityMult
          : undefined,
      triggered: false,
      destroyed: false,
      nearMissed: false,
    });
  }

  private addCollectibleToScene(item: CollectibleItem): void {
    const group = item.type === 'gold' ? createGoldCube() : createStarCollectible();
    group.position.set(0, item.y, item.z);
    this.levelGroup.add(group);
    this.runtimeCollectibles.push({ data: item, group, collected: false });
  }

  private disposeGroupResources(group: THREE.Group): void {
    this.levelGroup.remove(group);
    group.traverse((obj) => {
      const renderObj = obj as THREE.Mesh | THREE.LineSegments;
      if ((renderObj as THREE.Mesh).isMesh || (renderObj as THREE.LineSegments).isLineSegments) {
        if (renderObj.geometry && !renderObj.geometry.userData?.sharedResource) {
          renderObj.geometry.dispose();
        }
        const mat = renderObj.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            if (m && !m.userData?.sharedResource) m.dispose();
          });
        } else if (mat && !mat.userData?.sharedResource) {
          mat.dispose();
        }
      }
    });
  }

  private streamEndlessChunks(currentZ: number): void {
    const horizonZ = currentZ + 170;
    while (this.nextEndlessZ < horizonZ) {
      const { obstacles, collectibles } = generateEndlessChunk(
        this.nextEndlessChunkIdx,
        this.nextEndlessZ,
        {
          sawSpacingMult: this.adaptiveSawSpacingMult,
          sawVelocityMult: this.adaptiveSawVelocityMult,
        }
      );
      for (const obs of obstacles) {
        this.addObstacleToScene(
          obs,
          this.currentLevel.theme.accentHex,
          this.currentLevel.theme.hazardHex
        );
      }
      for (const item of collectibles) {
        this.addCollectibleToScene(item);
      }
      const adaptiveChunkDelta = Math.round((this.adaptiveSawSpacingMult - 1.0) * 20);
      this.nextEndlessChunkIdx += 1;
      this.nextEndlessZ += ENDLESS_CHUNK_LENGTH + adaptiveChunkDelta;
    }

    const cullZ = currentZ - 42;
    this.runtimeObstacles = this.runtimeObstacles.filter((obs) => {
      const d = obs.data;
      const obsEnd =
        d.type === 'spikes'
          ? d.zEnd
          : d.type === 'laserBar'
            ? Math.max(d.z1, d.z2) + 4
            : d.z + 6;
      if (obsEnd < cullZ) {
        this.disposeGroupResources(obs.group);
        return false;
      }
      return true;
    });

    this.runtimeCollectibles = this.runtimeCollectibles.filter((item) => {
      if (item.data.z < cullZ) {
        this.disposeGroupResources(item.group);
        return false;
      }
      return true;
    });
  }

  private buildParallaxCanyon(
    zStart: number,
    zEnd: number,
    accentHex: number,
    hazardHex: number
  ): void {
    const towerCount = Math.floor((zEnd - zStart) / 9);
    const towerGeo = new THREE.BoxGeometry(1, 1, 1);
    this.towerMat = new THREE.MeshStandardMaterial({
      color: 0x0b122b,
      metalness: 0.8,
      roughness: 0.35,
      emissive: accentHex,
      emissiveIntensity: 0.22,
    });
    this.disposableGeometries.push(towerGeo);
    this.disposableMaterials.push(this.towerMat);

    const towers = new THREE.InstancedMesh(towerGeo, this.towerMat, towerCount);
    towers.frustumCulled = false;
    this.towerInstances = [];
    let idx = 0;
    for (let i = 0; i < towerCount; i++) {
      const z = zStart + i * 9 + ((i * 7) % 5);
      const x = 11 + ((i * 13) % 24);
      const h = 14 + ((i * 19) % 26);
      const w = 2.4 + ((i * 3) % 4);
      const y = h * 0.5 - 12;
      this.towerInstances.push({ x, y, z, w, h });
      _dummy.position.set(x, y, z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(w, h, w);
      _dummy.updateMatrix();
      towers.setMatrixAt(idx++, _dummy.matrix);
    }
    towers.instanceMatrix.needsUpdate = true;
    towers.computeBoundingSphere();
    this.parallaxTowers = towers;
    this.levelGroup.add(towers);

    const floatCount = Math.floor((zEnd - zStart) / 11);
    const floatGeo = new THREE.OctahedronGeometry(0.95, 0);
    this.floatMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: hazardHex,
      emissiveIntensity: 0.68,
      metalness: 0.7,
      roughness: 0.25,
    });
    this.disposableGeometries.push(floatGeo);
    this.disposableMaterials.push(this.floatMat);

    const floaters = new THREE.InstancedMesh(floatGeo, this.floatMat, floatCount);
    floaters.frustumCulled = false;
    floaters.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(floatCount * 3),
      3
    );
    this.floaterInstances = [];

    for (let i = 0; i < floatCount; i++) {
      const z = zStart + i * 11;
      const isBelow = i % 2 === 0;
      const x = isBelow ? ((i * 11) % 24) - 10 : 9 + ((i * 17) % 18);
      const y = isBelow ? -4 - ((i * 5) % 8) : 16 + ((i * 7) % 12);
      const s = 0.65 + ((i * 3) % 5) * 0.22;
      const rx = i * 0.4;
      const ry = i * 0.7;

      this.floaterInstances.push({ x, y, z, s, rx, ry });
      _dummy.position.set(x, y, z);
      _dummy.rotation.set(rx, ry, 0);
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();
      floaters.setMatrixAt(i, _dummy.matrix);

      _color.setHex(i % 3 === 0 ? accentHex : hazardHex);
      floaters.setColorAt(i, _color);
    }
    floaters.instanceMatrix.needsUpdate = true;
    floaters.instanceColor.needsUpdate = true;
    floaters.computeBoundingSphere();
    this.parallaxFloaters = floaters;
    this.levelGroup.add(floaters);
  }

  private clearLevelGroup(): void {
    while (this.levelGroup.children.length > 0) {
      this.levelGroup.remove(this.levelGroup.children[0]);
    }
    this.levelGroup.traverse((obj) => {
      const renderObj = obj as THREE.Mesh | THREE.LineSegments;
      if ((renderObj as THREE.Mesh).isMesh || (renderObj as THREE.LineSegments).isLineSegments) {
        if (renderObj.geometry && !renderObj.geometry.userData?.sharedResource) {
          renderObj.geometry.dispose();
        }
        const mat = renderObj.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            if (m && !m.userData?.sharedResource) m.dispose();
          });
        } else if (mat && !mat.userData?.sharedResource) {
          mat.dispose();
        }
      }
    });
    for (const tex of this.disposableTextures) tex.dispose();
    for (const geo of this.disposableGeometries) geo.dispose();
    for (const mat of this.disposableMaterials) mat.dispose();

    this.disposableTextures = [];
    this.disposableGeometries = [];
    this.disposableMaterials = [];
    this.floorMat = null;
    this.railMat = null;
    this.wallRibbonMat = null;
    this.wallRibbonTex = null;
    this.towerMat = null;
    this.floatMat = null;
    this.floorMesh = null;
    this.ceilingMesh = null;
    this.railMeshes = [];
    this.wallRibbonMeshes = [];
    this.horizonMesh = null;
    this.parallaxTowers = null;
    this.parallaxFloaters = null;
  }

  private updateDynamicEnvironmentColors(dt: number, intensity: number): void {
    this.smoothedIntensity = THREE.MathUtils.damp(this.smoothedIntensity, intensity, 10, dt);
    const speedExcess = Math.max(0, this.activeSpeedMultiplier - 1.0);
    const speedFactor = this.activeSpeedMultiplier;

    this.huePhase = (this.huePhase + dt * (0.045 + speedExcess * 0.3)) % 1.0;
    const sectorHueShift = this.gameMode === 'endless' ? (this.currentSector - 1) * 0.14 : 0;
    const reactiveHueShift =
      (this.huePhase * 0.24 + speedExcess * 0.45 + this.smoothedIntensity * 0.08 + sectorHueShift) % 1.0;

    const gridHue = (this.baseAccentHue + reactiveHueShift) % 1.0;
    const prismHue = (this.baseAccentHue + reactiveHueShift + 0.1) % 1.0;
    const towerHue = (this.baseHazardHue + reactiveHueShift * 0.7) % 1.0;

    if (this.floorMat) {
      this.floorMat.emissive.setHSL(
        gridHue,
        0.88,
        0.44 + this.smoothedIntensity * 0.08
      );
      this.floorMat.emissiveIntensity =
        0.24 + this.smoothedIntensity * 0.24 + speedExcess * 0.16;
    }

    if (this.railMat) {
      const l = 0.45 + this.smoothedIntensity * 0.08;
      this.railMat.color.setHSL(prismHue, 0.92, l);
      this.railMat.emissive.setHSL(prismHue, 0.92, l);
      this.railMat.emissiveIntensity =
        0.74 + this.smoothedIntensity * 0.36 + speedExcess * 0.24;
    }

    if (this.wallRibbonTex && this.wallRibbonMat) {
      this.wallRibbonTex.offset.x = (this.wallRibbonTex.offset.x + dt * (0.12 + speedExcess * 0.25)) % 1;
      this.wallRibbonMat.opacity = 0.2 + this.smoothedIntensity * 0.14;
    }

    if (this.towerMat) {
      this.towerMat.emissive.setHSL(gridHue, 0.8, 0.4);
      this.towerMat.emissiveIntensity = 0.08 + this.smoothedIntensity * 0.12;
    }

    if (this.floatMat) {
      this.floatMat.emissive.setHSL(towerHue, 0.88, 0.48);
      this.floatMat.emissiveIntensity =
        0.3 + this.smoothedIntensity * 0.35 + (speedFactor > 1.2 ? 0.16 : 0);
    }

    if (this.bloomPass && this.bloomEnabled) {
      const powerBoost = this.powerActiveRemaining > 0 ? 0.08 : 0;
      const targetBloom = 0.24 + this.smoothedIntensity * 0.12 + speedExcess * 0.14 + powerBoost;
      this.bloomPass.strength = THREE.MathUtils.damp(this.bloomPass.strength, targetBloom, 8, dt);
    }

    if (this.scene.fog && this.scene.background instanceof THREE.Color) {
      this.baseFogColor.getHSL(_hsl);
      let targetHue = (_hsl.h + reactiveHueShift * 0.15) % 1.0;
      let targetSat = Math.min(0.75, _hsl.s + 0.06);
      let targetLight = Math.min(0.068, _hsl.l + this.smoothedIntensity * 0.014);

      if (this.envEventPhase === 'active') {
        if (this.envEventType === 'gravityShift') {
          targetHue = 0.94;
          targetSat = 0.72;
          targetLight = 0.075;
        } else if (this.envEventType === 'glitchStorm') {
          targetHue = (Math.floor(this.totalElapsed * 14) % 2 === 0) ? 0.82 : 0.52;
          targetSat = 0.78;
          targetLight = 0.072;
        } else if (this.envEventType === 'solarFlare') {
          targetHue = 0.1;
          targetSat = 0.76;
          targetLight = 0.075;
        } else if (this.envEventType === 'magTurbulence') {
          targetHue = 0.57;
          targetSat = 0.75;
          targetLight = 0.072;
        }
      } else if (this.powerActiveRemaining > 0 && (this.currentSkin.powerType === 'slowmo' || this.currentSkin.powerType === 'stasis')) {
        targetHue = 0.76;
      }

      _color.setHSL(targetHue, targetSat, targetLight);
      this.scene.background.lerp(_color, Math.min(1, dt * 6));
      (this.scene.fog as THREE.FogExp2).color.copy(this.scene.background);
    }
  }

  private spawnBurst(x: number, y: number, z: number, count: number, colorHex: number, speed = 8): void {
    let spawned = 0;
    for (let i = 0; i < PARTICLE_POOL_SIZE && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;
        const spd = speed * (0.45 + Math.random() * 0.85);
        p.vx = Math.cos(theta) * Math.cos(phi) * spd;
        p.vy = Math.sin(phi) * spd + 1.5;
        p.vz = Math.sin(theta) * Math.cos(phi) * spd;
        p.maxLife = 0.35 + Math.random() * 0.35;
        p.life = p.maxLife;
        p.scale = 0.7 + Math.random() * 0.9;
        p.colorHex = colorHex;
        spawned++;
      }
    }
  }

  private updateParticles(dt: number): void {
    let dirty = false;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _dummy.position.set(0, -100, 0);
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      p.vy -= 14 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      const t = p.life / p.maxLife;
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(p.life * 8, p.life * 6, 0);
      _dummy.scale.setScalar(p.scale * t);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, _color.setHex(p.colorHex));
    }

    if (dirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) {
        this.particleMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  private updateTrailGeometry(): void {
    while (
      this.trailVertices.length > 2 &&
      this.trailVertices[1].z < this.playerZ - 58
    ) {
      this.trailVertices.shift();
    }

    const ptsCount = this.trailVertices.length;
    if (ptsCount === 0) {
      this.trailMeshA.geometry.setDrawRange(0, 0);
      this.trailMeshB.geometry.setDrawRange(0, 0);
      this.trailLine.geometry.setDrawRange(0, 0);
      return;
    }

    const totalPts = Math.min(ptsCount + 1, MAX_TRAIL_POINTS);
    const halfW = 0.24;
    const halfH = 0.15;

    // Gradient endpoints: tail shifts hue from skin trailColor toward magenta/violet, head glows bright coreColor
    _headColor.setHex(this.currentSkin.coreColor);
    _tailColor.setHex(this.currentSkin.trailColor).getHSL(_hsl);
    _tailColor.setHSL((_hsl.h + 0.26) % 1.0, 0.95, 0.55);

    for (let i = 0; i < totalPts; i++) {
      const pt =
        i < ptsCount
          ? this.trailVertices[i]
          : { x: this.playerX, z: this.playerZ, y: this.playerY };
      const t = totalPts <= 1 ? 1 : i / (totalPts - 1);
      _color.copy(_tailColor).lerp(_headColor, t);

      const idx = i * 6;
      this.trailPositionsA[idx] = pt.x - halfW;
      this.trailPositionsA[idx + 1] = pt.y;
      this.trailPositionsA[idx + 2] = pt.z;

      this.trailPositionsA[idx + 3] = pt.x + halfW;
      this.trailPositionsA[idx + 4] = pt.y;
      this.trailPositionsA[idx + 5] = pt.z;

      this.trailPositionsB[idx] = pt.x;
      this.trailPositionsB[idx + 1] = pt.y - halfH;
      this.trailPositionsB[idx + 2] = pt.z;

      this.trailPositionsB[idx + 3] = pt.x;
      this.trailPositionsB[idx + 4] = pt.y + halfH;
      this.trailPositionsB[idx + 5] = pt.z;

      // Write vertex gradient colors for both sides of each ribbon vertex
      this.trailColorsA[idx] = _color.r;
      this.trailColorsA[idx + 1] = _color.g;
      this.trailColorsA[idx + 2] = _color.b;
      this.trailColorsA[idx + 3] = _color.r;
      this.trailColorsA[idx + 4] = _color.g;
      this.trailColorsA[idx + 5] = _color.b;

      this.trailColorsB[idx] = _color.r;
      this.trailColorsB[idx + 1] = _color.g;
      this.trailColorsB[idx + 2] = _color.b;
      this.trailColorsB[idx + 3] = _color.r;
      this.trailColorsB[idx + 4] = _color.g;
      this.trailColorsB[idx + 5] = _color.b;

      const lIdx = i * 3;
      this.trailLinePositions[lIdx] = pt.x;
      this.trailLinePositions[lIdx + 1] = pt.y;
      this.trailLinePositions[lIdx + 2] = pt.z;
    }

    const drawIndices = Math.max(0, (totalPts - 1) * 6);
    this.trailMeshA.geometry.attributes.position.needsUpdate = true;
    this.trailMeshA.geometry.attributes.color.needsUpdate = true;
    this.trailMeshA.geometry.setDrawRange(0, drawIndices);

    this.trailMeshB.geometry.attributes.position.needsUpdate = true;
    this.trailMeshB.geometry.attributes.color.needsUpdate = true;
    this.trailMeshB.geometry.setDrawRange(0, drawIndices);

    this.trailLine.geometry.attributes.position.needsUpdate = true;
    this.trailLine.geometry.setDrawRange(0, totalPts);
  }

  private checkHazardCollision(z: number, y: number): RuntimeObstacle | null {
    const r = HITBOX_RADIUS;
    const rSq = r * r;
    const nmR = r + NEAR_MISS_MARGIN;
    const nmRSq = nmR * nmR;

    for (const obs of this.runtimeObstacles) {
      if (obs.destroyed) continue;
      const data = obs.data;
      if (data.type === 'saw') {
        if (Math.abs(z - data.z) > data.radius + nmR) continue;
        const dz = z - data.z;
        const dy = y - data.y;
        const distSq = dz * dz + dy * dy;
        const effR = data.radius * 0.78 + r;
        if (distSq < effR * effR) return obs;

        const nearR = data.radius * 0.78 + nmR;
        if (!obs.nearMissed && distSq < nearR * nearR) {
          obs.nearMissed = true;
          this.awardNearMiss();
        }
      } else if (data.type === 'starMine') {
        if (Math.abs(z - data.z) > data.radius + nmR) continue;
        const dz = z - data.z;
        const dy = y - data.y;
        const distSq = dz * dz + dy * dy;
        const effR = data.radius * 0.68 + r;
        if (distSq < effR * effR) return obs;

        const nearR = data.radius * 0.68 + nmR;
        if (!obs.nearMissed && distSq < nearR * nearR) {
          obs.nearMissed = true;
          this.awardNearMiss();
        }
      } else if (data.type === 'block' && obs.subBoxes) {
        if (Math.abs(z - data.z) > data.width * 0.6 + nmR) continue;
        for (const b of obs.subBoxes) {
          const inset = 0.06;
          const cz = THREE.MathUtils.clamp(z, b.zMin + inset, b.zMax - inset);
          const cy = THREE.MathUtils.clamp(y, b.yMin + inset, b.yMax - inset);
          const dz = z - cz;
          const dy = y - cy;
          const distSq = dz * dz + dy * dy;
          if (distSq < rSq) return obs;
          if (!obs.nearMissed && distSq < nmRSq) {
            obs.nearMissed = true;
            this.awardNearMiss();
          }
        }
      } else if (data.type === 'spikes') {
        if (z < data.zStart - r * 0.5 || z > data.zEnd + r * 0.5) continue;
        const forgivingH = data.height * 0.78;
        if (data.placement === 'floor') {
          if (y - r < forgivingH) return obs;
          if (!obs.nearMissed && y - nmR < forgivingH) {
            obs.nearMissed = true;
            this.awardNearMiss();
          }
        } else {
          if (y + r > TRACK_CEILING_Y - forgivingH) return obs;
          if (!obs.nearMissed && y + nmR > TRACK_CEILING_Y - forgivingH) {
            obs.nearMissed = true;
            this.awardNearMiss();
          }
        }
      } else if (data.type === 'laserBar') {
        const minZ = Math.min(data.z1, data.z2) - nmR - 0.35;
        const maxZ = Math.max(data.z1, data.z2) + nmR + 0.35;
        if (z < minZ || z > maxZ) continue;
        const distSq = distSqToSegment2D(z, y, data.z1, data.y1, data.z2, data.y2);
        const effR = (data.thickness ?? 0.24) * 0.65 + r;
        if (distSq < effR * effR) return obs;

        const nearR = effR + NEAR_MISS_MARGIN;
        if (!obs.nearMissed && distSq < nearR * nearR) {
          obs.nearMissed = true;
          this.awardNearMiss();
        }
      } else if (data.type === 'patrolDrone') {
        if (Math.abs(z - data.z) > data.radius + nmR) continue;
        const droneY = obs.animatedSubgroup ? obs.animatedSubgroup.position.y : data.baseY;
        const dz = z - data.z;
        const dy = y - droneY;
        const distSq = dz * dz + dy * dy;
        const effR = data.radius * 0.8 + r;
        if (distSq < effR * effR) return obs;

        const nearR = effR + NEAR_MISS_MARGIN;
        if (!obs.nearMissed && distSq < nearR * nearR) {
          obs.nearMissed = true;
          this.awardNearMiss();
        }
      } else if (data.type === 'rotaryGate') {
        if (Math.abs(z - data.z) > data.armLength + nmR + 0.3) continue;
        const rot = obs.animatedSubgroup ? obs.animatedSubgroup.rotation.x : 0;
        const blades = data.blades ?? 2;

        // Center hub check
        const dzHub = z - data.z;
        const dyHub = y - data.y;
        const hubDistSq = dzHub * dzHub + dyHub * dyHub;
        const hubEffR = 0.42 + r;
        if (hubDistSq < hubEffR * hubEffR) return obs;

        for (let i = 0; i < blades; i++) {
          const alpha = rot + (i / blades) * Math.PI * 2;
          const tipZ = data.z + data.armLength * Math.sin(alpha);
          const tipY = data.y + data.armLength * Math.cos(alpha);
          const distSq = distSqToSegment2D(z, y, data.z, data.y, tipZ, tipY);
          const effR = 0.14 + r;
          if (distSq < effR * effR) return obs;

          const nearR = effR + NEAR_MISS_MARGIN;
          if (!obs.nearMissed && distSq < nearR * nearR) {
            obs.nearMissed = true;
            this.awardNearMiss();
          }
        }
      } else if (data.type === 'orbitMine') {
        if (Math.abs(z - data.z) > data.orbitRadius + data.mineRadius + nmR) continue;
        const rot = obs.animatedSubgroup ? obs.animatedSubgroup.rotation.x : 0;
        const offZ = data.orbitRadius * Math.sin(rot);
        const offY = data.orbitRadius * Math.cos(rot);
        const effR = data.mineRadius * 0.8 + r;
        const nearR = effR + NEAR_MISS_MARGIN;

        for (const dir of [1, -1]) {
          const mz = data.z + dir * offZ;
          const my = data.y + dir * offY;
          const dz = z - mz;
          const dy = y - my;
          const distSq = dz * dz + dy * dy;
          if (distSq < effR * effR) return obs;
          if (!obs.nearMissed && distSq < nearR * nearR) {
            obs.nearMissed = true;
            this.awardNearMiss();
          }
        }
      }
    }

    return null;
  }

  private triggerCameraShake(
    force: number,
    impulseY = 0,
    impulseZ = 0,
    impulseX = 0,
    decayRate = 1.65
  ): void {
    const clampedForce = THREE.MathUtils.clamp(force, 0, 1.35);
    this.cameraTrauma = Math.min(1.25, Math.max(this.cameraTrauma, clampedForce * 0.88) + clampedForce * 0.12);
    this.traumaDecayRate = decayRate;
    const motionScale = this.prefersReducedMotion ? 0.25 : 1.0;
    const kick = (1.6 + clampedForce * 2.2) * motionScale;
    this.camImpulseVel.x = THREE.MathUtils.clamp(this.camImpulseVel.x + impulseX * kick, -7, 7);
    this.camImpulseVel.y = THREE.MathUtils.clamp(this.camImpulseVel.y + impulseY * kick, -7, 7);
    this.camImpulseVel.z = THREE.MathUtils.clamp(this.camImpulseVel.z + impulseZ * kick, -7, 7);
  }

  private resetCameraShake(): void {
    this.cameraTrauma = 0;
    this.proximityShake = 0;
    this.camShakeOffset.set(0, 0, 0);
    this.camImpulseOffset.set(0, 0, 0);
    this.camImpulseVel.set(0, 0, 0);
  }

  private computeCollisionForce(obs: RuntimeObstacle | null): {
    force: number;
    dirY: number;
    dirZ: number;
  } {
    const endlessRamp =
      this.gameMode === 'endless' ? Math.min(0.45, this.playerZ / 1500) : 0;
    const speedRatio =
      (this.activeSpeedMultiplier + endlessRamp) *
      (this.gameMode === 'hardcore' ? 1.15 : 1.0);

    let severity = 1.0;
    let dirY = 0;
    let dirZ = -1.0;

    if (obs) {
      const t = obs.data.type;
      severity =
        t === 'block' || t === 'rotaryGate'
          ? 1.25
          : t === 'spikes' || t === 'laserBar'
            ? 1.12
            : t === 'saw' || t === 'patrolDrone'
              ? 1.02
              : 0.95;

      const center = this.getObstacleCenter(obs);
      const dy = this.playerY - center.y;
      const dz = this.playerZ - center.z;
      const len = Math.hypot(dy, dz);
      if (len > 0.05) {
        dirY = dy / len;
        dirZ = (dz / len) * 0.55 - 0.65;
      } else {
        dirY = this.playerY < 6 ? 0.55 : -0.55;
        dirZ = -0.85;
      }
    }

    const force = THREE.MathUtils.clamp(0.72 * severity * speedRatio, 0.55, 1.35);
    return { force, dirY, dirZ };
  }

  private computeHazardProximity(z: number, y: number): number {
    const PROXIMITY_RANGE = 2.25;
    let maxProx = 0;

    for (const obs of this.runtimeObstacles) {
      if (obs.destroyed) continue;
      const data = obs.data;
      if (data.type === 'speedGate' || data.type === 'warpGate') continue;

      let clearance = PROXIMITY_RANGE;

      if (data.type === 'saw') {
        if (Math.abs(z - data.z) > data.radius + HITBOX_RADIUS + PROXIMITY_RANGE) continue;
        const dist = Math.hypot(z - data.z, y - data.y);
        clearance = dist - (data.radius * 0.78 + HITBOX_RADIUS);
      } else if (data.type === 'starMine') {
        if (Math.abs(z - data.z) > data.radius + HITBOX_RADIUS + PROXIMITY_RANGE) continue;
        const dist = Math.hypot(z - data.z, y - data.y);
        clearance = dist - (data.radius * 0.68 + HITBOX_RADIUS);
      } else if (data.type === 'block' && obs.subBoxes) {
        if (Math.abs(z - data.z) > data.width * 0.6 + HITBOX_RADIUS + PROXIMITY_RANGE) continue;
        for (const b of obs.subBoxes) {
          const inset = 0.06;
          const cz = THREE.MathUtils.clamp(z, b.zMin + inset, b.zMax - inset);
          const cy = THREE.MathUtils.clamp(y, b.yMin + inset, b.yMax - inset);
          const dist = Math.hypot(z - cz, y - cy);
          const c = dist - HITBOX_RADIUS;
          if (c < clearance) clearance = c;
        }
      } else if (data.type === 'spikes') {
        if (z < data.zStart - PROXIMITY_RANGE || z > data.zEnd + PROXIMITY_RANGE) continue;
        const forgivingH = data.height * 0.78;
        const dzEdge = z < data.zStart ? data.zStart - z : z > data.zEnd ? z - data.zEnd : 0;
        const dyEdge =
          data.placement === 'floor'
            ? Math.max(0, y - HITBOX_RADIUS - forgivingH)
            : Math.max(0, TRACK_CEILING_Y - forgivingH - (y + HITBOX_RADIUS));
        clearance = Math.hypot(dzEdge, dyEdge);
      } else if (data.type === 'laserBar') {
        const minZ = Math.min(data.z1, data.z2) - PROXIMITY_RANGE - 0.4;
        const maxZ = Math.max(data.z1, data.z2) + PROXIMITY_RANGE + 0.4;
        if (z < minZ || z > maxZ) continue;
        const dist = Math.sqrt(distSqToSegment2D(z, y, data.z1, data.y1, data.z2, data.y2));
        clearance = dist - ((data.thickness ?? 0.24) * 0.65 + HITBOX_RADIUS);
      } else if (data.type === 'patrolDrone') {
        if (Math.abs(z - data.z) > data.radius + HITBOX_RADIUS + PROXIMITY_RANGE) continue;
        const droneY = obs.animatedSubgroup ? obs.animatedSubgroup.position.y : data.baseY;
        const dist = Math.hypot(z - data.z, y - droneY);
        clearance = dist - (data.radius * 0.8 + HITBOX_RADIUS);
      } else if (data.type === 'rotaryGate') {
        if (Math.abs(z - data.z) > data.armLength + HITBOX_RADIUS + PROXIMITY_RANGE) continue;
        const rot = obs.animatedSubgroup ? obs.animatedSubgroup.rotation.x : 0;
        const blades = data.blades ?? 2;
        const hubC = Math.hypot(z - data.z, y - data.y) - (0.42 + HITBOX_RADIUS);
        if (hubC < clearance) clearance = hubC;
        for (let i = 0; i < blades; i++) {
          const alpha = rot + (i / blades) * Math.PI * 2;
          const tipZ = data.z + data.armLength * Math.sin(alpha);
          const tipY = data.y + data.armLength * Math.cos(alpha);
          const dist = Math.sqrt(distSqToSegment2D(z, y, data.z, data.y, tipZ, tipY));
          const c = dist - (0.14 + HITBOX_RADIUS);
          if (c < clearance) clearance = c;
        }
      } else if (data.type === 'orbitMine') {
        if (Math.abs(z - data.z) > data.orbitRadius + data.mineRadius + HITBOX_RADIUS + PROXIMITY_RANGE) {
          continue;
        }
        const rot = obs.animatedSubgroup ? obs.animatedSubgroup.rotation.x : 0;
        const offZ = data.orbitRadius * Math.sin(rot);
        const offY = data.orbitRadius * Math.cos(rot);
        const effR = data.mineRadius * 0.8 + HITBOX_RADIUS;
        for (const dir of [1, -1]) {
          const dist = Math.hypot(z - (data.z + dir * offZ), y - (data.y + dir * offY));
          const c = dist - effR;
          if (c < clearance) clearance = c;
        }
      }

      if (clearance < PROXIMITY_RANGE) {
        const clamped = Math.max(0, clearance);
        const prox = Math.pow(1 - clamped / PROXIMITY_RANGE, 2);
        if (prox > maxProx) maxProx = prox;
      }
    }

    return maxProx;
  }

  private resetAdaptiveDifficulty(fullReset: boolean): void {
    this.endlessCleanRunTime = 0;
    if (fullReset) {
      this.nearMissHistory = [];
      this.collisionHistory = [];
      this.adaptiveFlowScore = 0;
      this.adaptiveSawSpacingMult = 1.0;
      this.adaptiveSawVelocityMult = 1.0;
      this.lastAdjustedSpacingMult = 1.0;
    }
  }

  private recordAdaptiveNearMiss(): void {
    if (this.gameMode !== 'endless') return;
    this.nearMissHistory.push(this.totalElapsed);
  }

  private recordAdaptiveCollision(weight: number): void {
    if (this.gameMode !== 'endless') return;
    this.collisionHistory.push({ time: this.totalElapsed, weight });
    this.endlessCleanRunTime *= 0.25;
  }

  private adjustUpcomingEndlessSaws(): void {
    this.lastAdjustedSpacingMult = this.adaptiveSawSpacingMult;
    const minAdjustZ = this.playerZ + 48;
    const targetHalfGap = THREE.MathUtils.clamp(2.6 * this.adaptiveSawSpacingMult, 2.15, 3.35);

    for (const obs of this.runtimeObstacles) {
      if (obs.destroyed || obs.data.type !== 'saw') continue;
      const d = obs.data;
      const baseZ = obs.sawBaseZ ?? d.z;
      if (baseZ <= minAdjustZ) continue;

      if (d.pairRole === 'upper' || d.pairRole === 'lower') {
        const nextBaseY = d.pairRole === 'upper' ? 6.0 + targetHalfGap : 6.0 - targetHalfGap;
        obs.sawBaseY = nextBaseY;
        if (!d.driftAmpY) {
          d.y = nextBaseY;
          obs.group.position.y = nextBaseY;
        }
      }
    }
  }

  private updateAdaptiveDifficulty(dt: number): void {
    if (this.gameMode !== 'endless' || this.phase !== 'playing') return;

    const now = this.totalElapsed;
    const nearMissWindow = 32;
    const collisionWindow = 45;

    while (this.nearMissHistory.length > 0 && now - this.nearMissHistory[0] > nearMissWindow) {
      this.nearMissHistory.shift();
    }
    while (this.collisionHistory.length > 0 && now - this.collisionHistory[0].time > collisionWindow) {
      this.collisionHistory.shift();
    }

    this.endlessCleanRunTime += dt;

    const nearMissRatePerMin = (this.nearMissHistory.length / nearMissWindow) * 60;
    let collisionLoad = 0;
    for (let i = 0; i < this.collisionHistory.length; i++) {
      const c = this.collisionHistory[i];
      collisionLoad += c.weight * Math.exp(-(now - c.time) / 22);
    }

    const nearMissDrive =
      Math.min(0.65, nearMissRatePerMin * 0.065) * (collisionLoad >= 0.4 ? 0.25 : 1.0);
    const cleanDrive = Math.min(0.45, Math.max(0, this.endlessCleanRunTime - 8) * 0.018);
    const collisionPenalty = collisionLoad * 0.58;

    const targetFlow = THREE.MathUtils.clamp(
      nearMissDrive + cleanDrive - collisionPenalty,
      -1.0,
      1.0
    );

    this.adaptiveFlowScore = THREE.MathUtils.damp(this.adaptiveFlowScore, targetFlow, 0.55, dt);
    this.adaptiveSawSpacingMult = THREE.MathUtils.clamp(
      1.0 - this.adaptiveFlowScore * 0.22,
      0.8,
      1.28
    );
    this.adaptiveSawVelocityMult = THREE.MathUtils.clamp(
      1.0 + this.adaptiveFlowScore * 0.34,
      0.72,
      1.38
    );

    if (Math.abs(this.adaptiveSawSpacingMult - this.lastAdjustedSpacingMult) >= 0.045) {
      this.adjustUpcomingEndlessSaws();
    }
  }

  private awardNearMiss(): void {
    this.nearMissCount += 1;
    this.recordAdaptiveNearMiss();
    const bonus = Math.round(50 * this.streakMultiplier);
    this.addScore(bonus);
    this.powerCharge = Math.min(100, this.powerCharge + 8);
    this.triggerCameraShake(0.26 * Math.min(1.3, this.activeSpeedMultiplier), 0.15, -0.14);
    this.pushCallout(`Near Miss +${bonus}`);
    this.spawnBurst(this.playerX, this.playerY, this.playerZ, 6, 0x38bdf8, 5);
    this.callbacks.onChallengeEvent?.({ nearMisses: 1 });
  }

  private fireBarrageRocket(): void {
    let slot: BarrageProjectile | null = null;
    for (const p of this.barrageProjectiles) {
      if (!p.active) {
        slot = p;
        break;
      }
    }
    if (!slot) return;

    let bestDistSq = Infinity;
    let targetZ = this.playerZ + 18;
    let targetY = this.playerY;

    for (const obs of this.runtimeObstacles) {
      if (obs.destroyed || !this.isDestructibleObstacle(obs, false)) continue;
      const center = this.getObstacleCenter(obs);
      const dz = center.z - this.playerZ;
      if (dz < 1.5 || dz > 26) continue;
      const dy = center.y - this.playerY;
      const dSq = dz * dz + dy * dy * 1.4;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        targetZ = center.z;
        targetY = center.y;
      }
    }

    const dx = -this.playerX;
    const dz = Math.max(1, targetZ - this.playerZ);
    const dy = targetY - this.playerY;
    const len = Math.hypot(dx, dy, dz);
    const speed = 56;

    slot.active = true;
    slot.x = this.playerX;
    slot.z = this.playerZ + 0.8;
    slot.y = this.playerY;
    slot.vx = (dx / len) * speed;
    slot.vz = (dz / len) * speed;
    slot.vy = (dy / len) * speed;
    slot.life = 0.65;
    soundEngine.playBarrageShot();
  }

  private updateBarrageProjectiles(dt: number): void {
    let dirty = false;
    for (let i = 0; i < BARRAGE_POOL_SIZE; i++) {
      const p = this.barrageProjectiles[i];
      if (!p.active) continue;
      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _dummy.position.set(0, -100, 0);
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        this.barrageMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.y += p.vy * dt;

      // Check collision with any destructible obstacle
      let hit = false;
      for (const obs of this.runtimeObstacles) {
        if (obs.destroyed || !this.isDestructibleObstacle(obs, false)) continue;
        const center = this.getObstacleCenter(obs);
        const dz = center.z - p.z;
        const dy = center.y - p.y;
        const hitRadius =
          obs.data.type === 'block'
            ? Math.max(obs.data.width, obs.data.height) * 0.55
            : obs.data.type === 'rotaryGate'
              ? obs.data.armLength * 0.82
              : obs.data.type === 'orbitMine'
                ? obs.data.orbitRadius + obs.data.mineRadius
                : obs.data.type === 'laserBar'
                  ? 2.1
                  : (obs.data as { radius?: number }).radius ?? 1.4;

        if (dz * dz + dy * dy <= (hitRadius + 0.75) * (hitRadius + 0.75)) {
          obs.destroyed = true;
          obs.group.visible = false;
          this.addScore(100);
          this.callbacks.onChallengeEvent?.({ hazardsShattered: 1 });
          this.spawnBurst(0, center.y, center.z, 22, 0xfb923c, 12);
          soundEngine.playCollectGold(5);
          this.triggerCameraShake(0.24 * Math.min(1.25, this.activeSpeedMultiplier), 0, -0.16);
          hit = true;
          break;
        }
      }

      if (hit) {
        p.active = false;
        _dummy.position.set(0, -100, 0);
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        this.barrageMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(-Math.atan2(p.vy, p.vz), 0, 0);
      _dummy.scale.setScalar(1.0);
      _dummy.updateMatrix();
      this.barrageMesh.setMatrixAt(i, _dummy.matrix);
    }

    if (dirty) {
      this.barrageMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateEnvironmentalEvents(dt: number): void {
    if (this.phase !== 'playing') return;

    if (this.envEventPhase === 'idle') {
      this.nextEnvEventCooldown -= dt;
      if (this.nextEnvEventCooldown <= 0) {
        const pool: EnvEventType[] = ['glitchStorm', 'gravityShift', 'solarFlare', 'magTurbulence'];
        const candidates = pool.filter((e) => e !== this.envEventType);
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        this.envEventType = picked;
        this.envEventPhase = 'warning';
        this.envEventTimer = 1.45;
        soundEngine.playEnvWarning(picked);
        const label =
          picked === 'glitchStorm'
            ? '⚠ Incoming: Glitch Storm'
            : picked === 'gravityShift'
              ? '⚠ Incoming: Gravity Shift'
              : picked === 'solarFlare'
                ? '⚠ Incoming: Solar Surge'
                : '⚠ Incoming: Ion Crosswind';
        this.pushCallout(label);
        this.emitHud(true);
      }
      return;
    }

    if (this.envEventPhase === 'warning') {
      this.envEventTimer -= dt;
      if (this.envEventTimer <= 0 && this.envEventType) {
        this.envEventPhase = 'active';
        const isDisruptive =
          this.envEventType === 'glitchStorm' || this.envEventType === 'gravityShift';
        const stabReduction = isDisruptive
          ? Math.max(0.55, 1 - this.upgradeLevels.stabilizer * 0.08)
          : 1.0;
        this.envEventTimer = (isDisruptive ? 4.6 : 5.5) * stabReduction;
        soundEngine.playEnvEventStart(this.envEventType);
        this.triggerCameraShake(0.32, 0.18, -0.22);
        this.spawnBurst(
          this.playerX,
          this.playerY,
          this.playerZ + 4,
          16,
          this.envEventType === 'solarFlare'
            ? 0xfacc15
            : this.envEventType === 'gravityShift'
              ? 0xf43f5e
              : 0x22d3ee,
          9
        );
        this.emitHud(true);
      }
      return;
    }

    // Active phase
    this.envEventTimer -= dt;
    if (this.envEventType === 'magTurbulence') {
      this.envParticleTimer -= dt;
      if (this.envParticleTimer <= 0) {
        this.envParticleTimer = 0.14;
        this.spawnBurst(
          (Math.random() - 0.5) * 4,
          1.2 + Math.random() * 9.5,
          this.playerZ + 16,
          3,
          0x38bdf8,
          6
        );
      }
    }

    if (this.envEventTimer <= 0) {
      this.envEventPhase = 'idle';
      this.envEventTimer = 0;
      this.nextEnvEventCooldown = 14.0 + Math.random() * 7.5;
      if (this.upgradeLevels.stabilizer > 0) {
        this.powerCharge = Math.min(100, this.powerCharge + this.upgradeLevels.stabilizer * 15);
      }
      this.callbacks.onChallengeEvent?.({ eventsSurvived: 1 });
      this.pushCallout('Environmental Anomaly Cleared');
      this.emitHud(true);
    }
  }

  private updateSpecialPowerState(dt: number): void {
    const power = this.currentSkin.powerType;
    const capBonus = 1 + this.upgradeLevels.capacitor * 0.14;
    const envChargeBoost =
      this.envEventPhase === 'active' &&
      (this.envEventType === 'solarFlare' || this.envEventType === 'magTurbulence')
        ? 1.5
        : 1.0;

    if (this.powerActiveRemaining > 0) {
      this.powerActiveRemaining = Math.max(0, this.powerActiveRemaining - dt);
      if (this.powerActiveRemaining === 0) {
        this.shieldCharges = 0;
        this.shieldActive = false;
      }
    } else {
      this.powerCharge = Math.min(100, this.powerCharge + dt * 7.0 * capBonus * envChargeBoost);
    }

    if (this.invulnTimer > 0) {
      this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    }

    const isPowerActive = this.powerActiveRemaining > 0;
    this.craft.shieldMesh.visible =
      (isPowerActive &&
        (power === 'shield' ||
          power === 'phase' ||
          power === 'warp' ||
          power === 'smash' ||
          power === 'aegis' ||
          power === 'stasis' ||
          power === 'deflect' ||
          power === 'revive')) ||
      this.invulnTimer > 0;
    this.craft.auraRing.visible =
      isPowerActive &&
      (power === 'magnet' ||
        power === 'overdrive' ||
        power === 'vortex' ||
        power === 'pulse' ||
        power === 'smash' ||
        power === 'deflect' ||
        power === 'revive');
    this.craft.laserBeam.visible = isPowerActive && power === 'breaker';

    if (this.craft.shieldMesh.visible) {
      this.craft.shieldMesh.rotation.y += dt * 2.5;
      this.craft.shieldMesh.rotation.x += dt * 1.4;
    }
    if (this.craft.auraRing.visible) {
      this.craft.auraRing.rotation.x += dt * 5.0;
      const baseScale = power === 'smash' ? 1.55 : power === 'deflect' ? 1.35 : 1.0;
      const s = baseScale + Math.sin(this.totalElapsed * 12) * 0.14;
      this.craft.auraRing.scale.setScalar(s);
    }

    if (isPowerActive && power === 'pulse') {
      this.triggerEmpBlast(2.6, 75);
    }

    if (isPowerActive && power === 'deflect') {
      this.deflectPulseCooldown -= dt;
      if (this.deflectPulseCooldown <= 0) {
        this.deflectPulseCooldown = 0.08;
        const rSq = 3.05 * 3.05;
        let deflected = 0;
        for (const obs of this.runtimeObstacles) {
          if (obs.destroyed || !this.isDestructibleObstacle(obs, false)) continue;
          const center = this.getObstacleCenter(obs);
          const dz = center.z - this.playerZ;
          const dy = center.y - this.playerY;
          if (dz * dz + dy * dy <= rSq) {
            obs.destroyed = true;
            obs.group.visible = false;
            deflected += 1;
            this.addScore(125);
            this.spawnBurst(this.playerX, center.y, center.z, 16, 0x38bdf8, 10);
          }
        }
        if (deflected > 0) {
          this.callbacks.onChallengeEvent?.({ hazardsShattered: deflected });
          soundEngine.playCollectGold(4);
          this.triggerCameraShake(0.22, 0.12, -0.14);
        }
      }
    }

    if (isPowerActive && power === 'barrage') {
      this.barrageCooldown -= dt;
      if (this.barrageCooldown <= 0) {
        this.barrageCooldown = 0.24;
        this.fireBarrageRocket();
      }
    }

    if (isPowerActive && power === 'smash') {
      const smashRadius = 2.4;
      const smashRSq = smashRadius * smashRadius;
      for (const obs of this.runtimeObstacles) {
        if (obs.destroyed || obs.data.type === 'speedGate' || obs.data.type === 'warpGate') continue;
        const d = obs.data;
        let hit = false;
        let burstY = this.playerY;
        let burstZ = this.playerZ;

        if (d.type === 'spikes') {
          if (this.playerZ >= d.zStart - 1.2 && this.playerZ <= d.zEnd + 1.2) {
            const dy =
              d.placement === 'floor'
                ? this.playerY - d.height * 0.6
                : TRACK_CEILING_Y - d.height * 0.6 - this.playerY;
            if (dy < smashRadius) {
              hit = true;
              burstZ = this.playerZ;
              burstY = d.placement === 'floor' ? d.height * 0.5 : TRACK_CEILING_Y - d.height * 0.5;
            }
          }
        } else if (d.type === 'laserBar') {
          const distSq = distSqToSegment2D(this.playerZ, this.playerY, d.z1, d.y1, d.z2, d.y2);
          if (distSq <= smashRSq) {
            hit = true;
            burstZ = (d.z1 + d.z2) * 0.5;
            burstY = (d.y1 + d.y2) * 0.5;
          }
        } else {
          const center = this.getObstacleCenter(obs);
          const dz = center.z - this.playerZ;
          const dy = center.y - this.playerY;
          const extra =
            d.type === 'rotaryGate'
              ? d.armLength * 0.65
              : d.type === 'orbitMine'
                ? d.orbitRadius + d.mineRadius
                : d.type === 'block'
                  ? Math.max(d.width, d.height) * 0.42
                  : (d as { radius?: number }).radius ?? 1.2;
          if (dz * dz + dy * dy <= (smashRadius + extra) * (smashRadius + extra)) {
            hit = true;
            burstZ = center.z;
            burstY = center.y;
          }
        }

        if (hit) {
          obs.destroyed = true;
          obs.group.visible = false;
          this.addScore(120);
          this.callbacks.onChallengeEvent?.({ hazardsShattered: 1 });
          this.triggerCameraShake(0.36 * Math.min(1.3, this.activeSpeedMultiplier), 0, -0.26);
          this.spawnBurst(0, burstY, burstZ, 24, 0xc084fc, 12);
          soundEngine.playSmashImpact();
        }
      }
    }

    if (isPowerActive && power === 'breaker') {
      const beamEndZ = this.playerZ + 13.0;
      for (const obs of this.runtimeObstacles) {
        if (obs.destroyed || !this.isDestructibleObstacle(obs, false)) continue;
        const d = obs.data;
        const center = this.getObstacleCenter(obs);
        const reachY =
          d.type === 'block'
            ? d.height * 0.5 + 0.65
            : d.type === 'rotaryGate'
              ? d.armLength + 0.65
              : d.type === 'orbitMine'
                ? d.orbitRadius + d.mineRadius + 0.65
                : d.type === 'laserBar'
                  ? Math.abs(d.y1 - d.y2) * 0.5 + 0.8
                  : ((d as { radius?: number }).radius ?? 1.2) + 0.9;

        if (center.z > this.playerZ && center.z <= beamEndZ && Math.abs(center.y - this.playerY) < reachY) {
          obs.destroyed = true;
          obs.group.visible = false;
          this.addScore(75);
          this.callbacks.onChallengeEvent?.({ hazardsShattered: 1 });
          this.spawnBurst(0, center.y, center.z, 20, 0xfb7185, 11);
          soundEngine.playCollectGold(4);
        }
      }
    }
  }

  private stepPhysics(dt: number): void {
    const MAX_STEP = 0.01;
    let remaining = dt;

    const power = this.currentSkin.powerType;
    const isPowerActive = this.powerActiveRemaining > 0;
    const modeBaseMult = this.gameMode === 'hardcore' ? 1.15 : 1.0;
    const slowMoFactor =
      isPowerActive && power === 'slowmo'
        ? 0.62
        : isPowerActive && power === 'stasis'
          ? 0.56
          : 1.0;
    const warpFactor = isPowerActive && power === 'warp' ? 1.42 : 1.0;
    const endlessRamp =
      this.gameMode === 'endless' ? Math.min(0.45, this.playerZ / 1500) : 0;
    const upgradeGoldMult = 1 + this.upgradeLevels.collector * 0.08;
    const solarEventMult =
      this.envEventPhase === 'active' && this.envEventType === 'solarFlare' ? 1.5 : 1.0;
    const scoreMult =
      (this.gameMode === 'hardcore' ? 2.0 : 1.0) *
      (isPowerActive && power === 'overdrive' ? 2.5 : 1.0) *
      (isPowerActive && power === 'vortex' ? 2.0 : 1.0) *
      upgradeGoldMult *
      solarEventMult *
      this.streakMultiplier;

    const gravityInverted =
      (this.gameMode === 'inverted') !==
      (this.envEventPhase === 'active' && this.envEventType === 'gravityShift');
    const climbInput = gravityInverted ? !this.isHolding : this.isHolding;

    while (remaining > 0 && this.phase === 'playing') {
      const step = Math.min(remaining, MAX_STEP);
      remaining -= step;

      const speed =
        this.currentLevel.baseSpeed *
        (this.activeSpeedMultiplier + endlessRamp) *
        modeBaseMult *
        slowMoFactor *
        warpFactor;
      const dz = speed * step;
      const dy = (climbInput ? 1 : -1) * speed * WAVE_SLOPE * step;

      this.playerZ += dz;
      let nextY = this.playerY + dy;
      let nextRail: 'free' | 'floor' | 'ceiling' = 'free';

      if (nextY <= PLAY_MIN_Y) {
        nextY = PLAY_MIN_Y;
        nextRail = 'floor';
      } else if (nextY >= PLAY_MAX_Y) {
        nextY = PLAY_MAX_Y;
        nextRail = 'ceiling';
      }

      if (nextRail !== this.railState) {
        this.trailVertices.push({ x: this.playerX, z: this.playerZ, y: nextY });
        this.lastTrailSampleX = this.playerX;
        if (this.trailVertices.length > MAX_TRAIL_POINTS - 2) {
          this.trailVertices.shift();
        }
        this.railState = nextRail;
      }

      this.playerY = nextY;

      // Spatial Warp timers & smooth X-axis displacement
      if (this.xShiftTimer > 0) this.xShiftTimer = Math.max(0, this.xShiftTimer - step);
      if (this.invertCamTimer > 0) this.invertCamTimer = Math.max(0, this.invertCamTimer - step);
      if (this.mirrorCamTimer > 0) this.mirrorCamTimer = Math.max(0, this.mirrorCamTimer - step);

      if (this.xShiftTimer <= 0 && this.invertCamTimer <= 0 && this.mirrorCamTimer <= 0) {
        this.activeWarpEffect = null;
      }

      const targetPlayerX = this.xShiftTimer > 0 ? this.xShiftTarget : 0;
      this.playerX = THREE.MathUtils.damp(this.playerX, targetPlayerX, 8.5, step);
      if (Math.abs(this.playerX - this.lastTrailSampleX) >= 0.09) {
        this.trailVertices.push({ x: this.playerX, z: this.playerZ, y: this.playerY });
        this.lastTrailSampleX = this.playerX;
        if (this.trailVertices.length > MAX_TRAIL_POINTS - 2) {
          this.trailVertices.shift();
        }
      }

      // Infinity Sector Milestones every 250m
      if (this.gameMode === 'endless' && this.playerZ >= this.nextSectorZ) {
        this.currentSector += 1;
        this.nextSectorZ += SECTOR_DISTANCE;
        const sectorBonus = 500 * (this.currentSector - 1);
        this.addScore(sectorBonus);
        this.powerCharge = Math.min(100, this.powerCharge + 45);
        soundEngine.playCheckpoint();
        this.spawnBurst(this.playerX, this.playerY, this.playerZ, 26, 0x22d3ee, 11);
        this.pushCallout(`Sector 0${this.currentSector} · +${sectorBonus}`);
        this.callbacks.onChallengeEvent?.({ sectorsClearedInRun: this.currentSector - 1 });
        this.emitHud(true);
      }

      // Speed gates & Warp gates
      for (const obs of this.runtimeObstacles) {
        if (obs.data.type === 'speedGate' && !obs.triggered && this.playerZ >= obs.data.z) {
          obs.triggered = true;
          const prev = this.activeSpeedMultiplier;
          this.activeSpeedMultiplier = obs.data.multiplier;
          if (Math.abs(prev - obs.data.multiplier) > 0.05) {
            soundEngine.playSpeedGate(obs.data.multiplier > prev);
          }
        } else if (obs.data.type === 'warpGate' && !obs.triggered && this.playerZ >= obs.data.z) {
          obs.triggered = true;
          const dur = obs.data.duration ?? 4.2;
          const eff = obs.data.warpEffect;
          this.activeWarpEffect = eff;

          if (eff === 'shiftLeft') {
            this.xShiftTarget = -1.45;
            this.xShiftTimer = dur;
            this.pushCallout('Spatial Warp: Left Lane');
          } else if (eff === 'shiftRight') {
            this.xShiftTarget = 1.45;
            this.xShiftTimer = dur;
            this.pushCallout('Spatial Warp: Right Lane');
          } else if (eff === 'invertCam') {
            this.invertCamTimer = dur;
            this.pushCallout('Perspective Inverted 180°');
          } else {
            this.mirrorCamTimer = dur;
            this.pushCallout('Flank Perspective Flipped');
          }

          if (obs.warpMembraneMat) {
            obs.warpMembraneMat.opacity = 0.68;
          }
          soundEngine.playWarpGate(eff);
          this.callbacks.onChallengeEvent?.({ warpGatesCleared: 1 });
          this.triggerCameraShake(0.30, 0, -0.24);
          this.spawnBurst(
            this.playerX,
            this.playerY,
            obs.data.z,
            24,
            eff === 'invertCam' ? 0xf43f5e : eff === 'mirrorCam' ? 0x6366f1 : 0xa855f7,
            10
          );
          this.emitHud(true);
        }
      }

      // Checkpoints
      for (const cp of this.runtimeCheckpoints) {
        if (!cp.reached && this.playerZ >= cp.data.z) {
          cp.reached = true;
          cp.activate();
          this.lastCheckpoint = cp.data;
          soundEngine.playCheckpoint();
          this.spawnBurst(this.playerX, this.playerY, cp.data.z, 10, 0x34d399, 6);
          this.pushCallout('Checkpoint Reached');
        }
      }

      // Collectibles & Streak Multiplier
      const hasMagnet =
        isPowerActive &&
        (power === 'magnet' || power === 'overdrive' || power === 'vortex' || power === 'warp');
      const magnetRange =
        (power === 'vortex' ? 12.5 : power === 'magnet' ? 7.5 : 5.8) +
        this.upgradeLevels.collector * 0.4;
      const effPickupRadius = PICKUP_RADIUS + this.upgradeLevels.collector * 0.14;
      const pSq = effPickupRadius * effPickupRadius;
      const capBonus = 1 + this.upgradeLevels.capacitor * 0.14;

      for (const item of this.runtimeCollectibles) {
        if (item.collected) continue;
        const dZ = this.playerZ - item.data.z;
        if (Math.abs(dZ) > (hasMagnet ? magnetRange : effPickupRadius + 0.5)) {
          continue;
        }
        const dY = this.playerY - item.data.y;
        const distSq = dZ * dZ + dY * dY;

        if (hasMagnet && distSq < magnetRange * magnetRange) {
          const pull = Math.min(1, step * 11);
          item.data.z = THREE.MathUtils.lerp(item.data.z, this.playerZ, pull);
          item.data.y = THREE.MathUtils.lerp(item.data.y, this.playerY, pull);
          item.group.position.set(0, item.data.y, item.data.z);
        } else if (Math.abs(dZ) > effPickupRadius + 0.5) {
          continue;
        }

        const curDz = this.playerZ - item.data.z;
        const curDy = this.playerY - item.data.y;
        if (curDz * curDz + curDy * curDy <= pSq) {
          item.collected = true;
          item.group.visible = false;
          this.addScore(Math.round(item.data.value * scoreMult));

          if (item.data.type === 'gold') {
            this.powerCharge = Math.min(100, this.powerCharge + 14 * capBonus);
            soundEngine.playCollectGold(this.goldCombo);
            this.goldCombo += 1;
            this.goldComboTimer = 1.85;
            this.streakMultiplier = Math.min(3.0, 1.0 + Math.floor(this.goldCombo / 5) * 0.25);
            this.spawnBurst(0, item.data.y, item.data.z, 7, 0xfacc15, 6.5);
          } else {
            this.powerCharge = Math.min(100, this.powerCharge + 35 * capBonus);
            if (item.data.starIndex !== undefined) {
              this.starsEarned[item.data.starIndex] = true;
            }
            soundEngine.playCollectStar();
            this.spawnBurst(0, item.data.y, item.data.z, 16, 0xfef08a, 9);
            this.pushCallout('Sector Star Collected');
            this.callbacks.onChallengeEvent?.({ starsCollected: 1 });
          }
          this.emitHud(true);
        }
      }

      // Hazards
      const isIntangible =
        (isPowerActive && (power === 'phase' || power === 'warp' || power === 'smash')) ||
        this.invulnTimer > 0;
      if (!isIntangible) {
        const hitObs = this.checkHazardCollision(this.playerZ, this.playerY);
        if (hitObs) {
          if (this.shieldCharges > 0) {
            this.shieldCharges -= 1;
            this.shieldActive = this.shieldCharges > 0;
            if (this.shieldCharges === 0 && power !== 'stasis') {
              this.powerActiveRemaining = 0;
            }
            this.invulnTimer =
              (power === 'revive' ? 1.6 : 1.15) + this.upgradeLevels.plating * 0.25;
            this.recordAdaptiveCollision(0.65);
            const impact = this.computeCollisionForce(hitObs);
            const shieldForce = power === 'revive' ? Math.max(0.95, impact.force * 1.1) : impact.force * 0.72;
            this.triggerCameraShake(shieldForce, impact.dirY, impact.dirZ, (Math.random() - 0.5) * 0.4, 1.8);
            this.callbacks.onChallengeEvent?.({ shieldsAbsorbed: 1 });

            if (power === 'revive') {
              // Second Wind: obliterate all hazards within 9.5m
              let cleared = 0;
              const rSq = 9.5 * 9.5;
              for (const obs of this.runtimeObstacles) {
                if (obs.destroyed || obs.data.type === 'speedGate' || obs.data.type === 'warpGate') continue;
                const c = this.getObstacleCenter(obs);
                const dz = c.z - this.playerZ;
                const dy = c.y - this.playerY;
                if (dz * dz + dy * dy <= rSq) {
                  obs.destroyed = true;
                  obs.group.visible = false;
                  cleared += 1;
                }
              }
              this.addScore(200);
              this.callbacks.onChallengeEvent?.({ hazardsShattered: Math.max(1, cleared) });
              this.spawnBurst(this.playerX, this.playerY, this.playerZ, 34, 0xf59e0b, 14);
              soundEngine.playSmashImpact();
              this.pushCallout('Second Wind! Revival Blast');
            } else if (power === 'aegis') {
              if (hitObs.data.type !== 'spikes') {
                hitObs.destroyed = true;
                hitObs.group.visible = false;
                this.callbacks.onChallengeEvent?.({ hazardsShattered: 1 });
              }
              this.triggerEmpBlast(4.5, 90);
              soundEngine.playShieldPop();
              this.pushCallout(
                this.shieldCharges > 0 ? 'Aegis Absorbed (1 Shield Left)' : 'Aegis Impact Burst'
              );
            } else {
              if (hitObs.data.type !== 'spikes') {
                hitObs.destroyed = true;
                hitObs.group.visible = false;
                this.callbacks.onChallengeEvent?.({ hazardsShattered: 1 });
              }
              this.spawnBurst(this.playerX, this.playerY, this.playerZ, 26, 0x22d3ee, 11);
              soundEngine.playShieldPop();
              this.pushCallout('Shield Absorbed Hit');
            }
            this.emitHud(true);
          } else {
            this.triggerCrash(hitObs);
            return;
          }
        }
      }

      if (this.gameMode !== 'endless' && this.playerZ >= this.currentLevel.length) {
        this.triggerComplete();
        return;
      }
    }

    if (this.horizonMesh) {
      this.horizonMesh.position.z = this.playerZ + 165;
    }

    // Stream & keep endless trench aligned to playerZ
    if (this.gameMode === 'endless') {
      this.streamEndlessChunks(this.playerZ);
      const tileOffset = Math.floor(this.playerZ / this.endlessGridTileUnit) * this.endlessGridTileUnit;
      const slabCenterZ = tileOffset + (-24 + ENDLESS_SLAB_LEN) * 0.5;
      if (this.floorMesh) this.floorMesh.position.z = slabCenterZ;
      if (this.ceilingMesh) this.ceilingMesh.position.z = slabCenterZ;
      for (const rail of this.railMeshes) {
        rail.position.z = slabCenterZ;
      }
      for (const wallRibbon of this.wallRibbonMeshes) {
        wallRibbon.position.z = slabCenterZ;
      }

      if (this.parallaxTowers) {
        let dirtyTowers = false;
        for (let i = 0; i < this.towerInstances.length; i++) {
          const t = this.towerInstances[i];
          if (t.z < this.playerZ - 32) {
            t.z += this.endlessSpanZ;
            _dummy.position.set(t.x, t.y, t.z);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(t.w, t.h, t.w);
            _dummy.updateMatrix();
            this.parallaxTowers.setMatrixAt(i, _dummy.matrix);
            dirtyTowers = true;
          }
        }
        if (dirtyTowers) this.parallaxTowers.instanceMatrix.needsUpdate = true;
      }

      if (this.parallaxFloaters) {
        let dirtyFloaters = false;
        for (let i = 0; i < this.floaterInstances.length; i++) {
          const f = this.floaterInstances[i];
          if (f.z < this.playerZ - 32) {
            f.z += this.endlessSpanZ;
            _dummy.position.set(f.x, f.y, f.z);
            _dummy.rotation.set(f.rx, f.ry, 0);
            _dummy.scale.setScalar(f.s);
            _dummy.updateMatrix();
            this.parallaxFloaters.setMatrixAt(i, _dummy.matrix);
            dirtyFloaters = true;
          }
        }
        if (dirtyFloaters) this.parallaxFloaters.instanceMatrix.needsUpdate = true;
      }
    }
  }

  private triggerCrash(hitObs: RuntimeObstacle | null = null): void {
    this.phase = 'crashed';
    this.crashTimer = 0;
    this.recordAdaptiveCollision(1.0);
    const impact = this.computeCollisionForce(hitObs);
    this.triggerCameraShake(
      Math.max(0.88, impact.force),
      impact.dirY,
      impact.dirZ,
      (Math.random() - 0.5) * 0.65,
      1.45
    );
    this.craft.group.visible = false;
    this.craft.shieldMesh.visible = false;
    this.craft.auraRing.visible = false;
    this.craft.laserBeam.visible = false;
    this.resetBarrageProjectiles();
    this.spawnBurst(this.playerX, this.playerY, this.playerZ, 34, this.currentSkin.coreColor, 13);
    this.spawnBurst(this.playerX, this.playerY, this.playerZ, 16, 0xf43f5e, 10);
    soundEngine.playCrash();
    if (this.gameMode === 'endless') {
      this.callbacks.onChallengeEvent?.({ infinityDistanceInRun: Math.floor(this.playerZ) });
    }
    this.emitHud(true);
  }

  private triggerComplete(): void {
    this.phase = 'completed';
    this.playerZ = this.currentLevel.length;
    this.spawnBurst(this.playerX, this.playerY, this.playerZ, 40, 0xfacc15, 14);
    this.spawnBurst(this.playerX, this.playerY, this.playerZ, 24, 0x22d3ee, 11);
    soundEngine.playLevelComplete();
    this.callbacks.onChallengeEvent?.({ courseCompletedMode: this.gameMode });
    const snap = this.buildSnapshot();
    this.callbacks.onHudUpdate(snap);
    this.callbacks.onLevelComplete(snap);
  }

  private snapCameraToPlayer(): void {
    this.camera.up.set(0, 1, 0);
    if (this.cameraMode === 'isometric') {
      this.camBasePos.set(-13.2, 6.2 + (this.playerY - 6.0) * 0.2, this.playerZ - 7.5);
      _camCurrentLook.set(0, 6.0 + (this.playerY - 6.0) * 0.14, this.playerZ + 8.5);
    } else {
      this.camBasePos.set(-2.6, 6.3 + (this.playerY - 6.0) * 0.35, this.playerZ - 11.5);
      _camCurrentLook.set(0, 6.0 + (this.playerY - 6.0) * 0.2, this.playerZ + 11.0);
    }
    this.resetCameraShake();
    this.camera.position.copy(this.camBasePos);
    this.camera.lookAt(_camCurrentLook);
  }

  private updateCamera(dt: number): void {
    const targetInvertRoll = this.invertCamTimer > 0 ? Math.PI : 0;
    const targetMirror = this.mirrorCamTimer > 0 ? 1.0 : 0.0;
    this.camMirrorBlend = THREE.MathUtils.damp(this.camMirrorBlend, targetMirror, 5.5, dt);

    const chaseMirrorTilt = this.cameraMode === 'chase' ? this.camMirrorBlend * 0.42 : 0;
    this.camRollAngle = THREE.MathUtils.damp(
      this.camRollAngle,
      targetInvertRoll + chaseMirrorTilt,
      6.2,
      dt
    );
    this.camera.up.set(Math.sin(this.camRollAngle), Math.cos(this.camRollAngle), 0).normalize();

    if (this.cameraMode === 'isometric') {
      const camX = THREE.MathUtils.lerp(-13.2, 13.2, this.camMirrorBlend);
      const arcY = Math.sin(this.camMirrorBlend * Math.PI) * 3.4;
      _camTargetPos.set(
        camX,
        6.2 + (this.playerY - 6.0) * 0.2 + arcY,
        this.playerZ - 7.5
      );
      _camTargetLook.set(
        this.playerX * 0.35,
        6.0 + (this.playerY - 6.0) * 0.14,
        this.playerZ + 8.5
      );
    } else {
      const camX = THREE.MathUtils.lerp(-2.6, 4.8, this.camMirrorBlend) + this.playerX * 0.45;
      _camTargetPos.set(camX, 6.3 + (this.playerY - 6.0) * 0.35, this.playerZ - 11.5);
      _camTargetLook.set(
        this.playerX * 0.65,
        6.0 + (this.playerY - 6.0) * 0.2,
        this.playerZ + 11.0
      );
    }

    // Damp unshaken camera base position so shake offsets never pollute follow tracking
    const dampLambda = 11;
    this.camBasePos.x = THREE.MathUtils.damp(this.camBasePos.x, _camTargetPos.x, dampLambda, dt);
    this.camBasePos.y = THREE.MathUtils.damp(this.camBasePos.y, _camTargetPos.y, dampLambda, dt);
    this.camBasePos.z = THREE.MathUtils.damp(this.camBasePos.z, _camTargetPos.z, 18, dt);

    _camCurrentLook.x = THREE.MathUtils.damp(_camCurrentLook.x, _camTargetLook.x, dampLambda, dt);
    _camCurrentLook.y = THREE.MathUtils.damp(_camCurrentLook.y, _camTargetLook.y, dampLambda, dt);
    _camCurrentLook.z = THREE.MathUtils.damp(_camCurrentLook.z, _camTargetLook.z, 18, dt);

    const isWarping = this.xShiftTimer > 0 || this.invertCamTimer > 0 || this.mirrorCamTimer > 0;
    const targetFov =
      this.phase === 'playing' && this.activeSpeedMultiplier > 1.15
        ? 57
        : this.powerActiveRemaining > 0 && this.currentSkin.powerType === 'slowmo'
          ? 48
          : isWarping
            ? 56
            : 52;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();
    }

    // Proximity-based dynamic hazard rumble during active flight
    let targetProx = 0;
    if (this.phase === 'playing') {
      const power = this.currentSkin.powerType;
      const isIntangible =
        (this.powerActiveRemaining > 0 && (power === 'phase' || power === 'warp' || power === 'smash')) ||
        this.invulnTimer > 0;
      const endlessRamp =
        this.gameMode === 'endless' ? Math.min(0.45, this.playerZ / 1500) : 0;
      const speedScale = 0.65 + 0.35 * (this.activeSpeedMultiplier + endlessRamp);
      const rawProx = this.computeHazardProximity(this.playerZ, this.playerY);
      const envTremor =
        this.envEventPhase === 'active' && this.envEventType === 'magTurbulence' ? 0.12 : 0;
      targetProx = Math.min(1, rawProx * speedScale * (isIntangible ? 0.25 : 1.0) + envTremor);
    }
    this.proximityShake = THREE.MathUtils.damp(this.proximityShake, targetProx, 15, dt);

    // Decay collision trauma
    if (this.cameraTrauma > 0) {
      this.cameraTrauma = Math.max(0, this.cameraTrauma - this.traumaDecayRate * dt);
    }

    // Second-order spring recoil for directional collision impulse
    const springStiffness = 145;
    const springDamping = 16;
    const fx = -springStiffness * this.camImpulseOffset.x - springDamping * this.camImpulseVel.x;
    const fy = -springStiffness * this.camImpulseOffset.y - springDamping * this.camImpulseVel.y;
    const fz = -springStiffness * this.camImpulseOffset.z - springDamping * this.camImpulseVel.z;
    this.camImpulseVel.x += fx * dt;
    this.camImpulseVel.y += fy * dt;
    this.camImpulseVel.z += fz * dt;
    this.camImpulseOffset.x += this.camImpulseVel.x * dt;
    this.camImpulseOffset.y += this.camImpulseVel.y * dt;
    this.camImpulseOffset.z += this.camImpulseVel.z * dt;

    // Combine squared trauma, proximity rumble, and directional collision recoil into Camera.position offset
    const motionScale = this.prefersReducedMotion ? 0.25 : 1.0;
    const traumaAmp = this.cameraTrauma * this.cameraTrauma * 0.72;
    const proxAmp = this.proximityShake * 0.18;
    const totalOscAmp = (traumaAmp + proxAmp) * motionScale;

    if (
      totalOscAmp > 0.001 ||
      this.camImpulseOffset.lengthSq() > 1e-6
    ) {
      const t = this.totalElapsed;
      const ox =
        (Math.sin(t * 47.3) * 0.55 + Math.cos(t * 73.1) * 0.25 + (Math.random() - 0.5) * 0.5) *
        totalOscAmp;
      const oy =
        (Math.cos(t * 53.7) * 0.55 + Math.sin(t * 81.9) * 0.25 + (Math.random() - 0.5) * 0.5) *
        totalOscAmp;
      const oz =
        (Math.sin(t * 39.1 + 1.3) * 0.4 + (Math.random() - 0.5) * 0.35) * totalOscAmp * 0.7;

      this.camShakeOffset.set(
        THREE.MathUtils.clamp(ox + this.camImpulseOffset.x, -1.6, 1.6),
        THREE.MathUtils.clamp(oy + this.camImpulseOffset.y, -1.6, 1.6),
        THREE.MathUtils.clamp(oz + this.camImpulseOffset.z, -1.6, 1.6)
      );
    } else {
      this.camShakeOffset.set(0, 0, 0);
    }

    this.camera.position.copy(this.camBasePos).add(this.camShakeOffset);
    this.camera.lookAt(_camCurrentLook);
  }

  private animateProps(dt: number): void {
    this.craft.outerRing.rotation.z += dt * 3.5;
    this.craft.innerRing.rotation.x += dt * 4.5;
    this.craft.innerRing.rotation.y += dt * 2.2;

    const pulse = 0.88 + Math.sin(this.totalElapsed * 24) * 0.14;
    this.craft.thrusterCone.scale.set(pulse, pulse, this.phase === 'playing' ? 1.25 : 0.8);

    const minAnimZ = this.playerZ - 34;
    const maxAnimZ = this.playerZ + 125;

    for (const obs of this.runtimeObstacles) {
      if (obs.destroyed) continue;
      const d = obs.data;
      const obsZ = d.type === 'spikes' ? (d.zStart + d.zEnd) * 0.5 : d.type === 'laserBar' ? d.z1 : d.z;
      if (obsZ < minAnimZ || obsZ > maxAnimZ) continue;

      if (d.type === 'saw') {
        const velRatio =
          this.gameMode === 'endless'
            ? THREE.MathUtils.clamp(
                this.adaptiveSawVelocityMult / (obs.sawSpawnVelMult || 1),
                0.55,
                1.75
              )
            : 1.0;
        obs.group.rotation.x += (d.spinSpeed ?? 3.5) * velRatio * dt;
        if (this.gameMode === 'endless' && (d.driftAmpY || d.driftAmpZ)) {
          const nextPhase =
            (obs.sawMotionPhase ?? d.driftPhase ?? 0) +
            (d.driftSpeed ?? 1.35) * velRatio * dt;
          obs.sawMotionPhase = nextPhase;
          const baseY = obs.sawBaseY ?? d.y;
          const baseZ = obs.sawBaseZ ?? d.z;
          const nextY = THREE.MathUtils.clamp(
            baseY + Math.sin(nextPhase) * (d.driftAmpY ?? 0),
            1.5,
            10.5
          );
          const nextZ = baseZ + Math.cos(nextPhase * 0.8) * (d.driftAmpZ ?? 0);
          d.y = nextY;
          d.z = nextZ;
          obs.group.position.set(0, nextY, nextZ);
        }
      } else if (d.type === 'starMine') {
        obs.group.rotation.x += (d.spinSpeed ?? 3.8) * dt;
      } else if (d.type === 'patrolDrone' && obs.animatedSubgroup) {
        obs.animatedSubgroup.position.y =
          d.baseY + Math.sin(this.totalElapsed * d.speed + (d.phase ?? 0)) * d.ampY;
        obs.animatedSubgroup.rotation.y += dt * 2.8;
      } else if (d.type === 'rotaryGate' && obs.animatedSubgroup) {
        obs.animatedSubgroup.rotation.x += d.spinSpeed * dt;
      } else if (d.type === 'orbitMine' && obs.animatedSubgroup) {
        obs.animatedSubgroup.rotation.x += d.spinSpeed * dt;
      } else if (d.type === 'warpGate' && obs.animatedSubgroup) {
        obs.animatedSubgroup.rotation.z += (obs.triggered ? 4.8 : 1.7) * dt;
        if (obs.warpMembraneMat && obs.warpMembraneMat.opacity > 0.16) {
          obs.warpMembraneMat.opacity = Math.max(0.16, obs.warpMembraneMat.opacity - dt * 1.4);
        }
      }
    }

    for (const item of this.runtimeCollectibles) {
      if (item.collected) continue;
      if (item.data.z < minAnimZ || item.data.z > maxAnimZ) continue;
      if (item.data.type === 'gold') {
        item.group.rotation.y += dt * 2.4;
        item.group.rotation.x = Math.sin(this.totalElapsed * 2.5 + item.data.z) * 0.35;
      } else {
        item.group.rotation.y += dt * 2.0;
        item.group.position.y = item.data.y + Math.sin(this.totalElapsed * 3.2 + item.data.z) * 0.14;
      }
    }

    if (this.finishPortalRing) {
      this.finishPortalRing.rotation.z += dt * 1.4;
    }
  }

  private buildSnapshot(): HudSnapshot {
    const rawPct =
      this.gameMode === 'endless'
        ? 0
        : (this.playerZ / this.currentLevel.length) * 100;
    const percent = Math.min(100, Math.max(0, Math.floor(rawPct)));
    const cpPct = this.lastCheckpoint
      ? Math.floor((this.lastCheckpoint.z / this.currentLevel.length) * 100)
      : 0;
    const warpRemaining = Math.max(this.xShiftTimer, this.invertCamTimer, this.mirrorCamTimer);
    return {
      phase: this.phase,
      mode: this.gameMode,
      percent,
      distance: Math.floor(this.playerZ),
      sector: this.currentSector,
      score: this.score,
      streakMultiplier: this.streakMultiplier,
      nearMissCount: this.nearMissCount,
      calloutText: this.calloutTimer > 0 ? this.calloutText : null,
      stars: [...this.starsEarned] as [boolean, boolean, boolean],
      attempts: this.attempts,
      activeSpeedMultiplier: this.activeSpeedMultiplier,
      hasCheckpoint: this.lastCheckpoint !== null,
      checkpointPercent: cpPct,
      powerCharge: Math.floor(this.powerCharge),
      powerActiveRemaining: Number(this.powerActiveRemaining.toFixed(1)),
      powerDuration: this.currentSkin.powerDuration,
      shieldActive: this.shieldActive,
      shieldCharges: this.shieldCharges,
      musicIntensity: this.currentMusicIntensity,
      activeWarpEffect: warpRemaining > 0 ? this.activeWarpEffect : null,
      activeWarpRemaining: Number(warpRemaining.toFixed(1)),
      envEventType: this.envEventPhase !== 'idle' ? this.envEventType : null,
      envEventPhase: this.envEventPhase,
      envEventRemaining: Number(Math.max(0, this.envEventTimer).toFixed(1)),
    };
  }

  private emitHud(force = false): void {
    if (force || this.totalElapsed - this.lastHudEmit >= 0.05) {
      this.lastHudEmit = this.totalElapsed;
      if (this.gameMode === 'endless' && this.phase === 'playing') {
        const dist = Math.floor(this.playerZ);
        if (dist >= this.lastReportedInfinityDist + 10) {
          this.lastReportedInfinityDist = dist;
          this.callbacks.onChallengeEvent?.({ infinityDistanceInRun: dist });
        }
      }
      this.callbacks.onHudUpdate(this.buildSnapshot());
    }
  }

  private tick = (): void => {
    if (this.disposed) return;

    const nowMs = performance.now();
    const rawDt = (nowMs - this.lastTimeMs) / 1000;
    this.lastTimeMs = nowMs;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    if (!this.paused) {
      this.totalElapsed += dt;

      if (this.goldComboTimer > 0) {
        this.goldComboTimer -= dt;
        if (this.goldComboTimer <= 0) {
          this.goldCombo = 0;
          this.streakMultiplier = 1.0;
        }
      }

      if (this.calloutTimer > 0) {
        this.calloutTimer -= dt;
        if (this.calloutTimer <= 0) {
          this.calloutText = null;
        }
      }

      const endlessBoost =
        this.gameMode === 'endless' ? Math.min(0.45, this.playerZ / 1500) : 0;
      const effectiveSpeed =
        this.activeSpeedMultiplier + endlessBoost + (this.gameMode === 'hardcore' ? 0.15 : 0);
      this.currentMusicIntensity = soundEngine.stepMusicPulse(
        dt,
        this.phase === 'playing',
        effectiveSpeed
      );
      this.updateDynamicEnvironmentColors(dt, this.currentMusicIntensity);

      if (this.phase === 'ready') {
        const bob = Math.sin(this.totalElapsed * 3.5) * 0.14;
        this.craft.group.position.set(this.playerX, this.playerY + bob, this.playerZ);
        this.craft.group.rotation.x = THREE.MathUtils.damp(this.craft.group.rotation.x, 0, 10, dt);
      } else if (this.phase === 'playing') {
        this.updateAdaptiveDifficulty(dt);
        this.updateEnvironmentalEvents(dt);
        this.updateSpecialPowerState(dt);
        this.stepPhysics(dt);
        this.updateBarrageProjectiles(dt);

        const gravityInverted =
          (this.gameMode === 'inverted') !==
          (this.envEventPhase === 'active' && this.envEventType === 'gravityShift');
        const climbInput = gravityInverted ? !this.isHolding : this.isHolding;
        const targetPitch =
          this.railState !== 'free'
            ? 0
            : climbInput
              ? -(42 * Math.PI) / 180
              : (42 * Math.PI) / 180;
        this.craftPitch = THREE.MathUtils.damp(this.craftPitch, targetPitch, 28, dt);
        this.craft.group.position.set(this.playerX, this.playerY, this.playerZ);
        this.craft.group.rotation.x = this.craftPitch;

        const targetFlipZ =
          this.envEventPhase === 'active' && this.envEventType === 'gravityShift' ? Math.PI : 0;
        this.envBodyFlipAngle = THREE.MathUtils.damp(this.envBodyFlipAngle, targetFlipZ, 9, dt);
        this.craft.bodyGroup.rotation.z = this.envBodyFlipAngle;

        this.updateTrailGeometry();
        this.emitHud(false);
      } else if (this.phase === 'crashed') {
        this.crashTimer += dt;
        if (this.crashTimer >= 0.72) {
          this.attempts += 1;
          if (this.gameMode === 'endless') {
            this.loadLevel(this.currentLevel, 'endless', true);
          } else {
            this.respawnAtCheckpoint(this.gameMode === 'hardcore');
          }
        }
      }

      this.animateProps(dt);
      this.updateParticles(dt);
      this.updateCamera(dt);
    }

    if (this.isSoftwareGl || !this.composer || !this.bloomEnabled) {
      this.renderer.render(this.scene, this.camera);
    } else {
      this.composer.render();
    }
    this.scheduleNextFrame();
  };

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.reducedMotionQuery?.removeEventListener('change', this.handleReducedMotionChange);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.clearLevelGroup();
    disposeSharedModelCache();

    this.trailMeshA.geometry.dispose();
    this.trailMeshB.geometry.dispose();
    (this.trailMeshA.material as THREE.Material).dispose();
    this.trailLine.geometry.dispose();
    (this.trailLine.material as THREE.Material).dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.barrageMesh.geometry.dispose();
    (this.barrageMesh.material as THREE.Material).dispose();

    this.bloomPass?.dispose();
    this.composer?.dispose();
    this.envRenderTarget.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
