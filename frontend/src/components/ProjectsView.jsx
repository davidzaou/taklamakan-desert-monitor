import { useState, useEffect, useMemo, useRef } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchTimeseries } from "../api/client";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { FiSearch, FiChevronDown, FiChevronUp, FiMapPin, FiCalendar, FiLayers } from "react-icons/fi";
import "./ProjectsView.css";

const OUR_INITIATIVES = [
  {
    id: "initiative_satellite",
    titleKey: "proj_satellite",
    descKey: "proj_satelliteDesc",
    icon: "\u{1F4E1}",
    color: "#00b894",
    statusKey: "proj_statusLive",
    nextKey: "proj_satelliteNext",
    pillar: 1,
  },
  {
    id: "initiative_snake",
    titleKey: "proj_snake",
    descKey: "proj_snakeDesc",
    icon: "\u{1F40D}",
    color: "#fd79a8",
    statusKey: "proj_statusDesign",
    nextKey: "proj_snakeNext",
    pillar: 2,
  },
  {
    id: "initiative_field",
    titleKey: "proj_field",
    descKey: "proj_fieldDesc",
    icon: "\u{1F3D5}\uFE0F",
    color: "#e17055",
    statusKey: "proj_statusPlanning",
    nextKey: "proj_fieldNext",
    pillar: 3,
  },
];

const FILTER_TABS = [
  { key: "all", labelKey: "allCategories" },
  { key: "ours", labelKey: "proj_filterOurs" },
  { key: "vegetation", labelKey: "vegetation" },
  { key: "project", labelKey: "project" },
];

function NdviSparkline({ geometry }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!geometry) return;
    fetchTimeseries(geometry, 2018, 2025)
      .then((res) => { if (res.data) setData(res.data); })
      .catch(() => {});
  }, [geometry]);

  if (!data || data.length === 0) {
    return <div className="pv2-sparkline-empty">--</div>;
  }

  const lastVal = data[data.length - 1]?.mean_ndvi;
  const firstVal = data[0]?.mean_ndvi;
  const trend = lastVal > firstVal ? "up" : lastVal < firstVal ? "down" : "flat";

  return (
    <div className="pv2-sparkline-wrapper">
      <ResponsiveContainer width="100%" height={36}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Line
            type="monotone"
            dataKey="mean_ndvi"
            stroke={trend === "up" ? "#91cf60" : trend === "down" ? "#d73027" : "#e0a030"}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <span className={`pv2-sparkline-val ${trend}`}>{lastVal?.toFixed(3)}</span>
    </div>
  );
}

function ProjectCard({ feature, expanded, onToggle, lang }) {
  const name = lang === "zh" ? feature.name_zh : feature.name_en;
  const desc = lang === "zh" ? feature.description_zh : feature.description_en;
  const stats = feature.stats || {};

  return (
    <div className={`pv2-card ${expanded ? "pv2-expanded" : ""}`}>
      <div className="pv2-card-header" onClick={onToggle}>
        <div className="pv2-card-main">
          <span className={`pv2-category-dot ${feature.category}`} />
          <div className="pv2-card-info">
            <h3 className="pv2-card-name">{name}</h3>
            <div className="pv2-card-meta">
              {stats.area_sqkm && <span><FiLayers size={11} /> {stats.area_sqkm.toLocaleString()} km\u00B2</span>}
              {stats.length_km && <span><FiMapPin size={11} /> {stats.length_km.toLocaleString()} km</span>}
              {stats.planted_year && <span><FiCalendar size={11} /> {stats.planted_year}</span>}
              {stats.start_year && <span><FiCalendar size={11} /> {stats.start_year}</span>}
            </div>
          </div>
        </div>
        <div className="pv2-card-right">
          <NdviSparkline geometry={feature.geometry} />
          {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </div>
      </div>

      {expanded && (
        <div className="pv2-card-detail">
          <p className="pv2-card-desc">{desc}</p>
          <div className="pv2-card-stats">
            {stats.tree_species && <div className="pv2-stat"><span className="pv2-stat-label">Species</span><span className="pv2-stat-val">{stats.tree_species}</span></div>}
            {stats.trees_planted && <div className="pv2-stat"><span className="pv2-stat-label">Trees Planted</span><span className="pv2-stat-val">{stats.trees_planted}</span></div>}
            {stats.perimeter_km && <div className="pv2-stat"><span className="pv2-stat-label">Perimeter</span><span className="pv2-stat-val">{stats.perimeter_km.toLocaleString()} km</span></div>}
            {stats.water_delivered_billion_m3 && <div className="pv2-stat"><span className="pv2-stat-label">Water Delivered</span><span className="pv2-stat-val">{stats.water_delivered_billion_m3}B m\u00B3</span></div>}
            {stats.gap_closed_year && <div className="pv2-stat"><span className="pv2-stat-label">Gap Closed</span><span className="pv2-stat-val">{stats.gap_closed_year}</span></div>}
            {stats.poplar_restored_sqkm && <div className="pv2-stat"><span className="pv2-stat-label">Poplar Restored</span><span className="pv2-stat-val">{stats.poplar_restored_sqkm.toLocaleString()} km\u00B2</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectsView({ features, onSelectFeature }) {
  const { lang, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const projectFeatures = useMemo(() => {
    return features.filter(
      (f) => f.category === "project" || f.category === "vegetation"
    );
  }, [features]);

  const filtered = useMemo(() => {
    let list = projectFeatures;

    if (activeTab === "vegetation") {
      list = list.filter((f) => f.category === "vegetation");
    } else if (activeTab === "project") {
      list = list.filter((f) => f.category === "project");
    } else if (activeTab === "ours") {
      list = [];
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.name_en.toLowerCase().includes(q) ||
          f.name_zh.includes(q)
      );
    }
    return list;
  }, [projectFeatures, search, activeTab]);

  return (
    <div className="pv2-view">
      {/* Header */}
      <div className="pv2-header">
        <div>
          <h2>{t("viewProjects")}</h2>
          <p className="pv2-subtitle">{t("proj_subtitle")}</p>
        </div>
        <div className="pv2-search">
          <FiSearch size={14} />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="pv2-tabs">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`pv2-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Our Initiatives */}
      {(activeTab === "all" || activeTab === "ours") && !search && (
        <div className="pv2-initiatives">
          <h3 className="pv2-section-title">{t("proj_ourInitiatives")}</h3>
          <div className="pv2-initiative-grid">
            {OUR_INITIATIVES.map((init) => (
              <div key={init.id} className="pv2-initiative-card" style={{ borderTopColor: init.color }}>
                <div className="pv2-init-header">
                  <span className="pv2-init-icon">{init.icon}</span>
                  <span className="pv2-init-pillar">Pillar {init.pillar}</span>
                </div>
                <h4 className="pv2-init-title">{t(init.titleKey)}</h4>
                <p className="pv2-init-desc">{t(init.descKey)}</p>
                <div className="pv2-init-footer">
                  <span className="pv2-init-status" style={{ color: init.color }}>{t(init.statusKey)}</span>
                  <span className="pv2-init-next">{t(init.nextKey)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Cards */}
      {activeTab !== "ours" && (
        <div className="pv2-cards-section">
          <h3 className="pv2-section-title">
            {activeTab === "vegetation" ? t("proj_greenBelts") : activeTab === "project" ? t("proj_govProjects") : t("proj_allProjects")}
            <span className="pv2-count">{filtered.length}</span>
          </h3>
          <div className="pv2-cards">
            {filtered.map((f) => (
              <ProjectCard
                key={f.id}
                feature={f}
                expanded={expandedId === f.id}
                onToggle={() => setExpandedId(expandedId === f.id ? null : f.id)}
                lang={lang}
              />
            ))}
            {filtered.length === 0 && (
              <div className="pv2-empty">{t("noResults")}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
