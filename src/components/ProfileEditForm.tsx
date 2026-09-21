"use client";

import { FormEvent, useState } from "react";
import { Check, LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";

type ProfileUser = {
  role: string;
  phone: string | null;
  addresses: { label: string; addressLine: string; city: string }[];
  customerProfile: { fullName: string } | null;
  workerProfile: { fullName: string; bio: string | null; experienceYears: number; serviceRadiusKm: unknown; services: { service: { id: string } }[] } | null;
};

type AvailableService = { id: string; name: string; category: { name: string } };

export function ProfileEditForm({ user, availableServices = [] }: { user: ProfileUser; availableServices?: AvailableService[] }) {
  const router = useRouter();
  const worker = user.role === "WORKER";
  const [fullName, setFullName] = useState(user.workerProfile?.fullName || user.customerProfile?.fullName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [bio, setBio] = useState(user.workerProfile?.bio || "");
  const [experienceYears, setExperienceYears] = useState(String(user.workerProfile?.experienceYears ?? 0));
  const [serviceRadiusKm, setServiceRadiusKm] = useState(String(user.workerProfile?.serviceRadiusKm ?? 10));
  const [locationLabel, setLocationLabel] = useState(user.addresses[0]?.label || "Primary location");
  const [addressLine, setAddressLine] = useState(user.addresses[0]?.addressLine || "");
  const [city, setCity] = useState(user.addresses[0]?.city || "");
  const [serviceIds, setServiceIds] = useState(user.workerProfile?.services.map((item) => item.service.id) || []);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const response = await fetch("/api/v1/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone, bio, experienceYears, serviceRadiusKm, locationLabel, addressLine, city, serviceIds }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || "Unable to save your profile");
      setSaving(false);
      return;
    }
    setMessage("Profile saved");
    setSaving(false);
    router.refresh();
  }

  return <form className="profile-edit-form" onSubmit={save}>
    <div className="profile-edit-heading"><div><span className="kicker">Edit profile</span><h2>Keep your details up to date</h2></div><Save size={20} /></div>
    <div className="profile-edit-grid">
      <label>Full name<input required maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
      <label>Phone number<input inputMode="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" /></label>
      {worker && <>
        <label>Years of experience<input type="number" min="0" max="80" required value={experienceYears} onChange={(event) => setExperienceYears(event.target.value)} /></label>
        <label>Service radius (km)<input type="number" min="1" max="200" step="0.5" required value={serviceRadiusKm} onChange={(event) => setServiceRadiusKm(event.target.value)} /></label>
        <label className="profile-edit-wide">Bio<textarea maxLength={1000} rows={4} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Tell customers about your experience and services" /></label>
        <fieldset className="profile-edit-wide profile-service-picker"><legend>Services you provide</legend>{availableServices.length ? <div className="profile-service-options">{availableServices.map((service) => <label key={service.id}><input type="checkbox" checked={serviceIds.includes(service.id)} onChange={(event) => setServiceIds((current) => event.target.checked ? [...current, service.id] : current.filter((id) => id !== service.id))} /><span>{service.name}<small>{service.category.name}</small></span></label>)}</div> : <p className="profile-edit-muted">No active services are available yet.</p>}</fieldset>
      </>}
      {user.role !== "ADMIN" && <fieldset className="profile-edit-wide profile-location-fields"><legend>Service location</legend><div className="profile-edit-grid"><label>Location label<input maxLength={40} value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} placeholder="Home, shop, or office" /></label><label>City<input required={Boolean(addressLine)} maxLength={80} value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" /></label><label className="profile-edit-wide">Address<input required={Boolean(city)} maxLength={160} value={addressLine} onChange={(event) => setAddressLine(event.target.value)} placeholder="Street, area, or landmark" /></label></div></fieldset>}
    </div>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {message && <p className="profile-edit-success" role="status"><Check size={16} /> {message}</p>}
    <button className="button" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <><Save size={16} /> Save profile</>}</button>
  </form>;
}
