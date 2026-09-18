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
  Heart,
  Wrench,
  X,
} from "lucide-react";
import { SevaSetuLogo } from "@/components/SevaSetuLogo";

const categories = [
  { name: "Home repairs", slug: "home-repairs", detail: "Electricians, plumbers & more", icon: Wrench, tone: "blue" },
  { name: "Cleaning", slug: "cleaning", detail: "A fresher home, on your schedule", icon: Sparkles, tone: "mint" },
  { name: "Moving & delivery", slug: "moving-delivery", detail: "Careful hands for every move", icon: BriefcaseBusiness, tone: "gold" },
  { name: "Garden care", slug: "garden-care", detail: "Bring your outdoor space to life", icon: Leaf, tone: "green" },
  { name: "Construction", slug: "construction", detail: "Build, repair, and improve", icon: Hammer, tone: "navy" },
  { name: "Painting", slug: "painting", detail: "Fresh walls and careful finishes", icon: Sparkles, tone: "blue" },
  { name: "Appliance repair", slug: "appliance-repair", detail: "Keep your home running smoothly", icon: Wrench, tone: "mint" },
  { name: "Pest control", slug: "pest-control", detail: "A cleaner, safer home", icon: ShieldCheck, tone: "gold" },
  { name: "Car wash", slug: "car-wash", detail: "Care for your vehicle at home", icon: MapPin, tone: "green" },
  { name: "Event help", slug: "event-help", detail: "Reliable hands for special days", icon: BriefcaseBusiness, tone: "navy" },
];

const demoWorkers = [
  { name: "Rakesh Kumar", role: "Electrician", skills: "Wiring · Fan installation · Repairs", rating: "4.9", jobs: "214", price: "₹500", distance: "2.4 km", initials: "RK", color: "#0b3d91" },
  { name: "Priya Sharma", role: "Home cleaner", skills: "Deep clean · Kitchen · Move-out", rating: "4.8", jobs: "168", price: "₹399", distance: "3.1 km", initials: "PS", color: "#00b894" },
  { name: "Amit Singh", role: "Carpenter", skills: "Furniture · Doors · Custom work", rating: "4.7", jobs: "126", price: "₹700", distance: "4.8 km", initials: "AS", color: "#1479a9" },
];

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
  const [workers, setWorkers] = useState<Array<(typeof demoWorkers)[number] & { id?: string }>>(demoWorkers);
  useEffect(() => {
    const params = new URLSearchParams({ limit: showAllProfessionals ? "50" : "12" });
    if (query.trim()) params.set("q", query.trim());
    fetch(`/api/v1/workers?${params.toString()}`, { cache: "no-store" }).then((response) => response.json()).then((result) => {
      if (!Array.isArray(result.data)) return;
      setWorkers(result.data.map((worker: { id: string; fullName: string; services: { service: { name: string }; price?: unknown }[]; ratingAverage: unknown; completedJobs: number }) => ({ id: worker.id, name: worker.fullName, role: worker.services[0]?.service.name || "SevaSetu professional", skills: worker.services.slice(0, 3).map((item) => item.service.name).join(" · ") || "Verified local service", rating: String(worker.ratingAverage), jobs: String(worker.completedJobs), price: worker.services[0]?.price ? `₹${String(worker.services[0].price)}` : "Request quote", distance: "Nearby", initials: worker.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), color: "#0b3d91" })));
    }).catch(() => undefined);
  }, [query, showAllProfessionals]);
  const filteredWorkers = useMemo(() => workers.filter((worker) => `${worker.name} ${worker.role} ${worker.skills}`.toLowerCase().includes(query.toLowerCase())), [workers, query]);

  function startSearch() {
    if (!query.trim() || !location.trim()) {
      setSearchSubmitted(false);
      setShowAllProfessionals(false);
      setNotice("Choose a service and location before searching.");
      return;
    }
    setSearchSubmitted(true);
    const selectedLocation = location || "your area";
    setNotice(query ? `Showing trusted ${query.toLowerCase()} professionals near ${selectedLocation}.` : `Tell us what you need in ${selectedLocation} to find a match.`);
    document.getElementById("professionals")?.scrollIntoView({ behavior: "smooth" });
  }

  function browseServices() {
    setShowAllServices((value) => !value);
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function browseProfessionals() {
    if (!searchSubmitted) {
      setNotice("Search for a service and choose a location first.");
      return;
    }
    setShowAllProfessionals((value) => {
      const nextValue = !value;
      setNotice(nextValue ? "Showing all available SevaSetu professionals." : "Showing featured professionals.");
      return nextValue;
    });
    document.getElementById("professionals")?.scrollIntoView({ behavior: "smooth" });
  }

  function chooseCurrentLocation() {
    if (!navigator.geolocation) {
      setNotice("Location services are not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
      setLocationDraft(`Pinned location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`);
    }, () => setNotice("We could not access your location. Enter it manually or choose a point on the map."));
  }

  function saveLocation() {
    const nextLocation = locationDraft.trim();
    if (!nextLocation && !coordinates) return;
    setLocation(nextLocation || `Pinned location (${coordinates?.latitude.toFixed(4)}, ${coordinates?.longitude.toFixed(4)})`);
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
          <a href="#services" onClick={() => setMenuOpen(false)}>Services</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#professionals" onClick={() => setMenuOpen(false)}>Find a professional</a>
          <button className="nav-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </nav>
        <div className="top-actions"><a className="text-button" href="/login">Log in</a><a className="button button-small" href="/login">Join SevaSetu <ArrowRight size={16} /></a></div>
        <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
      </header>

      <section className="hero" id="top">
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> Local help, made simple</div><h1>Good work is <em>closer</em> than you think.</h1><p>Find skilled, verified professionals for the jobs that keep your home and life moving.</p>
          <div className="search-panel"><div className="search-field"><Search size={19} /><input value={query} onChange={(event) => { setQuery(event.target.value); setSearchSubmitted(false); setShowAllProfessionals(false); }} placeholder="What service do you need?" aria-label="Service needed" /></div><button type="button" className="location-field" onClick={() => { setLocationDraft(location); setLocationPickerOpen(true); }} aria-label="Choose service location"><MapPin size={18} /><span>{location || "Choose your location"}</span></button><button className="button search-button" onClick={startSearch}>Search <ArrowRight size={18} /></button></div>
          <div className="popular"><span>Popular:</span><button onClick={() => { setQuery("Electrician"); setSearchSubmitted(false); setShowAllProfessionals(false); }}>Electrician</button><button onClick={() => { setQuery("Plumber"); setSearchSubmitted(false); setShowAllProfessionals(false); }}>Plumber</button><button onClick={() => { setQuery("Cleaning"); setSearchSubmitted(false); setShowAllProfessionals(false); }}>Cleaning</button><button onClick={() => { setQuery("Carpenter"); setSearchSubmitted(false); setShowAllProfessionals(false); }}>Carpenter</button></div>
        </div>
        <div className="hero-aside"><div className="trust-card"><div className="trust-icon"><ShieldCheck size={23} /></div><div><strong>Service you can trust</strong><span>Every professional is reviewed by our community.</span></div></div><div className="hero-stat"><strong>4.8<span>/5</span></strong><div><div className="stars">★★★★★</div><small>Average community rating</small></div></div></div>
      </section>

      {locationPickerOpen && <div className="location-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLocationPickerOpen(false); }}><section className="location-picker" role="dialog" aria-modal="true" aria-labelledby="location-picker-title"><div className="location-picker-heading"><div><span className="kicker">Set your service area</span><h2 id="location-picker-title">Where should we look?</h2></div><button type="button" className="icon-button" onClick={() => setLocationPickerOpen(false)} aria-label="Close location picker"><X size={19} /></button></div><label className="location-input-label">Location or landmark<input autoFocus value={locationDraft} onChange={(event) => setLocationDraft(event.target.value)} placeholder="Enter your area, city, or landmark" /></label><button type="button" className="current-location-button" onClick={chooseCurrentLocation}><LocateFixed size={17} /> Use my current location</button><div className="location-map" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width; const y = (event.clientY - rect.top) / rect.height; const latitude = 13.0827 - (y - 0.5) * 0.18; const longitude = 80.2707 + (x - 0.5) * 0.18; setCoordinates({ latitude, longitude }); setLocationDraft(`Pinned location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`); }}><div className="map-road road-one" /><div className="map-road road-two" /><div className="map-pin" style={coordinates ? { left: `${Math.min(92, Math.max(8, 50 + ((coordinates.longitude - 80.2707) / 0.18) * 100))}%`, top: `${Math.min(92, Math.max(8, 50 - ((coordinates.latitude - 13.0827) / 0.18) * 100))}%` } : undefined}><MapPin size={29} fill="currentColor" /></div><span className="map-hint">Click or drag on the map to adjust the pin</span></div><p className="location-picker-note">Your exact address is kept private until you request a service.</p><div className="location-picker-actions"><button type="button" className="text-button" onClick={() => setLocationPickerOpen(false)}>Cancel</button><button type="button" className="button" onClick={saveLocation}>Use this location <ArrowRight size={16} /></button></div></section></div>}

      <section className="proof-strip"><div><strong>2,500+</strong><span>skilled professionals</span></div><div><strong>18,000+</strong><span>jobs completed</span></div><div><strong>4.8 / 5</strong><span>community rating</span></div><div className="proof-note"><BadgeCheck size={20} /> Verified profiles. Clear pricing. Real reviews.</div></section>

      <section className="section" id="services"><div className="section-heading"><div><span className="kicker">Start with a service</span><h2>Whatever needs doing,<br /><span>there&apos;s someone for it.</span></h2></div><button type="button" className="link-button" onClick={browseServices}>{showAllServices ? "Show less" : "Browse all services"} <ArrowRight size={17} /></button></div><div className="category-grid">{categories.slice(0, showAllServices ? categories.length : 5).map((category) => { const Icon = category.icon; return <a className="category-card" key={category.name} href={`/services/${category.slug}`}><span className={`category-icon ${category.tone}`}><Icon size={23} /></span><span className="category-name">{category.name}</span><span className="category-detail">{category.detail}</span><ArrowRight className="category-arrow" size={18} /></a>; })}</div></section>

      <section className="section professionals" id="professionals"><div className="section-heading"><div><span className="kicker">People who make it happen</span><h2>Meet your local<br /><span>professionals.</span></h2></div><button type="button" className="link-button" onClick={browseProfessionals}>{showAllProfessionals ? "Show less" : "All professionals"} <ArrowRight size={17} /></button></div>{notice && <div className="notice"><Check size={17} /> {notice}</div>}{searchSubmitted ? <div className="worker-grid">{filteredWorkers.length ? filteredWorkers.map((worker) => <article className="worker-card" key={worker.id || worker.name}><div className="worker-top"><div className="avatar" style={{ background: worker.color }}>{worker.initials}</div><span className="available"><span /> Available</span></div><h3>{worker.name} <BadgeCheck className="verified" size={17} /></h3><p className="worker-role">{worker.role}</p><p className="worker-skills">{worker.skills}</p><div className="worker-meta"><span><Star size={15} fill="currentColor" /> {worker.rating} <small>({worker.jobs})</small></span><span><MapPin size={14} /> {worker.distance}</span></div><div className="worker-bottom"><strong>{worker.price} <small>starting</small></strong>{worker.id ? <a className="outline-button" href={`/professionals/${worker.id}`}>View profile</a> : <a className="outline-button" href="/register">Create account to view</a>}</div></article>) : <div className="empty-state"><Search size={24} /><strong>No professionals found yet</strong><span>Try a category like electrician, cleaning, or carpenter.</span></div>}</div> : <div className="empty-state"><Search size={24} /><strong>Search to find professionals</strong><span>Choose a service and location, then click Search.</span></div>}</section>

      <section className="how-section" id="how-it-works"><div className="steps-brand-box"><SevaSetuLogo className="navbar-logo" /></div><div className="how-inner"><div><span className="kicker light">A better way to get things done</span><h2>From “I need help”<br />to <em>“all sorted.”</em></h2><p>SevaSetu makes finding and hiring local help feel straightforward, transparent, and human.</p></div><div className="steps"><div><span>01</span><div><h3>Tell us what you need</h3><p>Search by service, skill, or simply describe the job.</p></div></div><div><span>02</span><div><h3>Choose with confidence</h3><p>Compare real profiles, prices, availability, and reviews.</p></div></div><div><span>03</span><div><h3>Get it done</h3><p>Request, chat, track progress, and review the work.</p></div></div></div></div></section>

      <footer><p className="footer-copyright">© 2026 SevaSetu. All rights reserved.</p><p className="footer-love">Made with love <Heart size={13} fill="currentColor" aria-hidden="true" /></p></footer>
    </main>
  );
}
