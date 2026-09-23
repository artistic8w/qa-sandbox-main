import { WritableSignal } from '@angular/core';

// Renders cached data instantly (if present) and refreshes it in the background;
// otherwise loads with the spinner. Keeps repeat visits to list screens instant.
export async function staleWhileRevalidate<T>(
  cache: WritableSignal<T | null>,
  loading: WritableSignal<boolean>,
  load: () => Promise<T>,
  apply: (data: T) => void,
): Promise<void> {
  const cached = cache();
  if (cached !== null) {
    apply(cached);
    loading.set(false);
    void load().then((fresh) => {
      cache.set(fresh);
      apply(fresh);
    });
  } else {
    loading.set(true);
    const fresh = await load();
    cache.set(fresh);
    apply(fresh);
    loading.set(false);
  }
}
