// Shared answer styling for phone and big screen, so the colors/shapes match between the two.
export const OPTION_COLORS = ['bg-rose-600', 'bg-blue-600', 'bg-amber-500', 'bg-emerald-600'];
export const OPTION_HEX = ['#e11d48', '#2563eb', '#f59e0b', '#059669'];
export const OPTION_ICONS = ['▲', '◆', '●', '■'];

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatPoints(n: number): string {
  return n.toLocaleString('en-US');
}
