import assert from "node:assert/strict";
import test from "node:test";
import { parseRssOrAtom, rssCandidates } from "./rss";
import { parseBankOfFinlandNewsIndex } from "./bank-of-finland";
import { isClearlyIrrelevantYleNoise } from "./yle";

test("parses RSS metadata, categories and media without requiring optional fields", () => {
  const xml = `<?xml version="1.0"?><rss><channel><item><guid>x-1</guid><title><![CDATA[Economy &amp; rates]]></title><link>https://example.test/a</link><description>Useful &lt;b&gt;summary&lt;/b&gt;</description><pubDate>Wed, 10 Sep 2026 10:00:00 GMT</pubDate><category>Economy</category><media:content url="https://img.example/a.jpg" /></item><item><title>Missing link</title></item></channel></rss>`;
  const items = parseRssOrAtom(xml); assert.equal(items.length, 1); assert.equal(items[0]!.title, "Economy & rates"); assert.deepEqual(items[0]!.categories, ["Economy"]); assert.equal(items[0]!.imageUrl, "https://img.example/a.jpg");
  const candidates = rssCandidates(xml, { sourceSlug: "yle", language: "fi", feedUrl: "https://feed.example/rss", maxItems: 10 }); assert.equal(candidates[0]!.publishedAt, "2026-09-10T10:00:00.000Z");
});
test("parses Atom ids, alternate links, updated dates, authors and category terms", () => {
  const xml = `<feed><entry><id>ecb-1</id><title>Rate decision</title><link rel="alternate" href="https://example.test/rate"/><updated>2026-09-10T12:00:00Z</updated><author><name>ECB</name></author><category term="monetary policy"/></entry></feed>`;
  const item = parseRssOrAtom(xml)[0]!; assert.equal(item.id, "ecb-1"); assert.equal(item.author, "ECB"); assert.deepEqual(item.categories, ["monetary policy"]); assert.equal(item.updated, "2026-09-10T12:00:00.000Z");
});
test("parses the Bank of Finland's bounded official news index", () => {
  const html = `<p>Press release | 9 Sep 2026</p><a href="/en/news-and-topical/release/">Finland’s economy at a turning point</a>`;
  const items = parseBankOfFinlandNewsIndex(html, "https://www.suomenpankki.fi/en/news-and-topical/press-releases-and-news/", 30); assert.equal(items.length, 1); assert.equal(items[0]!.sourceSlug, "bank-of-finland"); assert.match(items[0]!.canonicalUrl, /suomenpankki\.fi/);
});
test("keeps Yle politics and economy while skipping only clear sports noise", () => {
  const base = { sourceSlug: "yle" as const, sourceArticleId: "x", canonicalUrl: "https://yle.fi/x", excerpt: "", publishedAt: "2026-09-10T10:00:00Z", categories: [], language: "fi", rawMetadata: {} };
  assert.equal(isClearlyIrrelevantYleNoise({ ...base, title: "Urheilu: ottelu" }), true);
  assert.equal(isClearlyIrrelevantYleNoise({ ...base, title: "Politiikka ja talous", categories: ["politics"] }), false);
});
