import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminBroadcastForm } from "@/components/AdminBroadcastForm";

export default async function AdminBroadcastsPage() { await requireSession(["ADMIN"]); const broadcasts = await prisma.broadcast.findMany({ orderBy: { createdAt: "desc" }, take: 50 }); return <main className="state-page"><section className="state-panel" style={{ maxWidth: 1100, textAlign: "left" }}><Link className="back-link" href="/admin">Dashboard</Link><span className="kicker">Admin workspace</span><h1>Broadcasts</h1><AdminBroadcastForm /><div className="workspace-table">{broadcasts.map((broadcast) => <div className="workspace-row" key={broadcast.id}><div><strong>{broadcast.title}</strong><small>{broadcast.body} · {broadcast.audienceRole || "All users"}</small></div><span>{broadcast.createdAt.toLocaleString("en-IN")}</span></div>)}</div></section></main>; }
