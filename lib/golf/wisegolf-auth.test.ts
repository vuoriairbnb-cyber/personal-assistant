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
  assert.equal(getClub("hirsala")!.playerSearch?.auth.envVar, "HIRSALA_WISEGOLF_ACCESS_TOKEN");
  assert.equal(getClub("mastergolf")!.playerSearch?.auth.envVar, "MASTER_WISEGOLF_ACCESS_TOKEN");
  assert.equal(getClub("pickala")!.playerSearch?.auth.envVar, "PICKALA_WISEGOLF_ACCESS_TOKEN");
  assert.equal(getClub("keimola")!.playerSearch?.auth.envVar, "KEIMOLA_WISEGOLF_ACCESS_TOKEN");
  const aulanko = getClub("aulanko-golf")!;
  assert.equal(aulanko.playerSearch?.auth.envVar, "AULANKO_WISEGOLF_ACCESS_TOKEN");
  assert.deepEqual(authenticatedWiseGolfHeaders(aulanko, { AULANKO_WISEGOLF_ACCESS_TOKEN: "test-access-token" }), { Accept: "application/json", Authorization: "token test-access-token", "x-session-type": "wisegolf" });
  const stLaurence = getClub("st-laurence")!;
  assert.equal(stLaurence.playerSearch?.auth.envVar, "STLAURENCE_WISEGOLF_ACCESS_TOKEN");
  assert.deepEqual(authenticatedWiseGolfHeaders(stLaurence, { STLAURENCE_WISEGOLF_ACCESS_TOKEN: "test-access-token" }), { Accept: "application/json", Authorization: "token test-access-token", "x-session-type": "wisegolf" });
  const shg = getClub("shg")!;
  assert.equal(shg.playerSearch?.auth.envVar, "SHG_WISEGOLF_ACCESS_TOKEN");
  assert.deepEqual(authenticatedWiseGolfHeaders(shg, { SHG_WISEGOLF_ACCESS_TOKEN: "test-access-token" }), { Accept: "application/json", Authorization: "token test-access-token", "x-session-type": "wisegolf" });
});

test("missing WiseGolf token fails closed", () => {
  assert.throws(() => authenticatedWiseGolfHeaders(getClub("hgk")!, {}), WiseGolfAuthRequiredError);
  assert.throws(() => authenticatedWiseGolfHeaders(getClub("aulanko-golf")!, {}), WiseGolfAuthRequiredError);
  assert.throws(() => authenticatedWiseGolfHeaders(getClub("st-laurence")!, {}), WiseGolfAuthRequiredError);
  assert.throws(() => authenticatedWiseGolfHeaders(getClub("shg")!, {}), WiseGolfAuthRequiredError);
});
