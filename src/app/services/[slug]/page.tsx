import Link from "next/link";
import { ArrowLeft, BadgeCheck, Clock3, MapPin, Star, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ServiceDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await prisma.service.findFirst({
    where: { slug, active: true },
    include: {
      category: true,
      workers: {
        where: { worker: { user: { status: "ACTIVE" } } },
        include: { worker: { include: { user: { select: { phone: true } }, reviews: { select: { rating: true, body: true }, orderBy: { createdAt: "desc" }, take: 3 } } } },
        orderBy: { worker: { ratingAverage: "desc" } },
      },
    },
  });
  if (!service) notFound();

  const prices = service.workers.map((worker) => worker.price).filter((price): price is NonNullable<typeof price> => price !== null).map(Number);
  const lowestPrice = prices.length ? Math.min(...prices) : null;
  const highestPrice = prices.length ? Math.max(...prices) : null;

  return <main className="auth-page"><section className="auth-card service-details-page"><Link className="back-link" href="/#services"><ArrowLeft size={15} /> Back to services</Link><div className="auth-intro"><span className="portal-icon"><BadgeCheck size={19} /></span><span className="kicker">{service.category.name}</span><h1>{service.name}</h1><p>{service.description || `Book trusted professionals for ${service.name.toLowerCase()} through SevaSetu.`}</p></div><div className="workspace-stats"><div><strong>{service.workers.length}</strong><span><Users size={13} /> Professionals</span></div><div><strong>{lowestPrice ? `₹${lowestPrice}` : "Quote"}</strong><span>Starting price</span></div><div><strong>{highestPrice ? `₹${highestPrice}` : "Flexible"}</strong><span>Highest listed price</span></div></div><section className="profile-details"><h2>What professionals provide</h2><p>Depending on the worker, this service may include assessment, preparation, the main work, cleanup, and practical recommendations for maintaining the result.</p><div className="service-detail-points"><span>✓ Clear pricing before work starts</span><span>✓ Verified local professionals</span><span>✓ Customer ratings and feedback</span><span>✓ Schedule based on availability</span></div></section><section className="profile-details"><h2>Professionals for this service</h2>{service.workers.length ? <div className="reference-list">{service.workers.map((offering) => <div className="reference-list-row" key={offering.workerId}><span className="mini-avatar">{offering.worker.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><strong>{offering.worker.fullName}</strong><small>{offering.description || `${offering.pricingType.replaceAll("_", " ")} · ${offering.worker.completedJobs} completed jobs`} · {offering.worker.user.phone || "Contact after request"}</small><small><Star size={12} fill="currentColor" /> {String(offering.worker.ratingAverage)} ({offering.worker.ratingCount} ratings) · <MapPin size={12} /> {offering.worker.serviceRadiusKm ? `${offering.worker.serviceRadiusKm} km coverage` : "Local coverage"}</small></div><span className="status-pill">{offering.price ? `₹${String(offering.price)}` : "Quote"}</span></div>)}</div> : <p>No professionals are listed for this service yet.</p>}</section><section className="profile-details"><h2>Typical timing</h2><p><Clock3 size={14} /> Most requests receive a response after a professional reviews the job details, preferred date, location, and budget.</p></section><Link className="button auth-submit" href="/register">Create an account to request this service <ArrowLeft size={17} className="rotate-180" /></Link></section></main>;
}