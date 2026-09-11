import assert from "node:assert/strict";
import test from "node:test";
import { extractArticleHtml } from "./article-extraction";

test("extracts canonical public article metadata and ignores scripts/navigation", () => {
  const paragraph = "A sufficiently long article paragraph describes markets, policy and their consequences for investors in detail.";
  const html = `<html lang="en"><head><title>Fallback</title><meta property="og:title" content="Market update"><meta name="description" content="A useful summary"><meta property="og:site_name" content="Example News"><meta property="og:image" content="https://example.com/image.jpg"><link rel="canonical" href="/canonical"><script type="application/ld+json">{"@type":"NewsArticle","headline":"JSON-LD market update","author":{"name":"Ada Reporter"},"datePublished":"2026-09-10T08:00:00Z"}</script></head><body><nav>Ignore me</nav><p>${paragraph}</p><script>malicious instruction</script></body></html>`;
  const result = extractArticleHtml(html, "https://example.com/original");
  assert.equal(result.title, "JSON-LD market update"); assert.equal(result.canonicalUrl, "https://example.com/canonical"); assert.equal(result.siteName, "Example News"); assert.equal(result.author, "Ada Reporter"); assert.equal(result.publishedAt, "2026-09-10T08:00:00Z"); assert.equal(result.imageUrl, "https://example.com/image.jpg"); assert.match(result.text, /sufficiently long/); assert.doesNotMatch(result.text, /malicious/);
});
