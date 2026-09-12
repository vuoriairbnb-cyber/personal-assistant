export type ApprovedDiagnosticUser = { id: string };
export type LiveRankingDiagnosticsDependencies = { requireApprovedUser: () => Promise<{ user: ApprovedDiagnosticUser }>; buildDiagnostic: (userId: string) => Promise<unknown> };

/** Factory keeps auth/error behavior focused and testable without exposing diagnostic internals. */
export function createLiveRankingDiagnosticsGetHandler(dependencies: LiveRankingDiagnosticsDependencies) {
  return async function GET() {
    let user: ApprovedDiagnosticUser;
    try { ({ user } = await dependencies.requireApprovedUser()); }
    catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
    try { return Response.json(await dependencies.buildDiagnostic(user.id)); }
    catch { return Response.json({ error: "Morning Brief diagnostic unavailable" }, { status: 500 }); }
  };
}
