function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`portal-skeleton ${className}`} />;
}

export default function Loading() {
  return (
    <div className="portal-shell" aria-busy="true" aria-label="Loading SevaSetu">
      <aside className="portal-sidebar portal-sidebar-skeleton">
        <SkeletonBlock className="skeleton-brand" />
        <div className="skeleton-nav">
          {Array.from({ length: 7 }, (_, index) => <SkeletonBlock key={index} className="skeleton-nav-item" />)}
        </div>
      </aside>
      <main className="portal-main">
        <SkeletonBlock className="skeleton-topbar" />
        <div className="skeleton-heading">
          <SkeletonBlock className="skeleton-title" />
          <SkeletonBlock className="skeleton-subtitle" />
        </div>
        <section className="portal-card-grid">
          {Array.from({ length: 4 }, (_, index) => <SkeletonBlock key={index} className="skeleton-card" />)}
        </section>
        <section className="skeleton-content-grid">
          <SkeletonBlock className="skeleton-panel" />
          <SkeletonBlock className="skeleton-panel" />
        </section>
      </main>
    </div>
  );
}
