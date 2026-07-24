import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProfileResponse } from '@/types';
import { setActiveCurrency } from '@/utils/currency';
import { apiRequest } from '@/utils/api';
import { useAppEvent } from './use-app-event';

/**
 * Keeps the app-wide active currency (AUDIT item 17) in sync with the user's
 * profile. Mounted once, high in the tree (the tabs layout): it reads
 * `user.currency` on load and whenever the profile changes, then forces a single
 * re-render so every money figure below re-formats with the right symbol.
 *
 * Currency is effectively static per user, so this is cheap — one extra render
 * when it first resolves (or changes), not on every profile read.
 */
export function useCurrencySync(): void {
  const { getToken, isSignedIn } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [, bump] = useState(0);

  const sync = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const res = await apiRequest<ProfileResponse>('/api/profile', {}, token);
      const next = res?.user?.currency;
      setActiveCurrency(next);
      // Re-render the subtree so already-mounted money views pick up the symbol.
      bump((n) => n + 1);
    } catch {
      // Keep the default (INR) — better a sensible symbol than a crash.
    }
  }, [isSignedIn]);

  useEffect(() => {
    sync();
  }, [sync]);

  // A currency change rides on the same event every money screen already re-reads.
  useAppEvent('profile:changed', () => {
    sync();
  });
}
