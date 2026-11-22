import Link from "next/link";
import { Inbox } from "lucide-react";
import { LocalizedNav, LocalizedText as T } from "@/components/LocalizedText";
import type { PortalQuery } from "@/lib/portal-config";

export function EmptyState({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return <div className="portal-empty"><Inbox size={30} aria-hidden="true" /><h2><T>{title}</T></h2><p><T>{description}</T></p>{href && action && <Link className="button" href={href}><T>{action}</T></Link>}</div>;
}
export function Stats({ items }: { items: { label: string; value: string | number; href?: string }[] }) {
  return <div className="portal-summary-grid">{items.map((item) => <article className="portal-summary-card" key={item.label}><span><T>{item.label}</T></span><strong>{item.value}</strong>{item.href && <Link href={item.href}><T>View details</T> →</Link>}</article>)}</div>;
}
export function Pagination({ total, page, pageSize, base, query = {} }: { total: number; page: number; pageSize: number; base: string; query?: PortalQuery }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (number: number) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (typeof value === "string" && value && key !== "page") params.set(key, value); params.set("page", String(number)); return `${base}?${params}`; };
  return <LocalizedNav className="portal-pagination" aria-label="Pagination"><span><T>Page</T> {page} / {pages} · {total} <T>records</T></span><div className="portal-actions">{page > 1 && <Link className="outline-button" href={href(page - 1)}><T>Previous</T></Link>}{page < pages && <Link className="outline-button" href={href(page + 1)}><T>Next</T></Link>}</div></LocalizedNav>;
}
export function Status({ value }: { value: string }) { return <span className={`status-pill portal-status status-${value.toLowerCase().replaceAll("_", "-")}`}><T>{value}</T></span>; }
