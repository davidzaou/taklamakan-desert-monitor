import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchDashboard } from "../api/client";
import { SatelliteBeforeAfter } from "./SatellitePhoto";
import SatellitePhoto from "./SatellitePhoto";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiEye, FiGitPullRequest, FiRefreshCw } from "react-icons/fi";
import useDataCache from "../hooks/useDataCache";
import { fetchDataSource } from "../api/client";
import "./MonitorView.css";

const API = import.meta.env.DEV ? "http://localhost:8001/api" : "/api";

const ZONES = [
  { id: "hotan",   label: "Hotan",       bounds: [79.5, 36.8, 80.5, 37.5] },
  { id: "alar",    label: "Alar",        bounds: [80.5, 40.2, 81.5, 40.9] },
  { id: "korla",   label: "Korla",       bounds: [85.5, 41.4, 86.5, 42.0] },
  { id: "highway", label: "Highway",     bounds: [83.2, 37.5, 84.0, 39.5] },
  { id: "minfeng", label: "Minfeng",     bounds: [82.3, 36.8, 83.2, 37.4] },
];

export default function MonitorView() {
  const { t, lang } = useLanguage();
  const { data: dashboard } = useDataCache("dashboard", fetchDashboard);
  const { data: dataSource } = useDataCache("data-source", fetchDataSource);
  const [zone, setZone] = useState(ZONES[0]);
  const [compareYear, setCompareYear] = useState(2018);
  const [geeStats, setGeeStats] = useState(null);
  const [geeChange, setGeeChange] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);

  const isLive = dataSource?.source === "gee";

  // Fetch real GEE stats for selected zone
  const fetchStats = useCallback(() => {
    setStatsLoading(true);
    setGeeStats(null);
    fetch(`${API}/satellite/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bounds: zone.bounds, year: 2024 }),
    }).then(r => r.json()).then(d => {
      setGeeStats(d);
      setStatsLoading(false);
    }).catch(() => setStatsLoading(false));
  }, [zone]);

  // Fetch real GEE change detection
  const fetchChange = useCallback(() => {
    setChangeLoading(true);
    setGeeChange(null);
    fetch(`${API}/satellite/change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bounds: zone.bounds, year1: compareYear, year2: 2024 }),
    }).then(r => r.json()).then(d => {
      setGeeChange(d);
      setChangeLoading(false);
    }).catch(() => setChangeLoading(false));
  }, [zone, compareYear]);

  // Auto-fetch on zone change
  useEffect(() => { fetchStats(); fetchChange(); }, [fetchStats, fetchChange]);

  return (
    <div className="monitor-view">
      {/* ── HEADER ── */}
      <div className="mon-header">
        <div>
          <h2>{lang === "zh" ? "环境监测" : "Environmental Monitor"}</h2>
          <p className="mon-subtitle">{lang === "zh" ? "基于Sentinel-2卫星的实时植被监测" : "Real-time vegetation monitoring via Sentinel-2"}</p>
        </div>
        <div className="mon-source-badge" data-live={isLive}>
          <span className="mon-source-dot" />
          {isLive ? "LIVE — Sentinel-2" : "DEMO DATA"}
        </div>
      </div>

      {/* ── ZONE SELECTOR ── */}
      <div className="mon-zone-bar">
        {ZONES.map(z => (
          <button key={z.id} className={`mon-zone-btn ${zone.id === z.id ? "active" : ""}`} onClick={() => setZone(z)}>
            {z.label}
          </button>
        ))}
      </div>

      <div className="mon-body">
        {/* ── LEFT: Visual evidence ── */}
        <div className="mon-left">
          {/* Before/After satellite comparison — the hero */}
          <div className="mon-hero-card">
            <div className="mon-hero-header">
              <h3><FiGitPullRequest size={14} /> {lang === "zh" ? "卫星变化对比" : "Satellite Change Comparison"}</h3>
              <div className="mon-compare-ctrl">
                <select value={compareYear} onChange={e => setCompareYear(+e.target.value)}>
                  {[2017, 2018, 2019, 2020, 2021, 2022, 2023].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span className="mon-vs">→ 2024</span>
              </div>
            </div>
            <SatelliteBeforeAfter
              bounds={zone.bounds}
              yearBefore={compareYear}
              yearAfter={2024}
              band="truecolor"
              width={900}
            />
          </div>

          {/* NDVI view of the same region */}
          <div className="mon-ndvi-row">
            <div className="mon-ndvi-card">
              <h4>{lang === "zh" ? "植被指数 (NDVI)" : "Vegetation Index (NDVI)"} — 2024</h4>
              <SatellitePhoto bounds={zone.bounds} year={2024} band="ndvi" width={500} className="mon-ndvi-img" />
            </div>
            <div className="mon-ndvi-card">
              <h4>{lang === "zh" ? "真彩色影像" : "True Color Imagery"} — 2024</h4>
              <SatellitePhoto bounds={zone.bounds} year={2024} band="truecolor" width={500} className="mon-ndvi-img" />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Data & analysis ── */}
        <div className="mon-right">
          {/* Key metrics from GEE */}
          <div className="mon-panel">
            <h4>
              <FiEye size={13} /> {lang === "zh" ? "区域数据" : "Region Data"} — {zone.label}
              {statsLoading && <span className="mon-loading-dot" />}
              {geeStats && <span className={`mon-src-tag ${geeStats.source === "gee" ? "gee" : ""}`}>{geeStats.source === "gee" ? "GEE" : "DEMO"}</span>}
            </h4>
            {geeStats ? (
              <div className="mon-stats-grid">
                <div className="mon-stat">
                  <span className="mon-stat-val" style={{ color: "#91cf60" }}>{geeStats.mean?.toFixed(3) ?? "—"}</span>
                  <span className="mon-stat-lbl">Mean NDVI</span>
                </div>
                <div className="mon-stat">
                  <span className="mon-stat-val" style={{ color: "#4CAF50" }}>{geeStats.vegPct != null ? `${geeStats.vegPct}%` : "—"}</span>
                  <span className="mon-stat-lbl">{lang === "zh" ? "植被覆盖" : "Vegetated"}</span>
                </div>
                <div className="mon-stat">
                  <span className="mon-stat-val" style={{ color: "#D4A843" }}>{geeStats.barePct != null ? `${geeStats.barePct}%` : "—"}</span>
                  <span className="mon-stat-lbl">{lang === "zh" ? "裸地" : "Bare Land"}</span>
                </div>
                <div className="mon-stat">
                  <span className="mon-stat-val" style={{ color: "#1a9850" }}>{geeStats.max?.toFixed(3) ?? "—"}</span>
                  <span className="mon-stat-lbl">Peak NDVI</span>
                </div>
              </div>
            ) : (
              <div className="mon-stats-loading">{lang === "zh" ? "正在获取卫星数据..." : "Fetching satellite data..."}</div>
            )}
          </div>

          {/* Change detection results from GEE */}
          <div className="mon-panel">
            <h4>
              <FiGitPullRequest size={13} /> {lang === "zh" ? "变化检测" : "Change Detection"} ({compareYear}→2024)
              {changeLoading && <span className="mon-loading-dot" />}
              {geeChange && <span className={`mon-src-tag ${geeChange.source === "gee" ? "gee" : ""}`}>{geeChange.source === "gee" ? "GEE" : "DEMO"}</span>}
            </h4>
            {geeChange ? (
              <div className="mon-change-results">
                <div className="mon-change-bar">
                  <div className="mon-change-gain" style={{ width: `${geeChange.gainedPct}%` }} />
                  <div className="mon-change-stable" style={{ width: `${geeChange.stablePct}%` }} />
                  <div className="mon-change-loss" style={{ width: `${geeChange.lostPct}%` }} />
                </div>
                <div className="mon-change-legend">
                  <span className="mon-change-item"><span className="mon-dot gain" />{lang === "zh" ? "植被增长" : "Vegetation Gain"}: <strong>{geeChange.gainedPct}%</strong></span>
                  <span className="mon-change-item"><span className="mon-dot stable" />{lang === "zh" ? "稳定" : "Stable"}: <strong>{geeChange.stablePct}%</strong></span>
                  <span className="mon-change-item"><span className="mon-dot loss" />{lang === "zh" ? "退化" : "Loss"}: <strong>{geeChange.lostPct}%</strong></span>
                </div>
                <div className="mon-change-mean">
                  {lang === "zh" ? "NDVI均值变化" : "Mean NDVI Change"}: <strong style={{ color: geeChange.meanChange >= 0 ? "#4CAF50" : "#ef5350" }}>
                    {geeChange.meanChange >= 0 ? "+" : ""}{geeChange.meanChange?.toFixed(4) ?? "—"}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="mon-stats-loading">{lang === "zh" ? "正在分析变化..." : "Analyzing changes..."}</div>
            )}
          </div>

          {/* Quick summary metrics */}
          {dashboard && (
            <div className="mon-panel">
              <h4>{lang === "zh" ? "全局概况" : "Global Overview"} <span className="mon-src-tag">CACHED</span></h4>
              <div className="mon-global-stats">
                <div className="mon-global-row">
                  <span>{lang === "zh" ? "绿化总面积" : "Total Green Area"}</span>
                  <strong>{dashboard.total_green_area_sqkm?.toLocaleString()} km²</strong>
                </div>
                <div className="mon-global-row">
                  <span>{lang === "zh" ? "沙漠面积" : "Desert Area"}</span>
                  <strong>{dashboard.total_desert_area_sqkm?.toLocaleString()} km²</strong>
                </div>
                <div className="mon-global-row">
                  <span>{lang === "zh" ? "防护林总长" : "Shelterbelt Length"}</span>
                  <strong>{dashboard.total_shelterbelt_km?.toLocaleString()} km</strong>
                </div>
                <div className="mon-global-row">
                  <span>{lang === "zh" ? "同比绿化增长" : "YoY Green Growth"}</span>
                  <strong style={{ color: "#4CAF50" }}>+{dashboard.yoy_green_change_pct}%</strong>
                </div>
              </div>
            </div>
          )}

          {/* Refresh button */}
          <button className="mon-refresh-btn" onClick={() => { fetchStats(); fetchChange(); }}>
            <FiRefreshCw size={14} />
            {lang === "zh" ? "重新获取数据" : "Refresh Data"}
          </button>

          {/* Data source info */}
          <div className="mon-panel mon-info-panel">
            <div className="mon-info-row"><span>Source</span><span>{isLive ? "Sentinel-2 L2A (10m)" : "Simulated"}</span></div>
            <div className="mon-info-row"><span>Period</span><span>Apr–Oct growing season</span></div>
            <div className="mon-info-row"><span>Cloud mask</span><span>{isLive ? "SCL-based, <20%" : "N/A"}</span></div>
            <div className="mon-info-row"><span>Composite</span><span>Seasonal median</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
