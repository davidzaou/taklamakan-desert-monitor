import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import {
  DESERT_OUTLINE,
  GREEN_BELT_SEGMENTS,
  RIVERS,
  MOUNTAINS,
  LAKES,
  HIGHWAYS,
  MAP_BOUNDS,
  toSVG,
  pointsToPath,
  pointsToSmoothPath,
} from "../data/mapShapes";
import { FiGrid } from "react-icons/fi";
import "./IllustratedMap.css";

const TILE = 22;
const GAP = 1;
const CELL = TILE + GAP;

function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function getDesertSVGPolygon() {
  return DESERT_OUTLINE.map(([lng, lat]) => toSVG(lng, lat));
}

function samplePath(points, spacing = 0.3) {
  const samples = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.max(1, Math.floor(dist / spacing));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      samples.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
    }
  }
  return samples;
}

// Seeded pseudo-random for deterministic "random" variation
function seededRand(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

// ─── TILE COMPONENTS ─────────────────────────────

const SandTile = React.memo(function SandTile({ x, y, variant = 0, fillColor }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width={TILE} height={TILE} rx={4} className="sand-block" style={fillColor ? { fill: fillColor } : undefined} />
      {variant === 0 && (
        <path d={`M4,${TILE * 0.55} Q${TILE / 2},${TILE * 0.38} ${TILE - 4},${TILE * 0.55}`} className="sand-ripple" />
      )}
      {variant === 1 && (
        <>
          <path d={`M4,${TILE * 0.42} Q${TILE / 2},${TILE * 0.28} ${TILE - 4},${TILE * 0.42}`} className="sand-ripple" />
          <path d={`M6,${TILE * 0.68} Q${TILE / 2},${TILE * 0.54} ${TILE - 6},${TILE * 0.68}`} className="sand-ripple" />
        </>
      )}
      {variant === 2 && (
        <>
          <circle cx={TILE * 0.35} cy={TILE * 0.4} r={1.2} className="sand-dot" />
          <circle cx={TILE * 0.65} cy={TILE * 0.6} r={1} className="sand-dot" />
        </>
      )}
    </g>
  );
});

const SteppeTile = React.memo(function SteppeTile({ x, y, variant = 0 }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width={TILE} height={TILE} rx={4} className="steppe-block" />
      {variant === 0 && (
        <>
          <line x1={TILE * 0.3} y1={TILE * 0.7} x2={TILE * 0.3} y2={TILE * 0.4} className="steppe-grass" />
          <line x1={TILE * 0.5} y1={TILE * 0.75} x2={TILE * 0.5} y2={TILE * 0.5} className="steppe-grass" />
          <line x1={TILE * 0.7} y1={TILE * 0.7} x2={TILE * 0.7} y2={TILE * 0.45} className="steppe-grass" />
        </>
      )}
      {variant === 1 && (
        <>
          <circle cx={TILE * 0.35} cy={TILE * 0.45} r={1.5} fill="#A8BF8A" opacity={0.3} />
          <circle cx={TILE * 0.65} cy={TILE * 0.6} r={1.2} fill="#A8BF8A" opacity={0.25} />
        </>
      )}
      {/* variant 2 = plain ground, just the base rect */}
    </g>
  );
});

const TreeTile = React.memo(function TreeTile({ x, y, growth = 1 }) {
  const c1 = growth < 0.35 ? "#A5D6A7" : growth < 0.65 ? "#66BB6A" : "#2E7D32";
  const c2 = growth < 0.35 ? "#C8E6C9" : growth < 0.65 ? "#81C784" : "#388E3C";
  const h = 6 + growth * 8; // taller trees
  return (
    <g transform={`translate(${x},${y})`}>
      <g className="tree-tile-anim">
        <rect width={TILE} height={TILE} rx={4} className="tree-ground" />
        {/* trunk */}
        <rect x={TILE / 2 - 1.5} y={TILE - 5} width={3} height={5} rx={1} fill="#8D6E63" />
        {/* canopy layers */}
        <rect x={TILE / 2 - 5.5} y={TILE - 5 - h * 0.38} width={11} height={h * 0.38} rx={3} fill={c1} />
        <rect x={TILE / 2 - 4} y={TILE - 5 - h * 0.7} width={8} height={h * 0.36} rx={2.5} fill={c2} />
        <rect x={TILE / 2 - 2.5} y={TILE - 5 - h} width={5} height={h * 0.32} rx={2} fill={c1} opacity={0.85} />
      </g>
    </g>
  );
});

const WaterTile = React.memo(function WaterTile({ x, y, variant = 0 }) {
  const wy = variant * 0.8;
  const delay = ((x * 7 + y * 13) % 5) * 0.4; // stagger animation per tile
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width={TILE} height={TILE} rx={4} className="water-block" />
      <path d={`M0,${7 + wy} Q${TILE * 0.25},${4 + wy} ${TILE * 0.5},${7 + wy} Q${TILE * 0.75},${10 + wy} ${TILE},${7 + wy}`} className="water-flow-1" style={{ animationDelay: `${delay}s` }} />
      <path d={`M0,${13 + wy} Q${TILE * 0.25},${10 + wy} ${TILE * 0.5},${13 + wy} Q${TILE * 0.75},${16 + wy} ${TILE},${13 + wy}`} className="water-flow-2" style={{ animationDelay: `${delay + 0.3}s` }} />
      {/* Sparkle dot */}
      <circle cx={TILE * 0.3 + variant * 3} cy={TILE * 0.35} r={1} className="water-sparkle" style={{ animationDelay: `${delay + 1}s` }} />
    </g>
  );
});

const RockTile = React.memo(function RockTile({ x, y, height = 1 }) {
  const ph = 6 + height * 8;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width={TILE} height={TILE} rx={3} className="rock-block" />
      <polygon
        points={`${TILE / 2},${TILE / 2 - ph} ${TILE / 2 - 7},${TILE - 2} ${TILE / 2 + 7},${TILE - 2}`}
        className="rock-peak"
      />
      {height > 0.65 && (
        <polygon
          points={`${TILE / 2},${TILE / 2 - ph} ${TILE / 2 - 3.5},${TILE / 2 - ph + 5} ${TILE / 2 + 3.5},${TILE / 2 - ph + 5}`}
          className="rock-snow"
        />
      )}
    </g>
  );
});

// ─── CITY MARKERS ────────────────────────────────

const CITY_LAYOUTS = {
  kashgar: { blds: [[-18,30,"#5C6BC0"],[-4,40,"#3949AB"],[12,24,"#7986CB"]], decor: "dome" },
  korla:   { blds: [[-16,28,"#5C6BC0"],[0,36,"#3949AB"],[16,22,"#7986CB"]], decor: "derrick" },
  hotan:   { blds: [[-16,26,"#5C6BC0"],[0,32,"#2E7D32"],[16,22,"#7986CB"]], decor: "roof" },
  alar:    { blds: [[-18,20,"#42A5F5"],[-2,34,"#1565C0"],[14,22,"#42A5F5"]], decor: "flag" },
  aksu:    { blds: [[-16,32,"#5C6BC0"],[0,24,"#3949AB"]], decor: "tree" },
  kuqa:    { blds: [[-16,24,"#5C6BC0"],[0,20,"#7986CB"],[14,42,"#8D6E63"]], decor: "tower" },
};

function CityDecor({ type, ox }) {
  if (type === "dome") return (
    <g>
      <circle cx={ox + 2} cy={-32} r={6} fill="#FFD54F" />
      <rect x={ox + 0.5} y={-40} width={3} height={6} rx={1} fill="#FFD54F" />
    </g>
  );
  if (type === "derrick") return (
    <g>
      <polygon points={`${ox + 22},0 ${ox + 17},-24 ${ox + 27},-24`} fill="none" stroke="#90A4AE" strokeWidth={2} strokeLinejoin="round" />
      <rect x={ox + 19} y={-20} width={6} height={2} rx={0.5} fill="#B0BEC5" />
      <rect x={ox + 21} y={-28} width={2} height={6} rx={0.5} fill="#CFD8DC" />
    </g>
  );
  if (type === "roof") return (
    <polygon points={`${ox + 6},-24 ${ox + 6 + 6},-30 ${ox + 6 + 12},-24`} fill="#1B5E20" />
  );
  if (type === "flag") return (
    <g>
      <rect x={ox + 15} y={-20} width={2} height={8} rx={0.5} fill="#B0BEC5" />
      <rect x={ox + 17} y={-20} width={7} height={4} rx={1} fill="#EF5350" />
    </g>
  );
  if (type === "tree") return (
    <g>
      <rect x={ox + 20} y={-3} width={3} height={8} rx={1} fill="#6D4C41" />
      <circle cx={ox + 21.5} cy={-8} r={7} fill="#43A047" />
      <circle cx={ox + 18} cy={-6} r={2} fill="#E53935" opacity={0.85} />
      <circle cx={ox + 25} cy={-9} r={1.8} fill="#E53935" opacity={0.85} />
    </g>
  );
  if (type === "tower") return (
    <polygon points={`${ox + 18},-34 ${ox + 22},-40 ${ox + 26},-34`} fill="#D4A843" />
  );
  return null;
}

function getCityKey(f) {
  const n = f.name_en.toLowerCase();
  for (const k of ["kashgar","korla","hotan","alar","aksu","kuqa"]) if (n.includes(k)) return k;
  if (n.includes("kucha")) return "kuqa";
  return null;
}

function CityMarker({ feature, onClick, lang }) {
  const [x, y] = toSVG(feature.lng, feature.lat);
  const name = lang === "zh" ? feature.name_zh : feature.name_en;
  const key = getCityKey(feature);
  const layout = CITY_LAYOUTS[key] || { blds: [[-10,18,"#5C6BC0"],[2,24,"#3949AB"],[14,14,"#7986CB"]], decor: null };

  return (
    <g className="city-marker" transform={`translate(${x},${y})`} onClick={() => onClick(feature)}
      role="button" tabIndex={0} aria-label={name} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(feature); } }}>
      {/* glow platform */}
      <ellipse cx={2} cy={4} rx={28} ry={7} className="city-glow" />
      <ellipse cx={2} cy={3} rx={24} ry={5} className="city-shadow" />
      {/* buildings */}
      {layout.blds.map(([dx, h, c], i) => (
        <g key={i} transform={`translate(${dx},${-h})`}>
          <rect width={12} height={h} rx={2} fill={c} className="bld-body" />
          {Array.from({ length: Math.floor(h / 7) }).map((_, wi) => (
            <rect key={wi} x={2.5} y={3 + wi * 7} width={7} height={3.5} rx={0.8} className="bld-window" />
          ))}
        </g>
      ))}
      {layout.decor && <CityDecor type={layout.decor} ox={0} />}
      <text x={0} y={20} className="city-name-label">{name}</text>
    </g>
  );
}

// ─── FEATURE MARKERS ─────────────────────────────

function VegetationMarker({ feature, onClick, lang }) {
  const [x, y] = toSVG(feature.lng, feature.lat);
  const name = lang === "zh" ? feature.name_zh : feature.name_en;
  return (
    <g className="feat-marker" transform={`translate(${x},${y})`} onClick={() => onClick(feature)}
      role="button" tabIndex={0} aria-label={name} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(feature); } }}>
      <circle r={18} className="feat-ring feat-ring-veg" />
      <circle r={14} className="feat-bg feat-bg-veg" />
      <rect x={-1.5} y={1} width={3} height={6} rx={1} fill="#fff" />
      <rect x={-6} y={-4} width={12} height={6} rx={2.5} fill="#fff" />
      <rect x={-4} y={-8} width={8} height={5} rx={2} fill="#fff" opacity={0.85} />
      <text x={0} y={28} className="feat-label feat-label-veg">{name}</text>
    </g>
  );
}

function ProjectMarker({ feature, onClick, lang, year }) {
  const [x, y] = toSVG(feature.lng, feature.lat);
  const name = lang === "zh" ? feature.name_zh : feature.name_en;
  const sy = feature.stats?.start_year || 2000;
  const ty = feature.stats?.target_year || 2025;
  const p = Math.min(1, Math.max(0, (year - sy) / (ty - sy)));
  const r = 18, circ = 2 * Math.PI * r, off = circ * (1 - p);
  const rc = p >= 1 ? "#43A047" : p > 0.5 ? "#7CB342" : "#FB8C00";

  return (
    <g className="feat-marker" transform={`translate(${x},${y})`} onClick={() => onClick(feature)}
      role="button" tabIndex={0} aria-label={`${name} — ${Math.round(p * 100)}% complete`} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(feature); } }}>
      <circle r={r} fill="none" stroke="#e0e0e0" strokeWidth={3} />
      <circle r={r} fill="none" stroke={rc} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round" transform="rotate(-90)" className="progress-ring-arc" />
      <circle r={13} className="feat-bg feat-bg-proj" />
      {p >= 1 ? (
        <path d="M-5,1 L-1.5,5 L6,-4" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <polygon points="0,-6 -1.8,-2 -5.5,-2 -2.5,0.5 -3.5,5 0,2.5 3.5,5 2.5,0.5 5.5,-2 1.8,-2" fill="#fff" />
      )}
      <title>{Math.round(p * 100)}% complete</title>
      <text x={0} y={30} className="feat-label feat-label-proj">{name}</text>
    </g>
  );
}

function WaterMarker({ feature, onClick, lang }) {
  const [x, y] = toSVG(feature.lng, feature.lat);
  const name = lang === "zh" ? feature.name_zh : feature.name_en;
  return (
    <g className="feat-marker" transform={`translate(${x},${y})`} onClick={() => onClick(feature)}
      role="button" tabIndex={0} aria-label={name} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(feature); } }}>
      <circle r={18} className="feat-ring feat-ring-water" />
      <circle r={14} className="feat-bg feat-bg-water" />
      <path d="M0,-7 C-3,-3 -5,1 -5,3 A5,5 0 0,0 5,3 C5,1 3,-3 0,-7Z" fill="#fff" />
      <text x={0} y={28} className="feat-label feat-label-water">{name}</text>
    </g>
  );
}

function DesertMarker({ feature, onClick, lang }) {
  const [x, y] = toSVG(feature.lng, feature.lat);
  const name = lang === "zh" ? feature.name_zh : feature.name_en;
  return (
    <g className="feat-marker" transform={`translate(${x},${y})`} onClick={() => onClick(feature)}
      role="button" tabIndex={0} aria-label={name} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(feature); } }}>
      <circle r={18} className="feat-ring feat-ring-sand" />
      <circle r={14} className="feat-bg feat-bg-sand" />
      <path d="M-6,2 Q-3,-3 0,2 Q3,-3 6,2" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" />
      <text x={0} y={28} className="feat-label feat-label-sand">{name}</text>
    </g>
  );
}

const MARKER_MAP = {
  city: CityMarker, vegetation: VegetationMarker,
  project: ProjectMarker, water: WaterMarker, desert: DesertMarker,
};

// ─── MAIN MAP ────────────────────────────────────

// ─── NDVI helpers ────────────────────────────────

function ndviToColor(ndvi) {
  if (ndvi == null) return null;
  if (ndvi < 0.05) return "#F0D68A";
  if (ndvi < 0.10) return "#D4B85C";
  if (ndvi < 0.15) return "#B8A044";
  if (ndvi < 0.25) return "#9CB86A";
  if (ndvi < 0.40) return "#6AAF50";
  return "#3E8E3A";
}

function classifyNdvi(ndvi) {
  if (ndvi == null) return "—";
  if (ndvi < 0.05) return "Bare Sand";
  if (ndvi < 0.10) return "Very Sparse";
  if (ndvi < 0.15) return "Sparse Scrub";
  if (ndvi < 0.25) return "Grassland";
  if (ndvi < 0.40) return "Shrubland";
  return "Forest/Dense";
}

function findNearestNdvi(svgX, svgY, lookup) {
  if (!lookup) return null;
  let best = null, bestDist = Infinity;
  for (const p of lookup) {
    const d = (p.sx - svgX) ** 2 + (p.sy - svgY) ** 2;
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best;
}

function svgToGeo(svgX, svgY) {
  return {
    lng: MAP_BOUNDS.minLng + (svgX / 1200) * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng),
    lat: MAP_BOUNDS.maxLat - (svgY / 800) * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat),
  };
}

export default function IllustratedMap({ features, onFeatureClick, selectedFeature, year = 2024, ndviGrid = null }) {
  const { lang } = useLanguage();
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const mouseDownPos = useRef(null);

  // Interactive states
  const [pinnedCard, setPinnedCard] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const [clickRipple, setClickRipple] = useState(null); // {x, y} in SVG coords for tile highlight

  // NDVI lookup (convert grid points to SVG coords)
  const ndviLookup = useMemo(() => {
    if (!ndviGrid || !ndviGrid.length) return null;
    return ndviGrid.map(p => ({
      sx: ((p.lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 1200,
      sy: ((MAP_BOUNDS.maxLat - p.lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 800,
      ndvi: p.ndvi, lng: p.lng, lat: p.lat,
    }));
  }, [ndviGrid]);

  // Clamp pan so map edges stay within container
  const clampPan = useCallback((px, py, z) => {
    if (z <= 1) return { x: 0, y: 0 };
    const el = containerRef.current;
    if (!el) return { x: px, y: py };
    const maxPanX = (el.clientWidth * (z - 1)) / 2;
    const maxPanY = (el.clientHeight * (z - 1)) / 2;
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, px)),
      y: Math.max(-maxPanY, Math.min(maxPanY, py)),
    };
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(z => {
      const next = Math.max(1, Math.min(4, z + (e.deltaY > 0 ? -0.15 : 0.15)));
      if (next <= 1) setPan({ x: 0, y: 0 });
      else setPan(p => clampPan(p.x, p.y, next));
      return next;
    });
  }, [clampPan]);
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.addEventListener("wheel", handleWheel, { passive: false });
    return () => { if (el) el.removeEventListener("wheel", handleWheel); };
  }, [handleWheel]);
  const handleMouseDown = e => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = e => {
    if (dragging && dragStart.current) {
      const rawX = e.clientX - dragStart.current.x;
      const rawY = e.clientY - dragStart.current.y;
      setPan(clampPan(rawX, rawY, zoom));
    }
  };
  const handleMouseUp = (e) => {
    // Detect click vs drag
    if (mouseDownPos.current) {
      const dx = Math.abs(e.clientX - mouseDownPos.current.x);
      const dy = Math.abs(e.clientY - mouseDownPos.current.y);
      if (dx < 5 && dy < 5) {
        handleMapClick(e);
      }
    }
    setDragging(false);
    dragStart.current = null;
    mouseDownPos.current = null;
  };

  const desertPoly = useMemo(() => getDesertSVGPolygon(), []);

  // ── Sand tiles ──
  const sandTiles = useMemo(() => {
    const t = [], xs = desertPoly.map(p => p[0]), ys = desertPoly.map(p => p[1]);
    const x0 = Math.floor(Math.min(...xs) / CELL) * CELL, x1 = Math.ceil(Math.max(...xs) / CELL) * CELL;
    const y0 = Math.floor(Math.min(...ys) / CELL) * CELL, y1 = Math.ceil(Math.max(...ys) / CELL) * CELL;
    for (let gx = x0; gx < x1; gx += CELL)
      for (let gy = y0; gy < y1; gy += CELL)
        if (pointInPolygon(gx + TILE / 2, gy + TILE / 2, desertPoly))
          t.push({ x: gx, y: gy, v: Math.floor(seededRand(gx, gy) * 3) });
    return t;
  }, [desertPoly]);

  // ── Steppe tiles (surrounding terrain) ──
  const steppeTiles = useMemo(() => {
    const t = [];
    for (let gx = 0; gx < 1200; gx += CELL)
      for (let gy = 0; gy < 800; gy += CELL)
        if (!pointInPolygon(gx + TILE / 2, gy + TILE / 2, desertPoly)) {
          const r = seededRand(gx, gy);
          // variant: 0=grass blades, 1=sparse dot, 2=plain ground
          t.push({ x: gx, y: gy, v: r > 0.6 ? 0 : r > 0.3 ? 1 : 2 });
        }
    return t;
  }, [desertPoly]);

  // ── Water tiles ──
  const waterTiles = useMemo(() => {
    const t = [], placed = new Set();
    for (const r of RIVERS) {
      const pts = samplePath(r.points, 0.12);
      for (const [lng, lat] of pts) {
        const [sx, sy] = toSVG(lng, lat);
        // 2 tiles wide for rivers
        for (let d = -1; d <= 0; d++) {
          const gx = Math.round(sx / CELL) * CELL, gy = Math.round(sy / CELL) * CELL + d * CELL;
          const k = `${gx},${gy}`;
          if (!placed.has(k)) { placed.add(k); t.push({ x: gx, y: gy, v: t.length % 3 }); }
        }
      }
    }
    return t;
  }, []);

  // ── Mountain tiles ──
  const mtnTiles = useMemo(() => {
    const t = [], placed = new Set();
    for (const range of MOUNTAINS)
      for (const peak of range.peaks) {
        const [sx, sy] = toSVG(peak[0], peak[1]);
        for (let dx = -1; dx <= 1; dx++)
          for (let dy = -2; dy <= 0; dy++) {
            const gx = Math.round(sx / CELL) * CELL + dx * CELL;
            const gy = Math.round(sy / CELL) * CELL + dy * CELL;
            const k = `${gx},${gy}`;
            if (!placed.has(k)) { placed.add(k); t.push({ x: gx, y: gy, h: peak[2] * (1 - Math.sqrt(dx * dx + dy * dy) * 0.25) }); }
          }
      }
    return t;
  }, []);

  // ── Lake tiles ──
  const lakeTiles = useMemo(() => {
    const t = [];
    for (const lake of LAKES) {
      const [cx, cy] = toSVG(lake.center[0], lake.center[1]);
      const rx = (lake.rx / 15) * 1200, ry = (lake.ry / 7.5) * 800;
      for (let gx = cx - rx; gx < cx + rx; gx += CELL)
        for (let gy = cy - ry; gy < cy + ry; gy += CELL) {
          const dx = (gx + TILE / 2 - cx) / rx, dy = (gy + TILE / 2 - cy) / ry;
          if (dx * dx + dy * dy <= 1) t.push({ x: Math.round(gx / CELL) * CELL, y: Math.round(gy / CELL) * CELL, v: t.length % 2 });
        }
    }
    return t;
  }, []);

  // ── Highway tiles ──
  const hwTiles = useMemo(() => {
    const t = [], placed = new Set();
    for (const hw of HIGHWAYS) {
      const pts = samplePath(hw.points, 0.12);
      for (const [lng, lat] of pts) {
        const [sx, sy] = toSVG(lng, lat);
        const gx = Math.round(sx / CELL) * CELL, gy = Math.round(sy / CELL) * CELL;
        const k = `${gx},${gy}`;
        if (!placed.has(k)) { placed.add(k); t.push({ x: gx, y: gy }); }
      }
    }
    return t;
  }, []);

  // ── Vegetation tiles (year-dependent) ──
  const vegTiles = useMemo(() => {
    const t = [], placed = new Set();
    for (const seg of GREEN_BELT_SEGMENTS) {
      const { startYear = 2000, maturityYear = 2020 } = seg;
      if (year < startYear) continue;
      const g = Math.min(1, Math.max(0, (year - startYear) / (maturityYear - startYear)));
      const pts = samplePath(seg.points, 0.06); // denser sampling
      const show = Math.max(1, Math.round(pts.length * g));
      for (let i = 0; i < show; i++) {
        const [lng, lat] = pts[i];
        const [sx, sy] = toSVG(lng, lat);
        const rows = Math.max(1, Math.round(g * 5)); // wider belt (up to 5 rows)
        for (let r = 0; r < rows; r++) {
          const off = (r - Math.floor(rows / 2)) * CELL;
          const gx = Math.round(sx / CELL) * CELL, gy = Math.round(sy / CELL) * CELL + off;
          const k = `${gx},${gy}`;
          if (!placed.has(k)) { placed.add(k); t.push({ x: gx, y: gy, g }); }
        }
      }
    }
    return t;
  }, [year]);

  // ── Overlay exclusion keys ──
  const overlayKeys = useMemo(() => {
    const s = new Set();
    for (const arr of [waterTiles, mtnTiles, vegTiles, lakeTiles, hwTiles])
      for (const t of arr) s.add(`${t.x},${t.y}`);
    return s;
  }, [waterTiles, mtnTiles, vegTiles, lakeTiles, hwTiles]);

  // ── Terrain map for hover detection ──
  const terrainMap = useMemo(() => {
    const m = new Map();
    for (const t of waterTiles) m.set(`${t.x},${t.y}`, "River");
    for (const t of lakeTiles) m.set(`${t.x},${t.y}`, "Lake");
    for (const t of mtnTiles) m.set(`${t.x},${t.y}`, "Mountain");
    for (const t of vegTiles) m.set(`${t.x},${t.y}`, "Green Belt");
    for (const t of hwTiles) m.set(`${t.x},${t.y}`, "Highway");
    return m;
  }, [waterTiles, lakeTiles, mtnTiles, vegTiles, hwTiles]);

  // ── NDVI-colored sand tiles (memoized per-tile color) ──
  const sandTileColors = useMemo(() => {
    if (!ndviLookup) return null;
    const colors = {};
    for (const t of sandTiles) {
      const key = `${t.x},${t.y}`;
      if (overlayKeys.has(key)) continue;
      const nearest = findNearestNdvi(t.x + TILE / 2, t.y + TILE / 2, ndviLookup);
      if (nearest) colors[key] = ndviToColor(nearest.ndvi);
    }
    return colors;
  }, [sandTiles, ndviLookup, overlayKeys]);

  // Total tile count
  const totalTiles = sandTiles.length + waterTiles.length + mtnTiles.length + vegTiles.length + lakeTiles.length + hwTiles.length + steppeTiles.length;

  // ── Screen → SVG coordinate conversion (proper, handles slice + zoom + pan) ──
  function screenToSvg(clientX, clientY) {
    const svg = svgRef.current;
    if (!svg) return null;
    try {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const svgPt = pt.matrixTransform(ctm.inverse());
      return { sx: svgPt.x, sy: svgPt.y };
    } catch {
      return null;
    }
  }

  // ── Click to pin ──
  function handleMapClick(e) {
    const svgCoords = screenToSvg(e.clientX, e.clientY);
    if (!svgCoords) return;
    const { sx, sy } = svgCoords;
    const geo = svgToGeo(sx, sy);
    if (geo.lng < 74 || geo.lng > 91 || geo.lat < 35 || geo.lat > 44) return;

    const rect = containerRef.current.getBoundingClientRect();
    const gx = Math.round(sx / CELL) * CELL;
    const gy = Math.round(sy / CELL) * CELL;
    const terrain = terrainMap.get(`${gx},${gy}`) || (pointInPolygon(sx, sy, desertPoly) ? "Desert" : "Steppe");
    const nearest = ndviLookup ? findNearestNdvi(sx, sy, ndviLookup) : null;

    // Ripple effect at clicked tile
    setClickRipple({ x: gx, y: gy });
    setTimeout(() => setClickRipple(null), 600);

    setPinnedCard({
      screenX: e.clientX - rect.left, screenY: e.clientY - rect.top,
      lng: geo.lng, lat: geo.lat,
      ndvi: nearest?.ndvi ?? null, terrain,
      classification: classifyNdvi(nearest?.ndvi ?? null),
    });
  }

  // ── Labels ──
  const labels = useMemo(() => ({
    rivers: RIVERS.map(r => ({ k: r.id, t: lang === "zh" ? r.name_zh : r.name_en, p: toSVG(r.labelPos[0], r.labelPos[1]) })),
    mtns: MOUNTAINS.map(m => ({ k: m.id, t: lang === "zh" ? m.name_zh : m.name_en, p: toSVG(m.labelPos[0], m.labelPos[1]) })),
    lakes: LAKES.map(l => ({ k: l.id, t: lang === "zh" ? l.name_zh : l.name_en, p: toSVG(l.center[0], l.center[1]) })),
  }), [lang]);

  return (
    <div className="illustrated-map-container" ref={containerRef}
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <svg ref={svgRef} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className="illustrated-map"
        role="img" aria-label="Interactive illustrated map of the Taklamakan Desert showing vegetation, cities, and projects"
        style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, cursor: dragging ? "grabbing" : "grab" }}>
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="tile-shadow" x="-5%" y="-5%" width="115%" height="120%"><feDropShadow dx="0.5" dy="1" stdDeviation="0.8" floodColor="#000" floodOpacity="0.08" /></filter>
          <linearGradient id="sand-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F7DFA0" /><stop offset="100%" stopColor="#ECC86E" /></linearGradient>
          <linearGradient id="water-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#64B5F6" /><stop offset="100%" stopColor="#1E88E5" /></linearGradient>
          <linearGradient id="rock-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A1887F" /><stop offset="100%" stopColor="#795548" /></linearGradient>
        </defs>

        {/* Background */}
        <rect width="1200" height="800" fill="#F0EBE0" />

        {/* Steppe */}
        {steppeTiles.map((t, i) => <SteppeTile key={`st${i}`} x={t.x} y={t.y} variant={t.v} />)}

        {/* Mountains */}
        {mtnTiles.map((t, i) => <RockTile key={`mt${i}`} x={t.x} y={t.y} height={t.h} />)}

        {/* Sand (skip overlays) */}
        {sandTiles.map((t, i) => {
          const key = `${t.x},${t.y}`;
          if (overlayKeys.has(key)) return null;
          return <SandTile key={`sd${i}`} x={t.x} y={t.y} variant={t.v} fillColor={sandTileColors?.[key]} />;
        })}

        {/* Lakes */}
        {lakeTiles.map((t, i) => <WaterTile key={`lk${i}`} x={t.x} y={t.y} variant={t.v} />)}

        {/* Rivers */}
        {waterTiles.map((t, i) => <WaterTile key={`wt${i}`} x={t.x} y={t.y} variant={t.v} />)}

        {/* Highway */}
        {hwTiles.map((t, i) => (
          <g key={`hw${i}`} transform={`translate(${t.x},${t.y})`}>
            <rect width={TILE} height={TILE} rx={3} className="hw-block" />
            <line x1={4} y1={TILE / 2} x2={TILE - 4} y2={TILE / 2} className="hw-stripe" />
          </g>
        ))}

        {/* Vegetation */}
        {vegTiles.map((t, i) => <TreeTile key={`vg${i}`} x={t.x} y={t.y} growth={t.g} />)}

        {/* Desert label */}
        <g className="desert-title">
          <text x="600" y="410" className="desert-label-main">
            {lang === "zh" ? "塔克拉玛干沙漠" : "TAKLAMAKAN DESERT"}
          </text>
          <text x="600" y="432" className="desert-label-sub">
            {lang === "zh" ? "世界第二大流动沙漠" : "World's 2nd Largest Shifting Sand Desert"}
          </text>
        </g>

        {/* Geo labels with background pills */}
        {labels.mtns.map(l => (
          <g key={l.k} transform={`translate(${l.p[0]},${l.p[1]})`}>
            <rect x={-l.t.length * 4.2} y={-10} width={l.t.length * 8.4} height={16} rx={8} className="label-pill mtn-pill" />
            <text x={0} y={2} className="label-text mtn-text">{l.t}</text>
          </g>
        ))}
        {labels.rivers.map(l => (
          <g key={l.k} transform={`translate(${l.p[0]},${l.p[1]})`}>
            <rect x={-l.t.length * 3.5} y={-9} width={l.t.length * 7} height={14} rx={7} className="label-pill river-pill" />
            <text x={0} y={2} className="label-text river-text">{l.t}</text>
          </g>
        ))}
        {labels.lakes.map(l => (
          <g key={l.k} transform={`translate(${l.p[0]},${l.p[1] + 28})`}>
            <rect x={-l.t.length * 3.2} y={-9} width={l.t.length * 6.4} height={14} rx={7} className="label-pill lake-pill" />
            <text x={0} y={2} className="label-text lake-text">{l.t}</text>
          </g>
        ))}

        {/* Feature markers */}
        {features.map(f => {
          const C = MARKER_MAP[f.category];
          return C ? <C key={f.id} feature={f} onClick={onFeatureClick} lang={lang} year={year} /> : null;
        })}

        {/* Click ripple effect */}
        {clickRipple && (
          <g className="click-ripple" transform={`translate(${clickRipple.x},${clickRipple.y})`}>
            <rect x={-1} y={-1} width={TILE + 2} height={TILE + 2} rx={5} className="ripple-highlight" />
            <rect x={-4} y={-4} width={TILE + 8} height={TILE + 8} rx={7} className="ripple-ring" />
          </g>
        )}

        {/* Coordinate grid overlay */}
        {showGrid && (
          <g className="coord-grid">
            {[76, 78, 80, 82, 84, 86, 88].map(lng => {
              const [x1] = toSVG(lng, MAP_BOUNDS.maxLat);
              const [x2] = toSVG(lng, MAP_BOUNDS.minLat);
              return (
                <g key={`gv${lng}`}>
                  <line x1={x1} y1={0} x2={x2} y2={800} className="coord-grid-line" />
                  <text x={x1 + 3} y={14} className="coord-grid-label">{lng}°E</text>
                </g>
              );
            })}
            {[36, 38, 40, 42].map(lat => {
              const [, y1] = toSVG(MAP_BOUNDS.minLng, lat);
              return (
                <g key={`gh${lat}`}>
                  <line x1={0} y1={y1} x2={1200} y2={y1} className="coord-grid-line" />
                  <text x={6} y={y1 - 4} className="coord-grid-label">{lat}°N</text>
                </g>
              );
            })}
          </g>
        )}

        {/* Compass */}
        <g transform="translate(70,720)" className="compass">
          <circle r={20} className="compass-bg" />
          <polygon points="0,-16 -4,-4 4,-4" fill="#E53935" />
          <polygon points="0,16 -4,4 4,4" fill="#9E9E9E" />
          <circle r={3} fill="#fff" stroke="#bbb" strokeWidth={0.5} />
          <text y={-22} className="compass-n">N</text>
        </g>

        {/* Scale */}
        <g transform="translate(70,766)">
          <rect x={0} y={-3} width={80} height={6} rx={3} fill="#E0E0E0" />
          <rect x={0} y={-3} width={40} height={6} rx={3} fill="#BDBDBD" />
          <text x={40} y={14} className="scale-text">~200 km</text>
        </g>
      </svg>

      {/* (tooltip removed — data shows only on click via pinned card) */}

      {/* Pinned data card */}
      {pinnedCard && (
        <div className="map-pinned-card" style={{ left: Math.min(pinnedCard.screenX + 14, (containerRef.current?.clientWidth || 999) - 200), top: pinnedCard.screenY - 100 }}>
          <button className="map-pin-close" onClick={() => setPinnedCard(null)}>×</button>
          <div className="map-pin-coords">{pinnedCard.lat.toFixed(4)}°N, {pinnedCard.lng.toFixed(4)}°E</div>
          <div className="map-pin-ndvi">NDVI: <strong style={{ color: ndviToColor(pinnedCard.ndvi) || "#888" }}>{pinnedCard.ndvi != null ? pinnedCard.ndvi.toFixed(3) : "—"}</strong></div>
          <div className="map-pin-class">{pinnedCard.classification}</div>
          <div className="map-pin-terrain">{pinnedCard.terrain}</div>
        </div>
      )}

      {/* Controls */}
      <div className="map-zoom-controls">
        <button onClick={() => setShowGrid(g => !g)} aria-label="Toggle grid" className={showGrid ? "grid-active" : ""}>
          <FiGrid size={16} />
        </button>
        <button onClick={() => setZoom(z => Math.min(4, z + 0.3))} aria-label="Zoom in">+</button>
        <button onClick={() => setZoom(z => { const next = Math.max(1, z - 0.3); if (next <= 1) setPan({ x: 0, y: 0 }); return next; })} aria-label="Zoom out">−</button>
      </div>

      {/* Tile count badge */}
      {/* Loading indicator for NDVI data */}
      {!ndviGrid && (
        <div className="ndvi-loading-badge" aria-live="polite">
          <span className="ndvi-loading-dot" />
          Loading satellite data...
        </div>
      )}

      <div className="tile-count-badge">
        {totalTiles.toLocaleString()} tiles · {ndviGrid ? "Sentinel-2 2024" : "Demo"}
      </div>
    </div>
  );
}
