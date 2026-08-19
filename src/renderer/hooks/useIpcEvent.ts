import { useEffect } from 'react';

/** Subscribes to a preload event stream for the lifetime of the component. */
export function useIpcEvent<T>(
  subscribe: (cb: (payload: T) => void) => () => void,
  handler: (payload: T) => void,
  deps: unknown[] = []
): void {
  useEffect(() => {
    const unsubscribe = subscribe(handler);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
