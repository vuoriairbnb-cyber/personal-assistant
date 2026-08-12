import type { GolfClub } from "./clubs.ts";

export class WiseGolfAuthRequiredError extends Error {}

export function authenticatedWiseGolfHeaders(club: GolfClub, environment: Record<string, string | undefined> = process.env): HeadersInit {
  const auth = club.playerSearch?.auth;
  const accessToken = auth ? environment[auth.envVar]?.trim() : undefined;
  if (!auth || !accessToken) throw new WiseGolfAuthRequiredError("WiseGolf authentication is required");
  return { Accept: "application/json", Authorization: `token ${accessToken}`, "x-session-type": auth.sessionType };
}
