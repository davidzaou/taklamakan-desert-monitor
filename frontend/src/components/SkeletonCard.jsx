export default function SkeletonCard({ height = 80, variant = "block" }) {
  if (variant === "stat-grid") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton-card" style={{ height: 64 }} />
        ))}
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="skeleton-card" style={{ height: 14, width: "40%" }} />
        <div className="skeleton-card" style={{ height: height || 180 }} />
      </div>
    );
  }

  return <div className="skeleton-card" style={{ height }} />;
}
