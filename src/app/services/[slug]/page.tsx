import Link from "next/link";
import { ArrowLeft, BadgeCheck, Clock3, MapPin, Star, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const fallbackServices: Record<string, { name: string; description: string; points: string[] }> = {
  "home-repairs": { name: "Home repairs", description: "Reliable help for electrical, plumbing, appliance, and everyday household repairs.", points: ["Electrical and plumbing support", "Appliance and fixture repairs", "Clear pricing before work starts", "Verified local professionals"] },
  cleaning: { name: "Cleaning", description: "Dependable cleaning professionals for homes, kitchens, move-outs, and more.", points: ["Routine and deep cleaning", "Kitchen and move-out cleaning", "Flexible scheduling", "Customer ratings and feedback"] },
  "moving-delivery": { name: "Moving & delivery", description: "Careful local help for moving, loading, unloading, and delivery jobs.", points: ["Loading and unloading", "Local delivery support", "Careful handling of belongings", "Upfront service details"] },
  construction: { name: "Construction", description: "Skilled professionals for carpentry, painting, masonry, and improvement work.", points: ["Carpentry and masonry", "Painting and finishing", "Practical job assessments", "Experienced local workers"] },
  "garden-care": { name: "Garden care", description: "Keep outdoor spaces healthy and welcoming with dependable garden care.", points: ["Garden maintenance", "Plant and outdoor care", "Seasonal cleanup", "Local availability"] },
  "pest-control": { name: "Pest control", description: "Get help addressing common household and outdoor pest concerns safely.", points: ["Home pest inspections", "Targeted treatment planning", "Safety-conscious service", "Clear recommendations"] },
  "car-wash": { name: "Car wash", description: "Convenient vehicle cleaning from local professionals prepared for the job.", points: ["Exterior cleaning", "Interior care", "At-home convenience", "Flexible appointment times"] },
  "event-help": { name: "Event help", description: "Reliable extra hands for setup, serving, coordination, and special occasions.", points: ["Event setup assistance", "Serving and coordination", "Flexible support", "Dependable local help"] },
};

export default async function ServiceDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await prisma.service.findFirst({
    where: { OR: [{ slug }, { category: { slug } }], active: true },
    include: {
      category: true,
      workers: {
        where: { worker: { user: { status: "ACTIVE" } } },
        include: { worker: { include: { user: { select: { phone: true } }, reviews: { select: { rating: true, body: true }, orderBy: { createdAt: "desc" }, take: 3 } } } },
        orderBy: { worker: { ratingAverage: "desc" } },
      },
    },
  }).catch((error) => {
    console.error("Public service lookup failed", error);
    return null;
  });
  if (!service) {
    const fallback = fallbackServices[slug];
    if (!fallback) notFound();
    return <main className="auth-page"><section className="auth-card service-details-page"><Link className="back-link" href="/#services"><ArrowLeft size={15} /> Back to services</Link><div className="auth-intro"><span className="portal-icon"><BadgeCheck size={19} /></span><span className="kicker">SevaSetu service</span><h1>{fallback.name}</h1><p>{fallback.description}</p></div><div className="workspace-stats"><div><strong>0</strong><span><Users size={13} /> Professionals listed</span></div><div><strong>Quote</strong><span>Starting price</span></div><div><strong>Flexible</strong><span>Schedule</span></div></div><section className="profile-details"><h2>What to expect</h2><p>Share your requirements, preferred timing, and location. A suitable professional can review the job and confirm the details before work begins.</p><div className="service-detail-points">{fallback.points.map((point) => <span key={point}>✓ {point}</span>)}</div></section><section className="profile-details"><h2>Professionals are joining this service</h2><p>No profiles are listed yet. Create an account to describe your job and receive updates when local help becomes available.</p></section><Link className="button auth-submit" href="/register">Create an account to request this service <ArrowLeft size={17} className="rotate-180" /></Link></section></main>;
  }

  const prices = service.workers.map((worker) => worker.price).filter((price): price is NonNullable<typeof price> => price !== null).map(Number);
  const lowestPrice = prices.length ? Math.min(...prices) : null;
  const highestPrice = prices.length ? Math.max(...prices) : null;

  return <main className="auth-page"><section className="auth-card service-details-page"><Link className="back-link" href="/#services"><ArrowLeft size={15} /> Back to services</Link><div className="auth-intro"><span className="portal-icon"><BadgeCheck size={19} /></span><span className="kicker">{service.category.name}</span><h1>{service.name}</h1><p>{service.description || `Book trusted professionals for ${service.name.toLowerCase()} through SevaSetu.`}</p></div><div className="workspace-stats"><div><strong>{service.workers.length}</strong><span><Users size={13} /> Professionals</span></div><div><strong>{lowestPrice ? `₹${lowestPrice}` : "Quote"}</strong><span>Starting price</span></div><div><strong>{highestPrice ? `₹${highestPrice}` : "Flexible"}</strong><span>Highest listed price</span></div></div><section className="profile-details"><h2>What professionals provide</h2><p>Depending on the worker, this service may include assessment, preparation, the main work, cleanup, and practical recommendations for maintaining the result.</p><div className="service-detail-points"><span>✓ Clear pricing before work starts</span><span>✓ Verified local professionals</span><span>✓ Customer ratings and feedback</span><span>✓ Schedule based on availability</span></div></section><section className="profile-details"><h2>Professionals for this service</h2>{service.workers.length ? <div className="reference-list">{service.workers.map((offering) => <div className="reference-list-row" key={offering.workerId}><span className="mini-avatar">{offering.worker.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><strong>{offering.worker.fullName}</strong><small>{offering.description || `${offering.pricingType.replaceAll("_", " ")} · ${offering.worker.completedJobs} completed jobs`} · {offering.worker.user.phone || "Contact after request"}</small><small><Star size={12} fill="currentColor" /> {String(offering.worker.ratingAverage)} ({offering.worker.ratingCount} ratings) · <MapPin size={12} /> {offering.worker.serviceRadiusKm ? `${offering.worker.serviceRadiusKm} km coverage` : "Local coverage"}</small></div><span className="status-pill">{offering.price ? `₹${String(offering.price)}` : "Quote"}</span></div>)}</div> : <p>No professionals are listed for this service yet.</p>}</section><section className="profile-details"><h2>Typical timing</h2><p><Clock3 size={14} /> Most requests receive a response after a professional reviews the job details, preferred date, location, and budget.</p></section><Link className="button auth-submit" href="/register">Create an account to request this service <ArrowLeft size={17} className="rotate-180" /></Link></section></main>;
}