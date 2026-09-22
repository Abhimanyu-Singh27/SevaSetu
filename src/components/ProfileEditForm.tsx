"use client";

import { FormEvent, useState } from "react";
import { Check, LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { portalText } from "@/lib/portal-i18n";

type ProfileUser = {
  role: string;
  phone: string | null;
  addresses: { label: string; addressLine: string; city: string }[];
  customerProfile: { fullName: string } | null;
  workerProfile: { fullName: string; bio: string | null; experienceYears: number; serviceRadiusKm: unknown; services: { service: { id: string } }[] } | null;
};

type AvailableService = { id: string; name: string; category: { name: string } };

export function ProfileEditForm({ user, availableServices = [], language = "en" }: { user: ProfileUser; availableServices?: AvailableService[]; language?: string }) {
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
    try {
      const response = await fetch("/api/v1/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, bio, experienceYears, serviceRadiusKm, locationLabel, addressLine, city, serviceIds }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || portalText(language, "unableSaveProfile"));
        setSaving(false);
        return;
      }
      setMessage(portalText(language, "profileSaved"));
    } catch {
      setError(portalText(language, "unableSaveProfile"));
    } finally {
      setSaving(false);
    }
    router.refresh();
  }

  return <form className="profile-edit-form" onSubmit={save}>
    <div className="profile-edit-heading"><div><span className="kicker">{portalText(language, "editProfile")}</span><h2>{portalText(language, "keepDetailsUpdated")}</h2></div><Save size={20} /></div>
    <div className="profile-edit-grid">
      <label>{portalText(language, "fullName")}<input required maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
      <label>{portalText(language, "phoneNumber")}<input inputMode="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={portalText(language, "optional")} /></label>
      {worker && <>
        <label>{portalText(language, "yearsExperience")}<input type="number" min="0" max="80" required value={experienceYears} onChange={(event) => setExperienceYears(event.target.value)} /></label>
        <label>{portalText(language, "serviceRadius")}<input type="number" min="1" max="200" step="0.5" required value={serviceRadiusKm} onChange={(event) => setServiceRadiusKm(event.target.value)} /></label>
        <label className="profile-edit-wide">{portalText(language, "bio")}<textarea maxLength={1000} rows={4} value={bio} onChange={(event) => setBio(event.target.value)} placeholder={portalText(language, "keepDetailsUpdated")} /></label>
        <fieldset className="profile-edit-wide profile-service-picker"><legend>{portalText(language, "servicesYouProvide")}</legend>{availableServices.length ? <div className="profile-service-options">{availableServices.map((service) => <label key={service.id}><input type="checkbox" checked={serviceIds.includes(service.id)} onChange={(event) => setServiceIds((current) => event.target.checked ? Array.from(new Set([...current, service.id])) : current.filter((id) => id !== service.id))} /><span>{service.name}<small>{service.category.name}</small></span></label>)}</div> : <p className="profile-edit-muted">{portalText(language, "noActiveServices")}</p>}</fieldset>
      </>}
      {user.role !== "ADMIN" && <fieldset className="profile-edit-wide profile-location-fields"><legend>{portalText(language, "serviceLocation")}</legend><div className="profile-edit-grid"><label>{portalText(language, "locationLabel")}<input maxLength={40} value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} placeholder="Home, shop, or office" /></label><label>{portalText(language, "city")}<input required={Boolean(addressLine)} maxLength={80} value={city} onChange={(event) => setCity(event.target.value)} placeholder={portalText(language, "city")} /></label><label className="profile-edit-wide">{portalText(language, "address")}<input required={Boolean(city)} maxLength={160} value={addressLine} onChange={(event) => setAddressLine(event.target.value)} placeholder={portalText(language, "address")} /></label></div></fieldset>}
    </div>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {message && <p className="profile-edit-success" role="status"><Check size={16} /> {message}</p>}
    <button className="button" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <><Save size={16} /> {portalText(language, "saveProfile")}</>}</button>
  </form>;
}
