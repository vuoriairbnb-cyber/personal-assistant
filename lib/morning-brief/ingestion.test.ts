import assert from "node:assert/strict";
import test from "node:test";
import { classificationInputHash, shouldReuseLiveClassification } from "./ingestion-contract";
const candidate = { sourceSlug: "yle" as const, sourceArticleId: "x", title: "Politics retained", canonicalUrl: "https://yle.fi/a", excerpt: "Economic policy", publishedAt: "2026-09-10T10:00:00.000Z", categories: ["politics"], language: "fi", rawMetadata: {} };
test("unchanged feed metadata reuses classification while changed metadata does not", () => { const hash = classificationInputHash(candidate); assert.equal(shouldReuseLiveClassification(hash, hash, true), true); assert.equal(shouldReuseLiveClassification(hash, classificationInputHash({ ...candidate, excerpt: "Changed policy" }), true), false); assert.equal(shouldReuseLiveClassification(hash, hash, false), false); });
