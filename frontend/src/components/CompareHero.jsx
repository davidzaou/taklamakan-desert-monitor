import { useState, useEffect, useRef } from "react";
import { ReactCompareSlider, ReactCompareSliderHandle } from "react-compare-slider";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchGrid, fetchAnalysis } from "../api/client";
import { FiRefreshCw } from "react-icons/fi";
import "./CompareHero.css";

/* ── NDVI helpers (shared with SatellitePlayground) ── */
function ndviColor(v) {
  if (v < 0.05) return [58, 32, 5];
  if (v < 0.1)  return [139, 69, 19];
  if (v < 0.15) return [215, 48, 39];
  if (v < 0.2)  return [252, 141, 89];
  if (v < 0.25) return [254, 224, 139];
  if (v < 0.3)  return [217, 239, 139];
  if (v < 0.4)  return [145, 207, 96];
  if (v < 0.5)  return [76, 175, 80];
  if (v < 0.6)  return [26, 152, 80];
  return [0, 104, 55];
}

const ZONE_PRESETS = [
  { id: "hotan",   label: "Hotan",       labelZh: "和田",     bounds: [79.5, 36.8, 80.5, 37.5] },
  { id: "alar",    label: "Alar",        labelZh: "阿拉尔",   bounds: [80.5, 40.2, 81.5, 40.9] },
  { id: "korla",   label: "Korla",       labelZh: "库尔勒",   bounds: [85.5, 41.4, 86.5, 42.0] },
  { id: "highway", label: "Highway",     labelZh: "沙漠公路", bounds: [83.2, 37.5, 84.0, 39.5] },
  { id: "minfeng", label: "Minfeng",     labelZh: "民丰",     bounds: [82.3, 36.8, 83.2, 37.4] },
];

function makeGeometry(bounds) {
  const [w, s, e, n] = bounds;
  return {
    type: "Polygon",
    coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
  };
}

/* ── Pixel-fill NDVI canvas ── */
function NDVIHeroCanvas({ grid, width, height }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!grid || !grid.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const gridN = Math.round(Math.sqrt(grid.length));
    const lats = grid.map(p => p.lat);
    const lngs = grid.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;

    const srcGrid = new Array(gridN * gridN).fill(null);
    for (const p of grid) {
      const col = Math.round(((p.lng - minLng) / lngRange) * (gridN - 1));
      const row = Math.round(((maxLat - p.lat) / latRange) * (gridN - 1));
      srcGrid[row * gridN + col] = p.ndvi;
    }

    const imgData = ctx.createImageData(width, height);
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const srcCol = Math.round((px / (width - 1)) * (gridN - 1));
        const srcRow = Math.round((py / (height - 1)) * (gridN - 1));
        const ndvi = srcGrid[srcRow * gridN + srcCol];
        if (ndvi == null) continue;
        const [r, g, b] = ndviColor(ndvi);
        const idx = (py * width + px) * 4;
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [grid, width, height]);

  return <canvas ref={canvasRef} className="ch-canvas" />;
}

export default function CompareHero() {
  const { lang } = useLanguage();
  const isZh = lang === "zh";
  const currentYear = new Date().getFullYear();

  const [yearA, setYearA] = useState(2018);
  const [yearB, setYearB] = useState(currentYear);
  const [zone, setZone] = useState(ZONE_PRESETS[0]);
  const [gridA, setGridA] = useState(null);
  const [gridB, setGridB] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 500 });

  // Responsive canvas sizing
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ w: Math.round(rect.width), h: Math.round(rect.height - 120) });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setStats(null);
      const geom = makeGeometry(zone.bounds);
      try {
        const [resA, resB, analysis] = await Promise.all([
          fetchGrid(geom, yearA, 30),
          fetchGrid(geom, yearB, 30),
          fetchAnalysis(geom, yearA, yearB),
        ]);
        if (cancelled) return;
        setGridA(resA.data);
        setGridB(resB.data);
        setStats(analysis.data);
      } catch {
        if (cancelled) return;
        setGridA(null);
        setGridB(null);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [yearA, yearB, zone]);

  const cw = Math.max(200, canvasSize.w);
  const ch = Math.max(200, canvasSize.h);

  return (
    <div className="ch-container" ref={containerRef}>
      {/* Controls bar */}
      <div className="ch-controls">
        <div className="ch-zone-presets">
          {ZONE_PRESETS.map(z => (
            <button
              key={z.id}
              className={`ch-zone-btn ${zone.id === z.id ? "active" : ""}`}
              onClick={() => setZone(z)}
            >
              {isZh ? z.labelZh : z.label}
            </button>
          ))}
        </div>
        <div className="ch-year-selectors">
          <select value={yearA} onChange={e => setYearA(+e.target.value)}>
            {Array.from({ length: 10 }, (_, i) => currentYear - 9 + i).map(y => (
              <option key={y}>{y}</option>
            ))}
          </select>
          <span className="ch-vs">vs</span>
          <select value={yearB} onChange={e => setYearB(+e.target.value)}>
            {Array.from({ length: 10 }, (_, i) => currentYear - 9 + i).map(y => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison area */}
      <div className="ch-slider-wrapper">
        {loading ? (
          <div className="ch-loading">
            <FiRefreshCw size={24} className="ch-spin" />
            <span>{isZh ? "加载卫星数据..." : "Loading satellite data..."}</span>
          </div>
        ) : gridA && gridB ? (
          <>
            <ReactCompareSlider
              itemOne={
                <div className="ch-pane">
                  <NDVIHeroCanvas grid={gridA} width={cw} height={ch} />
                  <div className="ch-year-label ch-left">{yearA}</div>
                </div>
              }
              itemTwo={
                <div className="ch-pane">
                  <NDVIHeroCanvas grid={gridB} width={cw} height={ch} />
                  <div className="ch-year-label ch-right">{yearB}</div>
                </div>
              }
              handle={
                <ReactCompareSliderHandle
                  buttonStyle={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#4fc3f7",
                    border: "3px solid #fff",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                  }}
                  linesStyle={{ width: 3, color: "#4fc3f7" }}
                />
              }
              style={{ width: "100%", height: "100%", borderRadius: 12 }}
            />

            {/* Stats bar */}
            {stats && (
              <div className="ch-stats-bar">
                <div className="ch-stat">
                  <span className="ch-stat-val" style={{ color: stats.mean_change >= 0 ? "#4CAF50" : "#ef5350" }}>
                    {stats.mean_change >= 0 ? "+" : ""}{stats.mean_change?.toFixed(4)}
                  </span>
                  <span className="ch-stat-lbl">{isZh ? "NDVI均值变化" : "Mean NDVI Change"}</span>
                </div>
                <div className="ch-stat">
                  <span className="ch-stat-val" style={{ color: "#4CAF50" }}>{stats.area_improved_pct}%</span>
                  <span className="ch-stat-lbl">{isZh ? "改善区域" : "Improved"}</span>
                </div>
                <div className="ch-stat">
                  <span className="ch-stat-val" style={{ color: "#ef5350" }}>{stats.area_degraded_pct}%</span>
                  <span className="ch-stat-lbl">{isZh ? "退化区域" : "Degraded"}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="ch-loading">
            <span>{isZh ? "暂无数据" : "No data available"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
