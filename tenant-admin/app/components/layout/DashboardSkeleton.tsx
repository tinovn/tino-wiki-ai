export default function DashboardSkeleton() {
  return (
    <div className="dashboard-bg">
      <div className="dashboard-shell">
        <aside className="skeleton-sidebar">
          <div className="skeleton-block skeleton-brand" />
          <div className="skeleton-block skeleton-search" />
          <div className="skeleton-menu">
            {Array.from({ length: 8 }).map((_, index) => (
              <div className="skeleton-block skeleton-menu-item" key={index} />
            ))}
          </div>
          <div className="skeleton-block skeleton-user" />
        </aside>

        <main className="dashboard-main">
          <div className="skeleton-header">
            <div className="skeleton-block skeleton-title" />
            <div className="skeleton-actions">
              <div className="skeleton-block skeleton-pill" />
              <div className="skeleton-block skeleton-pill" />
              <div className="skeleton-block skeleton-pill" />
            </div>
          </div>

          <section className="kpi-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="skeleton-card" key={index}>
                <div className="skeleton-block skeleton-stat-title" />
                <div className="skeleton-block skeleton-stat-value" />
              </div>
            ))}
          </section>

          <section className="overview">
            <div className="skeleton-card" style={{ height: 120 }} />
          </section>

          <section className="main-grid">
            <div className="skeleton-card" style={{ minHeight: 360 }} />
            <div className="stack">
              <div className="skeleton-card" style={{ minHeight: 150 }} />
              <div className="skeleton-card" style={{ minHeight: 190 }} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
