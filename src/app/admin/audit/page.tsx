import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminAuditPage() { await requireSession(["ADMIN"]); const entries = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { email: true, role: true } } } }); return <main className="state-page"><section className="state-panel" style={{ maxWidth: 1100, textAlign: "left" }}><Link className="back-link" href="/admin">Dashboard</Link><span className="kicker">Admin workspace</span><h1>Audit logs</h1><div className="workspace-table">{entries.map((entry) => <div className="workspace-row" key={entry.id}><div><strong>{entry.action}</strong><small>{entry.actor.email} · {entry.actor.role} · {entry.targetType}:{entry.targetId}</small></div><span>{entry.createdAt.toLocaleString("en-IN")}</span></div>)}</div></section></main>; }
