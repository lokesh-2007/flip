import React from 'react';
import { Check, Lock, Play, Star, X } from 'lucide-react';
import { CRAFT_SKINS, LEVELS } from '../levels/levelData';
import { CraftSkin, LevelDefinition, LevelProgressRecord } from '../types/game';
import { formatScore } from '../utils/formatters';

interface LevelSelectModalProps {
  currentLevelId: string;
  progressMap: Record<string, LevelProgressRecord>;
  totalGold: number;
  selectedSkinId: string;
  onSelectLevel: (level: LevelDefinition) => void;
  onSelectSkin: (skin: CraftSkin) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevelId,
  progressMap,
  totalGold,
  selectedSkinId,
  onSelectLevel,
  onSelectSkin,
  onClose,
}) => {
  const stopProp = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#040714]/82 p-4 sm:p-6"
      onPointerDown={stopProp}
      onMouseDown={stopProp}
      onTouchStart={stopProp}
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#090e24] p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Cyber Trench Courses
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Hold Space, W, Up Arrow, or Click to climb at 42°. Release to dive.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-xs text-slate-400">Banked Gold</div>
              <div className="font-mono-num text-base font-bold text-amber-300">
                {formatScore(totalGold)}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Level Select"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 5 Handcrafted Levels Grid */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LEVELS.map((lvl) => {
            const record = progressMap[lvl.id];
            const bestPct = record?.bestPercent ?? 0;
            const stars = record?.starsEarned ?? [false, false, false];
            const isActive = lvl.id === currentLevelId;

            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => onSelectLevel(lvl)}
                className={`group flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                  isActive
                    ? 'border-cyan-400/70 bg-cyan-950/35'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>Course 0{lvl.number}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-cyan-300">{lvl.difficulty}</span>
                    </div>
                    <h2 className="mt-1 font-display text-lg font-bold text-white group-hover:text-cyan-200">
                      {lvl.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">
                      {lvl.subtitle}
                    </p>
                  </div>

                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-cyan-300 group-hover:border-cyan-400 group-hover:bg-cyan-500/20">
                    <Play className="h-4 w-4 fill-current" />
                  </span>
                </div>

                {/* Progress & Stars */}
                <div className="mt-4 flex w-full items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-2.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-cyan-400"
                        style={{ width: `${bestPct}%` }}
                      />
                    </div>
                    <span className="font-mono-num text-xs font-semibold text-slate-300">
                      {bestPct}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {stars.map((earned, idx) => (
                      <Star
                        key={idx}
                        className={`h-3.5 w-3.5 ${
                          earned
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Craft & Trail Skins */}
        <div className="mt-7 border-t border-white/10 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-slate-200">
              Craft Core & Ribbon Trail
            </h3>
            <span className="text-xs text-slate-400">
              Unlocked automatically with banked gold
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {CRAFT_SKINS.map((skin) => {
              const unlocked = totalGold >= skin.unlockGold;
              const selected = skin.id === selectedSkinId;

              return (
                <button
                  key={skin.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && onSelectSkin(skin)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? 'border-cyan-400 bg-cyan-950/40 text-white'
                      : unlocked
                        ? 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/25'
                        : 'border-white/5 bg-white/[0.015] text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: skin.cssSwatch }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">
                        {skin.name}
                      </div>
                      {!unlocked && (
                        <div className="font-mono-num text-[11px] text-slate-500">
                          {formatScore(skin.unlockGold)} Gold
                        </div>
                      )}
                    </div>
                  </div>
                  {selected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                  ) : !unlocked ? (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
