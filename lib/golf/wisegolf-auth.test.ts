import assert from "node:assert/strict";
import test from "node:test";
import { getClub } from "./clubs.ts";
import { authenticatedWiseGolfHeaders, WiseGolfAuthRequiredError } from "./wisegolf-auth.ts";

test("WiseGolf player auth uses the exact lower-case token scheme and configured session type", () => {
  const hgk = getClub("hgk")!;
  const headers = authenticatedWiseGolfHeaders(hgk, { HGK_WISEGOLF_ACCESS_TOKEN: "test-access-token" });
  assert.deepEqual(headers, { Accept: "application/json", Authorization: "token test-access-token", "x-session-type": "wisegolf" });
  assert.equal(getClub("kullo")!.playerSearch?.auth.envVar, "KULLO_WISEGOLF_ACCESS_TOKEN");
  assert.equal(getClub("vuosaari")!.playerSearch?.auth.envVar, "VUOSAARI_WISEGOLF_ACCESS_TOKEN");
  assert.equal(getClub("nordcenter")!.playerSearch?.auth.envVar, "NORDCENTER_WISEGOLF_ACCESS_TOKEN");
  assert.equal(getClub("tapiola")!.playerSearch?.auth.envVar, "TAPIOLA_WISEGOLF_ACCESS_TOKEN");
});

test("missing WiseGolf token fails closed", () => {
  assert.throws(() => authenticatedWiseGolfHeaders(getClub("hgk")!, {}), WiseGolfAuthRequiredError);
});
