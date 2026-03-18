import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, useMapEvents, Rectangle } from "react-leaflet";
import L from "leaflet";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchGrid, fetchAnalysis, fetchTimeseries, fetchNdviGridCache } from "../api/client";
import { FiCrosshair, FiLayers, FiSliders, FiX, FiInfo, FiRefreshCw, FiRadio, FiPlay, FiPause, FiColumns, FiDownload } from "react-icons/fi";
import CompareHero from "./CompareHero";
import { exportTimeseriesCSV, exportGridCSV } from "../utils/exportCSV";
import { exportReport } from "../utils/exportReport";
import { DESERT_OUTLINE, GREEN_BELT_SEGMENTS } from "../data/mapShapes";
import { hasCacheEntry } from "../hooks/useDataCache";
import "leaflet/dist/leaflet.css";
import "./SatellitePlayground.css";

/* ── Zone presets (ported from SatelliteView) ── */
const ZONE_PRESETS = [
  { id: "hotan",   label: "Hotan",       bounds: [[36.8, 79.5], [37.5, 80.5]] },
  { id: "alar",    label: "Alar",        bounds: [[40.2, 80.5], [40.9, 81.5]] },
  { id: "korla",   label: "Korla",       bounds: [[41.4, 85.5], [42.0, 86.5]] },
  { id: "highway", label: "Highway",     bounds: [[37.5, 83.2], [39.5, 84.0]] },
  { id: "minfeng", label: "Minfeng",     bounds: [[36.8, 82.3], [37.4, 83.2]] },
  { id: "full",    label: "Full Desert", bounds: [[36, 75], [43, 90]] },
];

/* ── NDVI helpers ── */
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

function classifyNdvi(v) {
  if (v < 0.1) return { en: "Bare Sand", zh: "\u88F8\u6C99", color: "#8B4513" };
  if (v < 0.2) return { en: "Very Sparse", zh: "\u6781\u7A00\u758F", color: "#D4A843" };
  if (v < 0.3) return { en: "Sparse Scrub", zh: "\u7A00\u758F\u704C\u4E1B", color: "#CDDC39" };
  if (v < 0.45) return { en: "Grassland", zh: "\u8349\u5730", color: "#8BC34A" };
  if (v < 0.6) return { en: "Shrubland", zh: "\u704C\u6728\u6797", color: "#4CAF50" };
  return { en: "Forest/Dense", zh: "\u5BC6\u6797", color: "#1B5E20" };
}

/* Find nearest point in cached grid */
function findNearest(grid, lat, lng) {
  if (!grid || !grid.length) return null;
  let best = null, bestDist = Infinity;
  for (const p of grid) {
    const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2;
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best;
}

/* ── Cities ── */
const CITIES = [
  { name: "Hotan", zh: "\u548C\u7530", pos: [37.13, 79.93] },
  { name: "Korla", zh: "\u5E93\u5C14\u52D2", pos: [41.76, 86.15] },
  { name: "Alar", zh: "\u963F\u62C9\u5C14", pos: [40.55, 81.28] },
  { name: "Kashgar", zh: "\u5580\u4EC0", pos: [39.47, 75.99] },
  { name: "Aksu", zh: "\u963F\u514B\u82CF", pos: [41.17, 80.26] },
  { name: "Kuqa", zh: "\u5E93\u8F66", pos: [41.73, 82.94] },
];

function cityIcon() {
  return L.divIcon({
    className: "pg-city-icon",
    html: '<div class="pg-city-dot"></div>',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

/* ── NDVI Canvas Overlay ── */
function NdviOverlay({ grid, bounds, opacity }) {
  const map = useMap();

  useEffect(() => {
    if (!grid || !grid.length || !bounds) return;

    const gridN = Math.round(Math.sqrt(grid.length));
    const canvasSize = Math.max(gridN, 200);
    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.createImageData(canvasSize, canvasSize);

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

    const alpha = Math.round(opacity * 255);
    for (let py = 0; py < canvasSize; py++) {
      for (let px = 0; px < canvasSize; px++) {
        const srcCol = Math.round((px / (canvasSize - 1)) * (gridN - 1));
        const srcRow = Math.round((py / (canvasSize - 1)) * (gridN - 1));
        const ndvi = srcGrid[srcRow * gridN + srcCol];
        if (ndvi == null) continue;
        const [r, g, b] = ndviColor(ndvi);
        const idx = (py * canvasSize + px) * 4;
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = alpha;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const imageBounds = [[bounds[1], bounds[0]], [bounds[3], bounds[2]]];
    const overlay = L.imageOverlay(canvas.toDataURL(), imageBounds, { opacity: 1, interactive: false });
    overlay.addTo(map);

    return () => { map.removeLayer(overlay); };
  }, [grid, bounds, opacity, map]);

  return null;
}

/* ── Map resize fix ── */
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 200);
    const observer = new ResizeObserver(() => map.invalidateSize());
    if (map.getContainer().parentElement) observer.observe(map.getContainer().parentElement);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [map]);
  return null;
}

/* ── Click handler ── */
function MapClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
}

/* ── Draw rectangle handler ── */
function DrawRectangle({ active, onDrawn }) {
  const map = useMap();
  const rectRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    function onMouseDown(e) {
      startRef.current = e.latlng;
      map.dragging.disable();
    }
    function onMouseMove(e) {
      if (!startRef.current) return;
      const bounds = L.latLngBounds(startRef.current, e.latlng);
      if (rectRef.current) rectRef.current.setBounds(bounds);
      else {
        rectRef.current = L.rectangle(bounds, {
          color: "#4fc3f7", weight: 2, fillColor: "#4fc3f7", fillOpacity: 0.15, dashArray: "6 4",
        }).addTo(map);
      }
    }
    function onMouseUp(e) {
      map.dragging.enable();
      if (!startRef.current) return;
      const bounds = L.latLngBounds(startRef.current, e.latlng);
      startRef.current = null;
      if (rectRef.current) { map.removeLayer(rectRef.current); rectRef.current = null; }
      const sw = bounds.getSouthWest(), ne = bounds.getNorthEast();
      if (Math.abs(ne.lat - sw.lat) > 0.05 && Math.abs(ne.lng - sw.lng) > 0.05) {
        onDrawn([sw.lng, sw.lat, ne.lng, ne.lat]);
      }
    }

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);
    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
      map.dragging.enable();
      if (rectRef.current) { map.removeLayer(rectRef.current); rectRef.current = null; }
    };
  }, [active, map, onDrawn]);

  return null;
}

/* ── FlyToZone helper ── */
function FlyToZone({ zone }) {
  const map = useMap();
  useEffect(() => {
    if (zone) map.flyToBounds(zone.bounds, { padding: [20, 20], duration: 0.8 });
  }, [zone, map]);
  return null;
}

/* ── MAIN COMPONENT ── */
export default function SatellitePlayground() {
  const { lang } = useLanguage();
  const isZh = lang === "zh";

  // Cached NDVI grid (loaded once from backend — real GEE or demo)
  const [cachedGrid, setCachedGrid] = useState(null);
  const [cacheSource, setCacheSource] = useState(null);
  const [cacheLoading, setCacheLoading] = useState(true);

  // State
  const currentYear = new Date().getFullYear();
  const [mode, setMode] = useState("click");
  const [year, setYear] = useState(() => {
    const saved = localStorage.getItem("pg-year");
    return saved ? +saved : currentYear;
  });
  const [yearB, setYearB] = useState(() => {
    const saved = localStorage.getItem("pg-yearB");
    return saved ? +saved : 2018;
  });
  const [tileLayer, setTileLayer] = useState("satellite");
  const [ndviOpacity, setNdviOpacity] = useState(0.7);

  // Zone presets (ported from SatelliteView)
  const [selectedZone, setSelectedZone] = useState(() => {
    const savedId = localStorage.getItem("pg-zone");
    return (savedId && ZONE_PRESETS.find(z => z.id === savedId)) || null;
  });

  // Time-lapse playback (ported from SatelliteView)
  const [playing, setPlaying] = useState(false);

  // Click inspect
  const [clickedPos, setClickedPos] = useState(null);
  const [clickedData, setClickedData] = useState(null);
  const [clickLoading, setClickLoading] = useState(false);

  // Draw region
  const [drawnBounds, setDrawnBounds] = useState(null);
  const [regionGrid, setRegionGrid] = useState(null);
  const [regionStats, setRegionStats] = useState(null);
  const [regionLoading, setRegionLoading] = useState(false);
  const [regionSource, setRegionSource] = useState(null);
  const [changeData, setChangeData] = useState(null);

  // Panel
  const [panelOpen, setPanelOpen] = useState(false);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);

  // Load cached NDVI grid on mount — skip if already in data cache
  useEffect(() => {
    if (hasCacheEntry("ndvi-grid")) {
      setCacheLoading(false);
      return;
    }
    let timeoutId;
    let retries = 0;
    const MAX_RETRIES = 5;
    function poll() {
      fetchNdviGridCache().then(res => {
        retries = 0;
        if (res.status === "ready") {
          setCachedGrid(res.data);
          setCacheSource(res.source);
          setCacheLoading(false);
        } else {
          timeoutId = setTimeout(poll, 3000);
        }
      }).catch(() => {
        retries++;
        if (retries < MAX_RETRIES) {
          timeoutId = setTimeout(poll, 3000 * retries);
        } else {
          setCacheLoading(false);
        }
      });
    }
    poll();
    return () => clearTimeout(timeoutId);
  }, []);

  // Persist year/zone selections to localStorage
  useEffect(() => { localStorage.setItem("pg-year", year); }, [year]);
  useEffect(() => { localStorage.setItem("pg-yearB", yearB); }, [yearB]);
  useEffect(() => {
    if (selectedZone) localStorage.setItem("pg-zone", selectedZone.id);
  }, [selectedZone]);

  // Time-lapse playback effect (ported from SatelliteView)
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setYear(y => {
        if (y >= currentYear) { setPlaying(false); return currentYear; }
        return y + 1;
      });
    }, 800);
    return () => clearInterval(id);
  }, [playing, currentYear]);

  // Keyboard shortcuts (ported from SatelliteView)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); setYear(y => Math.max(currentYear - 9, y - 1)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); setYear(y => Math.min(currentYear, y + 1)); }
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying(p => {
          if (!p) setYear(y => y >= currentYear ? currentYear - 9 : y);
          return !p;
        });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentYear]);

  // Desert/green belt polygons
  const desertPolygon = useMemo(() =>
    DESERT_OUTLINE.map(([lng, lat]) => [lat, lng]), []);

  const greenBeltLines = useMemo(() =>
    GREEN_BELT_SEGMENTS.map(seg => ({
      ...seg,
      positions: seg.points.map(([lng, lat]) => [lat, lng]),
    })), []);

  // Handle click — use cached grid for instant lookup, then fetch real timeseries
  const handleMapClick = useCallback(async (latlng) => {
    if (mode !== "click") return;
    const { lat, lng } = latlng;

    const nearest = findNearest(cachedGrid, lat, lng);
    const ndviNow = nearest ? nearest.ndvi : 0;
    const cls = classifyNdvi(ndviNow);

    setClickedPos(latlng);
    setClickedData({ lat, lng, ndvi: ndviNow, cls, source: cacheSource, timeseries: null, loading: true });
    setPanelOpen(true);
    setDrawnBounds(null);
    setRegionGrid(null);
    setRegionStats(null);
    setChangeData(null);
    setClickLoading(true);

    try {
      const pointGeom = {
        type: "Polygon",
        coordinates: [[[lng - 0.05, lat - 0.05], [lng + 0.05, lat - 0.05], [lng + 0.05, lat + 0.05], [lng - 0.05, lat + 0.05], [lng - 0.05, lat - 0.05]]],
      };
      const tsResult = await fetchTimeseries(pointGeom, 2016, currentYear);
      const ts = tsResult.data || [];

      const ndviYear = ts.find(d => d.year === year)?.mean_ndvi ?? ndviNow;
      const ndviYearB = ts.find(d => d.year === yearB)?.mean_ndvi ?? 0;
      const clsUpdated = classifyNdvi(ndviYear);

      setClickedData({
        lat, lng,
        ndvi: ndviYear,
        ndviB: ndviYearB,
        cls: clsUpdated,
        change: ndviYear - ndviYearB,
        timeseries: ts,
        source: tsResult.source || cacheSource,
        loading: false,
      });
    } catch {
      setClickedData(prev => prev ? { ...prev, loading: false, ndviB: 0, change: 0, timeseries: [] } : null);
    }
    setClickLoading(false);
  }, [mode, year, yearB, cachedGrid, cacheSource, currentYear]);

  // Handle drawn rectangle
  const handleDrawn = useCallback(async (bounds) => {
    setDrawnBounds(bounds);
    setClickedPos(null);
    setClickedData(null);
    setPanelOpen(true);
    setRegionLoading(true);
    setChangeData(null);
    setRegionSource(null);

    const geometry = {
      type: "Polygon",
      coordinates: [[[bounds[0], bounds[1]], [bounds[2], bounds[1]], [bounds[2], bounds[3]], [bounds[0], bounds[3]], [bounds[0], bounds[1]]]],
    };

    try {
      const [gridResult, changeResult] = await Promise.all([
        fetchGrid(geometry, year, 30),
        fetchAnalysis(geometry, yearB, year),
      ]);
      const grid = gridResult.data;
      setRegionGrid(grid);
      setRegionSource(gridResult.source || "unknown");

      if (grid && grid.length) {
        const ndvis = grid.map(p => p.ndvi);
        const mean = ndvis.reduce((a, b) => a + b, 0) / ndvis.length;
        const vegPct = (ndvis.filter(v => v > 0.2).length / ndvis.length * 100).toFixed(0);
        const barePct = (ndvis.filter(v => v < 0.1).length / ndvis.length * 100).toFixed(0);
        setRegionStats({ mean, max: Math.max(...ndvis), min: Math.min(...ndvis), vegPct, barePct, count: grid.length });
      }
      setChangeData(changeResult.data);
    } catch {
      setRegionStats(null);
    }
    setRegionLoading(false);
  }, [year, yearB]);

  // Refresh drawn region when year changes
  useEffect(() => {
    if (drawnBounds) handleDrawn(drawnBounds);
  }, [year, yearB]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleZoneClick(zone) {
    setSelectedZone(zone);
  }

  function handlePlayToggle() {
    if (!playing && year >= currentYear) setYear(currentYear - 9);
    setPlaying(p => !p);
  }

  // If compare mode is active, render CompareHero
  if (compareMode) {
    return (
      <div className="pg-container">
        <div className="pg-map-wrapper" style={{ position: "relative" }}>
          <CompareHero onClose={() => setCompareMode(false)} />
          <button
            className="pg-tool-btn pg-compare-exit"
            onClick={() => setCompareMode(false)}
            title={isZh ? "退出对比" : "Exit compare"}
            style={{ position: "absolute", top: 10, left: 10, zIndex: 1200, background: "rgba(13,17,23,0.9)", border: "1px solid #1e2a3a" }}
          >
            <FiX size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pg-container">
      {/* ── MAP ── */}
      <div className="pg-map-wrapper">
        <MapContainer center={[39.0, 82.5]} zoom={6} minZoom={5} maxZoom={13} zoomControl={false} className="pg-leaflet-map">
          <MapResizer />
          <FlyToZone zone={selectedZone} />

          {tileLayer === "satellite" ? (
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Esri Satellite" maxZoom={18} />
          ) : (
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap" />
          )}

          <Polygon positions={desertPolygon} pathOptions={{ color: "#c9a96e", weight: 2, fillColor: "#c9a96e", fillOpacity: 0.06, dashArray: "8 4" }} />

          {greenBeltLines.map(seg => (
            <Polygon key={seg.id} positions={seg.positions} pathOptions={{ color: "#66bb6a", weight: 3, fillOpacity: 0, opacity: 0.6 }} />
          ))}

          {CITIES.map(c => (
            <Marker key={c.name} position={c.pos} icon={cityIcon()}>
              <Popup className="pg-popup"><strong>{isZh ? c.zh : c.name}</strong></Popup>
            </Marker>
          ))}

          {regionGrid && drawnBounds && (
            <NdviOverlay grid={regionGrid} bounds={drawnBounds} opacity={ndviOpacity} />
          )}

          {drawnBounds && (
            <Rectangle
              bounds={[[drawnBounds[1], drawnBounds[0]], [drawnBounds[3], drawnBounds[2]]]}
              pathOptions={{ color: "#4fc3f7", weight: 2, fillOpacity: 0, dashArray: "6 4" }}
            />
          )}

          <MapClickHandler onClick={handleMapClick} />
          <DrawRectangle active={mode === "draw"} onDrawn={handleDrawn} />
        </MapContainer>

        {/* ── ZONE BAR (ported from SatelliteView) ── */}
        <div className="pg-zone-bar">
          {ZONE_PRESETS.map(z => (
            <button
              key={z.id}
              className={`pg-zone-btn ${selectedZone?.id === z.id ? "active" : ""}`}
              onClick={() => handleZoneClick(z)}
            >
              {z.label}
            </button>
          ))}
        </div>

        {/* ── TOOLBAR ── */}
        <div className="pg-toolbar">
          <button className={`pg-tool-btn ${mode === "click" ? "active" : ""}`} onClick={() => setMode("click")} title={isZh ? "\u70B9\u51FB\u68C0\u67E5" : "Click to inspect"}>
            <FiCrosshair size={16} />
          </button>
          <button className={`pg-tool-btn ${mode === "draw" ? "active" : ""}`} onClick={() => setMode("draw")} title={isZh ? "\u62D6\u62FD\u7ED8\u5236\u533A\u57DF" : "Draw region"}>
            <FiSliders size={16} />
          </button>
          <div className="pg-tool-divider" />
          <button className={`pg-tool-btn ${tileLayer === "satellite" ? "active" : ""}`} onClick={() => setTileLayer(tileLayer === "satellite" ? "osm" : "satellite")} title={isZh ? "\u5207\u6362\u56FE\u5C42" : "Toggle tiles"}>
            <FiLayers size={16} />
          </button>
          <div className="pg-tool-divider" />
          <button className="pg-tool-btn" onClick={() => setCompareMode(true)} title={isZh ? "\u524D\u540E\u5BF9\u6BD4" : "Before/After Compare"}>
            <FiColumns size={16} />
          </button>
        </div>

        {/* ── DATA SOURCE BADGE ── */}
        <div className={`pg-source-badge ${cacheSource === "gee" ? "live" : ""}`}>
          <FiRadio size={12} />
          {cacheLoading ? (isZh ? "\u52A0\u8F7D\u536B\u661F\u6570\u636E..." : "Loading satellite data...") :
           cacheSource === "gee" ? "Sentinel-2 LIVE" : "DEMO DATA"}
        </div>

        {/* ── YEAR CONTROLS ── */}
        <div className="pg-year-bar">
          <div className="pg-year-group">
            <label>{isZh ? "\u5E74\u4EFD" : "Year"}</label>
            <select value={year} onChange={e => setYear(+e.target.value)}>
              {Array.from({ length: 10 }, (_, i) => currentYear - i).map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="pg-year-group">
            <label>{isZh ? "\u5BF9\u6BD4" : "Compare"}</label>
            <select value={yearB} onChange={e => setYearB(+e.target.value)}>
              {Array.from({ length: 10 }, (_, i) => currentYear - i).map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          {/* Play/Pause button (ported from SatelliteView) */}
          <button className="pg-play-btn" onClick={handlePlayToggle} title={isZh ? (playing ? "\u6682\u505C" : "\u64AD\u653E") : (playing ? "Pause" : "Play")}>
            {playing ? <FiPause size={14} /> : <FiPlay size={14} />}
          </button>
          {drawnBounds && (
            <div className="pg-year-group">
              <label>{isZh ? "\u900F\u660E\u5EA6" : "Opacity"}</label>
              <input type="range" min="0" max="1" step="0.1" value={ndviOpacity} onChange={e => setNdviOpacity(+e.target.value)} />
            </div>
          )}
        </div>

        {/* ── LEGEND ── */}
        <div className="pg-legend">
          <div className="pg-legend-gradient" />
          <div className="pg-legend-labels">
            <span>0.0 {isZh ? "\u88F8\u5730" : "Bare"}</span>
            <span>0.3</span>
            <span>0.6+ {isZh ? "\u5BC6\u6797" : "Dense"}</span>
          </div>
        </div>

        {clickedPos && (
          <div className="pg-coords">
            {clickedPos.lat.toFixed(4)}\u00B0N, {clickedPos.lng.toFixed(4)}\u00B0E
          </div>
        )}

        {/* Year overlay during time-lapse */}
        {playing && <div className="pg-year-overlay">{year}</div>}

        <div className="pg-mode-indicator">
          {mode === "click"
            ? (isZh ? "\u70B9\u51FB\u5730\u56FE\u4EFB\u610F\u4F4D\u7F6E\u67E5\u770BNDVI\uFF08\u5B9E\u65F6\u536B\u661F\u6570\u636E\uFF09 \u2190/\u2192 \u5207\u6362\u5E74\u4EFD \u7A7A\u683C\u64AD\u653E" : "Click anywhere to inspect NDVI \u00B7 \u2190/\u2192 step year \u00B7 Space to play")
            : (isZh ? "\u62D6\u62FD\u7ED8\u5236\u533A\u57DF\u8FDB\u884C\u5206\u6790\uFF08\u5B9E\u65F6\u536B\u661F\u6570\u636E\uFF09" : "Draw a region for analysis (real satellite data)")}
        </div>
      </div>

      {/* ── SIDE PANEL ── */}
      <div className={`pg-panel ${panelOpen ? "open" : ""}`}>
        <button className="pg-panel-close" onClick={() => setPanelOpen(false)}><FiX size={16} /></button>

        {/* Click inspect results */}
        {clickedData && (
          <div className="pg-panel-section">
            <h3><FiCrosshair size={14} /> {isZh ? "\u70B9\u4F4D\u68C0\u67E5" : "Point Inspection"}</h3>
            <div className="pg-point-coords">
              {clickedData.lat.toFixed(4)}\u00B0N, {clickedData.lng.toFixed(4)}\u00B0E
              <span className={`pg-src-tag ${clickedData.source === "gee" ? "gee" : ""}`}>
                {clickedData.source === "gee" ? "GEE" : "DEMO"}
              </span>
            </div>

            <div className="pg-point-stats">
              <div className="pg-point-stat">
                <span className="pg-point-val" style={{ color: "#91cf60" }}>{clickedData.ndvi?.toFixed(3) ?? "—"}</span>
                <span className="pg-point-lbl">NDVI ({year})</span>
              </div>
              <div className="pg-point-stat">
                <span className="pg-point-val" style={{ color: clickedData.cls.color }}>{isZh ? clickedData.cls.zh : clickedData.cls.en}</span>
                <span className="pg-point-lbl">{isZh ? "\u5206\u7C7B" : "Class"}</span>
              </div>
            </div>

            {clickedData.loading ? (
              <div className="pg-loading">
                <FiRefreshCw size={16} className="pg-spin" />
                <span>{isZh ? "\u83B7\u53D6\u536B\u661F\u65F6\u95F4\u5E8F\u5217..." : "Fetching satellite timeseries..."}</span>
              </div>
            ) : (
              <>
                {clickedData.ndviB !== undefined && (
                  <div className="pg-point-change">
                    <h4>{isZh ? "\u53D8\u5316" : "Change"} ({yearB} \u2192 {year})</h4>
                    <div className="pg-change-row">
                      <span>NDVI {yearB}:</span>
                      <strong>{clickedData.ndviB?.toFixed(3) ?? "—"}</strong>
                    </div>
                    <div className="pg-change-row">
                      <span>NDVI {year}:</span>
                      <strong>{clickedData.ndvi?.toFixed(3) ?? "—"}</strong>
                    </div>
                    <div className="pg-change-row">
                      <span>{isZh ? "\u53D8\u5316" : "Change"}:</span>
                      <strong style={{ color: (clickedData.change ?? 0) >= 0 ? "#4CAF50" : "#ef5350" }}>
                        {(clickedData.change ?? 0) >= 0 ? "+" : ""}{clickedData.change?.toFixed(4) ?? "—"}
                      </strong>
                    </div>
                  </div>
                )}

                {clickedData.timeseries && clickedData.timeseries.length > 0 && (
                  <div className="pg-trend">
                    <h4>{isZh ? "\u5386\u53F2\u8D8B\u52BF\uFF08\u5B9E\u6D4B\uFF09" : "Historical Trend (measured)"}</h4>
                    <div className="pg-trend-bars">
                      {clickedData.timeseries.map(d => {
                        const v = d.mean_ndvi;
                        const h = Math.max(2, (v / 0.5) * 60);
                        return (
                          <div key={d.year} className="pg-trend-col">
                            <div className="pg-trend-bar" style={{ height: `${h}px`, background: `rgb(${ndviColor(v).join(",")})` }}
                              title={`${d.year}: ${v?.toFixed(3) ?? "—"}`} />
                            <span className="pg-trend-yr">{d.year.toString().slice(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <button className="pg-export-btn" onClick={() => exportTimeseriesCSV(clickedData.timeseries)}>
                      <FiDownload size={12} /> {isZh ? "\u5BFC\u51FACSV" : "Export CSV"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Region analysis results */}
        {drawnBounds && (
          <div className="pg-panel-section">
            <h3><FiSliders size={14} /> {isZh ? "\u533A\u57DF\u5206\u6790" : "Region Analysis"}</h3>
            {regionLoading ? (
              <div className="pg-loading">
                <FiRefreshCw size={18} className="pg-spin" />
                <span>{isZh ? "\u5206\u6790\u536B\u661F\u6570\u636E..." : "Analyzing satellite data..."}</span>
              </div>
            ) : regionStats ? (
              <>
                <div className="pg-region-stats">
                  <div className="pg-rstat"><span className="pg-rval" style={{ color: "#91cf60" }}>{regionStats.mean?.toFixed(3) ?? "—"}</span><span>Mean NDVI</span></div>
                  <div className="pg-rstat"><span className="pg-rval" style={{ color: "#4CAF50" }}>{regionStats.vegPct ?? "—"}%</span><span>{isZh ? "\u690D\u88AB" : "Vegetated"}</span></div>
                  <div className="pg-rstat"><span className="pg-rval" style={{ color: "#D4A843" }}>{regionStats.barePct ?? "—"}%</span><span>{isZh ? "\u88F8\u5730" : "Bare"}</span></div>
                  <div className="pg-rstat"><span className="pg-rval" style={{ color: "#1a9850" }}>{regionStats.max?.toFixed(3) ?? "—"}</span><span>Peak</span></div>
                </div>

                {changeData && (
                  <div className="pg-change-section">
                    <h4>{isZh ? "\u53D8\u5316\u68C0\u6D4B" : "Change Detection"} ({yearB} \u2192 {year})</h4>
                    <div className="pg-change-bar">
                      <div className="pg-cb-gain" style={{ width: `${changeData.area_improved_pct}%` }} />
                      <div className="pg-cb-loss" style={{ width: `${changeData.area_degraded_pct}%` }} />
                    </div>
                    <div className="pg-change-legend">
                      <span><span className="pg-cdot gain" />{isZh ? "\u589E\u957F" : "Gain"} {changeData.area_improved_pct}%</span>
                      <span><span className="pg-cdot loss" />{isZh ? "\u9000\u5316" : "Loss"} {changeData.area_degraded_pct}%</span>
                    </div>
                    <div className="pg-change-mean">
                      {isZh ? "NDVI\u5747\u503C\u53D8\u5316" : "Mean NDVI Change"}: <strong style={{ color: changeData.mean_change >= 0 ? "#4CAF50" : "#ef5350" }}>
                        {changeData.mean_change >= 0 ? "+" : ""}{changeData.mean_change?.toFixed(4)}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="pg-region-meta">
                  <div className="pg-meta-row"><span>{isZh ? "\u6570\u636E\u70B9" : "Data points"}</span><span>{regionStats.count}</span></div>
                  <div className="pg-meta-row"><span>{isZh ? "\u8303\u56F4" : "Bounds"}</span><span>{drawnBounds[0].toFixed(1)}\u00B0\u2013{drawnBounds[2].toFixed(1)}\u00B0E</span></div>
                  <div className="pg-meta-row"><span>{isZh ? "\u6765\u6E90" : "Source"}</span><span className={`pg-src-tag ${regionSource === "gee" ? "gee" : ""}`}>{regionSource === "gee" ? "Sentinel-2 (GEE)" : "Demo"}</span></div>
                </div>

                <div className="pg-export-row">
                  {regionGrid && (
                    <button className="pg-export-btn" onClick={() => exportGridCSV(regionGrid)}>
                      <FiDownload size={12} /> {isZh ? "\u5BFC\u51FACSV" : "Export CSV"}
                    </button>
                  )}
                  <button className="pg-export-btn" onClick={() => exportReport({
                    region: selectedZone?.label || "Custom Region",
                    yearA: yearB,
                    yearB: year,
                    stats: changeData,
                    regionStats,
                  })}>
                    <FiDownload size={12} /> {isZh ? "\u5BFC\u51FAPDF\u62A5\u544A" : "Export PDF Report"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Empty state */}
        {!clickedData && !drawnBounds && (
          <div className="pg-empty">
            <FiInfo size={24} />
            <p>{isZh
              ? "\u70B9\u51FB\u5730\u56FE\u67E5\u770B\u4EFB\u610F\u4F4D\u7F6E\u7684\u5B9E\u6D4BNDVI\u6570\u636E\uFF0C\u6216\u5207\u6362\u5230\u7ED8\u5236\u6A21\u5F0F\u62D6\u62FD\u9009\u62E9\u533A\u57DF"
              : "Click any point for real NDVI data, or switch to Draw mode to analyze a region"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
