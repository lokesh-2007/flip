import React from 'react';
import {
  Eye,
  Flag,
  LayoutGrid,
  RotateCcw,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CameraMode, HudSnapshot, LevelDefinition } from '../types/game';
import { formatScore } from '../utils/formatters';

interface TopHudProps {
  level: LevelDefinition;
  hud: HudSnapshot;
  totalGold: number;
  muted: boolean;
  cameraMode: CameraMode;
  onOpenLevels: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  level,
  hud,
  totalGold,
  muted,
  cameraMode,
  onOpenLevels,
  onRestart,
  onToggleMute,
  onToggleCamera,
}) => {
  const stopInputPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const starCount = hud.stars.filter(Boolean).length;
  const displayedGold = totalGold + hud.score;

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
          title="Levels & Craft Skins"
          aria-label="Open Level Select"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-[#0a0f26]/90 text-slate-200 transition-colors hover:border-cyan-400/60 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          <LayoutGrid className="h-4 w-4" />
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
          onClick={onToggleCamera}
          title="Switch Camera View (C)"
          aria-label="Switch Camera View"
          className="hidden sm:flex h-10 items-center gap-1.5 rounded-lg border border-white/15 bg-[#0a0f26]/90 px-3 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400/60 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400 whitespace-nowrap"
        >
          <Eye className="h-3.5 w-3.5 text-cyan-400" />
          <span>{cameraMode === 'isometric' ? 'Iso Rail' : 'Chase'}</span>
        </button>
      </div>

      {/* Top-Center: Progress Bar & Percentage */}
      <div className="pointer-events-auto flex flex-1 max-w-md flex-col items-center gap-1.5">
        <div className="flex w-full items-center justify-between text-xs font-medium tracking-wide text-slate-300">
          <span className="truncate font-display text-slate-100">
            {level.number}. {level.name}
          </span>
          <span className="font-mono-num text-cyan-300 font-bold">
            {hud.percent}%
          </span>
        </div>

        <div className="flex w-full items-center gap-2">
          <div className="relative h-2.5 flex-1 overflow-hidden rounded-full border border-white/15 bg-[#070b1e]/95">
            {/* Progress Fill */}
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-teal-300 transition-[width] duration-75"
              style={{ width: `${hud.percent}%` }}
            />
            {/* Checkpoint tick markers */}
            {level.checkpoints.map((cp) => {
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
      </div>

      {/* Top-Right: Stars & Gold Score Counters */}
      <div className="pointer-events-auto flex items-center gap-4 sm:gap-5 shrink-0 rounded-lg border border-white/15 bg-[#0a0f26]/90 px-3.5 py-2">
        <div className="flex items-center gap-1.5" title="Sector Stars Collected">
          <Star
            className={`h-4 w-4 ${
              starCount > 0 ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
            }`}
          />
          <span className="font-mono-num text-sm font-bold text-slate-100">
            {starCount}/3
          </span>
        </div>

        <span className="h-4 w-px bg-white/15" aria-hidden="true" />

        <div className="flex items-center gap-1.5" title="Collected Gold Score">
          <span
            className="inline-block h-3.5 w-3.5 rotate-45 rounded-[2px] border border-amber-200 bg-amber-400"
            aria-hidden="true"
          />
          <span className="font-mono-num text-sm font-bold text-amber-300">
            {formatScore(displayedGold)}
          </span>
        </div>
      </div>
    </header>
  );
};
