import assert from "node:assert/strict";
import test from "node:test";
import { createLiveRankingDiagnosticsGetHandler } from "./diagnostics-route";

test("diagnostic route rejects an unauthenticated request", async () => {
  const GET = createLiveRankingDiagnosticsGetHandler({ requireApprovedUser: async () => { throw new Error("Not signed in"); }, buildDiagnostic: async () => ({}) });
  const response = await GET();
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});

test("diagnostic route rejects a non-approved user through the same guard", async () => {
  const GET = createLiveRankingDiagnosticsGetHandler({ requireApprovedUser: async () => { throw new Error("Not approved"); }, buildDiagnostic: async () => ({}) });
  assert.equal((await GET()).status, 401);
});

test("diagnostic route permits only the guard-provided approved user", async () => {
  let receivedId = "";
  const GET = createLiveRankingDiagnosticsGetHandler({ requireApprovedUser: async () => ({ user: { id: "approved-user" } }), buildDiagnostic: async (userId) => { receivedId = userId; return { meta: { safe: true } }; } });
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(receivedId, "approved-user");
  assert.deepEqual(await response.json(), { meta: { safe: true } });
});
