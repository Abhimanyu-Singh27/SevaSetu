"use client";

import { LocalizedA, LocalizedButton, LocalizedInput, LocalizedNav, LocalizedText } from "@/components/LocalizedText";

import { useLanguage } from "@/components/LanguageProvider";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  Hammer,
  Leaf,
  MapPin,
  LocateFixed,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
  X,
} from "lucide-react";
import { SevaSetuLogo } from "@/components/SevaSetuLogo";
import { PublicLanguagePicker } from "@/components/PublicLanguagePicker";
import { portalText, translateText } from "@/lib/portal-i18n";

const categoryDesigns = [
  { name: "Home repairs", hiName: "घर की मरम्मत", slug: "home-repairs", detail: "Electricians, plumbers & more", hiDetail: "इलेक्ट्रीशियन, प्लंबर और अन्य", icon: Wrench, tone: "blue" },
  { name: "Cleaning", hiName: "सफाई", slug: "cleaning", detail: "A fresher home, on your schedule", hiDetail: "आपके समय के अनुसार साफ-सुथरा घर", icon: Sparkles, tone: "mint" },
  { name: "Moving & delivery", hiName: "स्थानांतरण और डिलीवरी", slug: "moving-delivery", detail: "Careful hands for every move", hiDetail: "हर स्थानांतरण के लिए भरोसेमंद मदद", icon: BriefcaseBusiness, tone: "gold" },
  { name: "Garden care", hiName: "बगीचे की देखभाल", slug: "garden-care", detail: "Bring your outdoor space to life", hiDetail: "अपने बाहरी स्थान को सुंदर बनाएं", icon: Leaf, tone: "green" },
  { name: "Construction", hiName: "निर्माण", slug: "construction", detail: "Build, repair, and improve", hiDetail: "बनाएं, मरम्मत करें और सुधारें", icon: Hammer, tone: "navy" },
  { name: "Painting", hiName: "पेंटिंग", slug: "painting", detail: "Fresh walls and careful finishes", hiDetail: "नई दीवारें और सुंदर फिनिश", icon: Sparkles, tone: "blue" },
  { name: "Appliance repair", hiName: "उपकरणों की मरम्मत", slug: "appliance-repair", detail: "Keep your home running smoothly", hiDetail: "अपने घर को सुचारु रूप से चलाएं", icon: Wrench, tone: "mint" },
  { name: "Pest control", hiName: "कीट नियंत्रण", slug: "pest-control", detail: "A cleaner, safer home", hiDetail: "स्वच्छ और सुरक्षित घर", icon: ShieldCheck, tone: "gold" },
  { name: "Car wash", hiName: "कार धुलाई", slug: "car-wash", detail: "Care for your vehicle at home", hiDetail: "अपने वाहन की घर पर देखभाल करें", icon: MapPin, tone: "green" },
  { name: "Event help", hiName: "कार्यक्रम सहायता", slug: "event-help", detail: "Reliable hands for special days", hiDetail: "खास दिनों के लिए भरोसेमंद मदद", icon: BriefcaseBusiness, tone: "navy" },
];

function localizedServiceName(name: string, language: string) {
  if (language !== "hi") return name;
  return translateText(language, name);
}

type WorkerCard = { id?: string; name: string; role: string; skills: string; rating: string; jobs: string; price: string; distance: string; initials: string; color: string; verified: boolean; availability: string };

export default function Home() {
  const [summary, setSummary] = useState<{ workers: number; completedJobs: number; rating: number | null; ratingCount: number; categories: { id: string; name: string; slug: string; description: string | null }[] } | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/marketplace-summary", { signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error("Unavailable"); return response.json(); }).then((result) => setSummary(result.data)).catch(() => { if (!controller.signal.aborted) setSummaryError(true); });
    return () => controller.abort();
  }, []);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAllProfessionals, setShowAllProfessionals] = useState(false);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [workers, setWorkers] = useState<WorkerCard[]>([]);
  const { language } = useLanguage();
  const categories = (summary?.categories || []).map((category) => { const design = categoryDesigns.find((item) => item.slug === category.slug); return { ...category, hiName: translateText("hi", category.name), detail: category.description || "", hiDetail: translateText("hi", category.description || ""), icon: design?.icon || Wrench, tone: design?.tone || "blue" }; });
  useEffect(() => {
    if (!searchSubmitted) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: showAllProfessionals ? "50" : "12" });
    if (query.trim()) params.set("q", translateText("en", query.trim()));
    if (coordinates) { params.set("latitude", String(coordinates.latitude)); params.set("longitude", String(coordinates.longitude)); } else if (location) params.set("city", location);
    fetch(`/api/v1/workers?${params.toString()}`, { cache: "no-store", signal: controller.signal }).then((response) => response.json()).then((result) => {
      if (!Array.isArray(result.data)) { setWorkers([]); return; }
      setWorkers(result.data.map((worker: { id: string; fullName: string; verificationStatus: string; services: { service: { name: string }; price?: unknown }[]; ratingAverage: unknown; completedJobs: number; city?: string | null; distanceKm?: number | null; availability: string }) => ({ id: worker.id, name: worker.fullName, role: localizedServiceName(worker.services[0]?.service.name || "", language) || portalText(language, "sevasetuProfessional"), skills: worker.services.slice(0, 3).map((item) => localizedServiceName(item.service.name, language)).join(" · ") || portalText(language, "verifiedLocalService"), rating: String(worker.ratingAverage), jobs: String(worker.completedJobs), price: worker.services[0]?.price != null ? `₹${String(worker.services[0].price)}` : portalText(language, "requestQuote"), distance: worker.distanceKm != null ? `${worker.distanceKm} km` : worker.city || translateText(language, "Service area not provided"), initials: worker.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), color: "#0b3d91", verified: worker.verificationStatus === "VERIFIED", availability: worker.availability })));
    }).catch(() => { if (!controller.signal.aborted) { setWorkers([]); setNotice(translateText(language, "Marketplace information is temporarily unavailable.")); } });
    return () => controller.abort();
  }, [language, query, showAllProfessionals, searchSubmitted, location, coordinates]);
  const filteredWorkers = workers;

  function startSearch() {
    const missingDetails = [
      !query.trim() ? portalText(language, "serviceNeeded") : "",
      !location.trim() ? portalText(language, "yourLocation") : "",
    ].filter(Boolean);
    if (missingDetails.length) {
      setSearchSubmitted(false);
      setShowAllProfessionals(false);
      setSearchMessage(portalText(language, "fillBeforeSearch", { details: missingDetails.join(language === "hi" ? " और " : " and ") }));
      return;
    }
    setSearchMessage("");
    setSearchSubmitted(true);
    const selectedLocation = location || "your area";
    setNotice(query ? portalText(language, "trustedProfessionalsNear", { service: query.toLowerCase(), location: selectedLocation }) : portalText(language, "tellNeedNear", { location: selectedLocation }));
    document.getElementById("professionals")?.scrollIntoView({ behavior: "smooth" });
  }

  function browseServices() {
    setShowAllServices((value) => !value);
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function browseProfessionals() {
    if (!searchSubmitted) {
      setNotice(portalText(language, "searchLocationFirst"));
      return;
    }
    setShowAllProfessionals((value) => {
      const nextValue = !value;
      setNotice(nextValue ? portalText(language, "allAvailableProfessionals") : portalText(language, "featuredProfessionals"));
      return nextValue;
    });
    document.getElementById("professionals")?.scrollIntoView({ behavior: "smooth" });
  }

  function chooseCurrentLocation() {
    if (!navigator.geolocation) {
      setNotice(portalText(language, "locationUnavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
      setLocationDraft(`Pinned location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`);
    }, () => setNotice(portalText(language, "locationAccessFailed")));
  }

  function saveLocation() {
    const nextLocation = locationDraft.trim();
    if (!nextLocation && !coordinates) return;
    setLocation(nextLocation || `Pinned location (${coordinates?.latitude.toFixed(4)}, ${coordinates?.longitude.toFixed(4)})`);
    setSearchMessage("");
    setSearchSubmitted(false);
    setShowAllProfessionals(false);
    setLocationPickerOpen(false);
  }

  return (
    <main>
      <header className="topbar">
        <LocalizedA className="brand" href="#top" aria-label="SevaSetu home"><SevaSetuLogo className="navbar-logo" /></LocalizedA>
        {menuOpen && <LocalizedButton className="nav-backdrop" type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
        <LocalizedNav className={menuOpen ? "nav-links open" : "nav-links"} aria-label="Main navigation">
          <a href="#services" onClick={() => setMenuOpen(false)}><LocalizedText>{portalText(language, "publicServices")}</LocalizedText></a><a href="#how-it-works" onClick={() => setMenuOpen(false)}><LocalizedText>{portalText(language, "howItWorks")}</LocalizedText></a><a href="#professionals" onClick={() => setMenuOpen(false)}><LocalizedText>{portalText(language, "findProfessional")}</LocalizedText></a>
          <LocalizedButton className="nav-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></LocalizedButton>
        </LocalizedNav>
        <div className="top-actions"><PublicLanguagePicker /><a className="text-button" href="/login"><LocalizedText>{portalText(language, "login")}</LocalizedText></a><a className="button button-small" href="/login"><LocalizedText>{portalText(language, "joinSevaSetu")}</LocalizedText> <ArrowRight size={16} /></a></div>
        <LocalizedButton className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={22} /></LocalizedButton>
      </header>

      <section className="hero" id="top">
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> <LocalizedText>{portalText(language, "localHelp")}</LocalizedText></div><h1><LocalizedText>{portalText(language, "closer")}</LocalizedText></h1><p><LocalizedText>{portalText(language, "findSkilled")}</LocalizedText></p>
          <div className="search-panel"><div className="search-field"><Search size={19} /><LocalizedInput value={translateText(language, query)} onChange={(event) => { setQuery(event.target.value); setSearchMessage(""); setSearchSubmitted(false); setShowAllProfessionals(false); }} placeholder={portalText(language, "whatService")} aria-label={portalText(language, "whatService")} /></div><LocalizedButton type="button" className="location-field" onClick={() => { setLocationDraft(location); setSearchMessage(""); setLocationPickerOpen(true); }} aria-label={portalText(language, "chooseLocation")}><MapPin size={18} /><span><LocalizedText>{location || portalText(language, "chooseLocation")}</LocalizedText></span></LocalizedButton><button className="button search-button" onClick={startSearch}><LocalizedText>{portalText(language, "search")}</LocalizedText> <ArrowRight size={18} /></button></div>{searchMessage && <p className="search-feedback" role="alert"><LocalizedText>{searchMessage}</LocalizedText></p>}
          <div className="popular"><span><LocalizedText>{portalText(language, "popular")}</LocalizedText></span><button onClick={() => { setQuery("Electrician"); setSearchMessage(""); setSearchSubmitted(false); setShowAllProfessionals(false); }}><LocalizedText>{portalText(language, "electrician")}</LocalizedText></button><button onClick={() => { setQuery("Plumber"); setSearchMessage(""); setSearchSubmitted(false); setShowAllProfessionals(false); }}><LocalizedText>{portalText(language, "plumber")}</LocalizedText></button><button onClick={() => { setQuery("Cleaning"); setSearchMessage(""); setSearchSubmitted(false); setShowAllProfessionals(false); }}><LocalizedText>{portalText(language, "cleaning")}</LocalizedText></button><button onClick={() => { setQuery("Carpenter"); setSearchMessage(""); setSearchSubmitted(false); setShowAllProfessionals(false); }}><LocalizedText>{portalText(language, "carpenter")}</LocalizedText></button></div>
        </div>
        <div className="hero-aside"><div className="trust-card"><div className="trust-icon"><ShieldCheck size={23} /></div><div><strong><LocalizedText>{portalText(language, "trustService")}</LocalizedText></strong><span><LocalizedText>{portalText(language, "reviewedCommunity")}</LocalizedText></span></div></div><div className="hero-stat"><strong>{summary?.rating ? summary.rating.toFixed(1) : "—"}<span>/5</span></strong><div><div className="stars">{summary?.rating ? "★".repeat(Math.round(summary.rating)) : "—"}</div><small><LocalizedText>{portalText(language, "averageCommunityRating")}</LocalizedText></small></div></div></div>
      </section>

      {locationPickerOpen && <div className="location-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLocationPickerOpen(false); }}><section className="location-picker" role="dialog" aria-modal="true" aria-labelledby="location-picker-title"><div className="location-picker-heading"><div><span className="kicker"><LocalizedText>{portalText(language, "setServiceArea")}</LocalizedText></span><h2 id="location-picker-title"><LocalizedText>{portalText(language, "whereLook")}</LocalizedText></h2></div><LocalizedButton type="button" className="icon-button" onClick={() => setLocationPickerOpen(false)} aria-label={portalText(language, "closeLocationPicker")}><X size={19} /></LocalizedButton></div><label className="location-input-label"><LocalizedText>{portalText(language, "locationLandmark")}</LocalizedText><LocalizedInput autoFocus value={translateText(language, locationDraft)} onChange={(event) => { setLocationDraft(event.target.value); setCoordinates(null); }} placeholder={portalText(language, "enterLocation")} /></label><button type="button" className="current-location-button" onClick={chooseCurrentLocation}><LocateFixed size={17} /> <LocalizedText>{portalText(language, "useCurrentLocation")}</LocalizedText></button><p className="location-picker-note"><LocalizedText>{portalText(language, "privateAddress")}</LocalizedText></p><div className="location-picker-actions"><button type="button" className="text-button" onClick={() => setLocationPickerOpen(false)}><LocalizedText>{portalText(language, "cancel")}</LocalizedText></button><button type="button" className="button" onClick={saveLocation}><LocalizedText>{portalText(language, "useThisLocation")}</LocalizedText> <ArrowRight size={16} /></button></div></section></div>}

      {summaryError && <p className="notice" role="status"><LocalizedText>{"Marketplace information is temporarily unavailable."}</LocalizedText></p>}
      <section className="proof-strip"><div><strong>{summary ? summary.workers.toLocaleString("en-IN") : "—"}</strong><span><LocalizedText>{portalText(language, "skilledProfessionals")}</LocalizedText></span></div><div><strong>{summary ? summary.completedJobs.toLocaleString("en-IN") : "—"}</strong><span><LocalizedText>{portalText(language, "jobsCompleted")}</LocalizedText></span></div><div><strong>{summary?.rating ? `${summary.rating.toFixed(1)} / 5` : "—"}</strong><span><LocalizedText>{portalText(language, "communityRating")}</LocalizedText></span></div><div className="proof-note"><BadgeCheck size={20} /> <LocalizedText>{portalText(language, "verifiedProfiles")}</LocalizedText></div></section>

      <section className="section" id="services"><div className="section-heading"><div><span className="kicker"><LocalizedText>{portalText(language, "startService")}</LocalizedText></span><h2><LocalizedText>{portalText(language, "whateverNeedsDoing")}</LocalizedText><br /><span><LocalizedText>{portalText(language, "someoneForIt")}</LocalizedText></span></h2></div><button type="button" className="link-button" onClick={browseServices}><LocalizedText>{showAllServices ? portalText(language, "showLess") : portalText(language, "browseServices")}</LocalizedText> <ArrowRight size={17} /></button></div><div className="category-grid">{categories.slice(0, showAllServices ? categories.length : 5).map((category) => { const Icon = category.icon; return <Link className="category-card" key={category.id} href={`/services/${encodeURIComponent(category.slug)}?categoryId=${encodeURIComponent(category.id)}`}><span className={`category-icon ${category.tone}`}><Icon size={23} /></span><span className="category-name"><LocalizedText>{language === "hi" ? category.hiName : category.name}</LocalizedText></span><span className="category-detail"><LocalizedText>{language === "hi" ? category.hiDetail : category.detail}</LocalizedText></span><ArrowRight className="category-arrow" size={18} /></Link>; })}</div>{summary && !categories.length && <div className="empty-state"><strong><LocalizedText>{"No services available"}</LocalizedText></strong><span><LocalizedText>{"Published services will appear here when the catalog is ready."}</LocalizedText></span></div>}</section>

      <section className="section professionals" id="professionals"><div className="section-heading"><div><span className="kicker"><LocalizedText>{portalText(language, "peopleMakeItHappen")}</LocalizedText></span><h2><LocalizedText>{portalText(language, "meetLocal")}</LocalizedText><br /><span><LocalizedText>{portalText(language, "professionals")}</LocalizedText></span></h2></div><button type="button" className="link-button" onClick={browseProfessionals}><LocalizedText>{showAllProfessionals ? portalText(language, "showLess") : portalText(language, "allProfessionals")}</LocalizedText> <ArrowRight size={17} /></button></div>{notice && <div className="notice"><Check size={17} /> <LocalizedText>{notice}</LocalizedText></div>}{searchSubmitted ? <div className="worker-grid"><LocalizedText>{filteredWorkers.length ? filteredWorkers.map((worker) => <article className="worker-card" key={worker.id || worker.name}><div className="worker-top"><div className="avatar" style={{ background: worker.color }}>{worker.initials}</div><span className={`available${worker.availability === "AVAILABLE" ? "" : " is-unavailable"}`}><span /> <LocalizedText>{worker.availability}</LocalizedText></span></div><h3>{worker.name} {worker.verified && <BadgeCheck className="verified" size={17} aria-label={translateText(language, "Verified worker")} />}</h3><p className="worker-role"><LocalizedText>{worker.role}</LocalizedText></p><p className="worker-skills"><LocalizedText>{worker.skills}</LocalizedText></p><div className="worker-meta"><span><Star size={15} fill="currentColor" /> {worker.rating} <small>(<LocalizedText>{worker.jobs}</LocalizedText>)</small></span><span><MapPin size={14} /> <LocalizedText>{worker.distance}</LocalizedText></span></div><div className="worker-bottom"><strong><LocalizedText>{worker.price}</LocalizedText> <small><LocalizedText>{portalText(language, "starting")}</LocalizedText></small></strong>{worker.id ? <a className="outline-button" href={`/professionals/${worker.id}`}><LocalizedText>{portalText(language, "viewProfile")}</LocalizedText></a> : <a className="outline-button" href="/register"><LocalizedText>{portalText(language, "createAccountToView")}</LocalizedText></a>}</div></article>) : <div className="empty-state"><Search size={24} /><strong><LocalizedText>{portalText(language, "noProfessionals")}</LocalizedText></strong><span><LocalizedText>{portalText(language, "tryCategory")}</LocalizedText></span></div>}</LocalizedText></div> : <div className="empty-state"><Search size={24} /><strong><LocalizedText>{portalText(language, "searchToFind")}</LocalizedText></strong><span><LocalizedText>{portalText(language, "chooseServiceLocation")}</LocalizedText></span></div>}</section>

      <section className="how-section" id="how-it-works"><div className="steps-brand-box"><SevaSetuLogo className="navbar-logo" /></div><div className="how-inner"><div><span className="kicker light"><LocalizedText>{portalText(language, "betterWay")}</LocalizedText></span><h2>{language === "hi" ? <><LocalizedText>{portalText(language, "fromNeedHelp")}</LocalizedText><br /><em><LocalizedText>{portalText(language, "allSorted")}</LocalizedText> <LocalizedText>{portalText(language, "to")}</LocalizedText>।</em></> : <><LocalizedText>{portalText(language, "fromNeedHelp")}</LocalizedText><br /><LocalizedText>{portalText(language, "to")}</LocalizedText> <em><LocalizedText>{portalText(language, "allSorted")}</LocalizedText></em></>}</h2><p><LocalizedText>{portalText(language, "sevaSetuMakes")}</LocalizedText></p></div><div className="steps"><div><span>01</span><div><h3><LocalizedText>{portalText(language, "tellNeed")}</LocalizedText></h3><p><LocalizedText>{portalText(language, "searchByService")}</LocalizedText></p></div></div><div><span>02</span><div><h3><LocalizedText>{portalText(language, "chooseConfidence")}</LocalizedText></h3><p><LocalizedText>{portalText(language, "compareProfiles")}</LocalizedText></p></div></div><div><span>03</span><div><h3><LocalizedText>{portalText(language, "getItDone")}</LocalizedText></h3><p><LocalizedText>{portalText(language, "requestChatTrack")}</LocalizedText></p></div></div></div></div></section>

      <footer><p className="footer-copyright">© 2026 SevaSetu. All rights reserved.</p><p className="footer-love"><LocalizedText>{"Made with ❤️"}</LocalizedText></p></footer>
    </main>
  );
}
