export function formatScore(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2).replace(/\.00$/, '')}K`;
  }
  return String(Math.floor(value));
}
