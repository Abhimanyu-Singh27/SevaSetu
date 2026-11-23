"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { LocalizedInput, LocalizedText as T } from "@/components/LocalizedText";
import { useLanguage } from "@/components/LanguageProvider";
import { pricingTypes } from "@/lib/portal-contracts";
import { portalText, translateText } from "@/lib/portal-i18n";
import { Feedback, MutationButton, SubmitButton, usePortalMutation } from "./Actions";

type Offering = { serviceId: string; pricingType: string; price: number | null; description: string | null; service: { name: string; active: boolean } };
type CatalogService = { id: string; name: string; category: { name: string } };

export function ServicesEditor({ offerings, services }: { offerings: Offering[]; services: CatalogService[] }) {
  const { language } = useLanguage();
  const addMutation = usePortalMutation();
  const priceMutation = usePortalMutation();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [editingServiceId, setEditingServiceId] = useState("");
  const [pricingType, setPricingType] = useState("QUOTE_REQUIRED");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const offeredIds = new Set(offerings.map((offering) => offering.serviceId));
  const availableServices = services.filter((service) => !offeredIds.has(service.id));
  const query = search.trim().toLowerCase();
  const filteredServices = availableServices.filter((service) => [service.name, service.category.name, translateText(language, service.name), translateText(language, service.category.name)].some((value) => value.toLowerCase().includes(query)));
  const groupedServices = new Map<string, CatalogService[]>();
  for (const service of filteredServices) groupedServices.set(service.category.name, [...(groupedServices.get(service.category.name) || []), service]);

  function edit(offering: Offering) {
    setEditingServiceId(offering.serviceId);
    setPricingType(offering.pricingType);
    setPrice(offering.price === null ? "" : String(offering.price));
    setDescription(offering.description || "");
    document.getElementById("service-pricing-editor")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function addSelected(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await addMutation.run("/api/v1/worker/services", { serviceIds: selectedIds }, "POST", "Services added. You can set prices individually below.")) setSelectedIds([]);
  }

  async function savePricing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await priceMutation.run("/api/v1/worker/services", { serviceId: editingServiceId, pricingType, price: pricingType === "QUOTE_REQUIRED" ? null : Number(price), description }, "PUT", "Changes saved.");
    if (saved) setEditingServiceId("");
  }

  const editingOffering = offerings.find((offering) => offering.serviceId === editingServiceId);
  return <div className="portal-editor-layout">
    <section>
      <h2><T>Your published services</T></h2>
      {offerings.length ? <div className="portal-record-list">{offerings.map((offering) => <article className="portal-record-card" key={offering.serviceId}><header><h3><T>{offering.service.name}</T></h3><span className="status-pill"><T>{offering.service.active ? "Published" : "Inactive service"}</T></span></header><p><strong>{offering.price !== null ? `₹${offering.price.toLocaleString("en-IN")}` : <T>Request quote</T>}</strong> · <T>{offering.pricingType}</T></p>{offering.description && <p>{offering.description}</p>}<div className="portal-actions">{offering.service.active && <button type="button" className="outline-button" onClick={() => edit(offering)}><T>Edit pricing</T></button>}<MutationButton endpoint="/api/v1/worker/services" method="DELETE" payload={{ serviceId: offering.serviceId }} confirm="Remove this service from your profile?"><T>Remove service</T></MutationButton></div></article>)}</div> : <p className="portal-helper"><T>Add services from the catalog to start receiving matching requests.</T></p>}
    </section>

    <div className="portal-service-management">
      <form className="portal-form-card" onSubmit={addSelected}>
        <h2><T>Add multiple services</T></h2>
        <p className="portal-helper"><T>Select all the services you provide. Each one starts as quote-required so you can set its price separately.</T></p>
        {availableServices.length ? <>
          <label className="profile-service-search portal-service-search"><Search size={16} aria-hidden="true" /><span className="sr-only"><T>Search services</T></span><LocalizedInput type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services and categories" /></label>
          <div className="portal-actions"><button type="button" className="text-button" onClick={() => setSelectedIds((current) => Array.from(new Set([...current, ...filteredServices.map((service) => service.id)])))}><T>Select all shown</T></button><button type="button" className="text-button" onClick={() => setSelectedIds([])} disabled={!selectedIds.length}><T>Clear selection</T></button></div>
          {groupedServices.size ? <div className="portal-service-catalog">{Array.from(groupedServices, ([category, items]) => <fieldset className="portal-service-category" key={category}><legend><T>{category}</T></legend><div className="portal-service-checkboxes">{items.map((service) => <label key={service.id}><input type="checkbox" checked={selectedIds.includes(service.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, service.id] : current.filter((id) => id !== service.id))} /><span><T>{service.name}</T></span></label>)}</div></fieldset>)}</div> : <p className="portal-helper" role="status"><T>No services match your search.</T></p>}
          <p className="portal-helper" aria-live="polite"><T>{portalText(language, "selectedServicesCount", { count: selectedIds.length })}</T></p>
          <SubmitButton busy={addMutation.busy} disabled={!selectedIds.length}>Add selected services</SubmitButton>
        </> : <p className="portal-helper">{services.length ? <T>You have added every active catalog service to your profile.</T> : <T>No active services are available in the catalog yet. Ask an administrator to publish services.</T>}</p>}
        <Feedback {...addMutation} />
      </form>

      {editingOffering ? <form className="portal-form-card" id="service-pricing-editor" onSubmit={savePricing}>
        <h2><T>Edit pricing</T>: <T>{editingOffering.service.name}</T></h2>
        <label><T>Pricing model</T><select value={pricingType} onChange={(event) => setPricingType(event.target.value)}>{pricingTypes.map((type) => <option value={type} key={type}><T>{type}</T></option>)}</select></label>
        {pricingType !== "QUOTE_REQUIRED" && <label><T>Price (₹)</T><input type="number" required value={price} onChange={(event) => setPrice(event.target.value)} min="0" max="10000000" step="0.01" />{["PER_HOUR", "PER_DAY"].includes(pricingType) && <small><T>Enter the rate for the selected time unit.</T></small>}</label>}
        <label><T>What is included</T><textarea maxLength={1000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <p className="portal-helper"><T>Customers see these prices on your public profile. Existing requests keep their agreed details.</T></p>
        <div className="portal-actions"><SubmitButton busy={priceMutation.busy}>Save service details</SubmitButton><button type="button" className="text-button" onClick={() => setEditingServiceId("")}><T>Cancel</T></button></div>
        <Feedback {...priceMutation} />
      </form> : <p className="portal-helper"><T>Choose Edit pricing on a published service to set its price and details.</T></p>}
    </div>
  </div>;
}
