import React from 'react';
import {
  Check,
  FlipVertical,
  Infinity as InfinityIcon,
  Lock,
  Play,
  ShieldAlert,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react';
import { CRAFT_SKINS, LEVELS } from '../levels/levelData';
import { CraftSkin, GameMode, LevelDefinition, LevelProgressRecord } from '../types/game';
import { formatScore } from '../utils/formatters';

interface LevelSelectModalProps {
  currentLevelId: string;
  currentMode: GameMode;
  endlessBest: number;
  progressMap: Record<string, LevelProgressRecord>;
  totalGold: number;
  selectedSkinId: string;
  onSelectMode: (mode: GameMode) => void;
  onSelectLevel: (level: LevelDefinition) => void;
  onSelectSkin: (skin: CraftSkin) => void;
  onClose: () => void;
}

const MODES: Array<{
  id: GameMode;
  label: string;
  detail: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'classic',
    label: 'Arcade',
    detail: 'Standard 42° · Checkpoints',
    icon: <Play className="h-3.5 w-3.5" />,
  },
  {
    id: 'inverted',
    label: 'Gravity Flip',
    detail: 'Hold to dive · Release to climb',
    icon: <FlipVertical className="h-3.5 w-3.5" />,
  },
  {
    id: 'hardcore',
    label: 'Hardcore',
    detail: 'No checkpoints · 1.15x speed · 2x Gold',
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
  },
  {
    id: 'endless',
    label: 'Infinity',
    detail: '250m Sectors · Escalating speed',
    icon: <InfinityIcon className="h-3.5 w-3.5" />,
  },
];

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevelId,
  currentMode,
  endlessBest,
  progressMap,
  totalGold,
  selectedSkinId,
  onSelectMode,
  onSelectLevel,
  onSelectSkin,
  onClose,
}) => {
  const stopProp = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#040714]/84 p-4 sm:p-6"
      onPointerDown={stopProp}
      onMouseDown={stopProp}
      onTouchStart={stopProp}
    >
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#090e24] p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Cyber Trench Hangar
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Choose a game mode, course, and 3D avatar with its signature special power.
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
              aria-label="Close Hangar"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Game Modes Selector */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-slate-200">
              Game Mode
            </h2>
            {currentMode === 'endless' && (
              <span className="font-mono-num text-xs text-cyan-300">
                Infinity Best: {endlessBest}m
              </span>
            )}
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {MODES.map((m) => {
              const active = m.id === currentMode;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMode(m.id)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? 'border-cyan-400 bg-cyan-950/45 text-white'
                      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 font-display text-sm font-bold">
                    <span className={active ? 'text-cyan-300' : 'text-slate-400'}>
                      {m.icon}
                    </span>
                    <span className="whitespace-nowrap">{m.label}</span>
                  </div>
                  <span className="mt-1 text-[11px] text-slate-400 leading-snug">
                    {m.detail}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5 Handcrafted Courses (or Infinity Mode Launch Banner) */}
        <div className="mt-6">
          <h2 className="font-display text-sm font-bold text-slate-200">
            {currentMode === 'endless' ? 'Infinity Mode' : 'Courses'}
          </h2>

          {currentMode === 'endless' ? (
            <button
              type="button"
              onClick={() => onSelectMode('endless')}
              className="mt-2.5 flex w-full items-center justify-between rounded-xl border border-fuchsia-400/50 bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-fuchsia-950/40 p-4 text-left transition-colors hover:border-cyan-300/70"
            >
              <div>
                <div className="font-display text-lg font-bold text-white">
                  Launch Infinity Mode
                </div>
                <p className="mt-0.5 text-xs text-slate-300">
                  Infinite procedural cyber-trench with 250m Sector Milestones, near-miss adrenaline bonuses, and reactive neon gradients. Best distance:{' '}
                  <span className="font-mono-num text-cyan-300 font-semibold">{endlessBest}m</span>
                </p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-400 text-slate-950">
                <Play className="h-4 w-4 fill-current" />
              </span>
            </button>
          ) : (
            <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    <div className="flex w-full items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>0{lvl.number}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-cyan-300">{lvl.difficulty}</span>
                        </div>
                        <h3 className="mt-1 truncate font-display text-base font-bold text-white group-hover:text-cyan-200">
                          {lvl.name}
                        </h3>
                      </div>

                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-cyan-300 group-hover:border-cyan-400 group-hover:bg-cyan-500/20">
                        <Play className="h-3.5 w-3.5 fill-current" />
                      </span>
                    </div>

                    <div className="mt-3.5 flex w-full items-center justify-between gap-3">
                      <div className="flex flex-1 items-center gap-2">
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

                      <div className="flex items-center gap-0.5">
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
          )}
        </div>

        {/* Avatars & Signature Special Powers */}
        <div className="mt-7 border-t border-white/10 pt-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold text-slate-200">
              Avatars & Special Powers ({CRAFT_SKINS.length})
            </h2>
            <span className="text-xs text-slate-400">
              Press E, Shift, or Right-Click in flight to activate
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {CRAFT_SKINS.map((skin) => {
              const unlocked = totalGold >= skin.unlockGold;
              const selected = skin.id === selectedSkinId;

              return (
                <button
                  key={skin.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && onSelectSkin(skin)}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors ${
                    selected
                      ? 'border-cyan-400 bg-cyan-950/40 text-white'
                      : unlocked
                        ? 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/25'
                        : 'border-white/5 bg-white/[0.015] text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-4 w-4 shrink-0 rounded-full border border-white/30"
                        style={{ backgroundColor: skin.cssSwatch }}
                      />
                      <span className="truncate font-display text-sm font-bold">
                        {skin.name}
                      </span>
                    </div>
                    {selected ? (
                      <Check className="h-4 w-4 shrink-0 text-cyan-300" />
                    ) : !unlocked ? (
                      <span className="flex items-center gap-1 font-mono-num text-[11px] text-slate-400">
                        <Lock className="h-3 w-3" />
                        {formatScore(skin.unlockGold)}
                      </span>
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    )}
                  </div>

                  <div className="mt-2.5 border-t border-white/10 pt-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                      <Zap className="h-3 w-3 shrink-0" />
                      <span>{skin.powerName}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
                      {skin.powerDescription}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
