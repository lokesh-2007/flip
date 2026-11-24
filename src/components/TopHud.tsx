import React from 'react';
import {
  Eye,
  Flag,
  Infinity as InfinityIcon,
  LayoutGrid,
  RotateCcw,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CameraMode, GameMode, HudSnapshot, LevelDefinition } from '../types/game';
import { formatScore } from '../utils/formatters';
import { scrambleGlitchText } from '../utils/glitchText';

interface TopHudProps {
  level: LevelDefinition;
  mode: GameMode;
  hud: HudSnapshot;
  totalGold: number;
  endlessBest: number;
  claimableChallenges: number;
  muted: boolean;
  bloomEnabled: boolean;
  cameraMode: CameraMode;
  glitchTick: number | null;
  reducedMotion?: boolean;
  onOpenLevels: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onToggleBloom: () => void;
  onToggleCamera: () => void;
}

const MODE_LABELS: Record<GameMode, string> = {
  classic: 'Arcade',
  inverted: 'Gravity Flip',
  hardcore: 'Hardcore',
  endless: 'Infinity',
};

const TopHudComponent: React.FC<TopHudProps> = ({
  level,
  mode,
  hud,
  totalGold,
  endlessBest,
  claimableChallenges,
  muted,
  bloomEnabled,
  cameraMode,
  glitchTick,
  reducedMotion = false,
  onOpenLevels,
  onRestart,
  onToggleMute,
  onToggleBloom,
  onToggleCamera,
}) => {
  const stopInputPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const starCount = hud.stars.filter(Boolean).length;
  const displayedGold = totalGold + hud.score;
  const isInfinity = mode === 'endless';
  const isGlitch = glitchTick !== null;

  const gx = (text: string, intensity = 0.5) =>
    isGlitch ? scrambleGlitchText(text, glitchTick, intensity) : text;

  const jitterStyle = (seed: number): React.CSSProperties | undefined => {
    if (!isGlitch || reducedMotion) return undefined;
    const dx = (((glitchTick + seed) * 7) % 5) - 2;
    const dy = (((glitchTick + seed) * 3) % 3) - 1;
    return {
      transform: `translate3d(${dx}px, ${dy}px, 0)`,
    };
  };

  return (
    <header
      className="pointer-events-none fixed top-0 left-0 right-0 z-20 flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4"
      onPointerDown={stopInputPropagation}
      onMouseDown={stopInputPropagation}
      onTouchStart={stopInputPropagation}
    >
      {/* Top-Left: Quick Action Buttons */}
      <div className="pointer-events-auto flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenLevels}
          title="Courses, Advancements, Daily Challenges & Avatars"
          aria-label="Open Course, Advancements, Daily Challenges and Avatar Select"
          className="relative flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-[#0a0f26]/90 px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-400/60 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400 whitespace-nowrap"
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden md:inline">{gx(MODE_LABELS[mode], 0.35)}</span>
          {claimableChallenges > 0 && (
            <span className="ml-0.5 rounded bg-amber-400 px-1.5 py-0.5 font-mono-num text-[10px] font-bold leading-none text-slate-950">
              {claimableChallenges}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onRestart}
          title="Instant Restart (R)"
          aria-label="Instant Restart"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-[#0a0f26]/90 text-slate-200 transition-colors hover:border-cyan-400/60 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          title={muted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
          aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-[#0a0f26]/90 text-slate-200 transition-colors hover:border-cyan-400/60 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={onToggleBloom}
          title={bloomEnabled ? 'Disable Neon Bloom (B)' : 'Enable Neon Bloom (B)'}
          aria-label={bloomEnabled ? 'Disable Neon Bloom' : 'Enable Neon Bloom'}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border bg-[#0a0f26]/90 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
            bloomEnabled
              ? 'border-fuchsia-400/50 text-fuchsia-300 hover:border-fuchsia-300'
              : 'border-white/15 text-slate-400 hover:border-cyan-400/60 hover:text-cyan-300'
          }`}
        >
          <Sparkles className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleCamera}
          title="Switch Camera View (C)"
          aria-label="Switch Camera View"
          className="hidden sm:flex h-10 items-center gap-1.5 rounded-lg border border-white/15 bg-[#0a0f26]/90 px-3 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400/60 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400 whitespace-nowrap"
        >
          <Eye className="h-3.5 w-3.5 text-cyan-400" />
          <span>{cameraMode === 'isometric' ? 'Iso Rail' : 'Chase'}</span>
        </button>
      </div>

      {/* Top-Center: Progress Bar or Infinity Mode Sector & Distance */}
      <div
        style={jitterStyle(1)}
        className={`pointer-events-auto flex flex-1 max-w-md flex-col items-center gap-1.5 rounded-xl border bg-[#0a0f26]/88 px-4 py-2 transition-colors ${
          isGlitch ? 'border-fuchsia-400/65' : 'border-white/15'
        }`}
      >
        {isInfinity ? (
          <>
            <div className="flex w-full items-center justify-between text-xs font-medium tracking-wide text-slate-300">
              <span className="truncate font-display text-slate-100">
                {gx('Infinity Mode', 0.45)}{' '}
                <span className="ml-1.5 text-fuchsia-300">
                  · {gx(`Sector ${String(hud.sector).padStart(2, '0')}`, 0.55)}
                </span>
              </span>
              <span className="font-mono-num text-cyan-300 font-bold">
                {gx(`${hud.distance}m`, 0.5)}{' '}
                <span className="text-slate-400 font-normal">
                  · {gx(`Best ${Math.max(endlessBest, hud.distance)}m`, 0.4)}
                </span>
              </span>
            </div>
            <div className="flex w-full items-center gap-2">
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full border border-white/15 bg-[#070b1e]/95">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 transition-[width] duration-75"
                  style={{
                    width: `${
                      isGlitch
                        ? (glitchTick * 37) % 100
                        : Math.min(100, ((hud.distance % 250) / 250) * 100)
                    }%`,
                  }}
                />
              </div>
              <InfinityIcon className="h-4 w-4 shrink-0 text-fuchsia-300" />
            </div>
          </>
        ) : (
          <>
            <div className="flex w-full items-center justify-between text-xs font-medium tracking-wide text-slate-300">
              <span className="truncate font-display text-slate-100">
                {gx(`${level.number}. ${level.name}`, 0.45)}
                {mode !== 'classic' && (
                  <span className="ml-2 text-amber-300">· {gx(MODE_LABELS[mode], 0.45)}</span>
                )}
              </span>
              <span className="font-mono-num text-cyan-300 font-bold">
                {gx(`${hud.percent}%`, 0.55)}
              </span>
            </div>

            <div className="flex w-full items-center gap-2">
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full border border-white/15 bg-[#070b1e]/95">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-fuchsia-400 transition-[width] duration-75"
                  style={{
                    width: `${isGlitch ? (glitchTick * 43) % 100 : hud.percent}%`,
                  }}
                />
                {mode !== 'hardcore' &&
                  level.checkpoints.map((cp) => {
                    const cpPct = (cp.z / level.length) * 100;
                    return (
                      <div
                        key={cp.id}
                        className="absolute top-0 bottom-0 w-0.5 bg-white/45"
                        style={{ left: `${cpPct}%` }}
                      />
                    );
                  })}
              </div>
              <Flag className="h-4 w-4 shrink-0 text-cyan-300" />
            </div>
          </>
        )}
      </div>

      {/* Top-Right: Stars, Streak & Gold Score Counters */}
      <div
        style={jitterStyle(2)}
        className={`pointer-events-auto flex items-center gap-3.5 sm:gap-4 shrink-0 rounded-lg border bg-[#0a0f26]/90 px-3.5 py-2 transition-colors ${
          isGlitch ? 'border-fuchsia-400/65' : 'border-white/15'
        }`}
      >
        {!isInfinity && (
          <>
            <div className="flex items-center gap-1.5" title="Sector Stars Collected">
              <Star
                className={`h-4 w-4 ${
                  starCount > 0 ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                }`}
              />
              <span className="font-mono-num text-sm font-bold text-slate-100">
                {gx(`${starCount}/3`, 0.4)}
              </span>
            </div>
            <span className="h-4 w-px bg-white/15" aria-hidden="true" />
          </>
        )}

        <div className="flex items-center gap-1.5" title="Collected Gold Score">
          <span
            className="inline-block h-3.5 w-3.5 rotate-45 rounded-[2px] border border-amber-200 bg-amber-400"
            aria-hidden="true"
          />
          <span className="font-mono-num text-sm font-bold text-amber-300">
            {gx(formatScore(displayedGold), 0.5)}
          </span>
          {hud.streakMultiplier > 1 && (
            <span className="ml-0.5 font-mono-num text-xs font-bold text-fuchsia-300">
              {gx(`${hud.streakMultiplier.toFixed(1)}x`, 0.4)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

export const TopHud = React.memo(TopHudComponent);

