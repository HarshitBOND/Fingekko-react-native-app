/**
 * Shared split/payer model for the expense composer, mirroring Splitwise's
 * "Adjust split" and "Who paid?" flows. The composer holds a SplitConfig and a
 * PayerConfig; the resolve helpers turn those into the exact per-person amounts
 * the backend stores (paidBy[] and participants[]), so the server never has to
 * re-derive a split from a type string.
 */

export type SplitMode = 'equally' | 'unequally' | 'percentages';

export type SplitConfig =
  | { mode: 'equally'; selectedIds: string[] }
  | { mode: 'unequally'; amounts: Record<string, number> }
  | { mode: 'percentages'; percents: Record<string, number> };

export type PayerConfig =
  | { mode: 'single'; id: string }
  | { mode: 'multiple'; amounts: Record<string, number> };

export type Person = { id: string; name: string; isYou?: boolean };

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Even split with the leftover cents spread one-per-head, so shares sum exactly. */
export function splitEvenly(total: number, ids: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  const n = ids.length;
  if (n === 0) return out;
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  let remainder = cents % n;
  ids.forEach((id) => {
    let share = base;
    if (remainder > 0) {
      share += 1;
      remainder -= 1;
    }
    out[id] = share / 100;
  });
  return out;
}

/** Turn a SplitConfig into exact owed amounts per person id. */
export function resolveSplit(config: SplitConfig, total: number): Record<string, number> {
  if (config.mode === 'equally') {
    return splitEvenly(total, config.selectedIds);
  }
  if (config.mode === 'unequally') {
    const out: Record<string, number> = {};
    Object.entries(config.amounts).forEach(([id, amt]) => {
      if (amt > 0) out[id] = round2(amt);
    });
    return out;
  }
  // percentages — distribute cents, largest-remainder rounding so it sums exactly
  const cents = Math.round(total * 100);
  const ids = Object.keys(config.percents).filter((id) => (config.percents[id] ?? 0) > 0);
  const rows = ids.map((id) => {
    const exact = ((config.percents[id] ?? 0) / 100) * cents;
    return { id, floor: Math.floor(exact), frac: exact - Math.floor(exact) };
  });
  let remainder = cents - rows.reduce((s, r) => s + r.floor, 0);
  rows.sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < rows.length && remainder > 0; i += 1) {
    rows[i].floor += 1;
    remainder -= 1;
  }
  const out: Record<string, number> = {};
  rows.forEach((r) => {
    out[r.id] = r.floor / 100;
  });
  return out;
}

/** Turn a PayerConfig into a paidBy[] list. */
export function resolvePayers(
  config: PayerConfig,
  total: number,
  currentUserId: string
): { userId: string; amount: number }[] {
  if (config.mode === 'single') {
    return [{ userId: config.id || currentUserId, amount: round2(total) }];
  }
  return Object.entries(config.amounts)
    .filter(([, amt]) => amt > 0)
    .map(([userId, amount]) => ({ userId, amount: round2(amount) }));
}

export const sumValues = (obj: Record<string, number>) =>
  round2(Object.values(obj).reduce((s, v) => s + (Number(v) || 0), 0));

/** Short label for the "split [____]" pill. */
export function splitLabel(mode: SplitMode): string {
  return mode === 'equally' ? 'equally' : mode === 'unequally' ? 'unequally' : 'by percentages';
}

/** Short label for the "Paid by [____]" pill. */
export function payerLabel(config: PayerConfig, people: Person[], currentUserId: string): string {
  if (config.mode === 'multiple') {
    const n = Object.values(config.amounts).filter((a) => a > 0).length;
    return `${n} people`;
  }
  const id = config.id || currentUserId;
  if (id === currentUserId) return 'you';
  const person = people.find((p) => p.id === id);
  return person ? person.name.split(' ')[0] : 'someone';
}
