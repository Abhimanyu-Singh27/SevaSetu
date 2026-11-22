import { translateText } from "./portal-i18n";

export function serviceSearchTerm(value: string) {
  const english = translateText("en", value).trim();
  const synonyms: Record<string, string> = { electrician: "Electrical repair", plumber: "Plumbing repair", carpenter: "Carpentry" };
  return synonyms[english.toLowerCase()] || english;
}

export function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLat = radians(to.latitude - from.latitude), deltaLng = radians(to.longitude - from.longitude);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
