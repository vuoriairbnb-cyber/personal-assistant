import assert from "node:assert/strict";
import test from "node:test";
import { fetchPublicSource } from "./http";

test("public-source fetches abort with a bounded, safe timeout", async () => {
  const fetcher = async (_input: string, init?: RequestInit) => await new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  });

  await assert.rejects(fetchPublicSource("https://example.test/feed", {}, fetcher, 1), /Source request timed out after 1s/);
});
