import { useRef, useEffect, useState, useCallback } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { FiCpu, FiZap, FiSun, FiCamera, FiThermometer, FiDroplet, FiCheckCircle, FiAlertCircle, FiClock, FiArrowLeft, FiArrowRight, FiUploadCloud, FiPlay, FiRepeat, FiExternalLink, FiChevronDown, FiChevronUp, FiBook, FiGrid, FiWifi } from "react-icons/fi";
import FadeSection from "./FadeSection";
import "./SnakeRobotView.css";

/* ── Data ── */
const SPECS = [
  { labelEn: "Length", labelZh: "\u957F\u5EA6", value: "~60 cm", detail: "8 segments" },
  { labelEn: "Weight", labelZh: "\u91CD\u91CF", value: "~800g", detail: "with battery" },
  { labelEn: "Actuators", labelZh: "\u9A71\u52A8\u5668", value: "7x Servo", detail: "MG996R" },
  { labelEn: "Speed", labelZh: "\u901F\u5EA6", value: "3\u20135 cm/s", detail: "on sand" },
  { labelEn: "Runtime", labelZh: "\u7EED\u822A", value: "~45 min", detail: "active" },
  { labelEn: "Control", labelZh: "\u63A7\u5236", value: "WiFi/BT", detail: "remote" },
];

const SENSORS = [
  { icon: FiCamera, en: "ESP32-CAM", zh: "ESP32\u6444\u50CF\u5934", descEn: "Photographs stem bases to classify alive vs. dead saplings. GPS-tagged images stored on microSD.", descZh: "\u62CD\u6444\u6811\u5E72\u57FA\u90E8\u5224\u65AD\u5B58\u6D3B\u72B6\u6001\u3002GPS\u6807\u8BB0\u56FE\u50CF\u5B58\u50A8\u5728microSD\u5361\u3002", color: "#4fc3f7", pos: "Head" },
  { icon: FiThermometer, en: "DHT22", zh: "DHT22\u4F20\u611F\u5668", descEn: "Ground-level temperature & humidity. Desert surface can be 15\u201320\u00B0C hotter than air.", descZh: "\u5730\u8868\u6E29\u6E7F\u5EA6\u3002\u6C99\u6F20\u5730\u8868\u53EF\u6BD4\u6C14\u6E29\u9AD815\u201320\u00B0C\u3002", color: "#ffa726", pos: "Segment 4" },
  { icon: FiDroplet, en: "Soil Probe", zh: "\u571F\u58E4\u63A2\u9488", descEn: "Capacitive sensor measures root-zone moisture at ~5 cm depth. Critical for irrigation assessment.", descZh: "\u7535\u5BB9\u5F0F\u4F20\u611F\u5668\u6D4B\u91CF\u7EA65cm\u6DF1\u5904\u6839\u533A\u6C34\u5206\u3002", color: "#66bb6a", pos: "Segment 6" },
];

const TERRAIN = [
  { en: "Loose Sand", zh: "\u677E\u6563\u6C99\u5730", snake: 9, wheeled: 3, legged: 5 },
  { en: "Dunes", zh: "\u6C99\u4E18", snake: 7, wheeled: 2, legged: 4 },
  { en: "Rocks", zh: "\u5CA9\u77F3", snake: 6, wheeled: 5, legged: 7 },
  { en: "Irrigation", zh: "\u704C\u6E20", snake: 9, wheeled: 2, legged: 5 },
  { en: "Vegetation", zh: "\u690D\u88AB\u95F4", snake: 8, wheeled: 3, legged: 5 },
];

const BOM = [
  { item: "MG996R Servo Motor", qty: "7", cost: "$42", note: "High torque, metal gear" },
  { item: "3D Printed Segments", qty: "8", cost: "$15", note: "PLA/PETG, ~2hr each" },
  { item: "ESP32 Controller", qty: "1", cost: "$12", note: "Main MCU + WiFi" },
  { item: "PCA9685 Servo Driver", qty: "1", cost: "$5", note: "16-channel PWM" },
  { item: "3S LiPo 2200mAh", qty: "1", cost: "$18", note: "11.1V battery pack" },
  { item: "ESP32-CAM Module", qty: "1", cost: "$8", note: "Head camera + WiFi" },
  { item: "DHT22 + Soil Probe", qty: "2", cost: "$7", note: "Temp/humidity + moisture" },
  { item: "20W Solar Panel", qty: "1", cost: "$25", note: "Charging station" },
  { item: "Wiring & Misc", qty: "\u2014", cost: "$17", note: "Connectors, shrink tube" },
];

const BOM_CATEGORIES = [
  { label: "Servos", value: 42, color: "#ffa726" },
  { label: "Power", value: 43, color: "#ffc107" },
  { label: "Electronics", value: 25, color: "#4fc3f7" },
  { label: "Misc", value: 17, color: "#7c4dff" },
  { label: "Structure", value: 15, color: "#8a9aaa" },
  { label: "Sensors", value: 7, color: "#66bb6a" },
];

const IMPACT_STATS = [
  { valueEn: "500,000+", valueZh: "50万+", labelEn: "hectares of green belt along Taklamakan", labelZh: "塔克拉玛干沙漠绿化带面积（公顷）" },
  { valueEn: "~85M", valueZh: "~8500万", labelEn: "saplings planted annually in Xinjiang", labelZh: "新疆每年种植的树苗" },
  { valueEn: "15–30%", valueZh: "15–30%", labelEn: "first-year sapling mortality rate", labelZh: "树苗第一年死亡率" },
  { valueEn: "6×", valueZh: "6×", labelEn: "faster than manual inspection per hectare", labelZh: "比人工巡检每公顷快" },
];

const ROBOT_VS_MANUAL = [
  { metricEn: "Speed", metricZh: "速度", robotEn: "~50 trees/hr", robotZh: "~50棵/小时", manualEn: "~8 trees/hr", manualZh: "~8棵/小时" },
  { metricEn: "Heat Risk", metricZh: "中暑风险", robotEn: "None", robotZh: "无", manualEn: "Severe (>45°C)", manualZh: "严重 (>45°C)" },
  { metricEn: "Data Consistency", metricZh: "数据一致性", robotEn: "GPS-tagged, repeatable", robotZh: "GPS标记，可重复", manualEn: "Varies by worker", manualZh: "因人而异" },
  { metricEn: "Soil Moisture", metricZh: "土壤湿度", robotEn: "Measured at every tree", robotZh: "每棵树都测量", manualEn: "Rarely measured", manualZh: "很少测量" },
  { metricEn: "Cost / Survey", metricZh: "单次成本", robotEn: "~$0 (solar)", robotZh: "~¥0（太阳能）", manualEn: "~$50/day labor", manualZh: "~¥350/天人工" },
  { metricEn: "Night Operation", metricZh: "夜间作业", robotEn: "Yes (IR camera)", robotZh: "可以（红外）", manualEn: "No", manualZh: "不可以" },
];

const REFERENCES = [
  { authors: "Marvi, H. & Hu, D.L.", year: 2012, title: "Friction enhancement in concertina locomotion of snakes", journal: "Journal of the Royal Society Interface", doi: "10.1098/rsif.2012.0132" },
  { authors: "Choset, H. et al.", year: 2016, title: "Sidewinding with minimal slip: Snake and robot ascent of sandy slopes", journal: "Science (CMU Biorobotics Lab)", doi: "10.1126/science.1249679" },
  { authors: "Gong, C. et al.", year: 2016, title: "A study on the design of a snake robot for desert search", journal: "Robotics and Autonomous Systems", doi: "10.1016/j.robot.2015.11.013" },
];

const SOFTWARE_ARCH = [
  { id: "esp32", en: "ESP32 Firmware", zh: "ESP32固件", sub: "C++ / Arduino", color: "#ffa726" },
  { id: "wifi", en: "WiFi Relay", zh: "WiFi传输", sub: "802.11n", color: "#8a9aaa" },
  { id: "backend", en: "Python Backend", zh: "Python后端", sub: "FastAPI + SQLite", color: "#4fc3f7" },
  { id: "gee", en: "GEE Integration", zh: "GEE集成", sub: "Earth Engine API", color: "#66bb6a" },
  { id: "dashboard", en: "Web Dashboard", zh: "Web仪表盘", sub: "React + Leaflet", color: "#7c4dff" },
];

const TIMELINE_STEPS = [
  { en: "Research & CAD", zh: "\u7814\u7A76\u4E0ECAD", months: "Mar\u2013Apr", status: "current" },
  { en: "3D Print & Assemble", zh: "3D\u6253\u5370\u4E0E\u7EC4\u88C5", months: "Apr\u2013May", status: "upcoming" },
  { en: "Program & Test", zh: "\u7F16\u7A0B\u4E0E\u6D4B\u8BD5", months: "May\u2013Jun", status: "upcoming" },
  { en: "Field Deployment", zh: "\u5B9E\u5730\u90E8\u7F72", months: "Jun\u2013Aug", status: "upcoming" },
];

const FIELD_TESTS = [
  { en: "Sand Locomotion", zh: "\u6C99\u5730\u79FB\u52A8", descEn: "Film sidewinding across open sand. Document speed and track pattern.", descZh: "\u62CD\u6444\u5728\u5F00\u9614\u6C99\u5730\u4E0A\u7684\u4FA7\u7ED5\u8FD0\u52A8\u3002" },
  { en: "Green Belt Navigation", zh: "\u7EFF\u5E26\u5BFC\u822A", descEn: "Navigate between planted poplars and irrigation lines without damage.", descZh: "\u5728\u6811\u6728\u548C\u704C\u6E89\u7BA1\u7EBF\u95F4\u5BFC\u822A\u3002" },
  { en: "Data Collection Run", zh: "\u6570\u636E\u91C7\u96C6", descEn: "50m transect: photograph 20 trees, measure soil moisture, compare with manual count.", descZh: "50\u7C73\u6837\u7EBF\uFF1A\u62CD\u644720\u68F5\u6811\uFF0C\u6D4B\u571F\u58E4\u6E7F\u5EA6\uFF0C\u4E0E\u4EBA\u5DE5\u8BA1\u6570\u5BF9\u6BD4\u3002" },
  { en: "Failure Documentation", zh: "\u6545\u969C\u8BB0\u5F55", descEn: "Intentionally document what goes wrong \u2014 sand in servos, overheating. These are essay material.", descZh: "\u4E3B\u52A8\u8BB0\u5F55\u6545\u969C\u2014\u2014\u6C99\u5B50\u8FDB\u820D\u673A\u3001\u8FC7\u70ED\u3002\u8FD9\u4E9B\u662F\u7533\u8BF7\u7D20\u6750\u3002" },
];

const SEGMENT_INFO = [
  { en: "Head — ESP32-CAM module", zh: "头部 — ESP32-CAM模块", sensor: true },
  { en: "Segment 2 — structural link", zh: "第2节 — 结构连接", sensor: false },
  { en: "Segment 3 — structural link", zh: "第3节 — 结构连接", sensor: false },
  { en: "Segment 4 — DHT22 temp/humidity", zh: "第4节 — DHT22温湿度", sensor: true },
  { en: "Segment 5 — structural link", zh: "第5节 — 结构连接", sensor: false },
  { en: "Segment 6 — soil moisture probe", zh: "第6节 — 土壤湿度探针", sensor: true },
  { en: "Segment 7 — battery bay A", zh: "第7节 — 电池舱A", sensor: false },
  { en: "Segment 8 — battery bay B", zh: "第8节 — 电池舱B", sensor: false },
];

/* ── Terrain SVG icons ── */
const TerrainIcon = ({ type }) => {
  const icons = {
    "Loose Sand": <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 10c2-2 4 2 6 0s4 2 6 0"/><path d="M2 6c2-2 4 2 6 0s4 2 6 0" opacity="0.5"/></svg>,
    "Dunes": <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 13l4-7 4 7"/><path d="M7 13l4-9 4 9" opacity="0.7"/></svg>,
    "Rocks": <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 13l3-5 2 2 3-4 4 7z"/></svg>,
    "Irrigation": <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 3v10"/><path d="M8 3v10"/><path d="M12 3v10"/><path d="M2 8h12" opacity="0.4"/></svg>,
    "Vegetation": <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 14V7"/><path d="M8 9c-3-1-4-4-3-6 2 1 4 3 3 6"/><path d="M8 7c3-1 4-4 3-6-2 1-4 3-3 6"/></svg>,
  };
  return icons[type] || null;
};

/* ── Radar chart helper ── */
function radarPoints(values, cx, cy, r) {
  return values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / values.length - Math.PI / 2;
    const x = cx + (v / 10) * r * Math.cos(angle);
    const y = cy + (v / 10) * r * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");
}

/* ── Section nav config ── */
const NAV_SECTIONS = [
  { id: "hero", en: "Top", zh: "顶部" },
  { id: "impact", en: "Impact", zh: "影响" },
  { id: "gap", en: "Gap", zh: "空白" },
  { id: "why-snake", en: "Why Snake", zh: "为什么蛇" },
  { id: "tech-details", en: "Tech Details", zh: "技术细节" },
  { id: "software", en: "Software", zh: "软件" },
  { id: "sensors", en: "Sensors", zh: "传感器" },
  { id: "power", en: "Power", zh: "充电站" },
  { id: "use-case", en: "Use Case", zh: "任务示例" },
  { id: "references", en: "Research", zh: "研究" },
  { id: "media", en: "Media", zh: "媒体" },
];

export default function SnakeRobotView({ onNavigate }) {
  const { lang } = useLanguage();
  const isZh = lang === "zh";
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [techOpen, setTechOpen] = useState(false);
  const [radarHighlight, setRadarHighlight] = useState(null);
  const [activeSection, setActiveSection] = useState("hero");

  const pageRef = useRef(null);

  /* ── Section nav IntersectionObserver ── */
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const sectionEls = NAV_SECTIONS.map(s => page.querySelector(`[data-section="${s.id}"]`)).filter(Boolean);
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.dataset.section);
          }
        }
      },
      { root: page, rootMargin: "-10% 0px -60% 0px", threshold: 0 }
    );
    sectionEls.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const scrollToSection = useCallback((id) => {
    const page = pageRef.current;
    if (!page) return;
    const el = page.querySelector(`[data-section="${id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  /* ── Donut chart computation ── */
  const total = BOM_CATEGORIES.reduce((s, c) => s + c.value, 0);
  const circumference = 2 * Math.PI * 52;
  let donutOffset = 0;
  const donutSegments = BOM_CATEGORIES.map(cat => {
    const len = (cat.value / total) * circumference;
    const seg = { ...cat, dashArray: `${len} ${circumference - len}`, dashOffset: -donutOffset };
    donutOffset += len;
    return seg;
  });

  return (
    <div className="snake-page" ref={pageRef}>
      {/* ── Section Nav Dots ── */}
      <nav className="section-nav">
        {NAV_SECTIONS.map(s => (
          <button
            key={s.id}
            className={`section-nav-dot ${activeSection === s.id ? "active" : ""}`}
            onClick={() => scrollToSection(s.id)}
          >
            <span className="section-nav-label">{isZh ? s.zh : s.en}</span>
          </button>
        ))}
      </nav>

      {/* ── HERO ── */}
      <section className="snake-hero" data-section="hero">
        <svg className="snake-hero-bg" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice">
          <path d="M0 160 Q200 120 400 150 Q600 180 800 140 L800 200 L0 200Z" fill="#c9a96e" opacity="0.08"/>
          <path d="M0 170 Q200 150 400 165 Q600 180 800 160 L800 200 L0 200Z" fill="#c9a96e" opacity="0.05"/>
          <g className="snake-hero-serpent">
            <path d="M100 100 C160 70 220 130 280 100 C340 70 400 130 460 100" stroke="#66bb6a" strokeWidth="3" fill="none" opacity="0.25" strokeLinecap="round"/>
          </g>
          <g opacity="0.06" transform="translate(650,120)">
            <line x1="0" y1="0" x2="0" y2="-30" stroke="#66bb6a" strokeWidth="2"/>
            <ellipse cx="-6" cy="-28" rx="6" ry="10" fill="#66bb6a"/>
            <ellipse cx="6" cy="-34" rx="5" ry="8" fill="#66bb6a"/>
          </g>
        </svg>
        <div className="snake-hero-badge">
          <FiCpu size={14} />
          {isZh ? "\u7B2C\u4E8C\u5C42 \u00B7 \u5730\u9762\u5DE1\u903B" : "Pillar 2 \u00B7 Ground Patrol"}
        </div>
        <h1>{isZh ? "\u6C99\u6F20\u4E4B\u86C7" : "Desert Serpent"}</h1>
        <p className="snake-hero-sub">
          {isZh
            ? "\u4EFF\u751F\u86C7\u5F62\u673A\u5668\u4EBA \u2014 \u6C99\u6F20\u690D\u88AB\u5B58\u6D3B\u76D1\u6D4B"
            : "Bio-inspired snake robot for desert vegetation survival monitoring"}
        </p>
        <p className="snake-hero-mission">
          {isZh
            ? "\u6BCF\u5E74\u6570\u767E\u4E07\u68F5\u6811\u82D7\u88AB\u79CD\u4E0B\u3002\u5F88\u591A\u5728\u7B2C\u4E00\u5E74\u5C31\u6B7B\u4E86\u3002\u8FD9\u4E2A\u673A\u5668\u4EBA\u627E\u5230\u6B7B\u6811\u3002"
            : "Millions of saplings are planted each year. Many die in year one. This robot finds the dead ones."}
        </p>
        {onNavigate && (
          <button className="snake-back-btn" onClick={() => onNavigate("mission")}>
            <FiArrowLeft size={14} /> {isZh ? "\u8FD4\u56DE\u4F7F\u547D" : "Back to Mission"}
          </button>
        )}
      </section>

      {/* ── WHY THIS MATTERS ── */}
      <FadeSection className="snake-section" data-section="impact">
        <h2 className="snake-section-title">
          {isZh ? "为什么重要" : "Why This Matters"}
        </h2>
        <p className="snake-section-desc">
          {isZh
            ? "塔克拉玛干沙漠绿化带是人类最大的荒漠化治理工程之一。规模决定了人工巡检不可持续。"
            : "The Taklamakan green belt is one of humanity's largest desertification-fighting projects. Its scale makes manual inspection unsustainable."}
        </p>
        <div className="impact-stats-grid">
          {IMPACT_STATS.map((s, i) => (
            <div key={i} className="impact-stat-card">
              <span className="impact-stat-value">{isZh ? s.valueZh : s.valueEn}</span>
              <span className="impact-stat-label">{isZh ? s.labelZh : s.labelEn}</span>
            </div>
          ))}
        </div>

        <h3 className="snake-section-title" style={{ fontSize: 16, marginTop: 24 }}>
          {isZh ? "机器人 vs 人工巡检" : "Robot vs. Manual Inspection"}
        </h3>
        <div className="comparison-table">
          <div className="comp-header">
            <span>{isZh ? "指标" : "Metric"}</span>
            <span className="comp-robot">{isZh ? "蛇形机器人" : "Snake Robot"}</span>
            <span className="comp-manual">{isZh ? "人工" : "Manual"}</span>
          </div>
          {ROBOT_VS_MANUAL.map((r, i) => (
            <div key={i} className="comp-row">
              <span className="comp-metric">{isZh ? r.metricZh : r.metricEn}</span>
              <span className="comp-robot-val">{isZh ? r.robotZh : r.robotEn}</span>
              <span className="comp-manual-val">{isZh ? r.manualZh : r.manualEn}</span>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── THE GAP ── */}
      <FadeSection className="snake-section" data-section="gap">
        <h2 className="snake-section-title">
          {isZh ? "\u76D1\u6D4B\u7A7A\u767D" : "The Monitoring Gap"}
        </h2>
        <p className="snake-section-desc">
          {isZh
            ? "\u536B\u661F\u770B\u5F97\u592A\u8FDC\uFF0C\u4EBA\u5DE5\u5DE1\u68C0\u592A\u6162\u3002\u86C7\u5F62\u673A\u5668\u4EBA\u586B\u8865\u4E86\u4E24\u8005\u4E4B\u95F4\u7684\u7A7A\u767D\u3002"
            : "Satellites see too far. Humans inspect too slowly. The snake robot fills the gap."}
        </p>
        <div className="snake-gap-grid">
          {[
            { title: isZh ? "\u536B\u661F" : "Satellite", detail: isZh ? "10\u7C73/\u50CF\u7D20 \u00B7 \u770B\u8D8B\u52BF\uFF0C\u4E0D\u89C1\u5355\u68F5\u6811" : "10m/pixel \u00B7 Sees trends, not individual trees", color: "#4fc3f7", scale: isZh ? "\u5B8F\u89C2" : "Macro" },
            { title: isZh ? "\u86C7\u5F62\u673A\u5668\u4EBA" : "Snake Robot", detail: isZh ? "\u6BEB\u7C73\u7EA7 \u00B7 \u9010\u68F5\u68C0\u67E5\u690D\u7269\u5065\u5EB7" : "mm-level \u00B7 Inspects each plant individually", color: "#66bb6a", scale: isZh ? "\u4E2D\u89C2" : "Meso", highlight: true },
            { title: isZh ? "\u4EBA\u5DE5" : "Human", detail: isZh ? "\u6700\u4F73\u6570\u636E \u00B7 45\u00B0C\u4E0B\u6781\u5371\u9669" : "Best data \u00B7 But dangerous in 45\u00B0C heat", color: "#ffa726", scale: isZh ? "\u5FAE\u89C2" : "Micro" },
          ].map((g, i) => (
            <div key={i} className={`gap-card ${g.highlight ? "highlight" : ""}`} style={{ borderTopColor: g.color }}>
              <span className="gap-scale" style={{ color: g.color }}>{g.scale}</span>
              <h3>{g.title}</h3>
              <p>{g.detail}</p>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── WHY SNAKE ── */}
      <FadeSection className="snake-section" data-section="why-snake">
        <h2 className="snake-section-title">
          {isZh ? "\u4E3A\u4EC0\u4E48\u662F\u86C7\uFF1F" : "Why a Snake?"}
        </h2>
        <div className="snake-bio-card">
          <div className="snake-bio-left">
            <h3>{isZh ? "\u4FA7\u7ED5\u8FD0\u52A8" : "Sidewinding Locomotion"}</h3>
            <p>
              {isZh
                ? "\u89D2\u54CD\u5C3E\u86C7\uFF08Crotalus cerastes\uFF09\u8FDB\u5316\u51FA\u4E13\u9002\u5E94\u677E\u6563\u6C99\u5730\u7684\u4FA7\u7ED5\u8FD0\u52A8\u3002\u7EA660%\u7684\u8EAB\u4F53\u59CB\u7EC8\u79BB\u5F00\u5730\u9762\uFF0C\u5927\u5E45\u51CF\u5C11\u6469\u64E6\u3002"
                : "The sidewinder rattlesnake (Crotalus cerastes) evolved locomotion specifically for loose sand. ~60% of its body stays lifted off the surface, dramatically reducing friction."}
            </p>
            <div className="snake-bio-bullets">
              <div className="bio-bullet fail"><span>{isZh ? "\u8F6E\u5B50" : "Wheels"}</span> {isZh ? "\u5728\u6C99\u4E2D\u6253\u6ED1\u4E0B\u9677" : "spin and sink in sand"}</div>
              <div className="bio-bullet fail"><span>{isZh ? "\u8DB3\u5F0F" : "Legs"}</span> {isZh ? "\u523A\u7A7F\u6C99\u58F3\u53D8\u5F97\u4E0D\u7A33" : "punch through crust, unstable"}</div>
              <div className="bio-bullet pass"><span>{isZh ? "\u86C7\u5F62" : "Snake"}</span> {isZh ? "\u5206\u6563\u91CD\u91CF\uFF0C\u7545\u884C\u65E0\u963B" : "distributes weight, glides smoothly"}</div>
            </div>
            {/* Sidewinding motion explainer */}
            <div className="sidewind-explainer">
              <svg viewBox="0 0 240 80" className="sidewind-svg">
                <line x1="30" y1="70" x2="60" y2="50" stroke="#c9a96e" strokeWidth="1" strokeDasharray="3,3" opacity="0.3"/>
                <line x1="80" y1="70" x2="110" y2="50" stroke="#c9a96e" strokeWidth="1" strokeDasharray="3,3" opacity="0.3"/>
                <line x1="130" y1="70" x2="160" y2="50" stroke="#c9a96e" strokeWidth="1" strokeDasharray="3,3" opacity="0.3"/>
                <path className="sidewind-ghost sidewind-phase1" d="M20 55 C35 35 50 65 65 45 C80 25 95 55 110 40" stroke="#66bb6a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path className="sidewind-ghost sidewind-phase2" d="M60 55 C75 35 90 65 105 45 C120 25 135 55 150 40" stroke="#66bb6a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path className="sidewind-ghost sidewind-phase3" d="M100 55 C115 35 130 65 145 45 C160 25 175 55 190 40" stroke="#66bb6a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M200 47 L215 47 M210 42 L215 47 L210 52" stroke="#66bb6a" strokeWidth="1.5" fill="none" opacity="0.6" strokeLinecap="round"/>
              </svg>
              <span className="sidewind-caption">{isZh ? "侧绕运动示意" : "Sidewinding motion"}</span>
            </div>
          </div>
          <div className="snake-bio-right">
            <div className="snake-body-diagram-v2">
              <div className="diagram-label-row">
                <span className="dl cam">CAM</span>
                <span className="dl spacer" />
                <span className="dl spacer" />
                <span className="dl tmp">T/H</span>
                <span className="dl spacer" />
                <span className="dl soil">SOIL</span>
                <span className="dl batt">BATT</span>
                <span className="dl batt">BATT</span>
              </div>
              <div className="diagram-segments">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="dseg-wrapper"
                    style={{ animationDelay: `${i * 0.12}s` }}
                    onMouseEnter={() => setHoveredSegment(i)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() => setHoveredSegment(hoveredSegment === i ? null : i)}
                  >
                    <div className={`dseg ${i % 2 === 0 ? "dark" : "light"} ${i >= 6 ? "battery" : ""}`}>
                      <span className="dseg-num">{i + 1}</span>
                      {SEGMENT_INFO[i].sensor && <span className="dseg-sensor-dot" />}
                    </div>
                    {hoveredSegment === i && (
                      <div className="dseg-tooltip">
                        {isZh ? SEGMENT_INFO[i].zh : SEGMENT_INFO[i].en}
                        <span className="dseg-tooltip-arrow" />
                      </div>
                    )}
                    {i < 7 && <div className="dseg-joint" />}
                  </div>
                ))}
              </div>
              <div className="diagram-ground" />
              <span className="diagram-dim">~60 cm</span>
            </div>
            <span className="diagram-caption">{isZh ? "8\u6BB5\u5F0F\u86C7\u5F62\u673A\u5668\u4EBA\u4FA7\u89C6\u56FE" : "8-segment snake robot \u2014 side view"}</span>
          </div>
        </div>
      </FadeSection>

      {/* ── TECHNICAL DETAILS ACCORDION ── */}
      <section className="snake-section" data-section="tech-details">
        <h2 className="snake-section-title">
          {isZh ? "技术细节" : "Technical Details"}
        </h2>
        <div className="tech-summary" onClick={() => setTechOpen(!techOpen)}>
          <span className="tech-summary-text">
            {isZh
              ? "$149 总计 · 8 段 · 7 舵机 · 5 种地形"
              : "$149 total · 8 segments · 7 servos · 5 terrain types"}
          </span>
          <span className="tech-summary-toggle">
            {techOpen ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
          </span>
        </div>

        <div className={`tech-details-body ${techOpen ? "open" : ""}`}>
          {/* ── RADAR CHART (Terrain Performance) ── */}
          <div className="snake-section">
            <h3 className="snake-section-title" style={{ fontSize: 16 }}>
              {isZh ? "\u5730\u5F62\u6027\u80FD\u5BF9\u6BD4" : "Terrain Performance"}
            </h3>
            <div className="radar-chart-wrapper">
              <svg className="radar-svg" viewBox="0 0 300 280">
                {/* Grid pentagons */}
                {[3, 6, 9].map(level => (
                  <polygon key={level} className="radar-grid-line" points={radarPoints(Array(5).fill(level), 150, 130, 100)} />
                ))}
                {/* Axis lines */}
                {TERRAIN.map((_, i) => {
                  const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                  return <line key={i} className="radar-axis-line" x1={150} y1={130} x2={150 + 100 * Math.cos(angle)} y2={130 + 100 * Math.sin(angle)} />;
                })}
                {/* Axis labels */}
                {TERRAIN.map((t, i) => {
                  const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                  const lx = 150 + 118 * Math.cos(angle);
                  const ly = 130 + 118 * Math.sin(angle);
                  return <text key={i} className="radar-label" x={lx} y={ly}>{isZh ? t.zh : t.en}</text>;
                })}
                {/* Data polygons */}
                <polygon
                  className={`radar-polygon ${radarHighlight && radarHighlight !== "snake" ? "dimmed" : ""} ${radarHighlight === "snake" ? "highlighted" : ""}`}
                  points={radarPoints(TERRAIN.map(t => t.snake), 150, 130, 100)}
                  fill="#66bb6a" stroke="#66bb6a"
                />
                <polygon
                  className={`radar-polygon ${radarHighlight && radarHighlight !== "wheeled" ? "dimmed" : ""} ${radarHighlight === "wheeled" ? "highlighted" : ""}`}
                  points={radarPoints(TERRAIN.map(t => t.wheeled), 150, 130, 100)}
                  fill="#4fc3f7" stroke="#4fc3f7"
                />
                <polygon
                  className={`radar-polygon ${radarHighlight && radarHighlight !== "legged" ? "dimmed" : ""} ${radarHighlight === "legged" ? "highlighted" : ""}`}
                  points={radarPoints(TERRAIN.map(t => t.legged), 150, 130, 100)}
                  fill="#ffa726" stroke="#ffa726"
                />
              </svg>
              <div className="radar-legend">
                <span className="radar-legend-item" onMouseEnter={() => setRadarHighlight("snake")} onMouseLeave={() => setRadarHighlight(null)}>
                  <span className="t-dot" style={{ background: "#66bb6a" }} />{isZh ? "\u86C7\u5F62" : "Snake"}
                </span>
                <span className="radar-legend-item" onMouseEnter={() => setRadarHighlight("wheeled")} onMouseLeave={() => setRadarHighlight(null)}>
                  <span className="t-dot" style={{ background: "#4fc3f7" }} />{isZh ? "\u8F6E\u5F0F" : "Wheeled"}
                </span>
                <span className="radar-legend-item" onMouseEnter={() => setRadarHighlight("legged")} onMouseLeave={() => setRadarHighlight(null)}>
                  <span className="t-dot" style={{ background: "#ffa726" }} />{isZh ? "\u8DB3\u5F0F" : "Legged"}
                </span>
              </div>
              {/* Per-terrain bar breakdown */}
              <div className="terrain-bars-detail">
                {TERRAIN.map((t) => (
                  <div key={t.en} className="terrain-row">
                    <span className="terrain-label"><TerrainIcon type={t.en} />{isZh ? t.zh : t.en}</span>
                    <div className="terrain-bars">
                      <div className="t-bar" style={{ width: `${t.snake * 10}%`, background: "#66bb6a" }}><span>{t.snake}</span></div>
                      <div className="t-bar" style={{ width: `${t.wheeled * 10}%`, background: "#4fc3f7" }}><span>{t.wheeled}</span></div>
                      <div className="t-bar" style={{ width: `${t.legged * 10}%`, background: "#ffa726" }}><span>{t.legged}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SPECS ── */}
          <div className="snake-section">
            <h3 className="snake-section-title" style={{ fontSize: 16 }}>{isZh ? "\u6838\u5FC3\u89C4\u683C" : "Core Specifications"}</h3>
            <div className="snake-specs-grid">
              {SPECS.map((s, i) => (
                <div key={i} className="snake-spec-card">
                  <span className="spec-value">{s.value}</span>
                  <span className="spec-label">{isZh ? s.labelZh : s.labelEn}</span>
                  <span className="spec-detail">{s.detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── BOM ── */}
          <div className="snake-section">
            <h3 className="snake-section-title" style={{ fontSize: 16 }}>{isZh ? "\u7269\u6599\u6E05\u5355" : "Bill of Materials"}</h3>
            {/* Donut Chart */}
            <div className="bom-donut-wrapper">
              <div className="bom-donut-svg-wrapper">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  {donutSegments.map((seg, i) => (
                    <circle
                      key={i}
                      className="donut-segment"
                      cx="70" cy="70" r="52"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="16"
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      transform="rotate(-90 70 70)"
                    />
                  ))}
                  <text className="donut-center-total" x="70" y="66" textAnchor="middle">$149</text>
                  <text className="donut-center-label" x="70" y="82" textAnchor="middle">Total</text>
                </svg>
              </div>
              <div className="donut-legend">
                {BOM_CATEGORIES.map((cat, i) => (
                  <span key={i} className="donut-legend-item">
                    <span className="donut-legend-swatch" style={{ background: cat.color }} />
                    {cat.label} ${cat.value}
                  </span>
                ))}
              </div>
            </div>
            {/* BOM Table */}
            <div className="snake-bom">
              <div className="bom-header">
                <span>{isZh ? "\u7EC4\u4EF6" : "Component"}</span>
                <span>{isZh ? "\u6570\u91CF" : "Qty"}</span>
                <span>{isZh ? "\u4F30\u4EF7" : "Cost"}</span>
                <span>{isZh ? "\u5907\u6CE8" : "Notes"}</span>
              </div>
              {BOM.map((b, i) => (
                <div key={i} className="bom-row">
                  <span>{b.item}</span>
                  <span>{b.qty}</span>
                  <span>{b.cost}</span>
                  <span className="bom-note">{b.note}</span>
                </div>
              ))}
              <div className="bom-total">
                <span><strong>{isZh ? "\u603B\u8BA1" : "TOTAL"}</strong></span>
                <span />
                <span><strong>~$149</strong></span>
                <span className="bom-note">{isZh ? "\u4E0D\u542B3D\u6253\u5370\u673A" : "Excl. 3D printer"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOFTWARE ARCHITECTURE ── */}
      <FadeSection className="snake-section" data-section="software">
        <h2 className="snake-section-title">
          <FiGrid size={18} />
          {isZh ? "软件架构" : "Software Architecture"}
        </h2>
        <p className="snake-section-desc">
          {isZh
            ? "从蛇形机器人到Web仪表盘的完整数据管线，连接地面传感器与卫星影像。"
            : "End-to-end data pipeline from snake robot to web dashboard, bridging ground sensors with satellite imagery."}
        </p>
        <div className="arch-pipeline">
          {SOFTWARE_ARCH.map((node, i, arr) => (
            <div key={node.id} className="arch-node-wrapper">
              <div className="arch-node" style={{ borderColor: node.color }}>
                <span className="arch-node-name" style={{ color: node.color }}>{isZh ? node.zh : node.en}</span>
                <span className="arch-node-sub">{node.sub}</span>
              </div>
              {i < arr.length - 1 && (
                <svg className="arch-arrow" width="32" height="16" viewBox="0 0 32 16"><path d="M4 8h20M20 4l4 4-4 4" stroke="#3a4a5a" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </div>
          ))}
        </div>
        <div className="arch-integration-note">
          <FiWifi size={14} style={{ color: "#66bb6a", flexShrink: 0 }} />
          <span>
            {isZh
              ? "充电站同时作为WiFi中继，机器人返回时自动上传数据至后端。后端将地面数据与GEE卫星NDVI叠加分析。"
              : "The charging station doubles as a WiFi relay. Data uploads automatically when the robot returns. The backend overlays ground-truth data with GEE satellite NDVI for combined analysis."}
          </span>
        </div>
      </FadeSection>

      {/* ── SENSORS ── */}
      <FadeSection className="snake-section" data-section="sensors">
        <h2 className="snake-section-title">{isZh ? "\u4F20\u611F\u5668\u5957\u4EF6" : "Sensor Suite"}</h2>
        <div className="snake-sensors">
          {SENSORS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="sensor-card" style={{ borderLeftColor: s.color }}>
                <div className="sensor-header">
                  <Icon size={18} style={{ color: s.color }} />
                  <div>
                    <strong>{isZh ? s.zh : s.en}</strong>
                    <span className="sensor-pos">{s.pos}</span>
                  </div>
                </div>
                <p>{isZh ? s.descZh : s.descEn}</p>
              </div>
            );
          })}
        </div>
      </FadeSection>

      {/* ── POWER ── */}
      <FadeSection className="snake-section" data-section="power">
        <h2 className="snake-section-title">
          <FiSun size={18} />
          {isZh ? "\u592A\u9633\u80FD\u5145\u7535\u7AD9" : "Solar Charging Station"}
        </h2>
        <div className="snake-power-grid">
          <div className="power-card"><FiZap size={20} style={{ color: "#ffa726" }} /><div><strong>{isZh ? "\u529F\u8017" : "Draw"}</strong><span>~14.5W</span></div></div>
          <div className="power-card"><FiZap size={20} style={{ color: "#4fc3f7" }} /><div><strong>{isZh ? "\u7535\u6C60" : "Battery"}</strong><span>3S LiPo 2200mAh</span></div></div>
          <div className="power-card"><FiSun size={20} style={{ color: "#ffc107" }} /><div><strong>{isZh ? "\u592A\u9633\u80FD" : "Solar"}</strong><span>20W mono</span></div></div>
          <div className="power-card"><FiClock size={20} style={{ color: "#66bb6a" }} /><div><strong>{isZh ? "\u5145\u7535" : "Charge"}</strong><span>~2h {isZh ? "\u5145\u6EE1" : "full"}</span></div></div>
        </div>
        <div className="power-cycle">
          <p>
            {isZh
              ? "\u673A\u5668\u4EBA\u4F7F\u7528\u53EF\u66F4\u6362LiPo\u7535\u6C60\uFF0C\u6BCF\u6B21\u4EFB\u52A1\u540E\u8FD4\u56DE\u592A\u9633\u80FD\u5145\u7535\u7AD9\u3002\u7AD9\u70B9\u540C\u65F6\u4E0A\u4F20\u6570\u636E\u3002\u6BCF\u5929\u53EF\u5145\u75354\u20135\u6B21\u3002"
              : "The robot returns to a solar charging station after each sortie. The station doubles as a data relay. 4\u20135 sorties per day in full sun."}
          </p>
          <div className="cycle-steps">
            {[
              { en: "Charge", zh: "\u5145\u7535", icon: FiZap },
              { en: "Deploy", zh: "\u90E8\u7F72", icon: FiPlay },
              { en: "Inspect", zh: "\u5DE1\u68C0", icon: FiCamera },
              { en: "Return", zh: "\u8FD4\u56DE", icon: FiRepeat },
              { en: "Upload", zh: "\u4E0A\u4F20", icon: FiUploadCloud },
            ].map((s, i, arr) => {
              const Icon = s.icon;
              return (
                <span key={i} className="cycle-step">
                  <Icon size={14} className="cycle-feather-icon" />
                  {isZh ? s.zh : s.en}
                  {i < arr.length - 1 && <FiArrowRight size={12} className="cycle-arrow-icon" />}
                </span>
              );
            })}
          </div>
        </div>
      </FadeSection>

      {/* ── CONCRETE USE CASE ── */}
      <FadeSection className="snake-section" data-section="use-case">
        <h2 className="snake-section-title">
          {isZh ? "\u5177\u4F53\u4EFB\u52A1\u793A\u4F8B" : "Example Inspection Run"}
        </h2>
        <div className="use-case-card">
          <p className="use-case-scenario">
            {isZh
              ? "\u536B\u661F\u6807\u8BB0\u548C\u7530\u7EFF\u5E26\u4E00\u6BB5100\u7C73\u533A\u57DFNDVI\u4E0B\u964D\u3002\u673A\u5668\u4EBA\u51FA\u52A8\uFF1A"
              : "Satellite flags a 100m section of the Hotan green belt where NDVI has dropped. Robot deploys:"}
          </p>
          <div className="use-case-steps">
            <div className="uc-step"><span className="uc-num">1</span><span>{isZh ? "\u4FA7\u7ED5\u8FDB\u5165\u6811\u884C\uFF0C\u907F\u5F00\u6EF4\u704C\u7BA1" : "Sidewinds into tree row, avoids drip lines"}</span></div>
            <div className="uc-step"><span className="uc-num">2</span><span>{isZh ? "\u5728\u6BCF\u68F5\u6811\u524D\u505C\u4E0B\uFF0C\u62CD\u6444\u6811\u5E72\u57FA\u90E8" : "Stops at each tree, photographs stem base"}</span></div>
            <div className="uc-step"><span className="uc-num">3</span><span>{isZh ? "\u6D4B\u91CF\u6839\u533A\u571F\u58E4\u6E7F\u5EA6" : "Measures root-zone soil moisture"}</span></div>
            <div className="uc-step"><span className="uc-num">4</span><span>{isZh ? "50\u7C73\u5185\u68C0\u67E520\u68F5\u6811\uFF0C\u8017\u65F618\u5206\u949F" : "Inspects 20 trees in 50m, takes 18 minutes"}</span></div>
            <div className="uc-step"><span className="uc-num">5</span><span>{isZh ? "\u751F\u6210\u5B58\u6D3B\u5730\u56FE\uFF1A14\u68F5\u5B58\u6D3B\uFF0C6\u68F5\u6B7B\u4EA1\uFF0C\u6807\u8BB0\u8865\u79CD\u4F4D\u7F6E" : "Outputs survival map: 14 alive, 6 dead, marks replacement locations"}</span></div>
          </div>
          {/* Data flow diagram */}
          <div className="data-flow">
            {[
              { en: "Snake", zh: "蛇形机器人", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#66bb6a" strokeWidth="1.5" strokeLinecap="round"><path d="M2 7c2-3 4 1 6-1s4 1 6-1"/><circle cx="13" cy="6" r="1" fill="#66bb6a" stroke="none"/></svg> },
              { en: "Camera", zh: "拍照", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#66bb6a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="12" height="9" rx="2"/><circle cx="8" cy="8.5" r="2.5"/><path d="M5 4L6 2h4l1 2"/></svg> },
              { en: "Soil Probe", zh: "测土壤", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#66bb6a" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2v10"/><path d="M5 12h6"/><path d="M6 14h4"/></svg> },
              { en: "Upload", zh: "上传", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#66bb6a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 10V3M5 5l3-3 3 3"/><path d="M3 11v2h10v-2"/></svg> },
              { en: "Map", zh: "生成地图", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#66bb6a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3l5 2v9l-5-2z"/><path d="M6 5l4-2v9l-4 2z"/><path d="M10 3l5 2v9l-5-2z"/></svg> },
            ].map((node, i, arr) => (
              <span key={i} className="data-flow-node">
                <span className="data-flow-icon">{node.icon}</span>
                <span className="data-flow-label">{isZh ? node.zh : node.en}</span>
                {i < arr.length - 1 && (
                  <svg className="data-flow-arrow" width="20" height="16" viewBox="0 0 20 16"><path d="M2 8h12M11 4l4 4-4 4" stroke="#66bb6a" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </span>
            ))}
          </div>
          <p className="use-case-result">
            {isZh
              ? "\u7ED3\u679C\uFF1A\u4E00\u5F20\u536B\u661F\u65E0\u6CD5\u751F\u6210\u7684\u9010\u68F5\u5B58\u6D3B\u5730\u56FE\uFF0C\u65E0\u9700\u5DE5\u4EBA\u5728\u9177\u70ED\u4E2D\u884C\u8D70\u6570\u5C0F\u65F6\u3002"
              : "Result: a per-tree survival map that satellites cannot produce, without workers walking for hours in extreme heat."}
          </p>
        </div>
      </FadeSection>

      {/* ── BUILD TIMELINE ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title"><FiClock size={18} /> {isZh ? "\u5EFA\u9020\u65F6\u95F4\u7EBF" : "Build Timeline"}</h2>
        <div className="snake-build-timeline">
          {TIMELINE_STEPS.map((s, i) => (
            <div key={i} className={`build-step ${s.status}`}>
              <div className="build-dot">
                {s.status === "current" ? <div className="build-pulse" /> : <FiCheckCircle size={14} />}
              </div>
              <div className="build-info">
                <strong>{isZh ? s.zh : s.en}</strong>
                <span>{s.months} 2026</span>
              </div>
              {s.status === "current" && (
                <span className="build-badge">{isZh ? "\u5F53\u524D" : "In Progress"}</span>
              )}
              {i < TIMELINE_STEPS.length - 1 && <div className="build-line" />}
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── FIELD TEST PLAN ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title">
          {isZh ? "\u5B9E\u5730\u6D4B\u8BD5\u8BA1\u5212 \u2014 2026\u5E74\u590F\u5B63" : "Field Test Plan \u2014 Summer 2026"}
        </h2>
        <div className="field-test-grid">
          {FIELD_TESTS.map((t, i) => (
            <div key={i} className="field-test-card">
              <span className="ft-num">Test {i + 1}</span>
              <strong>{isZh ? t.zh : t.en}</strong>
              <p>{isZh ? t.descZh : t.descEn}</p>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── ACADEMIC REFERENCES ── */}
      <FadeSection className="snake-section" data-section="references">
        <h2 className="snake-section-title">
          <FiBook size={18} />
          {isZh ? "文献参考" : "Academic References"}
        </h2>
        <p className="snake-section-desc">
          {isZh
            ? "本项目设计参考了以下蛇形机器人运动学与沙地移动研究。"
            : "The design draws on peer-reviewed research in snake robot locomotion and sand mobility."}
        </p>
        <div className="references-list">
          {REFERENCES.map((r, i) => (
            <div key={i} className="reference-card">
              <span className="ref-number">[{i + 1}]</span>
              <div className="ref-body">
                <span className="ref-authors">{r.authors} ({r.year})</span>
                <span className="ref-title">{r.title}</span>
                <span className="ref-journal">{r.journal}</span>
                <span className="ref-doi">DOI: {r.doi}</span>
              </div>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── DESIGN GALLERY ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title">
          {isZh ? "设计进展" : "Design Progress"}
        </h2>
        <p className="snake-section-desc">
          {isZh
            ? "CAD模型与3D打印原型。点击查看大图。"
            : "CAD models and 3D print prototypes. Click to enlarge."}
        </p>
        <div className="design-gallery">
          {[
            { src: "/media/snake-cad-full.png", captionEn: "Full assembly — CAD render", captionZh: "完整装配 — CAD渲染" },
            { src: "/media/snake-cad-segment.png", captionEn: "Single segment detail", captionZh: "单段细节" },
            { src: "/media/snake-cad-joint.png", captionEn: "Servo joint mechanism", captionZh: "舵机关节结构" },
            { src: "/media/snake-cad-head.png", captionEn: "Head module with ESP32-CAM", captionZh: "头部模块（含ESP32-CAM）" },
          ].map((img, i) => (
            <a key={i} className="gallery-item" href={img.src} target="_blank" rel="noopener noreferrer">
              <img src={img.src} alt={isZh ? img.captionZh : img.captionEn} className="gallery-img" loading="lazy" />
              <span className="gallery-caption">{isZh ? img.captionZh : img.captionEn}</span>
            </a>
          ))}
        </div>
      </FadeSection>

      {/* ── RESEARCH POSTER ── */}
      <FadeSection className="snake-section" data-section="media">
        <h2 className="snake-section-title">
          {isZh ? "研究海报" : "Research Poster"}
        </h2>
        <div className="snake-poster-wrapper">
          <a href="/media/snakebot-poster.pdf" target="_blank" rel="noopener noreferrer">
            <img
              src="/media/snakebot-poster.png"
              alt="Snakebot Research Poster"
              className="snake-poster-img"
            />
            <span className="snake-poster-overlay">
              <FiExternalLink size={20} />
              {isZh ? "查看完整海报 (PDF)" : "View Full Poster (PDF)"}
            </span>
          </a>
        </div>
      </FadeSection>

      {/* ── PRESENTATION VIDEO ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title">
          {isZh ? "项目展示" : "Project Presentation"}
        </h2>
        <p className="snake-section-desc">
          {isZh
            ? "项目负责人向观众介绍蛇形机器人的设计与实现。"
            : "The project lead presents the snakebot design and implementation to a live audience."}
        </p>
        <div className="snake-video-wrapper">
          <video
            controls
            preload="metadata"
            className="snake-video"
            poster="/media/snakebot-poster.png"
          >
            <source src="/media/snakebot-presentation.mp4" type="video/mp4" />
            {isZh ? "您的浏览器不支持视频标签。" : "Your browser does not support the video tag."}
          </video>
        </div>
      </FadeSection>

      {/* ── STATUS ── */}
      <FadeSection className="snake-section snake-status-section">
        <div className="snake-status-card">
          <FiAlertCircle size={18} style={{ color: "#ffa726" }} />
          <div>
            <strong>{isZh ? "\u9879\u76EE\u72B6\u6001\uFF1A\u8BBE\u8BA1\u9636\u6BB5" : "Status: Design Phase"}</strong>
            <p>
              {isZh
                ? "\u539F\u578B\u673A\u6B63\u5728\u8BBE\u8BA1\u4E2D\u3002\u8BA1\u52122026\u5E74\u590F\u5B63\u5728\u5854\u514B\u62C9\u739B\u5E72\u6C99\u6F20\u8FDB\u884C\u5B9E\u5730\u6D4B\u8BD5\u3002"
                : "Prototype currently in design. Field testing planned for summer 2026 at the Taklamakan Desert."}
            </p>
          </div>
        </div>
      </FadeSection>
    </div>
  );
}
