"use client";

import { LocalizedInput, LocalizedText, LocalizedTextarea } from "@/components/LocalizedText";

import { useLanguage } from "@/components/LanguageProvider";

import { FormEvent, useState } from "react";
import { Check, LoaderCircle, Save, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { portalText, translateText } from "@/lib/portal-i18n";

type ProfileUser = {
  displayName?: string | null;
  role: string;
  phone: string | null;
  addresses: { label: string; addressLine: string; city: string }[];
  customerProfile: { fullName: string } | null;
  workerProfile: { fullName: string; bio: string | null; experienceYears: number; serviceRadiusKm: unknown; services: { service: { id: string } }[] } | null;
};

type AvailableService = { id: string; name: string; category: { name: string } };

export function ProfileEditForm({ user, availableServices = [] }: { user: ProfileUser; availableServices?: AvailableService[]; language?: string }) {
  const { language } = useLanguage();
  const router = useRouter();
  const worker = user.role === "WORKER";
  const [fullName, setFullName] = useState(user.displayName || user.workerProfile?.fullName || user.customerProfile?.fullName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [bio, setBio] = useState(user.workerProfile?.bio || "");
  const [experienceYears, setExperienceYears] = useState(String(user.workerProfile?.experienceYears ?? 0));
  const [serviceRadiusKm, setServiceRadiusKm] = useState(String(user.workerProfile?.serviceRadiusKm ?? 10));
  const [locationLabel, setLocationLabel] = useState(user.addresses[0]?.label || portalText(language, "primaryLocation"));
  const [addressLine, setAddressLine] = useState(user.addresses[0]?.addressLine || "");
  const [city, setCity] = useState(user.addresses[0]?.city || "");
  const [serviceIds, setServiceIds] = useState(user.workerProfile?.services.map((item) => item.service.id) || []);
  const [serviceSearch, setServiceSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const filteredServices = availableServices.filter((service) => `${service.name} ${service.category.name} ${translateText(language, service.name)} ${translateText(language, service.category.name)}`.toLowerCase().includes(serviceSearch.trim().toLowerCase()));

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
    <div className="profile-edit-heading"><div><span className="kicker"><LocalizedText>{portalText(language, "editProfile")}</LocalizedText></span><h2><LocalizedText>{portalText(language, "keepDetailsUpdated")}</LocalizedText></h2></div><Save size={20} /></div>
    <div className="profile-edit-grid">
      <label><LocalizedText>{portalText(language, "fullName")}</LocalizedText><input required maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
      <label><LocalizedText>{portalText(language, "phoneNumber")}</LocalizedText><LocalizedInput inputMode="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={portalText(language, "optional")} /></label>
      {worker && <>
        <label><LocalizedText>{portalText(language, "yearsExperience")}</LocalizedText><input type="number" min="0" max="80" required value={experienceYears} onChange={(event) => setExperienceYears(event.target.value)} /></label>
        <label><LocalizedText>{portalText(language, "serviceRadius")}</LocalizedText><input type="number" min="1" max="200" step="0.5" required value={serviceRadiusKm} onChange={(event) => setServiceRadiusKm(event.target.value)} /></label>
        <label className="profile-edit-wide"><LocalizedText>{portalText(language, "bio")}</LocalizedText><LocalizedTextarea maxLength={1000} rows={4} value={bio} onChange={(event) => setBio(event.target.value)} placeholder={portalText(language, "keepDetailsUpdated")} /></label>
        <fieldset className="profile-edit-wide profile-service-picker"><legend><LocalizedText>{portalText(language, "servicesYouProvide")}</LocalizedText></legend>{availableServices.length ? <>
          <div className="profile-service-toolbar">
            <label className="profile-service-search"><Search size={16} aria-hidden="true" /><span className="sr-only"><LocalizedText>{portalText(language, "searchServices")}</LocalizedText></span><LocalizedInput type="search" value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder={portalText(language, "searchServicesProfile")} /></label>
            <span className="profile-service-count" aria-live="polite"><LocalizedText>{portalText(language, "selectedServicesCount", { count: serviceIds.length })}</LocalizedText></span>
          </div>
          {filteredServices.length ? <div className="profile-service-options">{filteredServices.map((service) => <label key={service.id}><input type="checkbox" checked={serviceIds.includes(service.id)} onChange={(event) => setServiceIds((current) => event.target.checked ? Array.from(new Set([...current, service.id])) : current.filter((id) => id !== service.id))} /><span><LocalizedText>{service.name}</LocalizedText><small><LocalizedText>{service.category.name}</LocalizedText></small></span></label>)}</div> : <p className="profile-edit-muted" role="status"><LocalizedText>{portalText(language, "noMatchingServices")}</LocalizedText></p>}
        </> : <p className="profile-edit-muted"><LocalizedText>{portalText(language, "noActiveServices")}</LocalizedText></p>}</fieldset>
      </>}
      {user.role !== "ADMIN" && <fieldset className="profile-edit-wide profile-location-fields"><legend><LocalizedText>{portalText(language, "serviceLocation")}</LocalizedText></legend><div className="profile-edit-grid"><label><LocalizedText>{portalText(language, "locationLabel")}</LocalizedText><LocalizedInput maxLength={40} value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} placeholder="Home, shop, or office" /></label><label><LocalizedText>{portalText(language, "city")}</LocalizedText><LocalizedInput required={Boolean(addressLine)} maxLength={80} value={city} onChange={(event) => setCity(event.target.value)} placeholder={portalText(language, "city")} /></label><label className="profile-edit-wide"><LocalizedText>{portalText(language, "address")}</LocalizedText><LocalizedInput required={Boolean(city)} maxLength={160} value={addressLine} onChange={(event) => setAddressLine(event.target.value)} placeholder={portalText(language, "address")} /></label></div></fieldset>}
    </div>
    {error && <p className="auth-error" role="alert"><LocalizedText>{error}</LocalizedText></p>}
    {message && <p className="profile-edit-success" role="status"><Check size={16} /> <LocalizedText>{message}</LocalizedText></p>}
    <button className="button" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <><Save size={16} /> <LocalizedText>{portalText(language, "saveProfile")}</LocalizedText></>}</button>
  </form>;
}
