/**
 * A tiny in-process event bus.
 *
 * Screens in this app are tab screens that stay mounted, so a `useEffect` never
 * re-runs when something changes elsewhere. `useFocusEffect` covers the common
 * case, but it can't drive things that must happen *while* another screen is
 * in front (the streak / quest celebrations) and it can't refresh a screen that
 * is already focused. This bus fills both gaps: anything that mutates money or
 * progress publishes here, and every interested screen re-reads immediately.
 */

export type AppEventMap = {
  /** A transaction was created or removed — balances, insights and streaks are stale. */
  'transaction:changed': { type: 'expense' | 'income'; date: string; amount: number };
  /** The user's income / payday setup changed. */
  'profile:changed': undefined;
  /** Today's streak just advanced to `streak` days (logged on `date`). */
  'streak:advanced': { date: string };
  /** Every quest on today's board is now complete. */
  'quests:allComplete': { date: string; earnedXp: number; totalCount: number };
  /**
   * A quest board changed. `useQuests` is instantiated per-screen (home card and
   * the quest screen each hold their own copy), so the writer broadcasts the new
   * state and every other copy adopts it instead of drifting out of sync.
   */
  'quests:changed': { state: unknown; source: symbol };
};

type Handler<K extends keyof AppEventMap> = (payload: AppEventMap[K]) => void;

const listeners = new Map<keyof AppEventMap, Set<Handler<never>>>();

export function emitAppEvent<K extends keyof AppEventMap>(
  event: K,
  ...args: AppEventMap[K] extends undefined ? [payload?: undefined] : [payload: AppEventMap[K]]
): void {
  const set = listeners.get(event);
  if (!set) return;
  // Copy first — a handler is allowed to unsubscribe itself while we iterate.
  [...set].forEach((handler) => {
    try {
      (handler as Handler<K>)(args[0] as AppEventMap[K]);
    } catch (error) {
      console.warn(`appEvents: handler for "${String(event)}" threw`, error);
    }
  });
}

/** Subscribe to an event. Returns the unsubscribe function. */
export function onAppEvent<K extends keyof AppEventMap>(event: K, handler: Handler<K>): () => void {
  const set = listeners.get(event) ?? new Set();
  set.add(handler as Handler<never>);
  listeners.set(event, set);
  return () => {
    set.delete(handler as Handler<never>);
  };
}
