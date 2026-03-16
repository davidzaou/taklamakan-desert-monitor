import { useLanguage } from "../i18n/LanguageContext";
import SkeletonCard from "./SkeletonCard";

export default function ChangeStats({ data, loading }) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="stats-container">
        <h3>{t("changeAnalysis")}</h3>
        <SkeletonCard variant="stat-grid" />
      </div>
    );
  }

  if (!data) return null;

  const changeColor = data.mean_change > 0 ? "#1a9850" : "#d73027";
  const changeLabel = data.mean_change > 0 ? t("improvement") : t("decline");

  return (
    <div className="stats-container">
      <h3>
        {t("changeAnalysis")}: {data.year1} &rarr; {data.year2}
      </h3>
      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeftColor: changeColor }}>
          <div className="stat-value" style={{ color: changeColor }}>
            {data.mean_change > 0 ? "+" : ""}
            {data.mean_change?.toFixed(4)}
          </div>
          <div className="stat-label">{t("meanNDVIChange")} ({changeLabel})</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: "#1a9850" }}>
          <div className="stat-value" style={{ color: "#1a9850" }}>
            {data.improved_area_sqkm?.toFixed(1)} km&sup2;
          </div>
          <div className="stat-label">{t("areaImproved")}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: "#d73027" }}>
          <div className="stat-value" style={{ color: "#d73027" }}>
            {data.degraded_area_sqkm?.toFixed(1)} km&sup2;
          </div>
          <div className="stat-label">{t("areaDegraded")}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: "#4a90d9" }}>
          <div className="stat-value" style={{ color: "#4a90d9" }}>
            {data.min_change?.toFixed(4)} / {data.max_change?.toFixed(4)}
          </div>
          <div className="stat-label">{t("minMaxChange")}</div>
        </div>
      </div>
    </div>
  );
}
