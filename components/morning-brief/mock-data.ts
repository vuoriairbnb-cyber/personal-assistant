// Phase 1 only: replace with persisted Morning Brief data.

export type MorningBriefStory = {
  id: string;
  title: string;
  source: string;
  publishedLabel: string;
  summary?: string;
  tags?: string[];
  whyItMatters?: string;
  href?: string;
  readTime?: string;
};

export type MarketSnapshot = { label: string; value: string; change: string; positive?: boolean };

export const todayInThirtySeconds =
  "Vietnamese banking and credit remain in focus as domestic growth conditions develop. European credit markets are watching refinancing and rate expectations, while Finnish economic policy is one of the key domestic themes today.";

export const whatMattersToday: MorningBriefStory[] = [
  { id: "vietnam-credit", title: "Vietnamese bank lending stays central to the domestic growth outlook", source: "Asia Markets Desk", publishedLabel: "42 min ago", summary: "New lending indicators point to continued activity in the banking system as investors watch the balance between growth support and financial stability.", tags: ["Vietnam", "PYN Elite", "Banking"], whyItMatters: "Credit conditions are a direct lens on Vietnam's consumer, property and market cycle.", href: "https://example.com/morning-brief/vietnam-credit" },
  { id: "central-banks", title: "Rate expectations reset as major central banks signal patience", source: "Global Markets Review", publishedLabel: "1h ago", summary: "Markets are reassessing the timing of policy easing after a fresh set of inflation and activity signals.", tags: ["Markets", "Rates", "Macro"], whyItMatters: "The rate path shapes equity risk appetite, refinancing costs and credit spreads.", href: "https://example.com/morning-brief/rates" },
  { id: "finland-fiscal", title: "Finnish fiscal package puts competitiveness and public finances in focus", source: "Nordic Business Journal", publishedLabel: "2h ago", summary: "The latest policy discussion combines growth measures with a renewed emphasis on medium-term budget discipline.", tags: ["Finland", "Fiscal Policy", "Economy"], whyItMatters: "Domestic policy choices influence the Finnish business environment and household confidence.", href: "https://example.com/morning-brief/finland-fiscal" },
  { id: "nordic-refinancing", title: "Nordic property borrower returns to the bond market after refinancing", source: "European Credit Wire", publishedLabel: "3h ago", summary: "A successful refinancing offers a useful read-through on investor appetite for selected Nordic high-yield issuers.", tags: ["Nordic Credit", "Refinancing", "Property"], whyItMatters: "Refinancing access and pricing are core indicators for Nordic high-yield risk.", href: "https://example.com/morning-brief/nordic-credit" },
  { id: "pe-transaction", title: "European buyout market sees renewed focus on carve-outs and operational value creation", source: "Private Capital Review", publishedLabel: "4h ago", summary: "Sponsors are prioritising transactions where operational improvement can matter as much as leverage.", tags: ["Private Equity", "Europe", "Transactions"], whyItMatters: "The transaction mix signals how private capital is adapting to a more selective financing market.", href: "https://example.com/morning-brief/private-equity" },
];

export const marketsAtAGlance: MarketSnapshot[] = [
  { label: "S&P 500", value: "5,248", change: "+0.4%", positive: true },
  { label: "STOXX Europe 600", value: "536", change: "+0.2%", positive: true },
  { label: "OMX Helsinki", value: "10,164", change: "-0.1%" },
  { label: "VN-Index", value: "1,286", change: "+0.6%", positive: true },
  { label: "EUR/USD", value: "1.084", change: "+0.1%", positive: true },
  { label: "US 10Y", value: "4.18%", change: "-2 bp", positive: true },
  { label: "Brent", value: "$79.40", change: "+0.7%", positive: true },
  { label: "European HY spread", value: "328 bp", change: "-4 bp", positive: true },
];

export const sections: Array<{ id: string; title: string; description?: string; stories: MorningBriefStory[] }> = [
  { id: "vietnam", title: "Vietnam / PYN Elite", description: "A high-priority lens on Vietnam's economy, market structure and listed-company environment.", stories: [
    { id: "vietnam-reform", title: "Market-access reforms keep Vietnam's classification story in view", source: "Frontier Markets Monitor", publishedLabel: "1h ago", summary: "Investors continue to watch practical changes that could improve accessibility and foreign participation.", tags: ["Vietnam", "Market Reform", "Foreign Flows"], whyItMatters: "Market-structure progress can change the investor base and valuation framework over time." },
    { id: "vietnam-fdi", title: "Manufacturing investment pipeline supports Vietnam's export narrative", source: "Asia Industry Brief", publishedLabel: "5h ago", summary: "New industrial commitments underline the role of manufacturing and FDI in the country's medium-term growth outlook.", tags: ["Vietnam", "FDI", "Industrials"], whyItMatters: "FDI and exports remain important drivers of activity across Vietnam's economy." },
  ] },
  { id: "emerging-frontier", title: "Emerging & Frontier", stories: [
    { id: "frontier-flows", title: "Frontier equity flows stabilise as investors revisit country-specific opportunities", source: "Emerging Markets Review", publishedLabel: "2h ago", summary: "Capital allocation remains selective, with policy credibility and market access separating winners from laggards.", tags: ["Frontier Markets", "Capital Flows", "Equities"], whyItMatters: "Country selection and liquidity conditions are material to frontier-market exposure." },
    { id: "em-currency", title: "Currency policy remains a key differentiator across emerging markets", source: "Global FX Note", publishedLabel: "6h ago", summary: "Diverging inflation paths are keeping local rates and currency management central to investor conversations.", tags: ["Emerging Markets", "FX", "Policy"], whyItMatters: "Currency and policy credibility shape local returns for international investors." },
  ] },
  { id: "credit", title: "Credit & High Yield", stories: [
    { id: "credit-pricing", title: "European leveraged loan pricing shifts as rate expectations change", source: "Leveraged Finance Daily", publishedLabel: "48 min ago", summary: "New issue discussions reflect a more nuanced balance between borrower demand and investor selectivity.", tags: ["Leveraged Loans", "European Credit", "Rates"], whyItMatters: "Loan pricing and issuance conditions are direct signals for secured-credit market health." },
    { id: "credit-property", title: "Swedish property issuer returns to bond market after refinancing", source: "Nordic Credit Wire", publishedLabel: "3h ago", summary: "The transaction offers a fresh reference point for property-sector funding conditions in Nordic high yield.", tags: ["Nordic HY", "Refinancing", "Property"], whyItMatters: "Property refinancing remains a key stress point and opportunity set in Nordic credit." },
  ] },
  { id: "finland", title: "Finland", stories: [
    { id: "finland-investment", title: "Industrial investment plans lift attention on Finland's export outlook", source: "Finnish Business Review", publishedLabel: "1h ago", summary: "A new investment programme highlights the links between energy availability, industrial competitiveness and jobs.", tags: ["Finland", "Industry", "Exports"], whyItMatters: "Large industrial investments can influence growth, supply chains and regional competitiveness." },
    { id: "finland-tax", title: "Taxation debate sharpens ahead of the next fiscal-policy decisions", source: "Helsinki Policy Brief", publishedLabel: "4h ago", summary: "Policymakers are weighing growth incentives against the need to stabilise public finances.", tags: ["Finland", "Politics", "Taxation"], whyItMatters: "Fiscal choices affect business confidence, consumption and the domestic investment climate." },
  ] },
  { id: "vc-pe", title: "VC & Private Equity", stories: [
    { id: "vc-fund", title: "Nordic venture fund closes new vehicle focused on industrial technology", source: "European Venture Report", publishedLabel: "2h ago", summary: "The fundraise points to continued appetite for specialised strategies despite a selective broader fundraising market.", tags: ["VC", "Nordics", "Technology"], whyItMatters: "Fundraising conditions offer a useful signal on risk appetite and innovation financing." },
    { id: "pe-exit", title: "European sponsor prepares portfolio-company exit after operational turnaround", source: "Private Capital Review", publishedLabel: "5h ago", summary: "The planned process highlights the return of value-creation stories alongside financial engineering.", tags: ["Private Equity", "Exit", "Europe"], whyItMatters: "Exit activity is a key indicator for distributions, valuations and private-market liquidity." },
  ] },
  { id: "world", title: "World / Politics", stories: [
    { id: "world-trade", title: "Trade-policy discussions raise questions for global manufacturing supply chains", source: "World Affairs Desk", publishedLabel: "36 min ago", summary: "Governments are assessing new measures that could reshape costs and investment decisions across major trade routes.", tags: ["Geopolitics", "Trade", "Global Economy"], whyItMatters: "Trade changes can affect inflation, corporate margins and the global growth outlook." },
    { id: "world-energy", title: "Energy-security talks keep commodity risk on the global agenda", source: "International Markets Review", publishedLabel: "3h ago", summary: "Officials are balancing supply resilience with affordability as market participants watch the next policy signals.", tags: ["World", "Energy", "Commodities"], whyItMatters: "Energy shocks can move inflation expectations and market risk sentiment quickly." },
  ] },
];

export const worthReading: MorningBriefStory[] = [
  { id: "worth-credit", title: "The quieter risks inside a more selective refinancing cycle", source: "Financial Times", publishedLabel: "Analysis", summary: "A synthetic long-form analysis prompt on how funding conditions can reshape corporate strategy.", whyItMatters: "Useful background for understanding why credit selection matters more when rates stay higher.", readTime: "7 min read", href: "https://example.com/morning-brief/worth-credit" },
  { id: "worth-vietnam", title: "What market-access reform could mean for Vietnam's next growth chapter", source: "The Economist", publishedLabel: "Explainer", summary: "A synthetic explainer on institutions, capital markets and long-term development.", whyItMatters: "Adds context to the structural factors behind Vietnam's investment case.", readTime: "9 min read", href: "https://example.com/morning-brief/worth-vietnam" },
  { id: "worth-finland", title: "Finnish industry searches for the next investment cycle", source: "Talouselämä", publishedLabel: "Long read", summary: "A synthetic background piece on exports, energy and industrial renewal.", whyItMatters: "A useful domestic lens beyond the day's headlines.", readTime: "6 min read", href: "https://example.com/morning-brief/worth-finland" },
];
