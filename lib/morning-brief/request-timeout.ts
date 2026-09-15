export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number, fetcher: typeof fetch = fetch) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetcher(input, { ...init, signal: controller.signal }); }
  catch (error) { if (controller.signal.aborted) throw new Error(`External request timed out after ${Math.ceil(timeoutMs / 1_000)}s.`); throw error; }
  finally { clearTimeout(timer); }
}
