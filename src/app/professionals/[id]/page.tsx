import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, MapPin, Phone, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function WorkerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const worker = await prisma.workerProfile.findFirst({
    where: { id, user: { status: "ACTIVE" } },
    include: {
      services: { include: { service: true } },
      user: { select: { phone: true } },
      reviews: { select: { rating: true, body: true, quality: true, behaviour: true, punctuality: true, communication: true, value: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!worker) notFound();

  return <main className="auth-page"><section className="auth-card"><Link className="back-link" href="/#professionals"><ArrowLeft size={15} /> Back to professionals</Link><div className="auth-intro"><span className="portal-icon"><BadgeCheck size={19} /></span><span className="kicker">Verified professional</span><h1>{worker.fullName}</h1><p>{worker.bio || "A trusted SevaSetu professional ready to help."}</p></div><div className="workspace-stats"><div><strong>{String(worker.ratingAverage)}</strong><span><Star size={13} /> Rating ({worker.ratingCount})</span></div><div><strong>{worker.completedJobs}</strong><span>Completed jobs</span></div><div><strong>{worker.availability}</strong><span>Availability</span></div></div><div className="profile-details"><h2>Contact and background</h2><dl><div><dt><Phone size={13} /> Mobile</dt><dd>{worker.user.phone ? <a href={`tel:${worker.user.phone}`}>{worker.user.phone}</a> : "Available after request"}</dd></div><div><dt>Experience</dt><dd>{worker.experienceYears} years</dd></div><div><dt>Verification</dt><dd>{worker.verificationStatus}</dd></div></dl></div><section className="profile-details"><h2>Services and pricing</h2><div className="reference-list">{worker.services.map((item) => <div className="reference-list-row" key={item.serviceId}><span><MapPin size={14} /></span><div><strong>{item.service.name}</strong><small>{item.description || item.pricingType.replaceAll("_", " ")}</small></div><span className="status-pill">{item.price ? `₹${String(item.price)}` : "Quote"}</span></div>)}</div></section><section className="profile-details"><h2>Past ratings and feedback</h2>{worker.reviews.length ? <div className="reference-list">{worker.reviews.map((review) => <div className="reference-list-row" key={review.createdAt.toISOString()}><span><Star size={14} fill="currentColor" /></span><div><strong>{review.rating}/5</strong><small>{review.body || "Customer left a rating without written feedback."}</small></div><span className="status-pill">{review.createdAt.toLocaleDateString("en-IN")}</span></div>)}</div> : <p>No customer ratings yet.</p>}</section><Link className="button auth-submit" href="/register">Create an account to request service <ArrowLeft size={17} className="rotate-180" /></Link></section></main>;
}