import React from 'react';
import { ArrowRight, Gift, LayoutGrid, RotateCcw, Star, Trophy } from 'lucide-react';
import { CRAFT_SKINS } from '../levels/levelData';
import { GameMode, HudSnapshot, LevelDefinition } from '../types/game';
import { formatScore } from '../utils/formatters';

interface LevelCompleteModalProps {
  level: LevelDefinition;
  mode: GameMode;
  hud: HudSnapshot;
  totalGold: number;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenLevels: () => void;
}

const MODE_LABELS: Record<GameMode, string> = {
  classic: 'Arcade',
  inverted: 'Gravity Flip',
  hardcore: 'Hardcore',
  endless: 'Endless',
};

export const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({
  level,
  mode,
  hud,
  totalGold,
  hasNextLevel,
  onNextLevel,
  onReplay,
  onOpenLevels,
}) => {
  const stopProp = (e: React.SyntheticEvent) => e.stopPropagation();

  const nextLockedSkin = CRAFT_SKINS.find((s) => totalGold < s.unlockGold);
  const prevMilestone = nextLockedSkin
    ? CRAFT_SKINS[Math.max(0, CRAFT_SKINS.indexOf(nextLockedSkin) - 1)].unlockGold
    : 0;
  const bonusPct = nextLockedSkin
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((totalGold - prevMilestone) /
              Math.max(1, nextLockedSkin.unlockGold - prevMilestone)) *
              100
          )
        )
      )
    : 100;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#040714]/78 p-4"
      onPointerDown={stopProp}
      onMouseDown={stopProp}
      onTouchStart={stopProp}
    >
      <div className="w-full max-w-md rounded-2xl border border-cyan-400/30 bg-[#090f28] p-6 sm:p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/15 text-amber-300">
          <Trophy className="h-6 w-6" />
        </div>

        <h2 className="mt-4 font-display text-2xl sm:text-3xl font-bold text-white">
          Level Completed!
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Course 0{level.number} · {level.name} · {MODE_LABELS[mode]} ·{' '}
          <span className="font-mono-num text-cyan-300">100%</span>
        </p>

        {/* Stars Tally */}
        <div className="mt-6 flex items-center justify-center gap-4">
          {hud.stars.map((earned, idx) => (
            <div
              key={idx}
              className={`flex h-14 w-14 items-center justify-center rounded-xl border ${
                earned
                  ? 'border-amber-400/60 bg-amber-500/15'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <Star
                className={`h-7 w-7 ${
                  earned ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Score Breakdown */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-y border-white/10 py-4 text-left">
          <div>
            <div className="text-xs text-slate-400">Run Gold</div>
            <div className="mt-0.5 font-mono-num text-lg font-bold text-amber-300">
              +{formatScore(hud.score)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Banked Total</div>
            <div className="mt-0.5 font-mono-num text-lg font-bold text-white">
              {formatScore(totalGold)}
            </div>
          </div>
        </div>

        {/* Gift / Bonus Avatar Unlock Progress Bar */}
        <div className="mt-5 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">
              {nextLockedSkin
                ? `Next Avatar Unlock: ${nextLockedSkin.name}`
                : 'All 6 Avatars Unlocked'}
            </span>
            <span className="font-mono-num text-cyan-300 font-semibold">
              {bonusPct}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full border border-white/10 bg-[#060918]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-300 transition-[width] duration-300"
                style={{ width: `${bonusPct}%` }}
              />
            </div>
            <Gift className="h-4 w-4 shrink-0 text-amber-300" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenLevels}
            aria-label="Open Hangar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition-colors hover:border-white/30 hover:text-white"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onReplay}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-white/30 hover:text-white whitespace-nowrap"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Replay</span>
          </button>

          {hasNextLevel ? (
            <button
              type="button"
              onClick={onNextLevel}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-300 whitespace-nowrap"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLevels}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300 whitespace-nowrap"
            >
              <span>Hangar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
