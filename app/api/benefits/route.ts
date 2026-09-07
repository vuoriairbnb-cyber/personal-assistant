import { requireApprovedUser } from "@/lib/auth/guard";
import { searchBenefits } from "@/lib/benefits";

export async function GET(request: Request) {
  try {
    const { profile } = await requireApprovedUser(); const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    const results = await searchBenefits(query, { memberPlusUnionId: profile.member_plus_union_id, memberPlusUnionName: profile.member_plus_union_name });
    return Response.json({ ok: true, results: results.slice(0, 50) });
  } catch {
    return Response.json({ ok: false, error: "Benefits are temporarily unavailable." }, { status: 503 });
  }
}
