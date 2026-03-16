import { useState, useEffect, useRef, Fragment } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchTimeseries } from "../api/client";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import "./TimelineView.css";

const HISTORY_MILESTONES = [
  {
    year: 1978,
    titleKey: "tl_threeNorth",
    descKey: "tl_threeNorthDesc",
    icon: "\u{1F332}",
    color: "#1a9850",
    category: "government",
    stat: { value: "4,480", unit: "km", label: "shelterbelt planned" },
  },
  {
    year: 1986,
    titleKey: "tl_kekeya",
    descKey: "tl_kekeyaDesc",
    icon: "\u{1F33F}",
    color: "#66bd63",
    category: "government",
  },
  {
    year: 1995,
    titleKey: "tl_shelterbelts",
    descKey: "tl_shelterbeltsDesc",
    icon: "\u{1F33F}",
    color: "#91cf60",
    category: "government",
  },
  {
    year: 2000,
    titleKey: "tl_waterDiv",
    descKey: "tl_waterDivDesc",
    icon: "\u{1F4A7}",
    color: "#2da0c3",
    category: "government",
    stat: { value: "8.3B", unit: "m\u00B3", label: "water diverted" },
  },
  {
    year: 2003,
    titleKey: "tl_highway",
    descKey: "tl_highwayDesc",
    icon: "\u{1F6E3}\uFE0F",
    color: "#4a90d9",
    category: "government",
    stat: { value: "436", unit: "km", label: "/ 20M trees" },
  },
  {
    year: 2010,
    titleKey: "tl_expansion",
    descKey: "tl_expansionDesc",
    icon: "\u{1F4C8}",
    color: "#e0a030",
    category: "government",
  },
  {
    year: 2016,
    titleKey: "tl_kekeyaAward",
    descKey: "tl_kekeyaAwardDesc",
    icon: "\u{1F3C6}",
    color: "#f0c040",
    category: "government",
  },
  {
    year: 2020,
    titleKey: "tl_poplarRevival",
    descKey: "tl_poplarRevivalDesc",
    icon: "\u{1F333}",
    color: "#4caf50",
    category: "government",
  },
  {
    year: 2024,
    titleKey: "tl_gapClosed",
    descKey: "tl_gapClosedDesc",
    icon: "\u{1F389}",
    color: "#1a6b35",
    category: "government",
    stat: { value: "3,046", unit: "km", label: "perimeter completed" },
  },
];

const OUR_MILESTONES = [
  {
    year: 2025,
    month: "Dec",
    titleKey: "tl_projectLaunch",
    descKey: "tl_projectLaunchDesc",
    icon: "\u{1F6F0}\uFE0F",
    color: "#6c5ce7",
    category: "ours",
  },
  {
    year: 2026,
    month: "Mar",
    titleKey: "tl_satelliteLive",
    descKey: "tl_satelliteLiveDesc",
    icon: "\u{1F4E1}",
    color: "#00b894",
    category: "ours",
    stat: { value: "225", unit: "pts", label: "monitoring points" },
  },
  {
    year: 2026,
    month: "May",
    titleKey: "tl_snakePrototype",
    descKey: "tl_snakePrototypeDesc",
    icon: "\u{1F40D}",
    color: "#fd79a8",
    category: "ours",
    status: "upcoming",
  },
  {
    year: 2026,
    month: "Jul",
    titleKey: "tl_fieldTrip",
    descKey: "tl_fieldTripDesc",
    icon: "\u{1F3D5}\uFE0F",
    color: "#e17055",
    category: "ours",
    status: "upcoming",
  },
];

// Today's date for completed vs upcoming determination
const TODAY = new Date(2026, 2, 15); // Mar 15, 2026

function isMilestoneCompleted(milestone) {
  const monthIndex = milestone.month
    ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(milestone.month)
    : 11; // Dec if no month
  const milestoneDate = new Date(milestone.year, monthIndex, 15);
  return milestoneDate <= TODAY;
}

// Region geometry for the desert-wide NDVI trend
const DESERT_REGION = {
  type: "Polygon",
  coordinates: [[[78, 37], [88, 37], [88, 42], [78, 42], [78, 37]]],
};

// Milestones that fall within the NDVI chart range (2015-2025)
const CHART_MILESTONES = [
  { year: 2016, label: "Kekeya Award" },
  { year: 2020, label: "Poplar Revival" },
  { year: 2024, label: "Gap Closed" },
  { year: 2025, label: "Project Launch" },
];

function useInView(ref) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

function TimelineCard({ milestone, index, t }) {
  const ref = useRef(null);
  const visible = useInView(ref);
  const isOurs = milestone.category === "ours";
  const isUpcoming = milestone.status === "upcoming";
  const completed = isMilestoneCompleted(milestone);

  return (
    <div
      ref={ref}
      className={`tl2-card ${visible ? "tl2-visible" : ""} ${isOurs ? "tl2-ours" : ""} ${isUpcoming ? "tl2-upcoming" : ""}`}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="tl2-dot-wrapper">
        <div className="tl2-dot" style={{ background: milestone.color, boxShadow: `0 0 12px ${milestone.color}60` }}>
          {completed && isOurs && <span className="tl2-checkmark">✓</span>}
        </div>
      </div>
      <div className="tl2-content" style={{ borderLeftColor: milestone.color }}>
        <div className="tl2-header">
          <span className="tl2-icon">{milestone.icon}</span>
          <span className="tl2-year">
            {milestone.year}
            {milestone.month && <span className="tl2-month"> {milestone.month}</span>}
          </span>
          {isOurs && <span className="tl2-badge-ours">{t("tl_badgeOurs")}</span>}
          {isUpcoming && <span className="tl2-badge-upcoming">Upcoming</span>}
        </div>
        <h3 className="tl2-title">{milestone.titleKey}</h3>
        <p className="tl2-desc">{milestone.descKey}</p>
        {milestone.stat && (
          <div className="tl2-stat-callout">
            <span className="tl2-stat-value">{milestone.stat.value}</span>
            <span className="tl2-stat-unit">{milestone.stat.unit}</span>
            <span className="tl2-stat-label">{milestone.stat.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function NowIndicator({ t }) {
  const ref = useRef(null);
  const visible = useInView(ref);

  return (
    <div ref={ref} className={`tl2-now-indicator ${visible ? "tl2-visible" : ""}`}>
      <div className="tl2-dot-wrapper">
        <div className="tl2-now-dot" />
      </div>
      <div className="tl2-now-label">{t("tl_nowLabel")}</div>
    </div>
  );
}

export default function TimelineView({ onNavigateToProject }) {
  const { t } = useLanguage();
  const [ndviTrend, setNdviTrend] = useState([]);
  const [loadingNdvi, setLoadingNdvi] = useState(true);

  useEffect(() => {
    fetchTimeseries(DESERT_REGION, 2015, 2025)
      .then((res) => {
        if (res.data) setNdviTrend(res.data);
      })
      .catch(() => {})
      .finally(() => setLoadingNdvi(false));
  }, []);

  const allMilestones = [
    ...HISTORY_MILESTONES,
    ...OUR_MILESTONES,
  ].sort((a, b) => a.year - b.year || (a.month || "").localeCompare(b.month || ""));

  // Insert "Now" marker between Mar 2026 (satellite live) and May 2026 (snake prototype)
  const nowInsertIndex = allMilestones.findIndex(
    (m) => m.year === 2026 && m.month === "May"
  );

  return (
    <div className="tl2-view">
      {/* Header */}
      <div className="tl2-page-header">
        <div>
          <h2>{t("viewTimeline")}</h2>
          <p className="tl2-page-subtitle">{t("timelineSubtitle")}</p>
        </div>
      </div>

      {/* NDVI Trend Chart */}
      <div className="tl2-ndvi-panel">
        <div className="tl2-ndvi-header">
          <h3>{t("tl_ndviTrendTitle")}</h3>
          <span className="tl2-ndvi-badge">{loadingNdvi ? "Loading..." : "Sentinel-2 NDVI"}</span>
        </div>
        {ndviTrend.length > 0 ? (
          <div className="tl2-ndvi-chart">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={ndviTrend} margin={{ top: 20, right: 16, bottom: 4, left: 0 }}>
                <XAxis dataKey="year" tick={{ fill: "#9ba8b5", fontSize: 11 }} axisLine={{ stroke: "#2a2a4a" }} tickLine={false} />
                <YAxis domain={["auto", "auto"]} tick={{ fill: "#9ba8b5", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{ background: "#16213e", border: "1px solid #2a2a4a", borderRadius: 8, color: "#e0e0e0", fontSize: 12 }}
                  formatter={(v) => [v.toFixed(4), "Mean NDVI"]}
                />
                {CHART_MILESTONES.map((cm) => (
                  <ReferenceLine
                    key={cm.year}
                    x={cm.year}
                    stroke="#6a6a8a"
                    strokeDasharray="4 3"
                    label={{ value: cm.label, position: "top", fill: "#a0a0c0", fontSize: 9 }}
                  />
                ))}
                <Line type="monotone" dataKey="mean_ndvi" stroke="#91cf60" strokeWidth={2.5} dot={{ fill: "#91cf60", r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : !loadingNdvi ? (
          <div className="tl2-ndvi-empty">{t("tl_ndviNoData")}</div>
        ) : null}
      </div>

      {/* Vertical Timeline */}
      <div className="tl2-line-container">
        <div className="tl2-line" />
        {allMilestones.map((m, i) => (
          <Fragment key={`${m.year}-${m.titleKey}`}>
            {i === nowInsertIndex && <NowIndicator t={t} />}
            <TimelineCard
              milestone={{ ...m, titleKey: t(m.titleKey), descKey: t(m.descKey) }}
              index={i}
              t={t}
            />
          </Fragment>
        ))}
        {nowInsertIndex === -1 && <NowIndicator t={t} />}
      </div>

      {/* Footer */}
      <div className="tl2-footer">
        <p>{t("tl_footerNote")}</p>
      </div>
    </div>
  );
}
