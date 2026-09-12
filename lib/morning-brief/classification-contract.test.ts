import assert from "node:assert/strict";
import test from "node:test";
import { buildImportedArticleClassificationInput, parseImportedArticleClassification } from "./classification-contract";

const valid = { countries: ["Finland"], regions: ["Nordics"], categories: ["finland_business"], topics: ["banking"], sectors: ["financials"], companies: [], people: [], asset_classes: ["equity"], funds: [], event_type: "earnings", significance: 70, consequence: 60, scope: 50, confidence: 80, primary_section: "finland", content_type: "analysis", summary: "A concise summary.", why_it_matters: "It affects Finnish investors." };
test("accepts the structured classifier contract", () => assert.equal(parseImportedArticleClassification(valid).primarySection, "finland"));
test("preserves 0–100 confidence values without scale conversion", () => {
  assert.equal(parseImportedArticleClassification({ ...valid, confidence: 82 }).confidence, 82);
  assert.equal(parseImportedArticleClassification({ ...valid, confidence: 72 }).confidence, 72);
  assert.equal(parseImportedArticleClassification({ ...valid, confidence: 7 }).confidence, 7);
  assert.throws(() => parseImportedArticleClassification({ ...valid, confidence: 0.72 }));
});
test("accepts valid empty optional entity arrays and rejects malformed scores", () => { assert.equal(parseImportedArticleClassification({ ...valid, companies: [], people: [], funds: [] }).companies.length, 0); assert.throws(() => parseImportedArticleClassification({ ...valid, categories: ["made_up"] })); assert.throws(() => parseImportedArticleClassification({ ...valid, confidence: 101 })); assert.throws(() => parseImportedArticleClassification({ ...valid, topics: "banking" })); });
test("classifier input preserves metadata-only availability without inventing body text", () => { const input = buildImportedArticleClassificationInput({ canonicalUrl: "https://example.com/a", title: "Headline", excerpt: "Public excerpt", siteName: "Example", text: "", contentAvailability: "metadata_only" }); assert.equal(input.content_availability, "metadata_only"); assert.equal(input.article_text, ""); });
