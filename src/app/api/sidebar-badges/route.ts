import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSidebarBadges } from "@/lib/sidebar-badges";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const badges = await getSidebarBadges(session.role, session.userId);
  return NextResponse.json(badges, { headers: { "Cache-Control": "private, no-store" } });
}
