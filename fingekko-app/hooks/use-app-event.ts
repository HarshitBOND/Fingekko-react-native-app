import { useEffect, useRef } from 'react';
import { onAppEvent, type AppEventMap } from '@/lib/appEvents';

/**
 * Subscribe a component to an app event for its whole lifetime. The handler is
 * held in a ref, so callers can pass an inline arrow function without
 * re-subscribing on every render.
 */
export function useAppEvent<K extends keyof AppEventMap>(
  event: K,
  handler: (payload: AppEventMap[K]) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(
    () => onAppEvent(event, (payload) => handlerRef.current(payload)),
    [event],
  );
}
