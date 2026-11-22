"use client";

import { LocalizedDate, LocalizedText } from "@/components/LocalizedText";

import { useState } from "react";

type UserDetails = {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt?: string | null;
  role: string;
  status: string;
  joinedAt: string;
  requests: number;
  completed: number;
  serviceLocations: number;
  addresses: number;
  uploadedFiles: number;
  reviews: number;
  reports: number;
  worker?: {
    verificationStatus: string;
    availability: string;
    completedJobs: number;
    rating: string;
    ratingCount: number;
    serviceRadiusKm: string;
  };
  rawRequests?: { id: string; status: string }[];
  counts?: Record<string, number>;
  locationCount?: number;
  rawAddresses?: { id: string }[];
  rawReviews?: { id: string }[];
  receivedReports?: { id: string }[];
  _count?: { financialEntries: number; fraudSignals: number; auditEvents: number; conversationMemberships: number; locationEvents: number };
  customerProfile?: { fullName: string } | null;
  workerProfile?: { fullName: string; verificationStatus: string; availability: string; completedJobs: number; ratingAverage: string | number; ratingCount: number; serviceRadiusKm: string | number | null } | null;
};

export function AdminUserDetailsButton({ userId }: { userId: string }) {
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function toggleDetails() {
    if (details) {
      setDetails(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to load account details");
      const data = result.data;
      const profile = data.workerProfile;
      setDetails({
        id: data.id,
        name: data.displayName || data.customerProfile?.fullName || profile?.fullName || data.email,
        email: data.email,
        role: data.role,
        status: data.status,
        joinedAt: data.createdAt,
        requests: data.requests?.length || 0,
        completed: data.counts?.COMPLETED || 0,
        serviceLocations: data.locationCount || 0,
        addresses: data.addresses?.length || 0,
        uploadedFiles: 0,
        reviews: data.reviews?.length || 0,
        reports: data.receivedReports?.length || 0,
        worker: profile ? {
          verificationStatus: profile.verificationStatus,
          availability: profile.availability,
          completedJobs: profile.completedJobs,
          rating: String(profile.ratingAverage),
          ratingCount: profile.ratingCount,
          serviceRadiusKm: profile.serviceRadiusKm == null ? "Not set" : String(profile.serviceRadiusKm),
        } : undefined,
      });
    } catch (detailsError) {
      setError(detailsError instanceof Error ? detailsError.message : "Unable to load account details");
    } finally {
      setLoading(false);
    }
  }

  return <><button className="outline-button" type="button" onClick={toggleDetails} disabled={loading}><LocalizedText>{loading ? "Loading..." : details ? "Hide details" : "View details"}</LocalizedText></button>{error && <small className="auth-error" role="alert"><LocalizedText>{error}</LocalizedText></small>}{details && <div className="profile-details admin-inline-details"><h2>{details.name}</h2><p>{details.email} · <LocalizedText>{details.role}</LocalizedText> · <LocalizedText>{details.status}</LocalizedText><LocalizedText>{" · Joined "}</LocalizedText><LocalizedDate value={new Date(details.joinedAt)} /></p><div className="workspace-stats"><div><strong><LocalizedText>{details.requests}</LocalizedText></strong><span><LocalizedText>{"Total requests"}</LocalizedText></span></div><div><strong><LocalizedText>{details.completed}</LocalizedText></strong><span><LocalizedText>{"Completed"}</LocalizedText></span></div><div><strong><LocalizedText>{details.serviceLocations}</LocalizedText></strong><span><LocalizedText>{"Service locations"}</LocalizedText></span></div><div><strong><LocalizedText>{details.addresses}</LocalizedText></strong><span><LocalizedText>{"Saved addresses"}</LocalizedText></span></div><div><strong><LocalizedText>{details.reviews}</LocalizedText></strong><span><LocalizedText>{"Reviews"}</LocalizedText></span></div><div><strong><LocalizedText>{details.reports}</LocalizedText></strong><span><LocalizedText>{"Reports"}</LocalizedText></span></div></div>{details.worker && <p><LocalizedText>{"Verification: "}</LocalizedText><LocalizedText>{details.worker.verificationStatus}</LocalizedText><LocalizedText>{" · Availability: "}</LocalizedText><LocalizedText>{details.worker.availability}</LocalizedText><LocalizedText>{" · Completed jobs: "}</LocalizedText>{details.worker.completedJobs}<LocalizedText>{" · Rating: "}</LocalizedText>{details.worker.rating} ({details.worker.ratingCount}<LocalizedText>{") · Radius: "}</LocalizedText><LocalizedText>{details.worker.serviceRadiusKm}</LocalizedText><LocalizedText>{" km"}</LocalizedText></p>}</div>}</>;
}
