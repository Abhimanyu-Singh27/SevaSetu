"use client";

import { useEffect, useMemo, useState } from "react";
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
import { portalText } from "@/lib/portal-i18n";

const categories = [
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
  return categories.find((category) => category.name.toLowerCase() === name.toLowerCase())?.hiName || name;
}

type WorkerCard = { id?: string; name: string; role: string; skills: string; rating: string; jobs: string; price: string; distance: string; initials: string; color: string; verified: boolean };

export default function Home() {
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
  const [language, setLanguage] = useState("en");
  useEffect(() => {
    const saved = window.localStorage.getItem("sevasetu-language");
    if (saved === "hi") queueMicrotask(() => setLanguage(saved));
  }, []);
  useEffect(() => {
    const params = new URLSearchParams({ limit: showAllProfessionals ? "50" : "12" });
    if (query.trim()) params.set("q", query.trim());
    fetch(`/api/v1/workers?${params.toString()}`, { cache: "no-store" }).then((response) => response.json()).then((result) => {
      if (!Array.isArray(result.data)) { setWorkers([]); return; }
      setWorkers(result.data.map((worker: { id: string; fullName: string; verificationStatus: string; services: { service: { name: string }; price?: unknown }[]; ratingAverage: unknown; completedJobs: number }) => ({ id: worker.id, name: worker.fullName, role: localizedServiceName(worker.services[0]?.service.name || "", language) || portalText(language, "sevasetuProfessional"), skills: worker.services.slice(0, 3).map((item) => localizedServiceName(item.service.name, language)).join(" · ") || portalText(language, "verifiedLocalService"), rating: String(worker.ratingAverage), jobs: String(worker.completedJobs), price: worker.services[0]?.price ? `₹${String(worker.services[0].price)}` : portalText(language, "requestQuote"), distance: portalText(language, "nearby"), initials: worker.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), color: "#0b3d91", verified: worker.verificationStatus === "VERIFIED" })));
    }).catch(() => setWorkers([]));
  }, [language, query, showAllProfessionals]);
  const filteredWorkers = useMemo(() => workers.filter((worker) => `${worker.name} ${worker.role} ${worker.skills}`.toLowerCase().includes(query.toLowerCase())), [workers, query]);

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
        <a className="brand" href="#top" aria-label="SevaSetu home"><SevaSetuLogo className="navbar-logo" /></a>
        {menuOpen && <button className="nav-backdrop" type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
        <nav className={menuOpen ? "nav-links open" : "nav-links"} aria-label="Main navigation">
          <a href="#services" onClick={() => setMenuOpen(false)}>{portalText(language, "publicServices")}</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>{portalText(language, "howItWorks")}</a><a href="#professionals" onClick={() => setMenuOpen(false)}>{portalText(language, "findProfessional")}</a>
          <button className="nav-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </nav>
        <div className="top-actions"><PublicLanguagePicker onLanguageChange={(value) => setLanguage(value === "hi" ? "hi" : "en")} /><a className="text-button" href="/login">{portalText(language, "login")}</a><a className="button button-small" href="/login">{portalText(language, "joinSevaSetu")} <ArrowRight size={16} /></a></div>
        <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
      </header>

      <section className="hero" id="top">
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> {portalText(language, "localHelp")}</div><h1>{portalText(language, "closer")}</h1><p>{portalText(language, "findSkilled")}</p>
          <div className="search-panel"><div className="search-field"><Search size={19} /><input value={query} onChange={(event) => { setQuery(event.target.value); setSearchMessage(""); setSearchSubmitted(false); setShowAllProfessionals(false); }} placeholder={portalText(language, "whatService")} aria-label={portalText(language, "whatService")} /></div><button type="button" className="location-field" onClick={() => { setLocationDraft(location); setSearchMessage(""); setLocationPickerOpen(true); }} aria-label={portalText(language, "chooseLocation")}><MapPin size={18} /><span>{location || portalText(language, "chooseLocation")}</span></button><button className="button search-button" onClick={startSearch}>{portalText(language, "search")} <ArrowRight size={18} /></button></div>{searchMessage && <p className="search-feedback" role="alert">{searchMessage}</p>}
          <div className="popular"><span>{portalText(language, "popular")}</span><button onClick={() => { setQuery("Electrician"); setSearchMessage(""); setSearchSubmitted(false); setShowAllProfessionals(false); }}>{portalText(language, "electrician")}</button><button onClick={() => { setQuery("Plumber"); setSearchMessage(""); setSearchSubmitted(false); setShowAllProfessionals(false); }}>{portalText(language, "plumber")}</button><button onClick={() => { setQuery("Cleaning"); setSearchMessage(""); setSearchSubmitted(false); setShowAllProfessionals(false); }}>{portalText(language, "cleaning")}</button><button onClick={() => { setQuery("Carpenter"); setSearchMessage(""); setSearchSubmitted(false); setShowAllProfessionals(false); }}>{portalText(language, "carpenter")}</button></div>
        </div>
        <div className="hero-aside"><div className="trust-card"><div className="trust-icon"><ShieldCheck size={23} /></div><div><strong>{portalText(language, "trustService")}</strong><span>{portalText(language, "reviewedCommunity")}</span></div></div><div className="hero-stat"><strong>4.8<span>/5</span></strong><div><div className="stars">★★★★★</div><small>{portalText(language, "averageCommunityRating")}</small></div></div></div>
      </section>

      {locationPickerOpen && <div className="location-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLocationPickerOpen(false); }}><section className="location-picker" role="dialog" aria-modal="true" aria-labelledby="location-picker-title"><div className="location-picker-heading"><div><span className="kicker">{portalText(language, "setServiceArea")}</span><h2 id="location-picker-title">{portalText(language, "whereLook")}</h2></div><button type="button" className="icon-button" onClick={() => setLocationPickerOpen(false)} aria-label={portalText(language, "closeLocationPicker")}><X size={19} /></button></div><label className="location-input-label">{portalText(language, "locationLandmark")}<input autoFocus value={locationDraft} onChange={(event) => setLocationDraft(event.target.value)} placeholder={portalText(language, "enterLocation")} /></label><button type="button" className="current-location-button" onClick={chooseCurrentLocation}><LocateFixed size={17} /> {portalText(language, "useCurrentLocation")}</button><div className="location-map" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width; const y = (event.clientY - rect.top) / rect.height; const latitude = 13.0827 - (y - 0.5) * 0.18; const longitude = 80.2707 + (x - 0.5) * 0.18; setCoordinates({ latitude, longitude }); setLocationDraft(`Pinned location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`); }}><div className="map-road road-one" /><div className="map-road road-two" /><div className="map-pin" style={coordinates ? { left: `${Math.min(92, Math.max(8, 50 + ((coordinates.longitude - 80.2707) / 0.18) * 100))}%`, top: `${Math.min(92, Math.max(8, 50 - ((coordinates.latitude - 13.0827) / 0.18) * 100))}%` } : undefined}><MapPin size={29} fill="currentColor" /></div><span className="map-hint">{portalText(language, "mapHint")}</span></div><p className="location-picker-note">{portalText(language, "privateAddress")}</p><div className="location-picker-actions"><button type="button" className="text-button" onClick={() => setLocationPickerOpen(false)}>{portalText(language, "cancel")}</button><button type="button" className="button" onClick={saveLocation}>{portalText(language, "useThisLocation")} <ArrowRight size={16} /></button></div></section></div>}

      <section className="proof-strip"><div><strong>2,500+</strong><span>{portalText(language, "skilledProfessionals")}</span></div><div><strong>18,000+</strong><span>{portalText(language, "jobsCompleted")}</span></div><div><strong>4.8 / 5</strong><span>{portalText(language, "communityRating")}</span></div><div className="proof-note"><BadgeCheck size={20} /> {portalText(language, "verifiedProfiles")}</div></section>

      <section className="section" id="services"><div className="section-heading"><div><span className="kicker">{portalText(language, "startService")}</span><h2>{portalText(language, "whateverNeedsDoing")}<br /><span>{portalText(language, "someoneForIt")}</span></h2></div><button type="button" className="link-button" onClick={browseServices}>{showAllServices ? portalText(language, "showLess") : portalText(language, "browseServices")} <ArrowRight size={17} /></button></div><div className="category-grid">{categories.slice(0, showAllServices ? categories.length : 5).map((category) => { const Icon = category.icon; return <a className="category-card" key={category.name} href={`/services/${category.slug}`}><span className={`category-icon ${category.tone}`}><Icon size={23} /></span><span className="category-name">{language === "hi" ? category.hiName : category.name}</span><span className="category-detail">{language === "hi" ? category.hiDetail : category.detail}</span><ArrowRight className="category-arrow" size={18} /></a>; })}</div></section>

      <section className="section professionals" id="professionals"><div className="section-heading"><div><span className="kicker">{portalText(language, "peopleMakeItHappen")}</span><h2>{portalText(language, "meetLocal")}<br /><span>{portalText(language, "professionals")}</span></h2></div><button type="button" className="link-button" onClick={browseProfessionals}>{showAllProfessionals ? portalText(language, "showLess") : portalText(language, "allProfessionals")} <ArrowRight size={17} /></button></div>{notice && <div className="notice"><Check size={17} /> {notice}</div>}{searchSubmitted ? <div className="worker-grid">{filteredWorkers.length ? filteredWorkers.map((worker) => <article className="worker-card" key={worker.id || worker.name}><div className="worker-top"><div className="avatar" style={{ background: worker.color }}>{worker.initials}</div><span className="available"><span /> {portalText(language, "available")}</span></div><h3>{worker.name} {worker.verified && <BadgeCheck className="verified" size={17} aria-label="Verified worker" />}</h3><p className="worker-role">{worker.role}</p><p className="worker-skills">{worker.skills}</p><div className="worker-meta"><span><Star size={15} fill="currentColor" /> {worker.rating} <small>({worker.jobs})</small></span><span><MapPin size={14} /> {worker.distance}</span></div><div className="worker-bottom"><strong>{worker.price} <small>{portalText(language, "starting")}</small></strong>{worker.id ? <a className="outline-button" href={`/professionals/${worker.id}`}>{portalText(language, "viewProfile")}</a> : <a className="outline-button" href="/register">{portalText(language, "createAccountToView")}</a>}</div></article>) : <div className="empty-state"><Search size={24} /><strong>{portalText(language, "noProfessionals")}</strong><span>{portalText(language, "tryCategory")}</span></div>}</div> : <div className="empty-state"><Search size={24} /><strong>{portalText(language, "searchToFind")}</strong><span>{portalText(language, "chooseServiceLocation")}</span></div>}</section>

      <section className="how-section" id="how-it-works"><div className="steps-brand-box"><SevaSetuLogo className="navbar-logo" /></div><div className="how-inner"><div><span className="kicker light">{portalText(language, "betterWay")}</span><h2>{portalText(language, "fromNeedHelp")}<br />{portalText(language, "to")} <em>{portalText(language, "allSorted")}</em></h2><p>{portalText(language, "sevaSetuMakes")}</p></div><div className="steps"><div><span>01</span><div><h3>{portalText(language, "tellNeed")}</h3><p>{portalText(language, "searchByService")}</p></div></div><div><span>02</span><div><h3>{portalText(language, "chooseConfidence")}</h3><p>{portalText(language, "compareProfiles")}</p></div></div><div><span>03</span><div><h3>{portalText(language, "getItDone")}</h3><p>{portalText(language, "requestChatTrack")}</p></div></div></div></div></section>

      <footer><p className="footer-copyright">© 2026 SevaSetu. All rights reserved.</p><p className="footer-love">Made with ❤️</p></footer>
    </main>
  );
}
