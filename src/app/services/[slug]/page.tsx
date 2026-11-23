import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LocalizedDate, LocalizedText as T } from "@/components/LocalizedText";
import { PublicLanguagePicker } from "@/components/PublicLanguagePicker";
import { EmptyState, Stats, Status } from "@/components/portal/Shared";

type PriceSummary = { pricingType: string; average: number | null; pricedWorkers: number };

function PriceSummaries({ items }: { items: PriceSummary[] }) {
  const pricedItems = items.filter((item) => item.average !== null);
  if (!pricedItems.length) return <p className="portal-helper"><T>No average price is available yet. Workers can provide a quote.</T></p>;
  return <ul className="service-average-list">{pricedItems.map((item) => <li key={item.pricingType}><span><T>Average</T> <T>{item.pricingType.replaceAll("_", " ")}</T></span><strong>₹{item.average!.toLocaleString("en-IN", { maximumFractionDigits: 0 })}<small><T>{`Based on ${item.pricedWorkers} priced workers`}</T></small></strong></li>)}</ul>;
}

export default async function ServiceDetailsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{ categoryId?: string; serviceId?: string }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams ?? Promise.resolve<{ categoryId?: string; serviceId?: string }>({})]);
  const validId = (value?: string) => Boolean(value && /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value));
  const serviceSelect = { id: true, slug: true, name: true, description: true, category: { select: { name: true } } } as const;
  const serviceBySlug = await prisma.service.findFirst({ where: { slug: { equals: slug, mode: "insensitive" }, active: true, category: { active: true }, workers: { some: { worker: { user: { status: "ACTIVE" } } } } }, select: serviceSelect });
  const service = serviceBySlug || (validId(query.serviceId)
    ? await prisma.service.findFirst({ where: { id: query.serviceId, active: true, category: { active: true }, workers: { some: { worker: { user: { status: "ACTIVE" } } } } }, select: serviceSelect })
    : null);
  const listedService = { active: true, workers: { some: { worker: { user: { status: "ACTIVE" as const } } } } };
  const categorySelect = { id: true, name: true, description: true, services: { where: listedService, select: { id: true, slug: true, name: true, description: true } } } as const;
  const categoryBySlug = service ? null : await prisma.serviceCategory.findFirst({ where: { slug: { equals: slug, mode: "insensitive" }, active: true, services: { some: listedService } }, select: categorySelect });
  const category = categoryBySlug || (!service && validId(query.categoryId)
    ? await prisma.serviceCategory.findFirst({ where: { id: query.categoryId, active: true, services: { some: listedService } }, select: categorySelect })
    : null);
  if (!service && !category) notFound();

  const services = service ? [{ id: service.id, slug: service.slug, name: service.name, description: service.description }] : category!.services;
  const serviceIds = services.map((item) => item.id);
  const scope = { user: { status: "ACTIVE" as const }, services: { some: { serviceId: { in: serviceIds } } } };
  const [workers, total, available, verified, pricingGroups] = await Promise.all([
    prisma.workerProfile.findMany({ where: scope, orderBy: [{ ratingAverage: "desc" }, { ratingCount: "desc" }], take: 24, select: { id: true, fullName: true, availability: true, verificationStatus: true, ratingAverage: true, ratingCount: true, services: { where: { serviceId: { in: serviceIds } }, select: { id: true, price: true, pricingType: true, description: true, service: { select: { id: true, name: true } } } }, createdAt: true } }),
    prisma.workerProfile.count({ where: scope }),
    prisma.workerProfile.count({ where: { ...scope, availability: "AVAILABLE" } }),
    prisma.workerProfile.count({ where: { ...scope, verificationStatus: "VERIFIED" } }),
    prisma.workerService.groupBy({ by: ["serviceId", "pricingType"], where: { serviceId: { in: serviceIds }, worker: { availability: "AVAILABLE", user: { status: "ACTIVE" } } }, _avg: { price: true }, _count: { _all: true, price: true } }),
  ]);

  const pricesByService = new Map<string, PriceSummary[]>();
  const availableByService = new Map<string, number>();
  for (const row of pricingGroups) {
    const prices = pricesByService.get(row.serviceId) || [];
    prices.push({ pricingType: row.pricingType, average: row._avg.price === null ? null : Number(row._avg.price), pricedWorkers: row._count.price });
    pricesByService.set(row.serviceId, prices);
    availableByService.set(row.serviceId, (availableByService.get(row.serviceId) || 0) + row._count._all);
  }

  const serviceList = services.map((item) => ({ ...item, availableWorkers: availableByService.get(item.id) || 0, prices: pricesByService.get(item.id) || [] }));
  const requestLink = `/customer/services${service ? `?service=${service.id}` : ""}`;
  return <main className="state-page"><div className="auth-language"><PublicLanguagePicker /></div><section className="public-service-workspace">
    <Link className="back-link" href="/#services"><T>Back to services</T></Link>
    <header className="workspace-heading"><div><span className="kicker"><T>{service?.category.name || "SevaSetu service"}</T></span><h1><T>{service?.name || category!.name}</T></h1>{(service?.description || category?.description) && <p><T>{service?.description || category!.description}</T></p>}</div></header>
    <Stats items={service ? [{ label: "Professionals listed", value: total }, { label: "Available workers", value: available }, { label: "Verified professionals", value: verified }] : [{ label: "Professionals listed", value: total }, { label: "Available workers", value: available }, { label: "Services in this category", value: services.length }]} />
    {service && <section className="service-average-panel"><h2><T>Average prices from available workers</T></h2><p><T>Averages use current prices from active workers and are grouped by pricing model. Quote-only listings are not included.</T></p><PriceSummaries items={pricesByService.get(service.id) || []} /></section>}
    {category && <section className="service-catalog-section"><h2><T>Services in this category</T></h2><div className="service-catalog-grid">{serviceList.map((item) => <article className="service-catalog-card" key={item.id}><div><h3><T>{item.name}</T></h3>{item.description && <p><T>{item.description}</T></p>}</div><p className="service-catalog-availability"><strong>{item.availableWorkers}</strong> <T>available workers</T></p><PriceSummaries items={item.prices} /><Link className="outline-button" href={`/services/${encodeURIComponent(item.slug)}?serviceId=${encodeURIComponent(item.id)}`}><T>View details</T></Link></article>)}</div></section>}
    {workers.length ? <><h2><T>{service ? "Professionals for this service" : "Professionals in this category"}</T></h2><div className="portal-professional-grid">{workers.map((worker) => <article className="portal-record-card" key={worker.id}><header><div><h2>{worker.fullName}</h2><p><T>{worker.verificationStatus === "VERIFIED" ? "Verified professional" : "Verification not approved"}</T></p></div><Status value={worker.availability} /></header><p>★ {Number(worker.ratingAverage).toFixed(1)} ({worker.ratingCount} <T>reviews</T>)</p><ul className="portal-offering-list">{worker.services.map((offering) => <li key={offering.id}><T>{offering.service.name}</T><span>{offering.price !== null ? `₹${Number(offering.price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : <T>Request quote</T>} · <T>{offering.pricingType}</T></span></li>)}</ul><div className="portal-actions"><Link className="outline-button" href={`/professionals/${worker.id}`}><T>View profile</T></Link><Link className="button" href={`/customer/services?worker=${worker.id}`}><T>Request service</T></Link></div><small><T>Member since</T> <LocalizedDate value={worker.createdAt} /></small></article>)}</div></> : <EmptyState title="No professionals are listed for this service yet." description="You can submit a request for an administrator to assign when a suitable professional becomes available." href={requestLink} action="Request service" />}
    <p className="portal-helper"><T>Availability and final pricing are confirmed with the professional before work begins.</T></p><Link className="outline-button" href={requestLink}><T>Search all matching professionals</T></Link>
  </section></main>;
}
