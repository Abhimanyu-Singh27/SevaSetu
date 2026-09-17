"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="state-page">
      <section className="state-panel" role="alert">
        <span className="kicker">SevaSetu</span>
        <h1>Unable to load this page.</h1>
        <p>Something went wrong while loading your workspace. Please try again.</p>
        <button className="button" type="button" onClick={() => reset()}>Try Again</button>
      </section>
    </main>
  );
}
