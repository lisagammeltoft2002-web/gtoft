/* Builds the sand flow (every grain's start, timing and landing spot) off the main thread, so the
   page stays responsive while it loads. */
import { buildField, buildFlow, discAt } from "./flow";

let field: Float32Array | null = null;

self.onmessage = (e: MessageEvent<{ id: number; W: number; H: number; n: number; debug: boolean }>) => {
  const { id, W, H, n, debug } = e.data;
  field ??= buildField();
  const t0 = performance.now();
  const flow = buildFlow(discAt(W, H), W, H, n, field, debug);
  const ms = Math.round(performance.now() - t0);
  (self as unknown as Worker).postMessage({ id, data: flow.data, count: flow.count, stats: flow.stats, ms }, [flow.data.buffer]);
};
