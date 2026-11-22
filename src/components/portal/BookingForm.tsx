"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LocalizedText as T } from "@/components/LocalizedText";
import { Feedback, SubmitButton, usePortalMutation } from "./Actions";

export type BookableService = { id: string; name: string };
export function BookingForm({ services, workerId, initialLocation = "" }: { services: BookableService[]; workerId?: string; initialLocation?: string }) {
  const mutation = usePortalMutation(); const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(initialLocation);
  const [date, setDate] = useState(""); const [budget, setBudget] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await mutation.run("/api/v1/requests", { serviceId, workerId, description, locationLabel: location, ...(date ? { preferredDate: new Date(date).toISOString() } : {}), ...(budget ? { budget: Number(budget) } : {}) }, "POST", "Request sent.")) router.push("/customer/requests");
  }
  if (!services.length) return null;
  return <div className="portal-booking"><button type="button" className="button" aria-expanded={open} onClick={() => setOpen(!open)}><T>{open ? "Close booking form" : "Request service"}</T></button>{open && <form className="portal-inline-form" onSubmit={submit}><h3><T>Tell us about the job</T></h3><label><T>Service</T><select required value={serviceId} onChange={(event) => setServiceId(event.target.value)}>{services.map((service) => <option value={service.id} key={service.id}><T>{service.name}</T></option>)}</select></label><label><T>Job details</T><textarea required minLength={10} maxLength={2000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label><label><T>Service address or area</T><input required maxLength={120} value={location} onChange={(event) => setLocation(event.target.value)} /></label><label><T>Preferred date and time</T><input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} /></label><label><T>Budget (₹, optional)</T><input type="number" min="0" max="10000000" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} /></label><p className="portal-helper"><T>The worker will confirm availability and pricing before work begins.</T></p><SubmitButton busy={mutation.busy}>Send request</SubmitButton><Feedback {...mutation} /></form>}</div>;
}
