import { useEffect, useState } from 'react';

/** Re-render periodically so “delivered” flips when expected delivery time passes. */
export function useDeliveryClock(intervalMs: number = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);

  return now;
}
