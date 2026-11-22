"use client";

import { LocalizedText } from "@/components/LocalizedText";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="state-page">
      <section className="state-panel" role="alert">
        <span className="kicker"><LocalizedText>{"SevaSetu"}</LocalizedText></span>
        <h1><LocalizedText>{"Unable to load this page."}</LocalizedText></h1>
        <p><LocalizedText>{"Something went wrong while loading your workspace. Please try again."}</LocalizedText></p>
        <button className="button" type="button" onClick={() => reset()}><LocalizedText>{"Try Again"}</LocalizedText></button>
      </section>
    </main>
  );
}
