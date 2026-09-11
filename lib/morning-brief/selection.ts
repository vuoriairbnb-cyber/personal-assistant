import type { MorningBriefSection } from "./taxonomy";
import type { RankedStoryCluster } from "./clustering";

export const TOP_FIVE_CONFIG = { limit: 5, qualityFloor: 48, maxMustConsiderOverrides: 2, representationBonus: 4 } as const;
export type SelectionEntry = { cluster: RankedStoryCluster; adjustedScore: number; reason: string };
export type SelectionResult = { selected: SelectionEntry[]; excluded: Array<{ cluster: RankedStoryCluster; reason: string }> };
const includes = (values: string[], words: string[]) => values.some((value) => words.some((word) => value.toLowerCase().includes(word)));
const lensGroup = (story: RankedStoryCluster) => story.score.portfolioMatches.map((match) => match.lens).join("|");
const broadLens = (story: RankedStoryCluster) => ({ portfolio_vietnam: includes(story.countries, ["vietnam"]), portfolio_credit: story.score.portfolioMatches.some((match) => ["European High Yield", "Nordic High Yield", "Evli Nordic Secured Loan"].includes(match.lens)), finland: includes(story.countries, ["finland"]), global_major: story.score.mustConsider, emerging_frontier: story.score.portfolioMatches.some((match) => match.lens === "Evli Emerging Frontier"), private_markets: includes(story.topics, ["venture capital", "private equity", "private credit"]) });

function adjustment(story: RankedStoryCluster, selected: SelectionEntry[]) {
  const countryCount = selected.filter((entry) => includes(entry.cluster.countries, story.countries)).length;
  const topicCount = selected.filter((entry) => includes(entry.cluster.topics, story.topics)).length;
  const sectorCount = selected.filter((entry) => includes(entry.cluster.sectors, story.sectors)).length;
  const sameLens = selected.filter((entry) => lensGroup(entry.cluster) && lensGroup(entry.cluster) === lensGroup(story)).length;
  const penalties = (countryCount >= 3 ? 18 : countryCount === 2 ? 10 : countryCount === 1 ? 3 : 0) + (topicCount >= 2 ? 14 : topicCount === 1 ? 6 : 0) + (sectorCount >= 2 ? 7 : sectorCount === 1 ? 3 : 0) + (sameLens >= 2 ? 8 : sameLens === 1 ? 3 : 0);
  const represented = new Set(selected.flatMap((entry) => Object.entries(broadLens(entry.cluster)).filter(([, value]) => value).map(([key]) => key)));
  const bonus = story.score.finalScore >= TOP_FIVE_CONFIG.qualityFloor ? Object.entries(broadLens(story)).some(([key, value]) => value && !represented.has(key)) ? TOP_FIVE_CONFIG.representationBonus : 0 : 0;
  return { adjustedScore: story.score.finalScore - penalties + bonus, reason: penalties ? `Selected after diversity penalty (${penalties.toFixed(0)})` : bonus ? "Selected with a soft unrepresented-lens bonus" : "Highest remaining quality-adjusted story" };
}

export function selectTopFive(stories: RankedStoryCluster[], config = TOP_FIVE_CONFIG): SelectionResult {
  const candidates = [...stories].sort((a, b) => b.score.finalScore - a.score.finalScore || a.id.localeCompare(b.id));
  const selected: SelectionEntry[] = []; const excluded: SelectionResult["excluded"] = [];
  while (selected.length < config.limit) {
    const options = candidates.filter((story) => !selected.some((entry) => entry.cluster.id === story.id)).filter((story) => story.score.finalScore >= config.qualityFloor).map((story) => ({ story, ...adjustment(story, selected) })).sort((a, b) => b.adjustedScore - a.adjustedScore || a.story.id.localeCompare(b.story.id));
    if (!options.length) break;
    const next = options[0]!; selected.push({ cluster: next.story, adjustedScore: next.adjustedScore, reason: next.reason });
  }
  let overrides = 0;
  for (const story of candidates.filter((item) => item.score.mustConsider && !selected.some((entry) => entry.cluster.id === item.id))) {
    if (overrides >= config.maxMustConsiderOverrides || selected.some((entry) => entry.cluster.score.mustConsider && includes(entry.cluster.topics, story.topics))) { excluded.push({ cluster: story, reason: "Major-event duplicate or override cap" }); continue; }
    const lowest = [...selected].sort((a, b) => a.adjustedScore - b.adjustedScore || a.cluster.id.localeCompare(b.cluster.id))[0];
    if (!lowest) break;
    selected.splice(selected.indexOf(lowest), 1, { cluster: story, adjustedScore: story.score.finalScore, reason: "Must-consider major event replaced the lowest selected story" });
    excluded.push({ cluster: lowest.cluster, reason: "Replaced by a distinct must-consider major event" }); overrides += 1;
  }
  for (const story of candidates) if (!selected.some((entry) => entry.cluster.id === story.id) && !excluded.some((entry) => entry.cluster.id === story.id)) excluded.push({ cluster: story, reason: story.score.finalScore < config.qualityFloor ? "Below Top 5 quality floor" : "Lower quality-adjusted score after diversity" });
  return { selected: selected.sort((a, b) => b.adjustedScore - a.adjustedScore || a.cluster.id.localeCompare(b.cluster.id)), excluded };
}

const sectionPredicate: Record<Exclude<MorningBriefSection, "top_5">, (story: RankedStoryCluster) => boolean> = {
  vietnam: (s) => includes(s.countries, ["vietnam"]) && !includes(s.topics, ["tourism", "lifestyle", "restaurant"]),
  credit: (s) => s.article.primarySection === "credit" || s.score.portfolioMatches.some((m) => ["European High Yield", "Nordic High Yield", "Evli Nordic Secured Loan"].includes(m.lens)),
  finland: (s) => includes(s.countries, ["finland"]),
  markets: (s) => s.article.primarySection === "markets" || includes(s.topics, ["rates", "equity", "fx", "commodities", "macro", "markets", "central bank"]),
  politics: (s) => s.article.primarySection === "politics" || includes(s.topics, ["politics", "geopolitics", "policy", "parliament"]),
  emerging_frontier: (s) => s.article.primarySection === "emerging_frontier" || s.score.portfolioMatches.some((m) => m.lens === "Evli Emerging Frontier"),
  vc_pe: (s) => s.article.primarySection === "vc_pe" || includes(s.topics, ["venture capital", "private equity", "buyout", "fundraising", "secondaries"]),
  world: (s) => s.article.primarySection === "world" || s.score.mustConsider || includes(s.topics, ["geopolitics", "global economy", "trade policy"]),
  worth_reading: (s) => ["analysis", "explainer", "long_read"].includes(s.article.contentType),
};
export function selectSectionFeed(stories: RankedStoryCluster[], section: MorningBriefSection, limit = section === "worth_reading" ? 4 : 5) {
  if (section === "top_5") return selectTopFive(stories).selected.map((entry) => entry.cluster);
  return stories.filter(sectionPredicate[section]).sort((a, b) => b.score.finalScore - a.score.finalScore || a.id.localeCompare(b.id)).slice(0, limit);
}
export function formatSelectionDebug(stories: RankedStoryCluster[], selection = selectTopFive(stories)) {
  const base = ["Rank | Score | Headline | Portfolio lens | Importance | mustConsider | Sources", "--- | --- | --- | --- | --- | --- | ---", ...stories.slice(0, 15).map((story, index) => `${index + 1} | ${story.score.finalScore.toFixed(1)} | ${story.headline} | ${story.score.portfolioMatches.map((match) => match.lens).join(" + ") || "—"} | ${story.score.importanceScore.toFixed(0)} | ${story.score.mustConsider} | ${story.sourceCount}`)];
  const final = ["Position | Adjusted | Base | Headline | Why selected", "--- | --- | --- | --- | ---", ...selection.selected.map((entry, index) => `${index + 1} | ${entry.adjustedScore.toFixed(1)} | ${entry.cluster.score.finalScore.toFixed(1)} | ${entry.cluster.headline} | ${entry.reason}`)];
  const excluded = ["Headline | Why not selected", "--- | ---", ...selection.excluded.slice(0, 3).map((entry) => `${entry.cluster.headline} | ${entry.reason}`)];
  return `BASE RANKING TOP 15\n\n${base.join("\n")}\n\nFINAL TOP 5\n\n${final.join("\n")}\n\nEXCLUDED\n\n${excluded.join("\n")}`;
}
