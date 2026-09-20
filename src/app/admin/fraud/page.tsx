import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminActionButton } from "@/components/AdminActionButton";

export default async function AdminFraudPage() { await requireSession(["ADMIN"]); const signals = await prisma.fraudSignal.findMany({ where: { status: "OPEN" }, orderBy: [{ score: "desc" }, { createdAt: "desc" }], take: 100 }); return <main className="state-page"><section className="state-panel" style={{ maxWidth: 1100, textAlign: "left" }}><Link className="back-link" href="/admin">Dashboard</Link><span className="kicker">Admin workspace</span><h1>Fraud signals</h1><div className="workspace-table">{signals.length ? signals.map((signal) => <div className="workspace-row" key={signal.id}><div><strong>Score {signal.score}</strong><small>{signal.reason} · {signal.fingerprint} · {signal.createdAt.toLocaleString("en-IN")}</small></div><AdminActionButton endpoint="/api/v1/admin/fraud" id={signal.id} status="REVIEWED" label="Review" /></div>) : <p>No open fraud signals.</p>}</div></section></main>; }
