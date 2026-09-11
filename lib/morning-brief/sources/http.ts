import { LIVE_SOURCE_FETCH_TIMEOUT_MS } from "./config";
import type { SourceFetch } from "./types";

/** Public source fetch with an explicit bound; callers never inherit an unbounded request. */
export async function fetchPublicSource(url: string, init: RequestInit, fetcher: SourceFetch = fetch, timeoutMs = LIVE_SOURCE_FETCH_TIMEOUT_MS) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetcher(url, { ...init, signal: controller.signal }); }
  catch (error) { if (controller.signal.aborted) throw new Error(`Source request timed out after ${Math.ceil(timeoutMs / 1_000)}s.`); throw error; }
  finally { clearTimeout(timer); }
}
