import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { TopHud } from './components/TopHud';
import { CRAFT_SKINS, LEVELS } from './levels/levelData';
import { ZigzagEngine } from './three/ZigzagEngine';
import {
  CameraMode,
  CraftSkin,
  HudSnapshot,
  LevelDefinition,
  LevelProgressRecord,
} from './types/game';

const PROGRESS_STORAGE_KEY = 'cyber_trench_progress_v1';

interface SavedStorageData {
  progressMap: Record<string, LevelProgressRecord>;
  totalGold: number;
  selectedSkinId: string;
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
      };
    }
  } catch {
    // Ignore parse errors
  }
  return {
    progressMap: {},
    totalGold: 0,
    selectedSkinId: CRAFT_SKINS[0].id,
  };
}

export default function App() {
  const initialSaved = useMemo(() => loadSavedData(), []);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ZigzagEngine | null>(null);

  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const currentLevel = LEVELS[currentLevelIdx];

  const [progressMap, setProgressMap] = useState<Record<string, LevelProgressRecord>>(
    initialSaved.progressMap
  );
  const [totalGold, setTotalGold] = useState<number>(initialSaved.totalGold);
  const [selectedSkinId, setSelectedSkinId] = useState<string>(initialSaved.selectedSkinId);

  const [muted, setMuted] = useState<boolean>(() => soundEngine.isMuted());
  const [cameraMode, setCameraMode] = useState<CameraMode>('isometric');
  const [showLevelSelect, setShowLevelSelect] = useState<boolean>(false);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);

  const [hud, setHud] = useState<HudSnapshot>({
    phase: 'ready',
    percent: 0,
    score: 0,
    stars: [false, false, false],
    attempts: 1,
    activeSpeedMultiplier: 1.0,
    hasCheckpoint: false,
    checkpointPercent: 0,
  });

  // Track active pointer/key inputs so releasing one doesn't drop another
  const activeInputsRef = useRef<Set<string>>(new Set());
  const currentLevelRef = useRef<LevelDefinition>(currentLevel);
  currentLevelRef.current = currentLevel;

  const selectedSkin = useMemo(
    () => CRAFT_SKINS.find((s) => s.id === selectedSkinId) ?? CRAFT_SKINS[0],
    [selectedSkinId]
  );

  // Persist save data
  useEffect(() => {
    try {
      const payload: SavedStorageData = {
        progressMap,
        totalGold,
        selectedSkinId,
      };
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [progressMap, totalGold, selectedSkinId]);

  const updateProgressRecord = useCallback(
    (levelId: string, snapshot: HudSnapshot, isCompleted: boolean) => {
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

    const engine = new ZigzagEngine(container, currentLevelRef.current, selectedSkin, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
        if (snapshot.phase === 'crashed') {
          updateProgressRecord(currentLevelRef.current.id, snapshot, false);
        }
      },
      onLevelComplete: (snapshot) => {
        setHud(snapshot);
        updateProgressRecord(currentLevelRef.current.id, snapshot, true);
        setTotalGold((prev) => prev + snapshot.score);
        setShowCompleteModal(true);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause engine while Level Select modal is open
  useEffect(() => {
    engineRef.current?.setPaused(showLevelSelect);
  }, [showLevelSelect]);

  // Sync skin updates
  useEffect(() => {
    engineRef.current?.setSkin(selectedSkin);
  }, [selectedSkin]);

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

  const handleToggleCamera = useCallback(() => {
    const mode = engineRef.current?.toggleCameraMode();
    if (mode) setCameraMode(mode);
  }, []);

  const handleSelectLevel = useCallback(
    (level: LevelDefinition) => {
      const idx = LEVELS.findIndex((l) => l.id === level.id);
      if (idx === -1) return;
      clearInputs();
      setCurrentLevelIdx(idx);
      setShowLevelSelect(false);
      setShowCompleteModal(false);
      engineRef.current?.loadLevel(level);
    },
    [clearInputs]
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

  // Global keyboard & window focus listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (showLevelSelect || showCompleteModal) return;
        e.preventDefault();
        if (!activeInputsRef.current.has(e.code)) {
          activeInputsRef.current.add(e.code);
          syncHoldingState();
        }
      } else if (e.code === 'KeyR' && !e.repeat) {
        if (!showLevelSelect) {
          handleRestart();
        }
      } else if (e.code === 'KeyM' && !e.repeat) {
        handleToggleMute();
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
    handleRestart,
    handleToggleCamera,
    handleToggleMute,
    showCompleteModal,
    showLevelSelect,
    syncHoldingState,
  ]);

  // Pointer & Touch steering on the viewport
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (showLevelSelect || showCompleteModal) return;
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
        hud={hud}
        totalGold={totalGold}
        muted={muted}
        cameraMode={cameraMode}
        onOpenLevels={() => {
          clearInputs();
          setShowLevelSelect(true);
        }}
        onRestart={handleRestart}
        onToggleMute={handleToggleMute}
        onToggleCamera={handleToggleCamera}
      />

      {/* Active Overdrive Indicator (only when inside a speed boost zone) */}
      {hud.phase === 'playing' && hud.activeSpeedMultiplier > 1.05 && (
        <div className="pointer-events-none fixed bottom-6 left-6 z-20 rounded-lg border border-cyan-400/40 bg-[#090f28]/85 px-3 py-1.5 text-xs font-semibold text-cyan-300 font-mono-num">
          {hud.activeSpeedMultiplier.toFixed(2)}x Speed
        </div>
      )}

      {/* Ready-to-Launch Bottom Prompt (unobtrusive, leaves center 100% clear) */}
      {hud.phase === 'ready' && !showLevelSelect && !showCompleteModal && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2 w-[92vw] max-w-lg text-center">
          <div className="inline-flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-[#090e24]/88 px-5 py-3">
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
              <span>
                {hud.hasCheckpoint
                  ? `Checkpoint ${hud.checkpointPercent}%`
                  : `Course 0${currentLevel.number} · ${currentLevel.name}`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num text-slate-300">
                Attempt {hud.attempts}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-100">
              Hold <span className="text-cyan-300 font-semibold">Space</span>,{' '}
              <span className="text-cyan-300 font-semibold">W / Up</span>, or{' '}
              <span className="text-cyan-300 font-semibold">Click / Touch</span> to ascend · Release to dive
            </p>
          </div>
        </div>
      )}

      {/* Level Select & Skins Modal */}
      {showLevelSelect && (
        <LevelSelectModal
          currentLevelId={currentLevel.id}
          progressMap={progressMap}
          totalGold={totalGold}
          selectedSkinId={selectedSkinId}
          onSelectLevel={handleSelectLevel}
          onSelectSkin={handleSelectSkin}
          onClose={() => setShowLevelSelect(false)}
        />
      )}

      {/* Level Completed! Modal */}
      {showCompleteModal && (
        <LevelCompleteModal
          level={currentLevel}
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
