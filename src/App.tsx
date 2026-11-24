import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, FlipVertical, Radio, Shield, Sun, Zap } from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { TopHud } from './components/TopHud';
import { CRAFT_SKINS, ENDLESS_LEVEL_BASE, LEVELS } from './levels/levelData';
import { ZigzagEngine } from './three/ZigzagEngine';
import {
  AdvancementsState,
  CameraMode,
  CraftSkin,
  DailyChallengeState,
  EnvEventType,
  GameMode,
  HudSnapshot,
  LevelDefinition,
  LevelProgressRecord,
  UpgradeId,
  UpgradeLevels,
} from './types/game';
import {
  ADVANCEMENTS,
  UPGRADES,
  applyCareerEvent,
  getMaxUpgradeLevel,
  getStatForAdvancement,
  getUpgradeCost,
  loadAdvancementsState,
  loadUpgradeLevels,
  saveAdvancementsState,
  saveUpgradeLevels,
} from './utils/advancements';
import {
  applyChallengeEvent,
  loadOrCreateDailyState,
  saveDailyState,
} from './utils/dailyChallenges';
import { scrambleGlitchText } from './utils/glitchText';

const PROGRESS_STORAGE_KEY = 'cyber_trench_progress_v2';

interface SavedStorageData {
  progressMap: Record<string, LevelProgressRecord>;
  totalGold: number;
  selectedSkinId: string;
  selectedMode: GameMode;
  endlessBest: number;
}

function loadSavedData(): SavedStorageData {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedStorageData>;
      return {
        progressMap: parsed.progressMap ?? {},
        totalGold: typeof parsed.totalGold === 'number' ? parsed.totalGold : 0,
        selectedSkinId: parsed.selectedSkinId ?? CRAFT_SKINS[0].id,
        selectedMode: parsed.selectedMode ?? 'classic',
        endlessBest: typeof parsed.endlessBest === 'number' ? parsed.endlessBest : 0,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return {
    progressMap: {},
    totalGold: 0,
    selectedSkinId: CRAFT_SKINS[0].id,
    selectedMode: 'classic',
    endlessBest: 0,
  };
}

const ENV_EVENT_UI: Record<
  EnvEventType,
  {
    title: string;
    warningText: string;
    activeText: string;
    borderClass: string;
    textClass: string;
  }
> = {
  glitchStorm: {
    title: 'GLITCH STORM',
    warningText: 'Telemetry disruption inbound',
    activeText: 'HUD telemetry scrambled',
    borderClass: 'border-fuchsia-400/70',
    textClass: 'text-fuchsia-300',
  },
  gravityShift: {
    title: 'GRAVITY SHIFT',
    warningText: 'Polarization flip imminent',
    activeText: 'Hold / Release controls inverted!',
    borderClass: 'border-rose-400/75',
    textClass: 'text-rose-300',
  },
  solarFlare: {
    title: 'SOLAR FLARE',
    warningText: 'Thermal surge inbound',
    activeText: '1.5x Gold & Power Charge surge',
    borderClass: 'border-amber-400/70',
    textClass: 'text-amber-300',
  },
  magTurbulence: {
    title: 'MAG TURBULENCE',
    warningText: 'Flux eddies forming ahead',
    activeText: 'Magnetic eddies · +50% Charge',
    borderClass: 'border-cyan-400/70',
    textClass: 'text-cyan-300',
  },
};

export default function App() {
  const initialSaved = useMemo(() => loadSavedData(), []);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ZigzagEngine | null>(null);

  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>(initialSaved.selectedMode);
  const currentLevel = gameMode === 'endless' ? ENDLESS_LEVEL_BASE : LEVELS[currentLevelIdx];

  const [progressMap, setProgressMap] = useState<Record<string, LevelProgressRecord>>(
    initialSaved.progressMap
  );
  const [totalGold, setTotalGold] = useState<number>(initialSaved.totalGold);
  const [endlessBest, setEndlessBest] = useState<number>(initialSaved.endlessBest);
  const [selectedSkinId, setSelectedSkinId] = useState<string>(initialSaved.selectedSkinId);
  const [dailyState, setDailyState] = useState<DailyChallengeState>(() => loadOrCreateDailyState());
  const [upgrades, setUpgrades] = useState<UpgradeLevels>(() => loadUpgradeLevels());
  const [advancementsState, setAdvancementsState] = useState<AdvancementsState>(() =>
    loadAdvancementsState()
  );
  const [dailyBanner, setDailyBanner] = useState<string | null>(null);

  const [muted, setMuted] = useState<boolean>(() => soundEngine.isMuted());
  const [bloomEnabled, setBloomEnabled] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>('isometric');
  const [showLevelSelect, setShowLevelSelect] = useState<boolean>(false);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [glitchTick, setGlitchTick] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const [hud, setHud] = useState<HudSnapshot>({
    phase: 'ready',
    mode: initialSaved.selectedMode,
    percent: 0,
    distance: 0,
    sector: 1,
    score: 0,
    stars: [false, false, false],
    attempts: 1,
    activeSpeedMultiplier: 1.0,
    streakMultiplier: 1.0,
    nearMissCount: 0,
    calloutText: null,
    hasCheckpoint: false,
    checkpointPercent: 0,
    powerCharge: 100,
    powerActiveRemaining: 0,
    powerDuration: CRAFT_SKINS[0].powerDuration,
    shieldActive: false,
    shieldCharges: 0,
    musicIntensity: 0.15,
    activeWarpEffect: null,
    activeWarpRemaining: 0,
    envEventType: null,
    envEventPhase: 'idle',
    envEventRemaining: 0,
  });

  const activeInputsRef = useRef<Set<string>>(new Set());
  const currentLevelRef = useRef<LevelDefinition>(currentLevel);
  currentLevelRef.current = currentLevel;
  const gameModeRef = useRef<GameMode>(gameMode);
  gameModeRef.current = gameMode;
  const upgradesRef = useRef<UpgradeLevels>(upgrades);
  upgradesRef.current = upgrades;

  const selectedSkin = useMemo(
    () => CRAFT_SKINS.find((s) => s.id === selectedSkinId) ?? CRAFT_SKINS[0],
    [selectedSkinId]
  );

  // Track OS reduced-motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Persist save data
  useEffect(() => {
    try {
      const payload: SavedStorageData = {
        progressMap,
        totalGold,
        selectedSkinId,
        selectedMode: gameMode,
        endlessBest,
      };
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [progressMap, totalGold, selectedSkinId, gameMode, endlessBest]);

  const updateProgressRecord = useCallback(
    (levelId: string, snapshot: HudSnapshot, isCompleted: boolean) => {
      if (snapshot.mode === 'endless') {
        setEndlessBest((prev) => Math.max(prev, snapshot.distance));
        return;
      }
      setProgressMap((prev) => {
        const existing = prev[levelId] ?? {
          bestPercent: 0,
          starsEarned: [false, false, false] as [boolean, boolean, boolean],
          bestScore: 0,
          completed: false,
        };
        const mergedStars: [boolean, boolean, boolean] = [
          existing.starsEarned[0] || snapshot.stars[0],
          existing.starsEarned[1] || snapshot.stars[1],
          existing.starsEarned[2] || snapshot.stars[2],
        ];
        return {
          ...prev,
          [levelId]: {
            bestPercent: Math.max(existing.bestPercent, isCompleted ? 100 : snapshot.percent),
            starsEarned: mergedStars,
            bestScore: Math.max(existing.bestScore, snapshot.score),
            completed: existing.completed || isCompleted,
          },
        };
      });
    },
    []
  );

  // Mount Three.js Engine once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const engine = new ZigzagEngine(
      container,
      currentLevelRef.current,
      selectedSkin,
      gameModeRef.current,
      {
        onHudUpdate: (snapshot) => {
          setHud(snapshot);
          if (snapshot.phase === 'crashed') {
            updateProgressRecord(currentLevelRef.current.id, snapshot, false);
            if (snapshot.mode === 'endless' && snapshot.score > 0) {
              setTotalGold((prev) => prev + snapshot.score);
            }
          }
        },
        onLevelComplete: (snapshot) => {
          setHud(snapshot);
          updateProgressRecord(currentLevelRef.current.id, snapshot, true);
          setTotalGold((prev) => prev + snapshot.score);
          setShowCompleteModal(true);
        },
        onChallengeEvent: (event) => {
          setDailyState((prev) => applyChallengeEvent(prev, event).nextState);
          setAdvancementsState((prev) => applyCareerEvent(prev, event, upgradesRef.current).nextState);
        },
      }
    );

    engine.setUpgrades(upgradesRef.current);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setPaused(showLevelSelect);
  }, [showLevelSelect]);

  useEffect(() => {
    engineRef.current?.setSkin(selectedSkin);
  }, [selectedSkin]);

  useEffect(() => {
    engineRef.current?.setUpgrades(upgrades);
  }, [upgrades]);

  // Glitch Storm UI scramble interval (only active during Glitch Storm)
  const isGlitchActive =
    hud.phase === 'playing' &&
    hud.envEventPhase === 'active' &&
    hud.envEventType === 'glitchStorm' &&
    !showLevelSelect &&
    !showCompleteModal;

  useEffect(() => {
    if (!isGlitchActive) {
      setGlitchTick(null);
      return;
    }
    setGlitchTick(1);
    const intervalId = window.setInterval(() => {
      setGlitchTick((prev) => (prev === null ? 1 : (prev % 997) + 1));
    }, 95);
    return () => window.clearInterval(intervalId);
  }, [isGlitchActive]);

  const syncHoldingState = useCallback(() => {
    const isAnyHeld = activeInputsRef.current.size > 0;
    engineRef.current?.setHolding(isAnyHeld);
  }, []);

  const clearInputs = useCallback(() => {
    if (activeInputsRef.current.size > 0) {
      activeInputsRef.current.clear();
      engineRef.current?.setHolding(false);
    }
  }, []);

  const handleRestart = useCallback(() => {
    clearInputs();
    setShowCompleteModal(false);
    engineRef.current?.restartFull();
  }, [clearInputs]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = soundEngine.toggleMute();
    setMuted(nextMuted);
  }, []);

  const handleToggleBloom = useCallback(() => {
    setBloomEnabled((prev) => {
      const next = !prev;
      engineRef.current?.setBloomEnabled(next);
      return next;
    });
  }, []);

  const handleToggleCamera = useCallback(() => {
    const mode = engineRef.current?.toggleCameraMode();
    if (mode) setCameraMode(mode);
  }, []);

  const handleActivatePower = useCallback(() => {
    engineRef.current?.activateSpecialPower();
  }, []);

  const handleSelectMode = useCallback(
    (nextMode: GameMode) => {
      clearInputs();
      setGameMode(nextMode);
      setShowCompleteModal(false);
      const targetLevel = nextMode === 'endless' ? ENDLESS_LEVEL_BASE : LEVELS[currentLevelIdx];
      engineRef.current?.setMode(nextMode, targetLevel);
      if (nextMode === 'endless') {
        setShowLevelSelect(false);
      }
    },
    [clearInputs, currentLevelIdx]
  );

  const handleSelectLevel = useCallback(
    (level: LevelDefinition) => {
      const idx = LEVELS.findIndex((l) => l.id === level.id);
      if (idx === -1) return;
      clearInputs();
      const targetMode = gameMode === 'endless' ? 'classic' : gameMode;
      if (gameMode === 'endless') setGameMode('classic');
      setCurrentLevelIdx(idx);
      setShowLevelSelect(false);
      setShowCompleteModal(false);
      engineRef.current?.loadLevel(level, targetMode);
    },
    [clearInputs, gameMode]
  );

  const handleNextLevel = useCallback(() => {
    const nextIdx = currentLevelIdx + 1;
    if (nextIdx < LEVELS.length) {
      handleSelectLevel(LEVELS[nextIdx]);
    }
  }, [currentLevelIdx, handleSelectLevel]);

  const handleSelectSkin = useCallback((skin: CraftSkin) => {
    setSelectedSkinId(skin.id);
  }, []);

  const prevCompletedIdsRef = useRef<Set<string>>(
    new Set(
      dailyState.tasks
        .filter((t) => (dailyState.progress[t.id] ?? 0) >= t.target)
        .map((t) => t.id)
    )
  );

  useEffect(() => {
    const newlyDone = dailyState.tasks.filter(
      (t) =>
        (dailyState.progress[t.id] ?? 0) >= t.target &&
        !prevCompletedIdsRef.current.has(t.id)
    );
    if (newlyDone.length > 0) {
      newlyDone.forEach((t) => prevCompletedIdsRef.current.add(t.id));
      soundEngine.playCheckpoint();
      setDailyBanner(`Daily Complete: ${newlyDone[0].title} (+${newlyDone[0].rewardGold})`);
    }
  }, [dailyState]);

  const prevAdvIdsRef = useRef<Set<string>>(
    new Set(
      ADVANCEMENTS.filter(
        (adv) => getStatForAdvancement(adv, advancementsState.stats) >= adv.target
      ).map((adv) => adv.id)
    )
  );

  useEffect(() => {
    const newlyDone = ADVANCEMENTS.filter(
      (adv) =>
        getStatForAdvancement(adv, advancementsState.stats) >= adv.target &&
        !prevAdvIdsRef.current.has(adv.id)
    );
    if (newlyDone.length > 0) {
      newlyDone.forEach((adv) => prevAdvIdsRef.current.add(adv.id));
      soundEngine.playCheckpoint();
      setDailyBanner(`Advancement Unlocked: ${newlyDone[0].title} (+${newlyDone[0].rewardGold})`);
    }
  }, [advancementsState]);

  const handleClaimChallenge = useCallback(
    (taskId: string) => {
      if (dailyState.claimedIds.includes(taskId)) return;
      const task = dailyState.tasks.find((t) => t.id === taskId);
      if (!task || (dailyState.progress[taskId] ?? 0) < task.target) return;

      const nextState: DailyChallengeState = {
        ...dailyState,
        claimedIds: [...dailyState.claimedIds, taskId],
      };
      saveDailyState(nextState);
      setDailyState(nextState);
      setTotalGold((gold) => gold + task.rewardGold);
      soundEngine.playCollectStar();
    },
    [dailyState]
  );

  const handleBuyUpgrade = useCallback(
    (id: UpgradeId) => {
      const def = UPGRADES.find((u) => u.id === id);
      if (!def) return;
      const currentLv = upgrades[id] ?? 0;
      if (currentLv >= def.maxLevel) return;
      const cost = getUpgradeCost(def, currentLv);
      if (totalGold < cost) return;

      const nextUpgrades: UpgradeLevels = {
        ...upgrades,
        [id]: currentLv + 1,
      };
      saveUpgradeLevels(nextUpgrades);
      setUpgrades(nextUpgrades);
      setTotalGold((gold) => Math.max(0, gold - cost));

      const maxLv = getMaxUpgradeLevel(nextUpgrades);
      setAdvancementsState((prev) => {
        const nextState: AdvancementsState = {
          ...prev,
          stats: {
            ...prev.stats,
            maxUpgradeLevel: Math.max(prev.stats.maxUpgradeLevel, maxLv),
          },
        };
        saveAdvancementsState(nextState);
        return nextState;
      });
      soundEngine.playCollectStar();
    },
    [totalGold, upgrades]
  );

  const handleClaimAdvancement = useCallback(
    (advId: string) => {
      if (advancementsState.claimedIds.includes(advId)) return;
      const adv = ADVANCEMENTS.find((a) => a.id === advId);
      if (!adv || getStatForAdvancement(adv, advancementsState.stats) < adv.target) return;

      const nextState: AdvancementsState = {
        ...advancementsState,
        claimedIds: [...advancementsState.claimedIds, advId],
      };
      saveAdvancementsState(nextState);
      setAdvancementsState(nextState);
      setTotalGold((gold) => gold + adv.rewardGold);
      soundEngine.playCollectStar();
    },
    [advancementsState]
  );

  useEffect(() => {
    if (!dailyBanner) return;
    const timer = window.setTimeout(() => setDailyBanner(null), 2800);
    return () => window.clearTimeout(timer);
  }, [dailyBanner]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (showLevelSelect || showCompleteModal) return;
        e.preventDefault();
        if (!activeInputsRef.current.has(e.code)) {
          activeInputsRef.current.add(e.code);
          syncHoldingState();
        }
      } else if ((e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) {
        if (!showLevelSelect && !showCompleteModal) {
          e.preventDefault();
          handleActivatePower();
        }
      } else if (e.code === 'KeyR' && !e.repeat) {
        if (!showLevelSelect) {
          handleRestart();
        }
      } else if (e.code === 'KeyM' && !e.repeat) {
        handleToggleMute();
      } else if (e.code === 'KeyB' && !e.repeat) {
        handleToggleBloom();
      } else if (e.code === 'KeyC' && !e.repeat) {
        handleToggleCamera();
      } else if (e.code === 'Escape' && !e.repeat) {
        if (!showCompleteModal) {
          clearInputs();
          setShowLevelSelect((prev) => !prev);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (activeInputsRef.current.has(e.code)) {
          activeInputsRef.current.delete(e.code);
          syncHoldingState();
        }
      }
    };

    const onWindowBlur = () => clearInputs();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [
    clearInputs,
    handleActivatePower,
    handleRestart,
    handleToggleBloom,
    handleToggleCamera,
    handleToggleMute,
    showCompleteModal,
    showLevelSelect,
    syncHoldingState,
  ]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (showLevelSelect || showCompleteModal) return;
    if (e.pointerType === 'mouse' && e.button === 2) {
      handleActivatePower();
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    activeInputsRef.current.add(`ptr_${e.pointerId}`);
    syncHoldingState();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeInputsRef.current.has(`ptr_${e.pointerId}`)) {
      activeInputsRef.current.delete(`ptr_${e.pointerId}`);
      syncHoldingState();
    }
  };

  const isPowerActive = hud.powerActiveRemaining > 0;
  const isPowerReady = hud.powerCharge >= 100 && !isPowerActive;
  const powerBarPct = isPowerActive
    ? Math.min(100, (hud.powerActiveRemaining / Math.max(0.1, hud.powerDuration)) * 100)
    : hud.powerCharge;

  const claimableChallenges = useMemo(
    () =>
      dailyState.tasks.filter(
        (t) =>
          (dailyState.progress[t.id] ?? 0) >= t.target &&
          !dailyState.claimedIds.includes(t.id)
      ).length,
    [dailyState]
  );

  const claimableAdvancements = useMemo(
    () =>
      ADVANCEMENTS.filter(
        (adv) =>
          getStatForAdvancement(adv, advancementsState.stats) >= adv.target &&
          !advancementsState.claimedIds.includes(adv.id)
      ).length,
    [advancementsState]
  );

  const envEventUi = hud.envEventType ? ENV_EVENT_UI[hud.envEventType] : null;
  const showEnvBanner =
    hud.phase === 'playing' &&
    hud.envEventPhase !== 'idle' &&
    envEventUi !== null &&
    !showLevelSelect &&
    !showCompleteModal;

  const shieldStatusLabel =
    hud.shieldCharges > 0
      ? selectedSkin.powerType === 'revive'
        ? 'Revive Armed'
        : `${hud.shieldCharges} ${hud.shieldCharges === 1 ? 'Shield' : 'Shields'}`
      : hud.shieldActive
        ? 'Barrier Active'
        : null;

  const powerNameDisplay =
    glitchTick !== null
      ? scrambleGlitchText(selectedSkin.powerName, glitchTick, 0.45)
      : selectedSkin.powerName;

  const powerValueDisplay = isPowerActive
    ? `${hud.powerActiveRemaining.toFixed(1)}s`
    : isPowerReady
      ? 'E / Shift'
      : `${hud.powerCharge}%`;

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-[#060918] cursor-pointer"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Isolated WebGL Canvas Mount */}
      <div ref={canvasMountRef} className="fixed inset-0 h-full w-full" />

      {/* Top HUD */}
      <TopHud
        level={currentLevel}
        mode={gameMode}
        hud={hud}
        totalGold={totalGold}
        endlessBest={endlessBest}
        claimableChallenges={claimableChallenges + claimableAdvancements}
        muted={muted}
        bloomEnabled={bloomEnabled}
        cameraMode={cameraMode}
        glitchTick={glitchTick}
        reducedMotion={reducedMotion}
        onOpenLevels={() => {
          clearInputs();
          setShowLevelSelect(true);
        }}
        onRestart={handleRestart}
        onToggleMute={handleToggleMute}
        onToggleBloom={handleToggleBloom}
        onToggleCamera={handleToggleCamera}
      />

      {/* Environmental Event Warning / Active Banner */}
      {showEnvBanner && envEventUi && (
        <div className="pointer-events-none fixed top-16 left-1/2 z-20 -translate-x-1/2 sm:top-20">
          <div
            className={`flex items-center gap-2.5 rounded-xl border bg-[#090e24]/94 px-3.5 py-1.5 shadow-xl ${envEventUi.borderClass}`}
          >
            {hud.envEventType === 'gravityShift' ? (
              <FlipVertical className={`h-4 w-4 shrink-0 ${envEventUi.textClass}`} />
            ) : hud.envEventType === 'solarFlare' ? (
              <Sun className={`h-4 w-4 shrink-0 ${envEventUi.textClass}`} />
            ) : hud.envEventType === 'magTurbulence' ? (
              <Radio className={`h-4 w-4 shrink-0 ${envEventUi.textClass}`} />
            ) : (
              <AlertTriangle className={`h-4 w-4 shrink-0 ${envEventUi.textClass}`} />
            )}

            <div className="flex items-center gap-2 text-xs whitespace-nowrap">
              <span className={`font-display font-bold tracking-wide ${envEventUi.textClass}`}>
                {hud.envEventPhase === 'warning' ? `WARNING · ${envEventUi.title}` : envEventUi.title}
              </span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="text-slate-200 font-medium hidden sm:inline">
                {hud.envEventPhase === 'warning' ? envEventUi.warningText : envEventUi.activeText}
              </span>
              <span className="font-mono-num font-bold text-white">
                {hud.envEventRemaining.toFixed(1)}s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Non-intrusive Event Callout (Daily / Advancement / Near-Miss / Sector Milestone / Power) */}
      {(dailyBanner || hud.calloutText) && !showLevelSelect && !showCompleteModal && (
        <div
          className={`pointer-events-none fixed left-1/2 z-20 -translate-x-1/2 ${
            showEnvBanner ? 'top-26 sm:top-30' : 'top-16 sm:top-20'
          }`}
        >
          <div
            className={`rounded-lg border px-3.5 py-1 font-display text-xs font-bold tracking-wide shadow-lg whitespace-nowrap ${
              dailyBanner
                ? 'border-amber-400/60 bg-[#0d1229]/95 text-amber-300'
                : 'border-fuchsia-400/45 bg-[#090f28]/90 text-fuchsia-200'
            }`}
          >
            {dailyBanner ?? hud.calloutText}
          </div>
        </div>
      )}

      {/* Bottom-Left Special Power Trigger, Shield Charges & Charge Gauge */}
      {!showLevelSelect && !showCompleteModal && (
        <div
          className="fixed bottom-5 left-5 z-20 flex flex-col gap-2"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {hud.phase === 'playing' && shieldStatusLabel && (
            <div className="pointer-events-none self-start flex items-center gap-1.5 rounded-lg border border-emerald-400/50 bg-[#090f28]/92 px-2.5 py-1 text-xs font-semibold text-emerald-300 font-mono-num whitespace-nowrap">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span>{shieldStatusLabel}</span>
            </div>
          )}

          {hud.phase === 'playing' && hud.activeWarpRemaining > 0 && hud.activeWarpEffect && (
            <div className="pointer-events-none self-start rounded-lg border border-fuchsia-400/50 bg-[#090f28]/90 px-2.5 py-1 text-xs font-semibold text-fuchsia-200 font-mono-num whitespace-nowrap">
              {hud.activeWarpEffect === 'shiftLeft'
                ? 'X-Warp ←'
                : hud.activeWarpEffect === 'shiftRight'
                  ? 'X-Warp →'
                  : hud.activeWarpEffect === 'invertCam'
                    ? 'Inverted 180°'
                    : 'Flank Flip'}{' '}
              · {hud.activeWarpRemaining.toFixed(1)}s
            </div>
          )}

          {hud.phase === 'playing' && hud.activeSpeedMultiplier > 1.05 && (
            <div className="pointer-events-none self-start rounded-lg border border-cyan-400/40 bg-[#090f28]/90 px-2.5 py-1 text-xs font-semibold text-cyan-300 font-mono-num whitespace-nowrap">
              {hud.activeSpeedMultiplier.toFixed(2)}x Speed
            </div>
          )}

          <button
            type="button"
            disabled={!isPowerReady || hud.phase !== 'playing'}
            onClick={handleActivatePower}
            title="Activate Special Power (E, Shift, or Right-Click)"
            className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
              isPowerActive
                ? 'border-amber-400/70 bg-amber-950/70 text-amber-200'
                : isPowerReady && hud.phase === 'playing'
                  ? 'border-cyan-400 bg-[#0b1536]/95 text-white hover:bg-cyan-950/80'
                  : 'border-white/15 bg-[#090f26]/88 text-slate-300'
            }`}
          >
            <Zap
              className={`h-4 w-4 shrink-0 ${
                isPowerActive
                  ? 'text-amber-300 fill-amber-300'
                  : isPowerReady
                    ? 'text-cyan-300 fill-cyan-300'
                    : 'text-slate-500'
              }`}
            />
            <div className="min-w-[124px]">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold whitespace-nowrap">
                <span>{powerNameDisplay}</span>
                <span className="font-mono-num text-[11px] text-cyan-300">
                  {glitchTick !== null
                    ? scrambleGlitchText(powerValueDisplay, glitchTick, 0.5)
                    : powerValueDisplay}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-[width] duration-75 ${
                    isPowerActive ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${powerBarPct}%` }}
                />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Ready-to-Launch Bottom Prompt */}
      {hud.phase === 'ready' && !showLevelSelect && !showCompleteModal && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2 w-[92vw] max-w-lg text-center hidden sm:block">
          <div className="inline-flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-[#090e24]/88 px-5 py-3">
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
              <span>
                {gameMode === 'endless'
                  ? `Infinity Mode · Sector ${String(hud.sector).padStart(2, '0')}`
                  : hud.hasCheckpoint
                    ? `Checkpoint ${hud.checkpointPercent}%`
                    : `Course 0${currentLevel.number} · ${currentLevel.name}`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num text-slate-300">
                Attempt {hud.attempts}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-100">
              {gameMode === 'inverted' ? (
                <>
                  Gravity Flip: Hold to <span className="text-rose-300 font-semibold">dive</span> · Release to{' '}
                  <span className="text-cyan-300 font-semibold">ascend</span>
                </>
              ) : (
                <>
                  Hold <span className="text-cyan-300 font-semibold">Space</span>,{' '}
                  <span className="text-cyan-300 font-semibold">W / Up</span>, or{' '}
                  <span className="text-cyan-300 font-semibold">Click</span> to ascend ·{' '}
                  <span className="text-amber-300 font-semibold">E / Shift</span> for Power
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Hangar: Modes, Courses, Advancements, Daily Challenges & Avatars Modal */}
      {showLevelSelect && (
        <LevelSelectModal
          currentLevelId={currentLevel.id}
          currentMode={gameMode}
          endlessBest={endlessBest}
          progressMap={progressMap}
          totalGold={totalGold}
          selectedSkinId={selectedSkinId}
          dailyState={dailyState}
          upgrades={upgrades}
          advancementsState={advancementsState}
          onSelectMode={handleSelectMode}
          onSelectLevel={handleSelectLevel}
          onSelectSkin={handleSelectSkin}
          onClaimChallenge={handleClaimChallenge}
          onBuyUpgrade={handleBuyUpgrade}
          onClaimAdvancement={handleClaimAdvancement}
          onClose={() => setShowLevelSelect(false)}
        />
      )}

      {/* Level Completed! Modal */}
      {showCompleteModal && (
        <LevelCompleteModal
          level={currentLevel}
          mode={gameMode}
          hud={hud}
          totalGold={totalGold}
          hasNextLevel={currentLevelIdx < LEVELS.length - 1}
          onNextLevel={handleNextLevel}
          onReplay={handleRestart}
          onOpenLevels={() => {
            setShowCompleteModal(false);
            setShowLevelSelect(true);
          }}
        />
      )}
    </div>
  );
}

