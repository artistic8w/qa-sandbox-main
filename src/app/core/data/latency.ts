// Simulates a realistic, sometimes-slow backend. Latency is random within
// bounds, but outcomes are never random — no random failures, no random data.
// A per-session counter makes every 6th "heavy" call (list / dashboard
// aggregates) take noticeably longer, so the app spikes the way real apps do.
let heavyCalls = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function between(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export async function latency(kind: 'normal' | 'heavy' = 'normal'): Promise<void> {
  if (kind === 'heavy') {
    heavyCalls += 1;
    if (heavyCalls % 6 === 0) {
      await sleep(between(800, 1200));
      return;
    }
  }
  await sleep(between(100, 350));
}
