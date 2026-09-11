import type { PortfolioAsset, PortfolioExposure } from "@/lib/morning-brief/types";

export type InitialPortfolioLens = Pick<PortfolioAsset, "name" | "slug" | "assetType" | "priority"> & { exposures: Array<Pick<PortfolioExposure, "exposureType" | "exposureKey" | "relevanceStrength">> };
const topic = (exposureKey: string): Pick<PortfolioExposure, "exposureType" | "exposureKey" | "relevanceStrength"> => ({ exposureType: "topic", exposureKey, relevanceStrength: 90 });

export const INITIAL_PORTFOLIO_LENSES: InitialPortfolioLens[] = [
  { name: "PYN Elite", slug: "pyn-elite", assetType: "fund", priority: 100, exposures: ["vietnam", "vietnam equities", "vietnam macro", "vietnam banking", "vietnam consumer", "vietnam property", "vietnam industrials", "vietnam market regulation", "vietnam fdi", "vietnam currency", "vn-index"].map(topic) },
  { name: "Evli Emerging Frontier", slug: "evli-emerging-frontier", assetType: "fund", priority: 95, exposures: ["emerging markets", "frontier markets", "market classification", "local currencies", "capital flows", "market access", "local equities"].map(topic) },
  { name: "European High Yield", slug: "european-high-yield", assetType: "credit_strategy", priority: 90, exposures: ["european high yield", "credit spreads", "refinancing", "defaults", "issuance", "ratings", "leveraged finance", "ecb", "rates", "funding costs"].map(topic) },
  { name: "Nordic High Yield", slug: "nordic-high-yield", assetType: "credit_strategy", priority: 85, exposures: ["nordic credit", "sweden", "norway", "finland", "denmark", "refinancing", "defaults", "issuance", "property", "shipping", "energy", "sponsor-backed borrowers"].map(topic) },
  { name: "Evli Nordic Secured Loan", slug: "evli-nordic-secured-loan", assetType: "loan_fund", priority: 85, exposures: ["syndicated loans", "secured loans", "senior secured loans", "leveraged loans", "private credit", "covenants", "collateral", "restructuring", "nordic corporate credit"].map(topic) },
];
