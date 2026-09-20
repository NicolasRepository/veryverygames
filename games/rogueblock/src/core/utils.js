/* ============================================================================
   utils.js — funções puras compartilhadas por todo o projeto.
   ============================================================================ */
export const rnd = n => Math.floor(Math.random() * n);
export const pick = arr => arr[rnd(arr.length)];
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** Sorteio ponderado. `weights` é um objeto { chave: peso }. */
export function weightedPick(weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

export function uid(prefix = 'id') {
  return prefix + Math.random().toString(36).slice(2, 9);
}
