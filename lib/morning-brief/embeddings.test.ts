import assert from "node:assert/strict";
import test from "node:test";
import { buildEmbeddingInput, embeddingInputHash, needsEmbeddingGeneration, parseVector } from "./embedding-contract";

const article = { id: "a", title: "Nordic covenants", excerpt: "A public excerpt", body_text: "Useful public content", content_type: "analysis", countries: ["Sweden"], regions: ["Nordics"], categories: ["credit"], topics: ["covenants"], sectors: ["financials"], companies: [], event_type: "refinancing", summary: "Lenders tighten terms" };
test("semantic embedding input is bounded, deterministic and changes with material semantic content", () => { const input = buildEmbeddingInput(article); assert.match(input, /TITLE: Nordic covenants/); assert.match(input, /TOPICS: covenants/); assert.equal(embeddingInputHash(input), embeddingInputHash(buildEmbeddingInput(article))); assert.notEqual(embeddingInputHash(input), embeddingInputHash(buildEmbeddingInput({ ...article, summary: "Different refinancing event" }))); });
test("invalid persisted vectors are rejected", () => { assert.equal(parseVector("[1,2]"), null); assert.equal(parseVector("not-a-vector"), null); });
test("unchanged input reuses its embedding while material changes require a new vector", () => { const hash = embeddingInputHash(buildEmbeddingInput(article)); assert.equal(needsEmbeddingGeneration(hash, hash), false); assert.equal(needsEmbeddingGeneration(hash, embeddingInputHash(buildEmbeddingInput({ ...article, title: "Changed title" }))), true); });
