import React, { useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  Check,
  Cpu,
  FlipVertical,
  Gift,
  Infinity as InfinityIcon,
  LayoutGrid,
  Lock,
  Play,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { CRAFT_SKINS, LEVELS } from '../levels/levelData';
import {
  AdvancementCategory,
  AdvancementsState,
  AvatarRole,
  CraftSkin,
  DailyChallengeState,
  GameMode,
  LevelDefinition,
  LevelProgressRecord,
  UpgradeId,
  UpgradeLevels,
} from '../types/game';
import {
  ADVANCEMENTS,
  UPGRADES,
  getStatForAdvancement,
  getUpgradeCost,
} from '../utils/advancements';
import { formatScore } from '../utils/formatters';

interface LevelSelectModalProps {
  currentLevelId: string;
  currentMode: GameMode;
  endlessBest: number;
  progressMap: Record<string, LevelProgressRecord>;
  totalGold: number;
  selectedSkinId: string;
  dailyState: DailyChallengeState;
  upgrades: UpgradeLevels;
  advancementsState: AdvancementsState;
  onSelectMode: (mode: GameMode) => void;
  onSelectLevel: (level: LevelDefinition) => void;
  onSelectSkin: (skin: CraftSkin) => void;
  onClaimChallenge: (taskId: string) => void;
  onBuyUpgrade: (id: UpgradeId) => void;
  onClaimAdvancement: (advId: string) => void;
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

const ROLE_META: Record<AvatarRole, { label: string; textClass: string }> = {
  defense: { label: 'Defense', textClass: 'text-emerald-300' },
  offense: { label: 'Offense', textClass: 'text-rose-300' },
  utility: { label: 'Utility', textClass: 'text-cyan-300' },
};

const ADV_CATEGORY_META: Record<AdvancementCategory, { label: string; textClass: string }> = {
  flight: { label: 'Flight', textClass: 'text-cyan-300' },
  defense: { label: 'Defense', textClass: 'text-emerald-300' },
  mastery: { label: 'Mastery', textClass: 'text-fuchsia-300' },
  tech: { label: 'Systems', textClass: 'text-amber-300' },
};

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevelId,
  currentMode,
  endlessBest,
  progressMap,
  totalGold,
  selectedSkinId,
  dailyState,
  upgrades,
  advancementsState,
  onSelectMode,
  onSelectLevel,
  onSelectSkin,
  onClaimChallenge,
  onBuyUpgrade,
  onClaimAdvancement,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'hangar' | 'advancements' | 'daily'>('hangar');
  const [roleFilter, setRoleFilter] = useState<'all' | AvatarRole>('all');
  const stopProp = (e: React.SyntheticEvent) => e.stopPropagation();

  const completedTasksCount = dailyState.tasks.filter(
    (t) => (dailyState.progress[t.id] ?? 0) >= t.target
  ).length;
  const claimableCount = dailyState.tasks.filter(
    (t) => (dailyState.progress[t.id] ?? 0) >= t.target && !dailyState.claimedIds.includes(t.id)
  ).length;

  const completedAdvCount = ADVANCEMENTS.filter(
    (adv) => getStatForAdvancement(adv, advancementsState.stats) >= adv.target
  ).length;
  const claimableAdvCount = ADVANCEMENTS.filter(
    (adv) =>
      getStatForAdvancement(adv, advancementsState.stats) >= adv.target &&
      !advancementsState.claimedIds.includes(adv.id)
  ).length;

  const roleCounts = useMemo(
    () => ({
      all: CRAFT_SKINS.length,
      defense: CRAFT_SKINS.filter((s) => s.role === 'defense').length,
      offense: CRAFT_SKINS.filter((s) => s.role === 'offense').length,
      utility: CRAFT_SKINS.filter((s) => s.role === 'utility').length,
    }),
    []
  );

  const filteredSkins = useMemo(
    () => (roleFilter === 'all' ? CRAFT_SKINS : CRAFT_SKINS.filter((s) => s.role === roleFilter)),
    [roleFilter]
  );

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
              Choose a game mode, course, avatar, upgrade craft systems, or claim challenges.
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

        {/* Hangar Navigation Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('hangar')}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-display text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'hangar'
                ? 'border-cyan-400 bg-cyan-950/50 text-white'
                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:text-white'
            }`}
          >
            <LayoutGrid className="h-4 w-4 text-cyan-300" />
            <span>Courses & Avatars</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('advancements')}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-display text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'advancements'
                ? 'border-emerald-400 bg-emerald-950/40 text-white'
                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:text-white'
            }`}
          >
            <Award className="h-4 w-4 text-emerald-300" />
            <span>Advancements</span>
            {claimableAdvCount > 0 ? (
              <span className="rounded bg-emerald-400 px-1.5 py-0.5 font-mono-num text-[11px] font-bold leading-none text-slate-950">
                {claimableAdvCount} Ready
              </span>
            ) : (
              <span className="font-mono-num text-xs text-slate-400">
                {completedAdvCount}/{ADVANCEMENTS.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-display text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'daily'
                ? 'border-amber-400 bg-amber-950/40 text-white'
                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:text-white'
            }`}
          >
            <Trophy className="h-4 w-4 text-amber-300" />
            <span>Daily Challenges</span>
            {claimableCount > 0 ? (
              <span className="rounded bg-amber-400 px-1.5 py-0.5 font-mono-num text-[11px] font-bold leading-none text-slate-950">
                {claimableCount} Ready
              </span>
            ) : (
              <span className="font-mono-num text-xs text-slate-400">
                {completedTasksCount}/3
              </span>
            )}
          </button>
        </div>

        {activeTab === 'daily' ? (
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Calendar className="h-4 w-4 text-cyan-300" />
                <span className="font-mono-num font-semibold text-white">
                  {dailyState.dateKey}
                </span>
                <span className="text-slate-400">· 3 daily tasks · Progress tracks across all modes</span>
              </div>
              <span className="font-mono-num text-xs font-semibold text-amber-300">
                {completedTasksCount} / 3 Completed
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {dailyState.tasks.map((task) => {
                const current = Math.min(task.target, dailyState.progress[task.id] ?? 0);
                const pct = Math.min(100, Math.round((current / task.target) * 100));
                const isComplete = current >= task.target;
                const isClaimed = dailyState.claimedIds.includes(task.id);

                return (
                  <div
                    key={task.id}
                    className={`flex flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center ${
                      isClaimed
                        ? 'border-emerald-400/35 bg-emerald-950/20'
                        : isComplete
                          ? 'border-amber-400/60 bg-amber-950/25'
                          : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-display text-base font-bold text-white">
                          {task.title}
                        </h3>
                        <span className="inline-flex items-center gap-1 font-mono-num text-xs font-semibold text-amber-300">
                          <Gift className="h-3 w-3" />+{task.rewardGold} Gold
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300">{task.description}</p>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full transition-[width] duration-150 ${
                              isComplete
                                ? 'bg-gradient-to-r from-emerald-400 to-cyan-300'
                                : 'bg-gradient-to-r from-cyan-400 to-fuchsia-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono-num text-xs font-semibold text-slate-200 shrink-0">
                          {current} / {task.target}
                          {task.unitLabel ? ` ${task.unitLabel}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isClaimed ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-300 whitespace-nowrap">
                          <Check className="h-4 w-4" />
                          Claimed
                        </span>
                      ) : isComplete ? (
                        <button
                          type="button"
                          onClick={() => onClaimChallenge(task.id)}
                          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-300 px-4 py-2.5 font-display text-xs font-bold text-slate-950 transition-transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                        >
                          <Gift className="h-4 w-4" />
                          Claim +{task.rewardGold}
                        </button>
                      ) : (
                        <span className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 font-mono-num text-xs font-semibold text-slate-400 whitespace-nowrap">
                          {pct}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeTab === 'advancements' ? (
          <div className="mt-5 space-y-7">
            {/* Craft Systems Upgrades */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-cyan-300" />
                  <h2 className="font-display text-sm font-bold text-slate-100">
                    Craft Systems Upgrades
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  Permanent engineering upgrades applied across all avatars & modes
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {UPGRADES.map((upg) => {
                  const currentLv = upgrades[upg.id] ?? 0;
                  const isMax = currentLv >= upg.maxLevel;
                  const cost = getUpgradeCost(upg, currentLv);
                  const canAfford = !isMax && totalGold >= cost;

                  return (
                    <div
                      key={upg.id}
                      className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display text-sm font-bold text-white">
                            {upg.name}
                          </h3>
                          <span className="font-mono-num text-xs font-bold text-cyan-300 shrink-0">
                            Lv {currentLv} / {upg.maxLevel}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                          {upg.description}
                        </p>

                        <div className="mt-2.5 text-[11px] font-semibold text-emerald-300">
                          {upg.effectPerLevel}
                        </div>

                        {/* Segmented level bar */}
                        <div className="mt-2.5 flex items-center gap-1.5">
                          {Array.from({ length: upg.maxLevel }).map((_, idx) => (
                            <div
                              key={idx}
                              className={`h-1.5 flex-1 rounded-full ${
                                idx < currentLv
                                  ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                                  : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="mt-3.5 flex items-center justify-end">
                        {isMax ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 font-display text-xs font-bold text-emerald-300 whitespace-nowrap">
                            <Check className="h-3.5 w-3.5" />
                            Max Level
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => canAfford && onBuyUpgrade(upg.id)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-display text-xs font-bold transition-colors whitespace-nowrap ${
                              canAfford
                                ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                                : 'border border-white/10 bg-white/[0.04] text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <span>Upgrade</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-num">{formatScore(cost)} Gold</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Career Advancements */}
            <div className="border-t border-white/10 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-300" />
                  <h2 className="font-display text-sm font-bold text-slate-100">
                    Career Advancements ({completedAdvCount}/{ADVANCEMENTS.length})
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  Lifetime combat, storm survival & progression milestones
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-2.5">
                {ADVANCEMENTS.map((adv) => {
                  const rawStat = getStatForAdvancement(adv, advancementsState.stats);
                  const current = Math.min(adv.target, rawStat);
                  const pct = Math.min(100, Math.round((current / adv.target) * 100));
                  const isComplete = current >= adv.target;
                  const isClaimed = advancementsState.claimedIds.includes(adv.id);
                  const catMeta = ADV_CATEGORY_META[adv.category];

                  return (
                    <div
                      key={adv.id}
                      className={`flex flex-col justify-between gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center ${
                        isClaimed
                          ? 'border-emerald-400/35 bg-emerald-950/20'
                          : isComplete
                            ? 'border-amber-400/60 bg-amber-950/25'
                            : 'border-white/10 bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${catMeta.textClass}`}>
                            {catMeta.label}
                          </span>
                          <span className="text-slate-600" aria-hidden="true">·</span>
                          <h3 className="font-display text-sm font-bold text-white">
                            {adv.title}
                          </h3>
                          <span className="inline-flex items-center gap-1 font-mono-num text-xs font-semibold text-amber-300">
                            <Gift className="h-3 w-3" />+{adv.rewardGold} Gold
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-300">{adv.description}</p>

                        <div className="mt-2.5 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className={`h-full rounded-full transition-[width] duration-150 ${
                                isComplete
                                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-300'
                                  : 'bg-gradient-to-r from-cyan-400 to-fuchsia-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono-num text-xs font-semibold text-slate-200 shrink-0">
                            {current} / {adv.target}
                            {adv.unitLabel ? ` ${adv.unitLabel}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isClaimed ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 whitespace-nowrap">
                            <Check className="h-3.5 w-3.5" />
                            Claimed
                          </span>
                        ) : isComplete ? (
                          <button
                            type="button"
                            onClick={() => onClaimAdvancement(adv.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-300 px-3.5 py-2 font-display text-xs font-bold text-slate-950 transition-transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                          >
                            <Gift className="h-3.5 w-3.5" />
                            Claim +{adv.rewardGold}
                          </button>
                        ) : (
                          <span className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono-num text-xs font-semibold text-slate-400 whitespace-nowrap">
                            {pct}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-sm font-bold text-slate-200">
                  Avatars & Special Powers ({CRAFT_SKINS.length})
                </h2>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(['all', 'defense', 'offense', 'utility'] as const).map((role) => {
                    const active = roleFilter === role;
                    const label =
                      role === 'all'
                        ? `All (${roleCounts.all})`
                        : `${ROLE_META[role].label} (${roleCounts[role]})`;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setRoleFilter(role)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'border-cyan-400 bg-cyan-950/50 text-white'
                            : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSkins.map((skin) => {
                  const unlocked = totalGold >= skin.unlockGold;
                  const selected = skin.id === selectedSkinId;
                  const roleMeta = ROLE_META[skin.role];

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
                          <span className="flex items-center gap-1 font-mono-num text-[11px] text-slate-400 shrink-0">
                            <Lock className="h-3 w-3" />
                            {formatScore(skin.unlockGold)}
                          </span>
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        )}
                      </div>

                      <div className="mt-2.5 border-t border-white/10 pt-2">
                        <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                          <span className="flex items-center gap-1.5 text-amber-300 truncate">
                            <Zap className="h-3 w-3 shrink-0" />
                            <span className="truncate">{skin.powerName}</span>
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${roleMeta.textClass}`}>
                            {roleMeta.label}
                          </span>
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
          </>
        )}
      </div>
    </div>
  );
};

