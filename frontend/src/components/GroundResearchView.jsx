import { useRef, useEffect, useMemo } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { DESERT_OUTLINE, GREEN_BELT_SEGMENTS, RIVERS } from "../data/mapShapes";
import { FiMapPin, FiCalendar, FiCamera, FiThermometer, FiWind, FiDroplet, FiCheckSquare, FiPackage, FiTruck, FiSun, FiArrowRight, FiZoomIn, FiRadio, FiCpu, FiUser, FiNavigation } from "react-icons/fi";
import "./GroundResearchView.css";

/* ── Scroll-triggered fade-in ── */
function useFadeIn() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.unobserve(el); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function FadeSection({ children, className = "" }) {
  const ref = useFadeIn();
  return <section ref={ref} className={`gr-fade ${className}`}>{children}</section>;
}

/* ── SVG projection ── */
const BOUNDS = { minLng: 76, maxLng: 89, minLat: 36, maxLat: 42.5 };
const SVG_W = 600, SVG_H = 340;

function proj(lng, lat) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * SVG_W;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * SVG_H;
  return [x, y];
}

function toPath(points) {
  return points.map(([lng, lat], i) => {
    const [x, y] = proj(lng, lat);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

/** Smooth Catmull-Rom → SVG cubic bezier through waypoints */
function smoothRoute(waypoints) {
  if (waypoints.length < 2) return "";
  const pts = waypoints.map(([lng, lat]) => proj(lng, lat));
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const t = 0.35; // tension
    const cp1x = p1[0] + (p2[0] - p0[0]) * t;
    const cp1y = p1[1] + (p2[1] - p0[1]) * t;
    const cp2x = p2[0] - (p3[0] - p1[0]) * t;
    const cp2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/* ── Data ── */

// Travel order: Korla (fly in) → Highway (drive south along it) → Hotan (southwest) → Alar (north)
const SITES_ORDERED = [
  { id: "korla", order: 1, en: "Korla Oasis", zh: "库尔勒绿洲", short_en: "Korla", short_zh: "库尔勒", coord: "41.8°N, 86.1°E", lng: 86.1, lat: 41.8, desc_en: "Fly in. Established vegetation meets advancing sand. Long-term monitoring plots.", desc_zh: "飞抵。成熟植被与推进的沙漠交界。长期监测样地。", color: "#ab47bc", labelDir: "right" },
  { id: "highway", order: 2, en: "Desert Highway", zh: "沙漠公路", short_en: "Highway", short_zh: "公路", coord: "38.5°N, 83.6°E", lng: 83.6, lat: 38.5, desc_en: "436 km shelterbelt transect — the backbone of the green belt.", desc_zh: "436公里防护林样带——绿带的主干。", color: "#4fc3f7", labelDir: "right" },
  { id: "hotan", order: 3, en: "Hotan Green Belt", zh: "和田绿化带", short_en: "Hotan", short_zh: "和田", coord: "37.1°N, 79.9°E", lng: 79.9, lat: 37.1, desc_en: "Active planting frontier. Youngest trees, highest mortality risk.", desc_zh: "活跃种植前线。最年轻的树木，死亡风险最高。", color: "#66bb6a", labelDir: "left" },
  { id: "alar", order: 4, en: "Alar–Tarim Junction", zh: "阿拉尔–塔里木河", short_en: "Alar", short_zh: "阿拉尔", coord: "40.5°N, 81.3°E", lng: 81.3, lat: 40.5, desc_en: "Where the Tarim River feeds the shelterbelt. Water-vegetation coupling.", desc_zh: "塔里木河滋养防护林之处。水-植被耦合。", color: "#ffa726", labelDir: "left" },
];

// Smooth route — realistic driving path following the rim
const ROUTE_WAYPOINTS = [
  [86.1, 41.8],  // 1 Korla
  [85.0, 41.2],  // drive west along north rim
  [83.8, 41.0],  // approach highway from north
  [83.6, 39.5],  // highway mid
  [83.6, 38.5],  // 2 Highway center
  [83.5, 37.5],  // highway south
  [82.0, 37.0],  // drive west along south rim
  [79.9, 37.1],  // 3 Hotan
  [80.0, 38.5],  // drive north
  [80.5, 39.8],  // along west rim
  [81.3, 40.5],  // 4 Alar
];

const TIMELINE = [
  { month: "Jun", en: "Arrival & Base Setup", zh: "抵达与营地建设", desc_en: "Fly into Korla, drive to first site. Set up solar-powered field station and calibrate equipment.", desc_zh: "飞抵库尔勒，驱车前往第一个站点。搭建太阳能供电的野外站，校准设备。", icon: FiTruck },
  { month: "Jun–Jul", en: "Desert Highway Transect", zh: "沙漠公路样带调查", desc_en: "Walk the 436 km shelterbelt. GPS-tag every 50th tree. Measure trunk diameter, canopy cover, soil moisture.", desc_zh: "徒步调查436公里防护林。每50棵树GPS定位。测量胸径、冠幅覆盖度和土壤含水量。", icon: FiMapPin },
  { month: "Jul", en: "Hotan Southern Belt", zh: "和田南缘绿带", desc_en: "Survey the newest planting zones. Document sapling survival rates and irrigation infrastructure.", desc_zh: "调查南缘最新种植区。记录幼苗存活率和灌溉设施状况。", icon: FiDroplet },
  { month: "Jul–Aug", en: "Snake Robot Field Test", zh: "蛇形机器人实地测试", desc_en: "Deploy the prototype on real sand. Test sidewinding locomotion, camera-based tree inspection, autonomous navigation.", desc_zh: "在真实沙地上部署原型机。测试侧绕运动、摄像头检查和自主导航。", icon: FiSun },
  { month: "Aug", en: "Data Collection & Return", zh: "数据整理与返程", desc_en: "Compile ground-truth dataset: soil samples, photos, GPS tracks, drone footage. Cross-reference with satellite NDVI.", desc_zh: "汇编地面真值数据集：土壤样本、照片、GPS轨迹、无人机影像。与卫星NDVI交叉验证。", icon: FiCamera },
];

const SCALE_LEVELS = [
  { label_en: "Satellite", label_zh: "卫星", resolution: "10 m/px", area_en: "337,000 km²", area_zh: "33.7万km²", color: "#4fc3f7", Icon: FiRadio, desc_en: "Sentinel-2 sees the entire desert at once — but can't tell a dead tree from a live one", desc_zh: "Sentinel-2一次覆盖整片沙漠——但无法分辨枯树和活树" },
  { label_en: "Drone", label_zh: "无人机", resolution: "2 cm/px", area_en: "~1 km²", area_zh: "~1 km²", color: "#66bb6a", Icon: FiNavigation, desc_en: "Overhead view of a planting block — canopy shape, spacing, missing trees", desc_zh: "种植区块的俯视图——冠幅形状、间距、缺失的树" },
  { label_en: "Snake Robot", label_zh: "蛇形机器人", resolution: "1 mm", area_en: "~100 m", area_zh: "~100 m", color: "#ffa726", Icon: FiCpu, desc_en: "Ground-level patrol — bark texture, leaf health, trunk diameter, insect damage", desc_zh: "地面巡逻——树皮纹理、叶片健康、胸径、虫害" },
  { label_en: "Human", label_zh: "研究员", resolution: "touch", area_en: "1 tree", area_zh: "1棵树", color: "#ef5350", Icon: FiUser, desc_en: "Dig soil, test moisture, tag the tree, photograph every angle — the ground truth", desc_zh: "挖土、测水分、标记树木、全角度拍照——地面真值" },
];

const EQUIPMENT = [
  { en: "Soil Moisture Probe", zh: "土壤水分探针", desc_en: "TDR sensor, 0–60 cm depth", desc_zh: "TDR传感器，0-60cm深度", icon: FiDroplet },
  { en: "Handheld NDVI Meter", zh: "手持NDVI测量仪", desc_en: "GreenSeeker for ground-truth calibration", desc_zh: "GreenSeeker，用于地面真值标定", icon: FiThermometer },
  { en: "Weather Station", zh: "便携气象站", desc_en: "Temp, humidity, wind, solar radiation", desc_zh: "温度、湿度、风速、太阳辐射", icon: FiWind },
  { en: "GPS RTK Unit", zh: "GPS RTK装置", desc_en: "Centimeter-precision tree positioning", desc_zh: "厘米级精度树木定位", icon: FiMapPin },
  { en: "Drone (DJI Mini)", zh: "无人机（DJI Mini）", desc_en: "Aerial photos & orthomosaic mapping", desc_zh: "航拍照片与正射影像图", icon: FiCamera },
  { en: "Snake Robot v1", zh: "蛇形机器人v1", desc_en: "Sidewinding prototype, onboard cam, 2hr battery", desc_zh: "侧绕原型机，机载摄像头，2小时续航", icon: FiPackage },
];

const OBJECTIVES = [
  { en: "Ground-truth the satellite NDVI", zh: "验证卫星NDVI数据", desc_en: "Compare handheld NDVI readings against Sentinel-2 pixels at 200+ points to quantify accuracy.", desc_zh: "在200+个点位对比手持NDVI读数与Sentinel-2像元值，量化精度。" },
  { en: "Map sapling survival rates", zh: "绘制幼苗存活率图", desc_en: "GPS-tag and photograph every 50th tree along 436 km. Build the first tree-by-tree mortality map.", desc_zh: "沿436公里每50棵树GPS定位并拍照。构建首张逐株死亡率分布图。" },
  { en: "Test the snake robot on real terrain", zh: "真实地形机器人测试", desc_en: "Can the prototype navigate loose sand, inspect trees, and return data autonomously?", desc_zh: "原型机能否在松散沙地上导航、检查树木并自主回传数据？" },
  { en: "Collect soil & climate baseline", zh: "采集土壤与气候基线", desc_en: "Soil moisture, salinity, texture at each site. Weather data for the full research window.", desc_zh: "各站点的土壤含水量、盐度、质地。整个研究窗口的气象数据。" },
];

/* ═══════════════════════════════════════════
   SVG ROUTE MAP — smooth curves, numbered waypoints, offset labels
   ═══════════════════════════════════════════ */
function SiteMap({ sites, zh }) {
  const desertPath = toPath(DESERT_OUTLINE);
  const routeD = smoothRoute(ROUTE_WAYPOINTS);

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="gr-svg-map" role="img" aria-label="Research site map">
      <defs>
        <linearGradient id="grDesertFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c9a96e" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#8B6914" stopOpacity="0.03" />
        </linearGradient>
        <radialGradient id="grSandGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c9a96e" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#c9a96e" stopOpacity="0" />
        </radialGradient>
        <filter id="grGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background glow */}
      <ellipse cx={SVG_W / 2} cy={SVG_H / 2} rx={SVG_W * 0.4} ry={SVG_H * 0.35} fill="url(#grSandGlow)" />

      {/* Desert fill */}
      <path d={desertPath + " Z"} fill="url(#grDesertFill)" stroke="#c9a96e" strokeWidth="1.2" strokeOpacity="0.25" strokeDasharray="6 3" />

      {/* Green belt segments */}
      {GREEN_BELT_SEGMENTS.map(seg => (
        <path key={seg.id} d={toPath(seg.points)} fill="none" stroke="#66bb6a" strokeWidth={seg.thickness * 0.7} strokeOpacity="0.3" strokeLinecap="round" />
      ))}

      {/* Rivers — subtle */}
      {RIVERS.slice(0, 3).map(r => (
        <path key={r.id} d={toPath(r.points)} fill="none" stroke="#4fc3f7" strokeWidth="0.8" strokeOpacity="0.12" strokeLinecap="round" />
      ))}

      {/* Desert label */}
      <text x={SVG_W / 2} y={SVG_H / 2 + 8} textAnchor="middle" fill="#c9a96e" fontSize="13" fontWeight="700" opacity="0.1" fontFamily="-apple-system, sans-serif" letterSpacing="10">
        TAKLIMAKAN
      </text>

      {/* Route — smooth curve, animated dash */}
      <path d={routeD} fill="none" stroke="#ffa726" strokeWidth="2.5" strokeOpacity="0.15" strokeLinecap="round" />
      <path d={routeD} fill="none" stroke="#ffa726" strokeWidth="2" strokeDasharray="8 6" strokeLinecap="round" className="gr-route-animated" />

      {/* Site markers with numbered waypoints + offset labels */}
      {sites.map(site => {
        const [x, y] = proj(site.lng, site.lat);
        const isRight = site.labelDir === "right";
        const lx = isRight ? x + 18 : x - 18;
        const anchor = isRight ? "start" : "end";
        const label = zh ? site.short_zh : site.short_en;

        return (
          <g key={site.id}>
            {/* Soft glow ring */}
            <circle cx={x} cy={y} r="16" fill={site.color} fillOpacity="0.06" />
            <circle cx={x} cy={y} r="10" fill={site.color} fillOpacity="0.08" />

            {/* Outer ring */}
            <circle cx={x} cy={y} r="8" fill="none" stroke={site.color} strokeWidth="1.5" strokeOpacity="0.4" />

            {/* Inner dot */}
            <circle cx={x} cy={y} r="4" fill={site.color} />

            {/* Waypoint number */}
            <circle cx={x} cy={y} r="7" fill="#0d1117" stroke={site.color} strokeWidth="1.5" />
            <text x={x} y={y + 3.5} textAnchor="middle" fill={site.color} fontSize="8" fontWeight="800" fontFamily="-apple-system, sans-serif">
              {site.order}
            </text>

            {/* Leader line */}
            <line x1={x + (isRight ? 9 : -9)} y1={y} x2={lx - (isRight ? 4 : -4)} y2={y} stroke={site.color} strokeWidth="0.8" strokeOpacity="0.4" />

            {/* Label with background */}
            <rect x={isRight ? lx - 2 : lx - label.length * 5.5 - 2} y={y - 7} width={label.length * 5.5 + 4} height="14" rx="3" fill="#0d1117" fillOpacity="0.8" />
            <text x={lx} y={y + 3} textAnchor={anchor} fill={site.color} fontSize="9.5" fontWeight="700" fontFamily="-apple-system, sans-serif">
              {label}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${SVG_W - 145}, ${SVG_H - 30})`}>
        <rect x="-6" y="-8" width="142" height="22" rx="4" fill="#0d1117" fillOpacity="0.7" />
        <line x1="0" y1="3" x2="24" y2="3" stroke="#ffa726" strokeWidth="2" strokeDasharray="6 4" />
        <text x="30" y="7" fill="#6a7a8a" fontSize="9" fontFamily="-apple-system, sans-serif">{zh ? "计划路线" : "Planned route"}</text>
        <line x1="96" y1="3" x2="108" y2="3" stroke="#66bb6a" strokeWidth="2" strokeOpacity="0.5" />
        <text x="113" y="7" fill="#6a7a8a" fontSize="9" fontFamily="-apple-system, sans-serif">{zh ? "绿带" : "Belt"}</text>
      </g>
    </svg>
  );
}

/* ═══════════════════════════════════════════
   NESTED-FRAME SCALE COMPARISON
   ═══════════════════════════════════════════ */
function ScaleComparison({ levels, zh }) {
  return (
    <div className="gr-zoom-stack">
      {levels.map((lv, i) => {
        const Icon = lv.Icon;
        return (
          <div key={i} className="gr-zoom-frame" style={{ "--frame-color": lv.color }}>
            <div className="gr-zoom-header">
              <div className="gr-zoom-icon" style={{ background: `${lv.color}18`, color: lv.color }}>
                <Icon size={18} />
              </div>
              <div className="gr-zoom-meta">
                <strong style={{ color: lv.color }}>{zh ? lv.label_zh : lv.label_en}</strong>
                <div className="gr-zoom-badges">
                  <span className="gr-zoom-res">{lv.resolution}</span>
                  <span className="gr-zoom-area">{zh ? lv.area_zh : lv.area_en}</span>
                </div>
              </div>
            </div>
            <p className="gr-zoom-desc">{zh ? lv.desc_zh : lv.desc_en}</p>
            {i < levels.length - 1 && (
              <div className="gr-zoom-connector">
                <FiZoomIn size={12} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   VALIDATION PIPELINE — clean icon circles
   ═══════════════════════════════════════════ */
function ValidationPipeline({ zh }) {
  const steps = [
    { Icon: FiRadio, label: zh ? "卫星像元" : "Satellite pixel", sub: "NDVI = 0.32", color: "#4fc3f7" },
    { Icon: FiThermometer, label: zh ? "地面测量" : "Ground reading", sub: "NDVI = 0.34", color: "#66bb6a" },
    { Icon: FiCheckSquare, label: zh ? "误差分析" : "Error analysis", sub: "\u0394 = 0.02 (6%)", color: "#ffa726" },
    { Icon: FiZoomIn, label: zh ? "标定完成" : "Calibrated", sub: zh ? "可信度确认" : "Confidence set", color: "#66bb6a" },
  ];

  return (
    <div className="gr-pipeline">
      <h4>{zh ? "卫星数据验证流程" : "Satellite Data Validation Pipeline"}</h4>
      <div className="gr-pipe-steps">
        {steps.map((s, i) => {
          const Icon = s.Icon;
          return (
            <div key={i} className="gr-pipe-step">
              <div className="gr-pipe-icon" style={{ borderColor: s.color, color: s.color }}>
                <Icon size={18} />
              </div>
              <strong style={{ color: s.color }}>{s.label}</strong>
              <span className="gr-pipe-sub">{s.sub}</span>
              {i < steps.length - 1 && <div className="gr-pipe-connector"><FiArrowRight size={14} /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TREE TRANSECT — sand dunes + soil cross-section
   ═══════════════════════════════════════════ */
function TransectVisual({ zh }) {
  const trees = useMemo(() => {
    const rng = (i) => { const s = Math.sin(i * 127.1 + 43758.5); return s - Math.floor(s); };
    const result = [];
    for (let i = 0; i < 32; i++) {
      const alive = rng(i) > 0.35;
      const h = alive ? 18 + rng(i + 100) * 16 : 5 + rng(i + 200) * 8;
      result.push({ x: 18 + i * 17, alive, h, canopy: alive ? 7 + rng(i + 300) * 11 : 0 });
    }
    return result;
  }, []);

  return (
    <div className="gr-transect">
      <h4>{zh ? "防护林样带横截面示意" : "Shelterbelt Transect Cross-Section"}</h4>
      <svg viewBox="0 0 580 130" className="gr-transect-svg">
        {/* Sky gradient */}
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d1117" />
            <stop offset="100%" stopColor="#111d2b" />
          </linearGradient>
          <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B6914" stopOpacity="0.15" />
            <stop offset="40%" stopColor="#5a4520" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#3a2a10" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Background dune waves */}
        <path d="M0 70 Q60 62 120 68 T240 64 T360 70 T480 66 T580 70 L580 85 L0 85 Z" fill="#c9a96e" fillOpacity="0.04" />
        <path d="M0 74 Q80 68 160 73 T320 69 T480 74 T580 72 L580 85 L0 85 Z" fill="#c9a96e" fillOpacity="0.03" />

        {/* Ground surface */}
        <line x1="8" y1="85" x2="572" y2="85" stroke="#c9a96e" strokeWidth="1.5" strokeOpacity="0.25" />

        {/* Soil cross-section */}
        <rect x="8" y="85" width="564" height="40" rx="0" fill="url(#soilGrad)" />
        {/* Soil layers */}
        <line x1="8" y1="97" x2="572" y2="97" stroke="#5a4520" strokeWidth="0.5" strokeOpacity="0.15" strokeDasharray="4 8" />
        <line x1="8" y1="110" x2="572" y2="110" stroke="#3a2a10" strokeWidth="0.5" strokeOpacity="0.1" strokeDasharray="3 12" />
        {/* Soil labels */}
        <text x="578" y="93" textAnchor="end" fill="#8B6914" fontSize="7" fillOpacity="0.3">{zh ? "表土" : "topsoil"}</text>
        <text x="578" y="106" textAnchor="end" fill="#5a4520" fontSize="7" fillOpacity="0.25">{zh ? "沙层" : "sand"}</text>
        <text x="578" y="120" textAnchor="end" fill="#3a2a10" fontSize="7" fillOpacity="0.2">{zh ? "基岩" : "bedrock"}</text>

        {/* Root zones for alive trees (subtle) */}
        {trees.map((t, i) => t.alive && (
          <line key={`root-${i}`} x1={t.x} y1={85} x2={t.x + (i % 2 ? 3 : -3)} y2={97 + t.canopy * 0.3}
            stroke="#66bb6a" strokeWidth="0.5" strokeOpacity="0.15" />
        ))}

        {/* Soil moisture probe indicator */}
        <g transform="translate(290, 87)">
          <rect x="-1" y="0" width="2" height="24" rx="1" fill="#4fc3f7" fillOpacity="0.3" />
          <circle cx="0" cy="24" r="2" fill="#4fc3f7" fillOpacity="0.5" />
        </g>

        {/* Trees */}
        {trees.map((t, i) => (
          <g key={i}>
            {/* Trunk */}
            <line x1={t.x} y1={85} x2={t.x} y2={85 - t.h} stroke={t.alive ? "#8B6914" : "#4a3a2a"} strokeWidth={t.alive ? 2 : 1.5} strokeOpacity={t.alive ? 0.8 : 0.5} />
            {/* Canopy or dead marker */}
            {t.alive ? (
              <>
                <ellipse cx={t.x} cy={85 - t.h - t.canopy / 2.2} rx={t.canopy / 2} ry={t.canopy / 2.8} fill="#2E7D32" fillOpacity="0.35" />
                <ellipse cx={t.x - 1} cy={85 - t.h - t.canopy / 2.5} rx={t.canopy / 2.5} ry={t.canopy / 3.2} fill="#66bb6a" fillOpacity="0.4" />
              </>
            ) : (
              <>
                <line x1={t.x - 3} y1={85 - t.h - 5} x2={t.x + 3} y2={85 - t.h + 1} stroke="#ef5350" strokeWidth="1.5" strokeOpacity="0.7" />
                <line x1={t.x + 3} y1={85 - t.h - 5} x2={t.x - 3} y2={85 - t.h + 1} stroke="#ef5350" strokeWidth="1.5" strokeOpacity="0.7" />
              </>
            )}
            {/* GPS tag on every 5th */}
            {i % 5 === 0 && (
              <g>
                <line x1={t.x} y1={85 - t.h - (t.alive ? t.canopy : 4) - 6} x2={t.x} y2={85 - t.h - (t.alive ? t.canopy : 4) - 12} stroke="#4fc3f7" strokeWidth="0.5" strokeOpacity="0.5" />
                <circle cx={t.x} cy={85 - t.h - (t.alive ? t.canopy : 4) - 14} r="2.5" fill="#4fc3f7" fillOpacity="0.6" stroke="#0d1117" strokeWidth="0.5" />
              </g>
            )}
          </g>
        ))}

        {/* Distance markers */}
        {[0, 100, 200, 300, 436].map(km => {
          const xPos = 18 + (km / 436) * (32 * 17 - 18);
          return (
            <g key={km}>
              <line x1={xPos} y1={85} x2={xPos} y2={82} stroke="#6a7a8a" strokeWidth="0.5" strokeOpacity="0.3" />
              <text x={xPos} y={80} textAnchor="middle" fill="#4a5a6a" fontSize="7">{km} km</text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(14, 6)">
          <rect x="-4" y="-4" width="170" height="16" rx="3" fill="#0d1117" fillOpacity="0.7" />
          <ellipse cx="6" cy="5" rx="5" ry="3.5" fill="#66bb6a" fillOpacity="0.4" />
          <text x="16" y="8" fill="#8a9aaa" fontSize="8">{zh ? "活树" : "Alive"}</text>
          <line x1="54" y1="3" x2="60" y2="7" stroke="#ef5350" strokeWidth="1.2" />
          <line x1="60" y1="3" x2="54" y2="7" stroke="#ef5350" strokeWidth="1.2" />
          <text x="66" y="8" fill="#8a9aaa" fontSize="8">{zh ? "枯死" : "Dead"}</text>
          <circle cx="106" cy="5" r="2.5" fill="#4fc3f7" fillOpacity="0.6" />
          <text x="113" y="8" fill="#8a9aaa" fontSize="8">{zh ? "GPS标记" : "GPS tag"}</text>
        </g>
      </svg>
      <p className="gr-transect-caption">
        {zh
          ? "每50棵树进行GPS定位和测量。红色标记表示枯死树木。蓝色探针示意土壤含水量采样深度。"
          : "Every 50th tree is GPS-tagged. Red X marks dead trees needing replanting. Blue probe shows soil moisture sampling depth."}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function GroundResearchView({ onNavigate }) {
  const { lang } = useLanguage();
  const zh = lang === "zh";

  return (
    <div className="gr-page">
      {/* ── HERO ── */}
      <section className="gr-hero">
        <div className="gr-hero-inner">
          <div className="gr-hero-badge">
            <FiCalendar size={14} />
            {zh ? "2026年夏季计划" : "Summer 2026 Plan"}
          </div>
          <h1>{zh ? "实地研究计划" : "Ground Research Plan"}</h1>
          <p>
            {zh
              ? "这个夏天，我们将前往塔克拉玛干沙漠，用双脚丈量绿带，用仪器验证卫星数据，在真实沙漠中测试蛇形机器人。"
              : "This summer we go to the Taklimakan Desert. Walk the green belt, validate satellite data with instruments on the ground, and field-test the snake robot on real sand."}
          </p>
          <div className="gr-hero-stats">
            <div className="gr-hstat"><strong>~80</strong><span>{zh ? "天野外" : "days in field"}</span></div>
            <div className="gr-hstat"><strong>4</strong><span>{zh ? "研究站点" : "research sites"}</span></div>
            <div className="gr-hstat"><strong>436</strong><span>{zh ? "公里样带" : "km transect"}</span></div>
          </div>
        </div>
      </section>

      {/* ── SITE MAP ── */}
      <FadeSection className="gr-section">
        <h2><FiMapPin size={18} /> {zh ? "研究站点与路线" : "Research Sites & Route"}</h2>
        <p className="gr-section-desc">
          {zh ? "从库尔勒出发，沿沙漠边缘行进至四个研究站点。编号表示到达顺序。" : "Starting from Korla, traveling along the desert rim to four research sites. Numbers show arrival order."}
        </p>
        <div className="gr-map-container">
          <SiteMap sites={SITES_ORDERED} zh={zh} />
        </div>
        <div className="gr-sites">
          {SITES_ORDERED.map((site, i) => (
            <div key={i} className="gr-site" style={{ borderLeftColor: site.color }}>
              <div className="gr-site-header">
                <h4><span className="gr-site-num" style={{ color: site.color }}>{site.order}</span> {zh ? site.zh : site.en}</h4>
                <span className="gr-site-coord">{site.coord}</span>
              </div>
              <p>{zh ? site.desc_zh : site.desc_en}</p>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── RESOLUTION SCALE ── */}
      <FadeSection className="gr-section">
        <h2><FiZoomIn size={18} /> {zh ? "多尺度观测体系" : "Multi-Scale Observation"}</h2>
        <p className="gr-section-desc">
          {zh
            ? "从太空到地面，每一层填补上一层的盲区。实地研究提供最终的地面真值。"
            : "From space to the ground, each layer fills the blind spots of the one above. Field research provides the ultimate ground truth."}
        </p>
        <ScaleComparison levels={SCALE_LEVELS} zh={zh} />
      </FadeSection>

      {/* ── VALIDATION PIPELINE + TRANSECT ── */}
      <FadeSection className="gr-section">
        <h2><FiCheckSquare size={18} /> {zh ? "研究目标" : "Research Objectives"}</h2>
        <ValidationPipeline zh={zh} />
        <TransectVisual zh={zh} />
        <div className="gr-objectives">
          {OBJECTIVES.map((obj, i) => (
            <div key={i} className="gr-objective">
              <div className="gr-obj-num">{i + 1}</div>
              <div>
                <strong>{zh ? obj.zh : obj.en}</strong>
                <p>{zh ? obj.desc_zh : obj.desc_en}</p>
              </div>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── TIMELINE ── */}
      <FadeSection className="gr-section">
        <h2><FiCalendar size={18} /> {zh ? "行程时间线" : "Field Timeline"}</h2>
        <div className="gr-timeline">
          {TIMELINE.map((t, i) => {
            const Icon = t.icon;
            return (
              <div key={i} className="gr-tl-item">
                <div className="gr-tl-left">
                  <div className="gr-tl-dot" />
                  {i < TIMELINE.length - 1 && <div className="gr-tl-line" />}
                </div>
                <div className="gr-tl-content">
                  <div className="gr-tl-month"><Icon size={14} />{t.month}</div>
                  <h4>{zh ? t.zh : t.en}</h4>
                  <p>{zh ? t.desc_zh : t.desc_en}</p>
                </div>
              </div>
            );
          })}
        </div>
      </FadeSection>

      {/* ── EQUIPMENT ── */}
      <FadeSection className="gr-section">
        <h2><FiPackage size={18} /> {zh ? "装备清单" : "Equipment List"}</h2>
        <div className="gr-equipment">
          {EQUIPMENT.map((eq, i) => {
            const Icon = eq.icon;
            return (
              <div key={i} className="gr-equip-card">
                <Icon size={20} className="gr-equip-icon" />
                <strong>{zh ? eq.zh : eq.en}</strong>
                <span>{zh ? eq.desc_zh : eq.desc_en}</span>
              </div>
            );
          })}
        </div>
      </FadeSection>

      {/* ── WHAT HAPPENS AFTER ── */}
      <FadeSection className="gr-section gr-after">
        <h2>{zh ? "实地研究之后" : "After the Field Trip"}</h2>
        <p className="gr-section-desc">
          {zh
            ? "回来之后，这个页面将展示真实数据：照片、GPS轨迹、土壤分析、机器人测试视频，以及卫星-地面对比结果。"
            : "When we return, this page becomes real data: photos, GPS tracks, soil analysis, robot test footage, and satellite-vs-ground results."}
        </p>
        <div className="gr-after-cards">
          <div className="gr-after-card"><FiCamera size={20} /><strong>{zh ? "实地照片" : "Field Photos"}</strong><span>{zh ? "每个站点的植被、地形和设备照片" : "Vegetation, terrain, and equipment photos from each site"}</span></div>
          <div className="gr-after-card"><FiMapPin size={20} /><strong>{zh ? "GPS轨迹与树木地图" : "GPS Tracks & Tree Map"}</strong><span>{zh ? "逐株定位数据，叠加在卫星底图上" : "Tree-by-tree positioning data overlaid on satellite basemaps"}</span></div>
          <div className="gr-after-card"><FiThermometer size={20} /><strong>{zh ? "土壤与气候数据" : "Soil & Climate Data"}</strong><span>{zh ? "含水量、盐度和温度的时空分布" : "Moisture, salinity, and temperature across space and time"}</span></div>
        </div>
        {onNavigate && (
          <button className="gr-explore-btn" onClick={() => onNavigate("monitor")}>
            {zh ? "查看卫星监测数据" : "Explore Satellite Data"} <FiArrowRight size={14} />
          </button>
        )}
      </FadeSection>
    </div>
  );
}
