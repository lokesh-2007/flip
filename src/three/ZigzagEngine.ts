import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
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
  CheckpointMarker,
  CollectibleItem,
  CraftSkin,
  GameMode,
  GamePhase,
  HudSnapshot,
  LevelDefinition,
  LevelObstacle,
} from '../types/game';
import {
  createBlockObstacle,
  createCheckpointMarker,
  createFinishPortal,
  createGoldCube,
  createPlayerCraft,
  createSawBlade,
  createSpeedGate,
  createSpikeCluster,
  createStarCollectible,
  createStarMine,
  getBlockSubBoxes,
  PlayerCraftHandles,
} from './models';
import {
  createCheckerboardTexture,
  createDashedBeamTexture,
  createTrenchGridTexture,
} from './textures';

// Pre-allocated scratch objects for zero-GC render loop
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _baseColor = new THREE.Color();
const _hsl = { h: 0, s: 0, l: 0 };
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _camCurrentLook = new THREE.Vector3();

const HITBOX_RADIUS = 0.30;
const PICKUP_RADIUS = 0.95;
const MAX_TRAIL_POINTS = 320;
const PARTICLE_POOL_SIZE = 112;
const ENDLESS_SLAB_LEN = 264;

interface TrailVertex {
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

interface RuntimeObstacle {
  data: LevelObstacle;
  group: THREE.Group;
  subBoxes?: Array<{ zMin: number; zMax: number; yMin: number; yMax: number }>;
  triggered?: boolean;
  destroyed?: boolean;
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
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmremGenerator: THREE.PMREMGenerator;
  private envRenderTarget: THREE.WebGLRenderTarget;

  private levelGroup: THREE.Group;
  private craft: PlayerCraftHandles;
  private currentSkin: CraftSkin = CRAFT_SKINS[0];

  // Environment color-shifting material references
  private floorMat: THREE.MeshStandardMaterial | null = null;
  private railMat: THREE.MeshStandardMaterial | null = null;
  private towerMat: THREE.MeshStandardMaterial | null = null;
  private floatMat: THREE.MeshStandardMaterial | null = null;
  private floorMesh: THREE.Mesh | null = null;
  private ceilingMesh: THREE.Mesh | null = null;
  private railMeshes: THREE.Mesh[] = [];
  private parallaxTowers: THREE.InstancedMesh | null = null;
  private parallaxFloaters: THREE.InstancedMesh | null = null;
  private baseAccentHue: number = 0.52;
  private baseHazardHue: number = 0.95;
  private baseFogColor = new THREE.Color(0x070c22);
  private smoothedIntensity: number = 0.15;
  private huePhase: number = 0;

  // Dynamic 3D ribbon trail buffers
  private trailMeshA: THREE.Mesh;
  private trailMeshB: THREE.Mesh;
  private trailLine: THREE.Line;
  private trailPositionsA: Float32Array;
  private trailPositionsB: Float32Array;
  private trailLinePositions: Float32Array;
  private trailVertices: TrailVertex[] = [];

  // Particle pool
  private particleMesh: THREE.InstancedMesh;
  private particles: ParticleState[] = [];

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

  // Endless streaming state
  private nextEndlessChunkIdx: number = 0;
  private nextEndlessZ: number = 36;
  private endlessGridTileUnit: number = 8;
  private endlessSpanZ: number = 288;
  private towerInstances: Array<{ x: number; y: number; z: number; w: number; h: number }> = [];
  private floaterInstances: Array<{ x: number; y: number; z: number; s: number; rx: number; ry: number }> = [];

  // Gameplay state
  private phase: GamePhase = 'ready';
  private cameraMode: CameraMode = 'isometric';
  private isHolding: boolean = false;
  private playerZ: number = 0;
  private playerY: number = 6.0;
  private craftPitch: number = 0;
  private railState: 'free' | 'floor' | 'ceiling' = 'free';
  private activeSpeedMultiplier: number = 1.0;
  private lastCheckpoint: CheckpointMarker | null = null;
  private score: number = 0;
  private starsEarned: [boolean, boolean, boolean] = [false, false, false];
  private goldCombo: number = 0;
  private goldComboTimer: number = 0;
  private attempts: number = 1;
  private crashTimer: number = 0;
  private shakeIntensity: number = 0;
  private totalElapsed: number = 0;
  private lastHudEmit: number = 0;

  // Special Power state
  private powerCharge: number = 100;
  private powerActiveRemaining: number = 0;
  private shieldActive: boolean = false;
  private invulnTimer: number = 0;
  private currentMusicIntensity: number = 0.15;

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
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, width / height, 0.2, 260);

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

    // 3D Ribbon Trail Setup (2 crossed ribbons + center bright line)
    const maxVerts = MAX_TRAIL_POINTS * 2;
    this.trailPositionsA = new Float32Array(maxVerts * 3);
    this.trailPositionsB = new Float32Array(maxVerts * 3);
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
    trailGeoA.setIndex(indices);
    trailGeoA.setDrawRange(0, 0);

    const trailGeoB = new THREE.BufferGeometry();
    trailGeoB.setAttribute('position', new THREE.BufferAttribute(this.trailPositionsB, 3));
    trailGeoB.setIndex(indices);
    trailGeoB.setDrawRange(0, 0);

    const trailMat = new THREE.MeshBasicMaterial({
      color: this.currentSkin.trailColor,
      transparent: true,
      opacity: 0.75,
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

    // Load initial level
    this.loadLevel(initialLevel, initialMode);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.lastTimeMs = performance.now();
    this.scheduleNextFrame();
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
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

  public setSkin(skin: CraftSkin): void {
    this.currentSkin = skin;
    this.craft.setSkin(skin);
    const mat = this.trailMeshA.material as THREE.MeshBasicMaterial;
    mat.color.setHex(skin.trailColor);
    this.powerActiveRemaining = 0;
    this.shieldActive = false;
    this.craft.shieldMesh.visible = false;
    this.craft.auraRing.visible = false;
    this.craft.laserBeam.visible = false;
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

  public activateSpecialPower(): boolean {
    if (this.paused || this.phase !== 'playing') return false;
    if (this.powerCharge < 100 || this.powerActiveRemaining > 0) return false;

    this.powerCharge = 0;
    this.powerActiveRemaining = this.currentSkin.powerDuration;
    this.shieldActive = this.currentSkin.powerType === 'shield';

    soundEngine.playSpecialPower(this.currentSkin.powerType);
    this.spawnBurst(0, this.playerY, this.playerZ, 18, this.currentSkin.coreColor, 10);
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
    this.emitHud(true);
    return true;
  }

  public setHolding(holding: boolean): void {
    if (this.paused) return;

    if (this.phase === 'ready') {
      if (holding) {
        this.phase = 'playing';
        this.isHolding = true;
        this.railState = 'free';
        this.trailVertices = [{ z: this.playerZ, y: this.playerY }];
        soundEngine.playTurn(this.gameMode !== 'inverted');
        this.emitHud(true);
      }
      return;
    }

    if (this.phase === 'crashed') {
      if (holding && this.crashTimer >= 0.25) {
        this.respawnAtCheckpoint(this.gameMode === 'hardcore' || this.gameMode === 'endless');
        this.phase = 'playing';
        this.isHolding = true;
        this.railState = 'free';
        this.trailVertices = [{ z: this.playerZ, y: this.playerY }];
        soundEngine.playTurn(this.gameMode !== 'inverted');
        this.emitHud(true);
      }
      return;
    }

    if (this.phase !== 'playing') return;

    if (this.isHolding !== holding) {
      this.isHolding = holding;
      this.trailVertices.push({ z: this.playerZ, y: this.playerY });
      if (this.trailVertices.length > MAX_TRAIL_POINTS - 2) {
        this.trailVertices.shift();
      }
      const ascending = this.gameMode === 'inverted' ? !holding : holding;
      soundEngine.playTurn(ascending);
    }
  }

  public restartFull(): void {
    if (this.gameMode === 'endless') {
      this.loadLevel(this.currentLevel, 'endless');
      return;
    }

    this.lastCheckpoint = null;
    this.attempts += 1;
    this.score = 0;
    this.starsEarned = [false, false, false];
    this.goldCombo = 0;
    this.activeSpeedMultiplier = 1.0;

    for (const item of this.runtimeCollectibles) {
      item.collected = false;
      item.group.visible = true;
    }
    for (const obs of this.runtimeObstacles) {
      obs.triggered = false;
      obs.destroyed = false;
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

    this.playerZ = startZ;
    this.playerY = startY;
    this.craftPitch = 0;
    this.isHolding = false;
    this.railState = 'free';
    this.phase = 'ready';
    this.shakeIntensity = 0;
    this.crashTimer = 0;

    // Reset power state on respawn
    this.powerCharge = 100;
    this.powerActiveRemaining = 0;
    this.shieldActive = false;
    this.invulnTimer = 0;
    this.craft.shieldMesh.visible = false;
    this.craft.auraRing.visible = false;
    this.craft.laserBeam.visible = false;

    let mult = 1.0;
    for (const obs of this.runtimeObstacles) {
      if (obs.data.type === 'speedGate' && obs.data.z <= startZ) {
        mult = obs.data.multiplier;
        obs.triggered = true;
      } else if (obs.data.type === 'speedGate') {
        obs.triggered = false;
      }
    }
    this.activeSpeedMultiplier = mult;

    this.craft.group.visible = true;
    this.craft.group.position.set(0, this.playerY, this.playerZ);
    this.craft.group.rotation.set(0, 0, 0);

    this.trailVertices = [{ z: this.playerZ, y: this.playerY }];
    this.updateTrailGeometry();
    this.snapCameraToPlayer();
    this.emitHud(true);
  }

  public loadLevel(level: LevelDefinition, mode: GameMode = this.gameMode): void {
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
    const gridTex = createTrenchGridTexture(theme.trenchGlowHex, maxAniso);
    const checkerTex = createCheckerboardTexture(maxAniso);
    const beamTex = createDashedBeamTexture(theme.accentHex);
    this.disposableTextures.push(gridTex, checkerTex, beamTex);

    const isEndless = mode === 'endless';
    const trackStartZ = -24;
    const trackEndZ = isEndless ? ENDLESS_SLAB_LEN : level.length + 60;
    const trackLen = trackEndZ - trackStartZ;
    const trackCenterZ = (trackStartZ + trackEndZ) * 0.5;

    // Floor & Ceiling cyber-trench slabs
    gridTex.repeat.set(2, trackLen / 8);
    this.endlessGridTileUnit = 8;
    this.endlessSpanZ = trackLen;
    const slabGeo = new THREE.PlaneGeometry(8.5, trackLen);
    this.disposableGeometries.push(slabGeo);

    this.floorMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      roughness: 0.35,
      metalness: 0.65,
      emissive: theme.trenchGlowHex,
      emissiveMap: gridTex,
      emissiveIntensity: 0.38,
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
    const railGeo = new THREE.BoxGeometry(0.24, 0.24, trackLen);
    this.railMat = new THREE.MeshStandardMaterial({
      color: theme.accentHex,
      emissive: theme.accentHex,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.5,
    });
    this.disposableGeometries.push(railGeo);
    this.disposableMaterials.push(this.railMat);

    this.railMeshes = [];
    for (const x of [-4.25, 4.25]) {
      for (const y of [TRACK_FLOOR_Y + 0.12, TRACK_CEILING_Y - 0.12]) {
        const rail = new THREE.Mesh(railGeo, this.railMat);
        rail.position.set(x, y, trackCenterZ);
        this.levelGroup.add(rail);
        this.railMeshes.push(rail);
      }
    }

    // Parallax Cyber-Canyon Architecture
    this.buildParallaxCanyon(trackStartZ, trackEndZ, theme.accentHex, theme.hazardHex);

    this.runtimeObstacles = [];
    this.runtimeCollectibles = [];
    this.runtimeCheckpoints = [];
    this.finishPortalRing = null;

    if (isEndless) {
      this.nextEndlessChunkIdx = 0;
      this.nextEndlessZ = 34;
      this.streamEndlessChunks(0);
    } else {
      // Build Fixed Course Obstacles
      for (const obs of level.obstacles) {
        this.addObstacleToScene(obs, theme.accentHex, theme.hazardHex);
      }
      // Build Fixed Collectibles
      for (const item of level.collectibles) {
        this.addCollectibleToScene(item);
      }
      // Build Checkpoints (disabled in hardcore mode!)
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
      // Build Finish Portal
      const portal = createFinishPortal(level.length, checkerTex, theme.accentHex);
      this.levelGroup.add(portal.group);
      this.finishPortalRing = portal.ring;
    }

    this.attempts = 1;
    this.score = 0;
    this.starsEarned = [false, false, false];
    this.lastCheckpoint = null;
    this.goldCombo = 0;
    this.respawnAtCheckpoint(true);
  }

  private addObstacleToScene(obs: LevelObstacle, accentHex: number, hazardHex: number): void {
    let group: THREE.Group;
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
    } else {
      group = createSpeedGate(obs.z, obs.multiplier);
    }

    this.levelGroup.add(group);
    this.runtimeObstacles.push({
      data: obs,
      group,
      subBoxes,
      triggered: false,
      destroyed: false,
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
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material?.dispose();
      }
    });
  }

  private streamEndlessChunks(currentZ: number): void {
    const horizonZ = currentZ + 170;
    while (this.nextEndlessZ < horizonZ) {
      const { obstacles, collectibles } = generateEndlessChunk(
        this.nextEndlessChunkIdx,
        this.nextEndlessZ
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
      this.nextEndlessChunkIdx += 1;
      this.nextEndlessZ += ENDLESS_CHUNK_LENGTH;
    }

    // Recycle objects well behind the camera
    const cullZ = currentZ - 42;
    this.runtimeObstacles = this.runtimeObstacles.filter((obs) => {
      const obsEnd = obs.data.type === 'spikes' ? obs.data.zEnd : obs.data.z + 6;
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
      emissiveIntensity: 0.16,
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
      emissiveIntensity: 0.55,
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
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material?.dispose();
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
    this.towerMat = null;
    this.floatMat = null;
    this.floorMesh = null;
    this.ceilingMesh = null;
    this.railMeshes = [];
    this.parallaxTowers = null;
    this.parallaxFloaters = null;
  }

  private updateDynamicEnvironmentColors(dt: number, intensity: number): void {
    this.smoothedIntensity = THREE.MathUtils.damp(this.smoothedIntensity, intensity, 10, dt);
    const speedExcess = Math.max(0, this.activeSpeedMultiplier - 1.0);
    const speedFactor = this.activeSpeedMultiplier;

    // Continuous subtle hue drift accelerated by speed multiplier + reactive intensity shift
    this.huePhase = (this.huePhase + dt * (0.04 + speedExcess * 0.28)) % 1.0;
    const reactiveHueShift =
      (this.huePhase * 0.22 + speedExcess * 0.45 + this.smoothedIntensity * 0.08) % 1.0;

    const gridHue = (this.baseAccentHue + reactiveHueShift) % 1.0;
    const prismHue = (this.baseAccentHue + reactiveHueShift + 0.08) % 1.0;
    const towerHue = (this.baseHazardHue + reactiveHueShift * 0.7) % 1.0;

    if (this.floorMat) {
      this.floorMat.emissive.setHSL(
        gridHue,
        0.9,
        0.48 + this.smoothedIntensity * 0.14
      );
      this.floorMat.emissiveIntensity =
        0.3 + this.smoothedIntensity * 0.65 + speedExcess * 0.45;
    }

    if (this.railMat) {
      const l = 0.52 + this.smoothedIntensity * 0.16;
      this.railMat.color.setHSL(prismHue, 0.95, l);
      this.railMat.emissive.setHSL(prismHue, 0.95, l);
      this.railMat.emissiveIntensity =
        1.25 + this.smoothedIntensity * 1.45 + speedExcess * 0.9;
    }

    if (this.towerMat) {
      this.towerMat.emissive.setHSL(gridHue, 0.85, 0.45);
      this.towerMat.emissiveIntensity = 0.12 + this.smoothedIntensity * 0.28;
    }

    if (this.floatMat) {
      this.floatMat.emissive.setHSL(towerHue, 0.9, 0.52);
      this.floatMat.emissiveIntensity =
        0.45 + this.smoothedIntensity * 0.85 + (speedFactor > 1.2 ? 0.35 : 0);
    }

    // Subtle atmospheric fog tint shift during overdrive or chrono slow
    if (this.scene.fog && this.scene.background instanceof THREE.Color) {
      this.baseFogColor.getHSL(_hsl);
      const targetHue =
        this.powerActiveRemaining > 0 && this.currentSkin.powerType === 'slowmo'
          ? 0.76
          : (_hsl.h + reactiveHueShift * 0.18) % 1.0;
      const targetLight = Math.min(0.14, _hsl.l + this.smoothedIntensity * 0.035);
      _color.setHSL(targetHue, Math.min(0.85, _hsl.s + 0.1), targetLight);
      this.scene.background.lerp(_color, Math.min(1, dt * 5));
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
    const halfW = 0.22;
    const halfH = 0.14;

    for (let i = 0; i < totalPts; i++) {
      const pt = i < ptsCount ? this.trailVertices[i] : { z: this.playerZ, y: this.playerY };
      const idx = i * 6;

      this.trailPositionsA[idx] = -halfW;
      this.trailPositionsA[idx + 1] = pt.y;
      this.trailPositionsA[idx + 2] = pt.z;

      this.trailPositionsA[idx + 3] = halfW;
      this.trailPositionsA[idx + 4] = pt.y;
      this.trailPositionsA[idx + 5] = pt.z;

      this.trailPositionsB[idx] = 0;
      this.trailPositionsB[idx + 1] = pt.y - halfH;
      this.trailPositionsB[idx + 2] = pt.z;

      this.trailPositionsB[idx + 3] = 0;
      this.trailPositionsB[idx + 4] = pt.y + halfH;
      this.trailPositionsB[idx + 5] = pt.z;

      const lIdx = i * 3;
      this.trailLinePositions[lIdx] = 0;
      this.trailLinePositions[lIdx + 1] = pt.y;
      this.trailLinePositions[lIdx + 2] = pt.z;
    }

    const drawIndices = Math.max(0, (totalPts - 1) * 6);
    this.trailMeshA.geometry.attributes.position.needsUpdate = true;
    this.trailMeshA.geometry.setDrawRange(0, drawIndices);

    this.trailMeshB.geometry.attributes.position.needsUpdate = true;
    this.trailMeshB.geometry.setDrawRange(0, drawIndices);

    this.trailLine.geometry.attributes.position.needsUpdate = true;
    this.trailLine.geometry.setDrawRange(0, totalPts);
  }

  private checkHazardCollision(z: number, y: number): RuntimeObstacle | null {
    const r = HITBOX_RADIUS;
    const rSq = r * r;

    for (const obs of this.runtimeObstacles) {
      if (obs.destroyed) continue;
      const data = obs.data;
      if (data.type === 'saw') {
        if (Math.abs(z - data.z) > data.radius + r) continue;
        const dz = z - data.z;
        const dy = y - data.y;
        const effR = data.radius * 0.78 + r;
        if (dz * dz + dy * dy < effR * effR) return obs;
      } else if (data.type === 'starMine') {
        if (Math.abs(z - data.z) > data.radius + r) continue;
        const dz = z - data.z;
        const dy = y - data.y;
        const effR = data.radius * 0.68 + r;
        if (dz * dz + dy * dy < effR * effR) return obs;
      } else if (data.type === 'block' && obs.subBoxes) {
        if (Math.abs(z - data.z) > data.width * 0.6 + r) continue;
        for (const b of obs.subBoxes) {
          const inset = 0.06;
          const cz = THREE.MathUtils.clamp(z, b.zMin + inset, b.zMax - inset);
          const cy = THREE.MathUtils.clamp(y, b.yMin + inset, b.yMax - inset);
          const dz = z - cz;
          const dy = y - cy;
          if (dz * dz + dy * dy < rSq) return obs;
        }
      } else if (data.type === 'spikes') {
        if (z < data.zStart - r * 0.5 || z > data.zEnd + r * 0.5) continue;
        const forgivingH = data.height * 0.78;
        if (data.placement === 'floor') {
          if (y - r < forgivingH) return obs;
        } else {
          if (y + r > TRACK_CEILING_Y - forgivingH) return obs;
        }
      }
    }

    return null;
  }

  private updateSpecialPowerState(dt: number): void {
    const power = this.currentSkin.powerType;

    if (this.powerActiveRemaining > 0) {
      this.powerActiveRemaining = Math.max(0, this.powerActiveRemaining - dt);
      if (this.powerActiveRemaining === 0) {
        this.shieldActive = false;
      }
    } else {
      // Passive recharge during gameplay
      this.powerCharge = Math.min(100, this.powerCharge + dt * 7.0);
    }

    if (this.invulnTimer > 0) {
      this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    }

    const isPowerActive = this.powerActiveRemaining > 0;
    this.craft.shieldMesh.visible =
      (isPowerActive && (power === 'shield' || power === 'phase')) || this.invulnTimer > 0;
    this.craft.auraRing.visible =
      isPowerActive && (power === 'magnet' || power === 'overdrive');
    this.craft.laserBeam.visible = isPowerActive && power === 'breaker';

    if (this.craft.shieldMesh.visible) {
      this.craft.shieldMesh.rotation.y += dt * 2.5;
      this.craft.shieldMesh.rotation.x += dt * 1.4;
    }
    if (this.craft.auraRing.visible) {
      this.craft.auraRing.rotation.x += dt * 5.0;
      const s = 1.0 + Math.sin(this.totalElapsed * 12) * 0.12;
      this.craft.auraRing.scale.setScalar(s);
    }

    // Laser Breaker destroys hazards directly in front of the craft
    if (isPowerActive && power === 'breaker') {
      const beamEndZ = this.playerZ + 13.0;
      for (const obs of this.runtimeObstacles) {
        if (obs.destroyed) continue;
        const d = obs.data;
        if (d.type === 'saw' || d.type === 'starMine') {
          if (d.z > this.playerZ && d.z <= beamEndZ && Math.abs(d.y - this.playerY) < d.radius + 0.9) {
            obs.destroyed = true;
            obs.group.visible = false;
            this.score += 75;
            this.spawnBurst(0, d.y, d.z, 20, 0xfb7185, 11);
            soundEngine.playCollectGold(4);
          }
        } else if (d.type === 'block') {
          if (
            d.z > this.playerZ &&
            d.z <= beamEndZ &&
            Math.abs(d.y - this.playerY) < d.height * 0.5 + 0.65
          ) {
            obs.destroyed = true;
            obs.group.visible = false;
            this.score += 75;
            this.spawnBurst(0, d.y, d.z, 22, 0xfb7185, 11);
            soundEngine.playCollectGold(4);
          }
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
    const slowMoFactor = isPowerActive && power === 'slowmo' ? 0.62 : 1.0;
    const endlessRamp =
      this.gameMode === 'endless' ? Math.min(0.4, this.playerZ / 1600) : 0;
    const scoreMult =
      (this.gameMode === 'hardcore' ? 2.0 : 1.0) *
      (isPowerActive && power === 'overdrive' ? 2.5 : 1.0);

    const climbInput = this.gameMode === 'inverted' ? !this.isHolding : this.isHolding;

    while (remaining > 0 && this.phase === 'playing') {
      const step = Math.min(remaining, MAX_STEP);
      remaining -= step;

      const speed =
        this.currentLevel.baseSpeed *
        (this.activeSpeedMultiplier + endlessRamp) *
        modeBaseMult *
        slowMoFactor;
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
        this.trailVertices.push({ z: this.playerZ, y: nextY });
        if (this.trailVertices.length > MAX_TRAIL_POINTS - 2) {
          this.trailVertices.shift();
        }
        this.railState = nextRail;
      }

      this.playerY = nextY;

      // Speed gates
      for (const obs of this.runtimeObstacles) {
        if (obs.data.type === 'speedGate' && !obs.triggered && this.playerZ >= obs.data.z) {
          obs.triggered = true;
          const prev = this.activeSpeedMultiplier;
          this.activeSpeedMultiplier = obs.data.multiplier;
          if (Math.abs(prev - obs.data.multiplier) > 0.05) {
            soundEngine.playSpeedGate(obs.data.multiplier > prev);
          }
        }
      }

      // Checkpoints (Classic & Inverted modes)
      for (const cp of this.runtimeCheckpoints) {
        if (!cp.reached && this.playerZ >= cp.data.z) {
          cp.reached = true;
          cp.activate();
          this.lastCheckpoint = cp.data;
          soundEngine.playCheckpoint();
          this.spawnBurst(0, this.playerY, cp.data.z, 10, 0x34d399, 6);
        }
      }

      // Collectibles (with Magnet Surge / Overdrive magnetic pull)
      const hasMagnet = isPowerActive && (power === 'magnet' || power === 'overdrive');
      const magnetRange = power === 'magnet' ? 7.5 : 5.5;
      const pSq = PICKUP_RADIUS * PICKUP_RADIUS;

      for (const item of this.runtimeCollectibles) {
        if (item.collected) continue;
        const dZ = this.playerZ - item.data.z;
        const dY = this.playerY - item.data.y;
        const distSq = dZ * dZ + dY * dY;

        if (hasMagnet && distSq < magnetRange * magnetRange) {
          const pull = Math.min(1, step * 11);
          item.data.z = THREE.MathUtils.lerp(item.data.z, this.playerZ, pull);
          item.data.y = THREE.MathUtils.lerp(item.data.y, this.playerY, pull);
          item.group.position.set(0, item.data.y, item.data.z);
        } else if (Math.abs(dZ) > PICKUP_RADIUS + 0.5) {
          continue;
        }

        const curDz = this.playerZ - item.data.z;
        const curDy = this.playerY - item.data.y;
        if (curDz * curDz + curDy * curDy <= pSq) {
          item.collected = true;
          item.group.visible = false;
          this.score += Math.round(item.data.value * scoreMult);
          if (item.data.type === 'gold') {
            this.powerCharge = Math.min(100, this.powerCharge + 14);
            soundEngine.playCollectGold(this.goldCombo);
            this.goldCombo += 1;
            this.goldComboTimer = 0.75;
            this.spawnBurst(0, item.data.y, item.data.z, 7, 0xfacc15, 6.5);
          } else {
            this.powerCharge = Math.min(100, this.powerCharge + 35);
            if (item.data.starIndex !== undefined) {
              this.starsEarned[item.data.starIndex] = true;
            }
            soundEngine.playCollectStar();
            this.spawnBurst(0, item.data.y, item.data.z, 16, 0xfef08a, 9);
          }
          this.emitHud(true);
        }
      }

      // Hazards (skipped if Phase Blink or temporary shield post-hit invuln is active)
      const isIntangible =
        (isPowerActive && power === 'phase') || this.invulnTimer > 0;
      if (!isIntangible) {
        const hitObs = this.checkHazardCollision(this.playerZ, this.playerY);
        if (hitObs) {
          if (this.shieldActive) {
            // Consume Phase Shield & absorb impact!
            this.shieldActive = false;
            this.powerActiveRemaining = 0;
            this.invulnTimer = 1.15;
            this.shakeIntensity = 0.45;
            if (hitObs.data.type !== 'spikes') {
              hitObs.destroyed = true;
              hitObs.group.visible = false;
            }
            this.spawnBurst(0, this.playerY, this.playerZ, 26, 0x22d3ee, 11);
            soundEngine.playShieldPop();
            this.emitHud(true);
          } else {
            this.triggerCrash();
            return;
          }
        }
      }

      // Finish portal (non-endless modes)
      if (this.gameMode !== 'endless' && this.playerZ >= this.currentLevel.length) {
        this.triggerComplete();
        return;
      }
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

  private triggerCrash(): void {
    this.phase = 'crashed';
    this.crashTimer = 0;
    this.shakeIntensity = 0.85;
    this.craft.group.visible = false;
    this.craft.shieldMesh.visible = false;
    this.craft.auraRing.visible = false;
    this.craft.laserBeam.visible = false;
    this.spawnBurst(0, this.playerY, this.playerZ, 34, this.currentSkin.coreColor, 13);
    this.spawnBurst(0, this.playerY, this.playerZ, 16, 0xf43f5e, 10);
    soundEngine.playCrash();
    this.emitHud(true);
  }

  private triggerComplete(): void {
    this.phase = 'completed';
    this.playerZ = this.currentLevel.length;
    this.spawnBurst(0, this.playerY, this.playerZ, 40, 0xfacc15, 14);
    this.spawnBurst(0, this.playerY, this.playerZ, 24, 0x22d3ee, 11);
    soundEngine.playLevelComplete();
    const snap = this.buildSnapshot();
    this.callbacks.onHudUpdate(snap);
    this.callbacks.onLevelComplete(snap);
  }

  private snapCameraToPlayer(): void {
    if (this.cameraMode === 'isometric') {
      this.camera.position.set(-13.2, 6.2 + (this.playerY - 6.0) * 0.2, this.playerZ - 7.5);
      _camCurrentLook.set(0, 6.0 + (this.playerY - 6.0) * 0.14, this.playerZ + 8.5);
    } else {
      this.camera.position.set(-2.6, 6.3 + (this.playerY - 6.0) * 0.35, this.playerZ - 11.5);
      _camCurrentLook.set(0, 6.0 + (this.playerY - 6.0) * 0.2, this.playerZ + 11.0);
    }
    this.camera.lookAt(_camCurrentLook);
  }

  private updateCamera(dt: number): void {
    if (this.cameraMode === 'isometric') {
      _camTargetPos.set(-13.2, 6.2 + (this.playerY - 6.0) * 0.2, this.playerZ - 7.5);
      _camTargetLook.set(0, 6.0 + (this.playerY - 6.0) * 0.14, this.playerZ + 8.5);
    } else {
      _camTargetPos.set(-2.6, 6.3 + (this.playerY - 6.0) * 0.35, this.playerZ - 11.5);
      _camTargetLook.set(0, 6.0 + (this.playerY - 6.0) * 0.2, this.playerZ + 11.0);
    }

    const dampLambda = 11;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camTargetPos.x, dampLambda, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camTargetPos.y, dampLambda, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camTargetPos.z, 18, dt);

    _camCurrentLook.x = THREE.MathUtils.damp(_camCurrentLook.x, _camTargetLook.x, dampLambda, dt);
    _camCurrentLook.y = THREE.MathUtils.damp(_camCurrentLook.y, _camTargetLook.y, dampLambda, dt);
    _camCurrentLook.z = THREE.MathUtils.damp(_camCurrentLook.z, _camTargetLook.z, 18, dt);

    const targetFov =
      this.phase === 'playing' && this.activeSpeedMultiplier > 1.15
        ? 57
        : this.powerActiveRemaining > 0 && this.currentSkin.powerType === 'slowmo'
          ? 48
          : 52;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();
    }

    if (this.shakeIntensity > 0.005) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.x += sx;
      this.camera.position.y += sy;
      this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 8, dt);
    }

    this.camera.lookAt(_camCurrentLook);
  }

  private animateProps(dt: number): void {
    this.craft.outerRing.rotation.z += dt * 3.5;
    this.craft.innerRing.rotation.x += dt * 4.5;
    this.craft.innerRing.rotation.y += dt * 2.2;

    const pulse = 0.88 + Math.sin(this.totalElapsed * 24) * 0.14;
    this.craft.thrusterCone.scale.set(pulse, pulse, this.phase === 'playing' ? 1.25 : 0.8);

    for (const obs of this.runtimeObstacles) {
      if (obs.destroyed) continue;
      if (obs.data.type === 'saw') {
        obs.group.rotation.x += (obs.data.spinSpeed ?? 3.5) * dt;
      } else if (obs.data.type === 'starMine') {
        obs.group.rotation.x += (obs.data.spinSpeed ?? 3.8) * dt;
      }
    }

    for (const item of this.runtimeCollectibles) {
      if (item.collected) continue;
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
    return {
      phase: this.phase,
      mode: this.gameMode,
      percent,
      distance: Math.floor(this.playerZ),
      score: this.score,
      stars: [...this.starsEarned] as [boolean, boolean, boolean],
      attempts: this.attempts,
      activeSpeedMultiplier: this.activeSpeedMultiplier,
      hasCheckpoint: this.lastCheckpoint !== null,
      checkpointPercent: cpPct,
      powerCharge: Math.floor(this.powerCharge),
      powerActiveRemaining: Number(this.powerActiveRemaining.toFixed(1)),
      powerDuration: this.currentSkin.powerDuration,
      shieldActive: this.shieldActive,
      musicIntensity: this.currentMusicIntensity,
    };
  }

  private emitHud(force = false): void {
    if (force || this.totalElapsed - this.lastHudEmit >= 0.05) {
      this.lastHudEmit = this.totalElapsed;
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
        if (this.goldComboTimer <= 0) this.goldCombo = 0;
      }

      // Step synthesized synthwave pulse & update reactive grid/prism colors
      const endlessBoost =
        this.gameMode === 'endless' ? Math.min(0.4, this.playerZ / 1600) : 0;
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
        this.craft.group.position.set(0, this.playerY + bob, this.playerZ);
        this.craft.group.rotation.x = THREE.MathUtils.damp(this.craft.group.rotation.x, 0, 10, dt);
      } else if (this.phase === 'playing') {
        this.updateSpecialPowerState(dt);
        this.stepPhysics(dt);

        const climbInput =
          this.gameMode === 'inverted' ? !this.isHolding : this.isHolding;
        const targetPitch =
          this.railState !== 'free'
            ? 0
            : climbInput
              ? -(42 * Math.PI) / 180
              : (42 * Math.PI) / 180;
        this.craftPitch = THREE.MathUtils.damp(this.craftPitch, targetPitch, 28, dt);
        this.craft.group.position.set(0, this.playerY, this.playerZ);
        this.craft.group.rotation.x = this.craftPitch;

        this.updateTrailGeometry();
        this.emitHud(false);
      } else if (this.phase === 'crashed') {
        this.crashTimer += dt;
        if (this.crashTimer >= 0.72) {
          this.attempts += 1;
          if (this.gameMode === 'endless') {
            this.loadLevel(this.currentLevel, 'endless');
          } else {
            this.respawnAtCheckpoint(this.gameMode === 'hardcore');
          }
        }
      }

      this.animateProps(dt);
      this.updateParticles(dt);
      this.updateCamera(dt);
    }

    this.renderer.render(this.scene, this.camera);
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
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.clearLevelGroup();

    this.trailMeshA.geometry.dispose();
    this.trailMeshB.geometry.dispose();
    (this.trailMeshA.material as THREE.Material).dispose();
    this.trailLine.geometry.dispose();
    (this.trailLine.material as THREE.Material).dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();

    this.envRenderTarget.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
