import { useLanguage } from "../i18n/LanguageContext";
import { FiTarget, FiRadio, FiCpu, FiMapPin, FiArrowRight, FiArrowDown, FiGlobe, FiUsers, FiExternalLink, FiCalendar } from "react-icons/fi";
import FadeSection from "./FadeSection";
import "./MissionView.css";

/* ── Data ── */
const PILLARS = [
  {
    id: "satellite", navView: "monitor",
    icon: FiRadio, color: "#4fc3f7", bg: "rgba(79,195,247,0.06)", border: "rgba(79,195,247,0.18)",
    en: { title: "Satellite Monitor", subtitle: "Eyes from Space", desc: "Real-time vegetation tracking using Sentinel-2 satellite imagery and NDVI analysis across the entire Taklamakan region. We measure what's changing, where, and how fast.", scale: "Macro Scale", stat: "337,000 km\u00B2", statLabel: "Desert area monitored" },
    zh: { title: "\u536B\u661F\u76D1\u6D4B", subtitle: "\u592A\u7A7A\u4E4B\u773C", desc: "\u5229\u7528Sentinel-2\u536B\u661F\u5F71\u50CF\u548CNDVI\u5206\u6790\uFF0C\u5B9E\u65F6\u8DDF\u8E2A\u6574\u4E2A\u5854\u514B\u62C9\u739B\u5E72\u5730\u533A\u7684\u690D\u88AB\u53D8\u5316\u3002", scale: "\u5B8F\u89C2\u5C3A\u5EA6", stat: "337,000 \u5E73\u65B9\u516C\u91CC", statLabel: "\u6C99\u6F20\u76D1\u6D4B\u9762\u79EF" },
  },
  {
    id: "robot", navView: "snake",
    icon: FiCpu, color: "#66bb6a", bg: "rgba(102,187,106,0.06)", border: "rgba(102,187,106,0.18)",
    en: { title: "Snake Robot", subtitle: "Ground Patrol", desc: "A bio-inspired snake robot for close-range vegetation inspection. Sidewinding locomotion navigates terrain that defeats wheels and legs, checking tree survival one by one.", scale: "Meso Scale", stat: "$149", statLabel: "Prototype cost" },
    zh: { title: "\u86C7\u5F62\u673A\u5668\u4EBA", subtitle: "\u5730\u9762\u5DE1\u903B", desc: "\u4EFF\u751F\u86C7\u5F62\u673A\u5668\u4EBA\u539F\u578B\uFF0C\u7528\u4E8E\u8FD1\u8DDD\u79BB\u690D\u88AB\u68C0\u67E5\u3002\u4FA7\u7ED5\u8FD0\u52A8\u80FD\u5728\u8F6E\u5F0F\u548C\u8DB3\u5F0F\u673A\u5668\u4EBA\u65E0\u6CD5\u901A\u884C\u7684\u5730\u5F62\u4E2D\u79FB\u52A8\u3002", scale: "\u4E2D\u89C2\u5C3A\u5EA6", stat: "\u00A5999", statLabel: "\u539F\u578B\u673A\u6210\u672C" },
  },
  {
    id: "field", navView: null,
    icon: FiMapPin, color: "#ffa726", bg: "rgba(255,167,38,0.06)", border: "rgba(255,167,38,0.18)",
    en: { title: "Field Research", subtitle: "Boots on Sand", desc: "On-site validation at the Taklamakan Desert. Testing equipment on real terrain, collecting ground-truth data, and documenting the green belt firsthand. Summer 2026.", scale: "Micro Scale", stat: "2,800+ km", statLabel: "Green belt perimeter" },
    zh: { title: "\u5B9E\u5730\u7814\u7A76", subtitle: "\u8E0F\u4E0A\u6C99\u6F20", desc: "\u5728\u5854\u514B\u62C9\u739B\u5E72\u6C99\u6F20\u8FDB\u884C\u5B9E\u5730\u9A8C\u8BC1\u3002\u5728\u771F\u5B9E\u5730\u5F62\u4E0A\u6D4B\u8BD5\u8BBE\u5907\uFF0C\u6536\u96C6\u5730\u9762\u6570\u636E\u3002\u8BA1\u52122026\u5E74\u590F\u5B63\u3002", scale: "\u5FAE\u89C2\u5C3A\u5EA6", stat: "2,800+ \u516C\u91CC", statLabel: "\u7EFF\u5E26\u5468\u957F" },
  },
];

const STATS = [
  { en: "337,000 km\u00B2", zh: "33.7\u4E07km\u00B2", labelEn: "Desert Monitored", labelZh: "\u76D1\u6D4B\u6C99\u6F20\u9762\u79EF", color: "#ffa726" },
  { en: "18,500 km\u00B2", zh: "1.85\u4E07km\u00B2", labelEn: "Green Belt Area", labelZh: "\u7EFF\u5E26\u9762\u79EF", color: "#66bb6a" },
  { en: "3.5 Billion", zh: "35\u4EBF\u68F5", labelEn: "Trees Planted", labelZh: "\u690D\u6811\u91CF", color: "#4fc3f7" },
  { en: "Since 1978", zh: "\u59CB\u4E8E1978\u5E74", labelEn: "Years of Effort", labelZh: "\u6301\u7EED\u52AA\u529B", color: "#ab47bc" },
];

const FLOW = [
  { step: "1", en: "Observe", zh: "\u89C2\u6D4B", descEn: "Satellites detect NDVI changes across the desert", descZh: "\u536B\u661F\u68C0\u6D4BNDVI\u53D8\u5316", color: "#4fc3f7" },
  { step: "2", en: "Flag", zh: "\u6807\u8BB0", descEn: "Algorithm flags areas with vegetation decline", descZh: "\u7B97\u6CD5\u6807\u8BB0\u690D\u88AB\u9000\u5316\u533A\u57DF", color: "#ffa726" },
  { step: "3", en: "Inspect", zh: "\u5DE1\u68C0", descEn: "Snake robot inspects flagged areas at ground level", descZh: "\u86C7\u5F62\u673A\u5668\u4EBA\u5730\u9762\u5DE1\u68C0", color: "#66bb6a" },
  { step: "4", en: "Validate", zh: "\u9A8C\u8BC1", descEn: "Field research confirms findings on-site", descZh: "\u5B9E\u5730\u7814\u7A76\u73B0\u573A\u786E\u8BA4", color: "#ab47bc" },
  { step: "5", en: "Report", zh: "\u62A5\u544A", descEn: "Data feeds back into the monitoring platform", descZh: "\u6570\u636E\u53CD\u9988\u76D1\u6D4B\u5E73\u53F0", color: "#ef5350" },
];

const FIELD_SITES = [
  { en: "Desert Highway Shelterbelt", zh: "\u6C99\u6F20\u516C\u8DEF\u9632\u62A4\u6797", descEn: "436 km green corridor through shifting sand", descZh: "436\u516C\u91CC\u7EFF\u8272\u8D70\u5ECA" },
  { en: "Hotan Green Belt", zh: "\u548C\u7530\u7EFF\u5316\u5E26", descEn: "Southern edge, active planting zone", descZh: "\u5357\u7F18\uFF0C\u79EF\u6781\u79CD\u690D\u533A" },
  { en: "Alar Region", zh: "\u963F\u62C9\u5C14\u5730\u533A", descEn: "Junction of Tarim River and green belt", descZh: "\u5854\u91CC\u6728\u6CB3\u4E0E\u7EFF\u5E26\u4EA4\u6C47\u5904" },
  { en: "Korla Oasis", zh: "\u5E93\u5C14\u52D2\u7EFF\u6D32", descEn: "Eastern edge, established vegetation", descZh: "\u4E1C\u7F18\uFF0C\u6210\u719F\u690D\u88AB\u533A" },
];

export default function MissionView({ onNavigate }) {
  const { lang } = useLanguage();
  const isZh = lang === "zh";

  return (
    <div className="mission-page">
      {/* ── HERO ── */}
      <section className="mission-hero">
        <div className="mission-hero-particles" />
        <div className="mission-hero-inner">
          <div className="mission-hero-badge">
            <FiGlobe size={14} />
            {isZh ? "\u975E\u8425\u5229\u8BA1\u5212" : "Nonprofit Initiative"}
          </div>
          <h1 className="mission-hero-title">
            {isZh ? "\u5B88\u62A4\u7EFF\u8272\u957F\u57CE" : "Guarding the Green Wall"}
          </h1>
          <p className="mission-hero-subtitle">
            {isZh
              ? "\u76D1\u6D4B\u4E16\u754C\u6700\u5927\u6C99\u6F20\u7EFF\u5316\u5DE5\u7A0B\u7684\u8FDB\u5C55\u3002\u5229\u7528\u536B\u661F\u3001\u673A\u5668\u4EBA\u548C\u5B9E\u5730\u7814\u7A76\u3002"
              : "Monitoring the world's largest desert greening effort through satellites, robotics, and field research."}
          </p>
          <div className="mission-hero-cta">
            <button className="cta-primary" onClick={() => onNavigate?.("monitor")}>
              {isZh ? "\u67E5\u770B\u76D1\u6D4B" : "Explore Monitor"} <FiArrowRight size={16} />
            </button>
            <button className="cta-secondary" onClick={() => onNavigate?.("snake")}>
              {isZh ? "\u4E86\u89E3\u673A\u5668\u4EBA" : "Meet the Robot"} <FiCpu size={14} />
            </button>
          </div>
        </div>
        <div className="mission-hero-scroll">
          <FiArrowDown size={18} />
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <FadeSection className="mission-section">
        <h2 className="mission-section-title">
          <FiTarget size={18} />
          {isZh ? "\u95EE\u9898" : "The Problem"}
        </h2>
        <div className="mission-problem-grid">
          <div className="mission-problem-card">
            <span className="problem-number">337K</span>
            <span className="problem-unit">km&sup2;</span>
            <p>{isZh
              ? "\u5854\u514B\u62C9\u739B\u5E72\u6C99\u6F20\u2014\u2014\u4E16\u754C\u7B2C\u4E8C\u5927\u6D41\u52A8\u6C99\u6F20\uFF0C\u5A01\u80C1\u5468\u8FB9\u57CE\u5E02\u548C\u519C\u7530"
              : "The Taklamakan \u2014 world's 2nd largest shifting sand desert, threatening cities and farmland"}</p>
          </div>
          <div className="mission-problem-card">
            <span className="problem-number">2,800+</span>
            <span className="problem-unit">km</span>
            <p>{isZh
              ? "\u4E2D\u56FD\u5EFA\u8BBE\u7EFF\u5E26\u73AF\u7ED5\u6C99\u6F20\uFF0C\u4F46\u5982\u4F55\u77E5\u9053\u662F\u5426\u6709\u6548\uFF1F"
              : "China is building a green belt around the desert \u2014 but how do we know it's working?"}</p>
          </div>
          <div className="mission-problem-card">
            <span className="problem-number">40%+</span>
            <span className="problem-unit">{isZh ? "\u6B7B\u4EA1\u7387" : "mortality"}</span>
            <p>{isZh
              ? "\u65B0\u79CD\u6811\u82D7\u5728\u524D1-2\u5E74\u6B7B\u4EA1\u7387\u5F88\u9AD8\uFF0C\u9700\u53CA\u65F6\u53D1\u73B0\u8865\u79CD"
              : "Newly planted saplings have high mortality in years 1\u20132 \u2014 dead trees must be found and replaced fast"}</p>
          </div>
        </div>
      </FadeSection>

      {/* ── THREE PILLARS ── */}
      <FadeSection className="mission-section">
        <h2 className="mission-section-title">
          {isZh ? "\u6211\u4EEC\u7684\u65B9\u6CD5" : "Our Approach"}
        </h2>
        <p className="mission-section-desc">
          {isZh
            ? "\u4E09\u5C42\u76D1\u6D4B\u4F53\u7CFB\uFF1A\u4ECE\u592A\u7A7A\u5230\u5730\u9762\uFF0C\u6BCF\u5C42\u586B\u8865\u4E0A\u5C42\u7684\u76F2\u533A"
            : "Three layers of monitoring: from space to ground, each filling the blind spots of the layer above"}
        </p>

        <div className="mission-pillars">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            const t = isZh ? p.zh : p.en;
            return (
              <div
                key={p.id}
                className={`mission-pillar ${p.navView ? "clickable" : ""}`}
                style={{ borderColor: p.border, background: p.bg }}
                onClick={() => p.navView && onNavigate?.(p.navView)}
              >
                <div className="pillar-header">
                  <div className="pillar-icon" style={{ color: p.color, background: `${p.color}15` }}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <span className="pillar-num" style={{ color: p.color }}>
                      {isZh ? `\u7B2C${["\u4E00", "\u4E8C", "\u4E09"][i]}\u5C42` : `Pillar ${i + 1}`}
                    </span>
                    <h3 className="pillar-title">{t.title}</h3>
                    <span className="pillar-subtitle">{t.subtitle}</span>
                  </div>
                </div>
                <p className="pillar-desc">{t.desc}</p>
                <div className="pillar-footer">
                  <span className="pillar-scale" style={{ color: p.color }}>{t.scale}</span>
                  <div className="pillar-stat">
                    <strong>{t.stat}</strong>
                    <span>{t.statLabel}</span>
                  </div>
                </div>
                {p.navView && (
                  <div className="pillar-nav-hint" style={{ color: p.color }}>
                    <FiExternalLink size={13} />
                    <span>{isZh ? "\u67E5\u770B\u8BE6\u60C5" : "View details"}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </FadeSection>

      {/* ── FLOW (horizontal on desktop) ── */}
      <FadeSection className="mission-section">
        <h2 className="mission-section-title">
          {isZh ? "\u5DE5\u4F5C\u6D41\u7A0B" : "How It Works"}
        </h2>
        <div className="mission-flow-horizontal">
          {FLOW.map((s, i, arr) => (
            <div key={s.step} className="flow-h-step">
              <div className="flow-h-circle" style={{ background: s.color }}>{s.step}</div>
              <strong>{isZh ? s.zh : s.en}</strong>
              <span className="flow-h-desc">{isZh ? s.descZh : s.descEn}</span>
              {i < arr.length - 1 && <div className="flow-h-arrow"><FiArrowRight size={14} /></div>}
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── IMPACT NUMBERS ── */}
      <FadeSection className="mission-section">
        <h2 className="mission-section-title">
          {isZh ? "\u89C4\u6A21\u4E0E\u5F71\u54CD" : "Scale & Impact"}
        </h2>
        <div className="mission-stats-row">
          {STATS.map((s, i) => (
            <div key={i} className="mission-stat-card">
              <span className="mission-stat-value" style={{ color: s.color }}>{isZh ? s.zh : s.en}</span>
              <span className="mission-stat-label">{isZh ? s.labelZh : s.labelEn}</span>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── FIELD RESEARCH ── */}
      <FadeSection className="mission-section">
        <h2 className="mission-section-title">
          <FiCalendar size={18} />
          {isZh ? "\u5B9E\u5730\u7814\u7A76 \u2014 2026\u5E74\u590F\u5B63" : "Field Research \u2014 Summer 2026"}
        </h2>
        <p className="mission-section-desc">
          {isZh
            ? "\u6211\u4EEC\u5C06\u524D\u5F80\u5854\u514B\u62C9\u739B\u5E72\u6C99\u6F20\uFF0C\u5728\u4EE5\u4E0B\u7EFF\u5E26\u7AD9\u70B9\u8FDB\u884C\u5B9E\u5730\u6D4B\u8BD5\u548C\u6570\u636E\u6536\u96C6"
            : "We will travel to the Taklamakan Desert to test equipment and collect data at these green belt sites"}
        </p>
        <div className="field-sites-grid">
          {FIELD_SITES.map((site, i) => (
            <div key={i} className="field-site-card">
              <FiMapPin size={16} style={{ color: "#ffa726", flexShrink: 0 }} />
              <div>
                <strong>{isZh ? site.zh : site.en}</strong>
                <span>{isZh ? site.descZh : site.descEn}</span>
              </div>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── ABOUT ── */}
      <FadeSection className="mission-section mission-about">
        <h2 className="mission-section-title">
          <FiUsers size={18} />
          {isZh ? "\u5173\u4E8E\u6211\u4EEC" : "About Us"}
        </h2>
        <div className="mission-about-content">
          <div className="mission-founder">
            <div className="founder-avatar">
              <FiUsers size={28} />
            </div>
            <div className="founder-info">
              <strong>{isZh ? "\u521B\u59CB\u4EBA" : "Founder"}</strong>
              <p>
                {isZh
                  ? "\u4E00\u540D\u9AD8\u4E2D\u751F\uFF0C\u81F4\u529B\u4E8E\u7528\u6280\u672F\u76D1\u6D4B\u548C\u652F\u6301\u4E16\u754C\u6700\u5927\u7684\u6C99\u6F20\u7EFF\u5316\u5DE5\u7A0B\u3002\u73AF\u5883\u79D1\u5B66\u4E0D\u5E94\u53EA\u505C\u7559\u5728\u8BFE\u5802\u2014\u2014\u5B83\u9700\u8981\u884C\u52A8\u3001\u6570\u636E\u548C\u5B9E\u8DF5\u3002"
                  : "A high school student using technology to monitor the world's largest desert greening effort. Environmental science shouldn't stay in the classroom \u2014 it needs action, data, and fieldwork."}
              </p>
            </div>
          </div>
          <div className="mission-values">
            {[
              { en: "Open Data", zh: "\u5F00\u653E\u6570\u636E", desc: isZh ? "\u6240\u6709\u76D1\u6D4B\u6570\u636E\u516C\u5F00\u900F\u660E" : "All monitoring data publicly accessible" },
              { en: "Real Science", zh: "\u771F\u5B9E\u79D1\u5B66", desc: isZh ? "\u536B\u661F\u53D1\u73B0\u7ECF\u5B9E\u5730\u9A8C\u8BC1" : "Satellite findings validated by ground truth" },
              { en: "Student-Led", zh: "\u5B66\u751F\u4E3B\u5BFC", desc: isZh ? "\u8BC1\u660E\u5E74\u8F7B\u4EBA\u80FD\u591F\u4EA7\u751F\u5F71\u54CD" : "Proving young people can make an impact" },
            ].map((v, i) => (
              <div key={i} className="mission-value">
                <strong>{isZh ? v.zh : v.en}</strong>
                <span>{v.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeSection>

      {/* ── FOOTER ── */}
      <footer className="mission-footer">
        <span>{isZh ? "\u5B88\u62A4\u7EFF\u8272\u957F\u57CE\u8BA1\u5212" : "Green Wall Watch Project"} &middot; 2026</span>
      </footer>
    </div>
  );
}
