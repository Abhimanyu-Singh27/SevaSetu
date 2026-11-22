"use client";

import { createElement, type ComponentPropsWithRef, type JSX, type ReactNode } from "react";
import { useLanguage } from "./LanguageProvider";

// Returns text without adding DOM elements, including inside options and SVG titles.
export function LocalizedText({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const translate = (child: ReactNode): ReactNode => typeof child === "string" ? t(child) : Array.isArray(child) ? child.map(translate) : child;
  return <>{translate(children)}</>;
}

export function LocalizedDate({ value, time = false, short = false }: { value: Date | string; time?: boolean; short?: boolean }) {
  const { language } = useLanguage();
  const date = new Date(value);
  const locale = language === "hi" ? "hi-IN" : "en-IN";
  return <>{short ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(date) : time ? date.toLocaleString(locale, { hour12: false }) : date.toLocaleDateString(locale)}</>;
}

function localizedElement<Tag extends keyof JSX.IntrinsicElements>(tag: Tag) {
  return function LocalizedElement(props: ComponentPropsWithRef<Tag>) {
    const { t } = useLanguage();
    const localized = { ...props } as Record<string, unknown>;
    for (const attribute of ["placeholder", "aria-label", "title", "alt"]) {
      if (typeof localized[attribute] === "string") localized[attribute] = t(localized[attribute]);
    }
    return createElement(tag, localized);
  };
}

export const LocalizedInput = localizedElement("input");
export const LocalizedTextarea = localizedElement("textarea");
export const LocalizedSelect = localizedElement("select");
export const LocalizedButton = localizedElement("button");
export const LocalizedNav = localizedElement("nav");
export const LocalizedSection = localizedElement("section");
export const LocalizedDiv = localizedElement("div");
export const LocalizedSvg = localizedElement("svg");
export const LocalizedA = localizedElement("a");
export const LocalizedProgress = localizedElement("progress");
