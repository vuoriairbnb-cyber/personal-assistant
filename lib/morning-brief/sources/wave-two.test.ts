import assert from "node:assert/strict";
import test from "node:test";
import { isRelevantEurostatCandidate } from "./eurostat";
import { isRelevantFederalReserveCandidate } from "./federal-reserve";
import { parsePynEliteNewsIndex, pynContentType } from "./pyn-elite";
import { isRelevantVietnamStatisticsCandidate, parseVietnamStatisticsPressRoom } from "./vietnam-statistics";

const base = { sourceArticleId: "item", canonicalUrl: "https://example.test/item", excerpt: "", publishedAt: "2026-09-12T10:00:00.000Z", categories: [], language: "en", rawMetadata: {} };

test("PYN public news index preserves public report metadata and limits parsed cards", () => {
  const html = `<article class="elementor-post"><h2 class="elementor-post__title"><a href="/en/reviews/2026/pyn-elite-up-in-august/">PYN Elite up 1.8% in August</a></h2><span>06.09.2026</span><div class="elementor-post__excerpt"><p>Vietnam market commentary</p></div></article><article class="elementor-post"><h2 class="elementor-post__title"><a href="/en/blog/2026/investor-letter-3-2026/">Investor Letter 3/2026</a></h2><span>01.09.2026</span></article><a href="/en/news/">Navigation link</a>`;
  const items = parsePynEliteNewsIndex(html, "https://www.pyn.fi/en/news/", 1);
  assert.equal(items.length, 1); assert.equal(items[0]!.sourceSlug, "pyn-elite"); assert.equal(items[0]!.rawMetadata.portfolio_lens, "PYN Elite"); assert.equal(items[0]!.rawMetadata.region, "Vietnam");
  assert.equal(parsePynEliteNewsIndex(html, "https://www.pyn.fi/en/news/", 5).some((item) => item.categories.includes("investor_letter")), true);
  assert.equal(pynContentType("Investor Letter 3/2026"), "investor_letter");
  assert.deepEqual(parsePynEliteNewsIndex("<a href=\"/en/news/\">Navigation link</a>", "https://www.pyn.fi/en/news/", 5), []);
});

test("Vietnam statistics preserves Unicode while its shared deterministic filter keeps macro releases", () => {
  const html = `<article><a href="/en/data-and-statistics/2026/09/cpi/">Chỉ số giá tiêu dùng (CPI) tháng 9</a><span>Date of issue: 03/09/2026</span></article><article><a href="/en/data-and-statistics/2026/09/gdp/">GDP growth in the third quarter</a><span>Date of issue: 03/09/2026</span></article><article><a href="/en/data-and-statistics/2026/09/fdi/">Foreign investment reaches new high</a><span>Date of issue: 03/09/2026</span></article><article><a href="/en/data-and-statistics/2026/09/industry/">Industrial production index increases</a><span>Date of issue: 03/09/2026</span></article><article><a href="/en/news/event/">Sports day notice</a><span>Date of issue: 03/09/2026</span></article>`;
  const items = parseVietnamStatisticsPressRoom(html, "https://www.nso.gov.vn/en/press-room/", 5);
  assert.equal(items.length, 5); assert.equal(items[0]!.title, "Chỉ số giá tiêu dùng (CPI) tháng 9"); assert.equal(items[0]!.rawMetadata.country, "Vietnam");
  assert.equal(items.slice(0, 4).every(isRelevantVietnamStatisticsCandidate), true); assert.equal(isRelevantVietnamStatisticsCandidate(items[4]!), false);
  assert.deepEqual(parseVietnamStatisticsPressRoom("not html", "https://www.nso.gov.vn/en/press-room/", 5), []);
});

test("official macro filters retain policy releases and exclude routine non-macro items before AI", () => {
  const fed = { ...base, sourceSlug: "federal-reserve", title: "Statement on monetary policy", excerpt: "" };
  const routineSpeech = { ...base, sourceSlug: "federal-reserve", title: "Community event remarks", excerpt: "" };
  assert.equal(isRelevantFederalReserveCandidate(fed, "federal-reserve-speeches"), true);
  assert.equal(isRelevantFederalReserveCandidate(routineSpeech, "federal-reserve-speeches"), false);
  assert.equal(isRelevantFederalReserveCandidate(routineSpeech, "federal-reserve-monetary"), true);
  assert.equal(isRelevantFederalReserveCandidate({ ...base, sourceSlug: "federal-reserve", title: "Minutes of the Federal Open Market Committee", excerpt: "" }, "federal-reserve-monetary"), true);
  assert.equal(isRelevantFederalReserveCandidate({ ...base, sourceSlug: "federal-reserve", title: "Monetary Policy Report", excerpt: "" }, "federal-reserve-monetary"), true);
  assert.equal(isRelevantEurostatCandidate({ ...base, sourceSlug: "eurostat", title: "Euro area inflation at 2.1%", excerpt: "" }), true);
  assert.equal(isRelevantEurostatCandidate({ ...base, sourceSlug: "eurostat", title: "GDP up by 0.6% in the euro area", excerpt: "" }), true);
  assert.equal(isRelevantEurostatCandidate({ ...base, sourceSlug: "eurostat", title: "Unemployment in the euro area", excerpt: "" }), true);
  assert.equal(isRelevantEurostatCandidate({ ...base, sourceSlug: "eurostat", title: "Industrial production down in the EU", excerpt: "" }), true);
  assert.equal(isRelevantEurostatCandidate({ ...base, sourceSlug: "eurostat", title: "Museum visitors by age", excerpt: "" }), false);
});
