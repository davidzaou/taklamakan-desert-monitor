import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { FiArrowLeft, FiCheckCircle, FiAlertCircle, FiZap, FiDroplet, FiCpu, FiExternalLink } from "react-icons/fi";
import FadeSection from "./FadeSection";
import "./SandPearlView.css";

const VIDEOS = [
  { src: "/media/sand-pearl/sp-video1.mp4", num: 1 },
  { src: "/media/sand-pearl/sp-video2.mp4", num: 2 },
  { src: "/media/sand-pearl/sp-video3.mp4", num: 3 },
  { src: "/media/sand-pearl/sp-video4.mp4", num: 4 },
  { src: "/media/sand-pearl/sp-video5.mp4", num: 5 },
  { src: "/media/sand-pearl/sp-video6.mp4", num: 6 },
];

const SPECS = [
  { labelEn: "Form Factor", labelZh: "外形", value: "Sphere", detailEn: "sealed outer shell", detailZh: "密封外壳" },
  { labelEn: "Drive System", labelZh: "驱动系统", value: "Internal Gears", detailEn: "2-wheel inner drive", detailZh: "双轮内驱" },
  { labelEn: "Irrigation", labelZh: "灌溉", value: "2× Sprinklers", detailEn: "left & right nozzles", detailZh: "左右各一喷嘴" },
  { labelEn: "Terrain (tested)", labelZh: "测试地形", value: "Concrete + Soil", detailEn: "field trial done", detailZh: "已完成测试" },
  { labelEn: "Inspiration", labelZh: "设计灵感", value: "BB-8", detailEn: "internal pendulum drive", detailZh: "内摆驱动原理" },
  { labelEn: "Status", labelZh: "状态", value: "Prototype v1", detailEn: "active development", detailZh: "积极开发中" },
];

export default function SandPearlView({ onNavigate }) {
  const { lang } = useLanguage();
  const isZh = lang === "zh";
  const [activeVideo, setActiveVideo] = useState(0);

  return (
    <div className="sp-page">

      {/* ── HERO ── */}
      <section className="sp-hero">
        <div className="sp-hero-bg">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="sp-hero-orb" style={{
              width: `${40 + i * 18}px`, height: `${40 + i * 18}px`,
              left: `${10 + i * 11}%`, top: `${20 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.4}s`, opacity: 0.06 - i * 0.005,
            }} />
          ))}
        </div>
        <div className="sp-hero-content">
          <div className="sp-pivot-badge">
            {isZh ? "从蛇形机器人演进而来" : "Evolved from Snake Robot"}
          </div>
          <h1>Sand Pearl</h1>
          <p className="sp-hero-sub">
            {isZh
              ? "球形自主灌溉机器人 · 内驱齿轮系统"
              : "Spherical Autonomous Irrigation Robot · Internal Gear Drive"}
          </p>
          <p className="sp-hero-desc">
            {isZh
              ? "沙珠是对蛇形机器人经验教训的直接回应——一个自包含的滚动球体，携带两个侧置喷嘴，在沙漠绿化带中自主移动并灌溉树苗。"
              : "Sand Pearl is a direct response to the lessons learned from the Snake Robot — a self-contained rolling sphere carrying two side-mounted sprinkler nozzles, designed to autonomously navigate and irrigate saplings across desert green belt terrain."}
          </p>
          {onNavigate && (
            <button className="sp-back-btn" onClick={() => onNavigate("snake")}>
              <FiArrowLeft size={14} />
              {isZh ? "查看蛇形机器人" : "View Snake Robot"}
            </button>
          )}
        </div>
      </section>

      {/* ── WHY THE PIVOT ── */}
      <FadeSection className="sp-section">
        <h2 className="sp-section-title">{isZh ? "为何转型" : "Why We Pivoted"}</h2>
        <p className="sp-section-desc">
          {isZh
            ? "蛇形机器人的实地测试揭示了两个根本性问题：节段间过度打滑，以及底部车轮在松软地面上无法提供足够抓地力。这些问题指向一个核心挑战——蛇形构型在沙漠地形中的接触面积和驱动力不足。我们没有修补这些限制，而是重新思考了运动的基本形式。"
            : "Field testing of the Snake Robot revealed two fundamental issues: excessive slipping between body segments, and the underside wheel failing to grip soft terrain. These pointed to a core challenge — insufficient ground contact and traction in desert conditions. Rather than patching those limitations, we rethought the form of locomotion from the ground up."}
        </p>
        <div className="sp-pivot-grid">
          <div className="sp-pivot-card sp-pivot-before">
            <div className="sp-pivot-label">{isZh ? "之前：蛇形机器人" : "Before: Snake Robot"}</div>
            <ul>
              <li>{isZh ? "节段间打滑" : "Slipping between segments"}</li>
              <li>{isZh ? "底轮在软地失效" : "Underside wheel fails on soft ground"}</li>
              <li>{isZh ? "线性结构，接触面积有限" : "Linear body, limited ground contact"}</li>
            </ul>
          </div>
          <div className="sp-pivot-arrow">→</div>
          <div className="sp-pivot-card sp-pivot-after">
            <div className="sp-pivot-label">{isZh ? "之后：沙珠" : "After: Sand Pearl"}</div>
            <ul>
              <li>{isZh ? "球形外壳，全向接触" : "Spherical shell, omnidirectional contact"}</li>
              <li>{isZh ? "内驱齿轮，无外露滑动部件" : "Internal gear drive, no exposed slip joints"}</li>
              <li>{isZh ? "紧凑密封，防尘防沙" : "Compact sealed body, sand-resistant"}</li>
            </ul>
          </div>
        </div>
      </FadeSection>

      {/* ── DESIGN ── */}
      <FadeSection className="sp-section">
        <h2 className="sp-section-title">{isZh ? "设计原理" : "Design Concept"}</h2>
        <p className="sp-section-desc">
          {isZh
            ? "沙珠的灵感来源于BB-8的内摆驱动原理——球形外壳由内部两个齿轮驱动轮推动滚动，无需外部轨道或接触点。两个喷嘴对称分布在球体左右两侧，可独立控制，实现精准定向灌溉。"
            : "Sand Pearl draws inspiration from BB-8's internal pendulum drive — a spherical outer shell propelled by two internal gear-driven wheels, with no external rails or contact points needed. Two sprinkler nozzles are symmetrically positioned on the left and right sides of the sphere, independently controlled for targeted directional irrigation."}
        </p>
        <div className="sp-specs-grid">
          {SPECS.map((s, i) => (
            <div key={i} className="sp-spec-card">
              <span className="sp-spec-label">{isZh ? s.labelZh : s.labelEn}</span>
              <span className="sp-spec-value">{s.value}</span>
              <span className="sp-spec-detail">{isZh ? s.detailZh : s.detailEn}</span>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── FIELD TESTING ── */}
      <FadeSection className="sp-section">
        <h2 className="sp-section-title">{isZh ? "早期实地测试" : "Early Field Testing"}</h2>
        <p className="sp-section-desc">
          {isZh
            ? "作为原型开发的第一阶段，我们在两种环境中对沙珠进行了初步测试：混凝土硬地和小型种植地块（种有大蒜和小葱）。这些测试为我们提供了宝贵的第一手数据，并为下一阶段的开发指明了方向。"
            : "As the first phase of prototype development, we conducted initial tests of Sand Pearl in two environments: a flat concrete surface and a small planted field (garlic and spring onion cultivation). These tests provided valuable first-hand data and have shaped the direction of our next development phase."}
        </p>
        <div className="sp-test-results">
          <div className="sp-test-card sp-test-pass">
            <FiCheckCircle size={18} />
            <div>
              <strong>{isZh ? "混凝土地面 — 表现良好" : "Concrete Surface — Performing Well"}</strong>
              <p>{isZh
                ? "在平坦硬地上，沙珠展示了稳定的滚动运动、流畅的转向响应和可靠的直线行进能力。驱动系统运行顺畅，喷水功能正常激活。"
                : "On flat hard ground, Sand Pearl demonstrated stable rolling locomotion, smooth steering response, and reliable straight-line travel. The drive system ran cleanly and the sprinkler function activated as intended."}</p>
            </div>
          </div>
          <div className="sp-test-card sp-test-progress">
            <FiAlertCircle size={18} />
            <div>
              <strong>{isZh ? "软土地面 — 仍在优化中" : "Soft Soil Field — Still Being Refined"}</strong>
              <p>{isZh
                ? "在种植地块的测试中，机器人遭遇了由小土堆和植被根系形成的不规则地面。目前的电机扭矩在这类地形上尚不足以维持稳定前进。这是早期原型阶段的正常挑战，我们正在探索更高扭矩的驱动方案以应对复杂地形。"
                : "In the planted field, the robot encountered irregular terrain formed by small soil mounds and vegetation roots. The current motor torque is not yet sufficient to maintain consistent forward motion across this type of surface. This is a natural challenge at the early prototype stage, and we are exploring higher-torque drive options to handle more complex terrain."}</p>
            </div>
          </div>
        </div>
      </FadeSection>

      {/* ── VIDEO GALLERY ── */}
      <FadeSection className="sp-section">
        <h2 className="sp-section-title">{isZh ? "测试视频" : "Testing Videos"}</h2>
        <p className="sp-section-desc">
          {isZh
            ? "以下视频记录了沙珠在社区附近多种场景下的早期测试过程。"
            : "The following videos document Sand Pearl's early multi-scenario testing conducted at my neighborhood."}
        </p>

        {/* Main player */}
        <div className="sp-video-main">
          <video
            key={activeVideo}
            controls
            preload="metadata"
            className="sp-video-player"
          >
            <source src={VIDEOS[activeVideo].src} type="video/mp4" />
            {isZh ? "您的浏览器不支持视频标签。" : "Your browser does not support the video tag."}
          </video>
        </div>

        {/* Thumbnail strip */}
        <div className="sp-video-strip">
          {VIDEOS.map((v, i) => (
            <button
              key={i}
              className={`sp-video-thumb ${activeVideo === i ? "active" : ""}`}
              onClick={() => setActiveVideo(i)}
            >
              <video src={v.src + "#t=1"} preload="none" className="sp-thumb-preview" muted />
              <span className="sp-thumb-label">{isZh ? `片段 ${v.num}` : `Clip ${v.num}`}</span>
            </button>
          ))}
        </div>
      </FadeSection>

      {/* ── NEXT STEPS ── */}
      <FadeSection className="sp-section">
        <h2 className="sp-section-title">{isZh ? "下一步计划" : "Next Steps"}</h2>
        <div className="sp-next-grid">
          {[
            {
              icon: FiZap,
              en: "Higher-Torque Motor",
              zh: "更大扭矩电机",
              descEn: "Upgrade the internal drive to handle uneven soil, small mounds, and root clusters in real planting fields.",
              descZh: "升级内部驱动，以应对真实种植地块中的不平地面、小土堆和根系障碍。",
            },
            {
              icon: FiDroplet,
              en: "Precision Irrigation Control",
              zh: "精准灌溉控制",
              descEn: "Integrate soil moisture sensing so the sprinklers activate only when and where water is needed.",
              descZh: "集成土壤湿度传感，使喷嘴仅在需要时和需要的位置激活。",
            },
            {
              icon: FiCpu,
              en: "Autonomous Navigation",
              zh: "自主导航",
              descEn: "Add GPS-guided path planning so Sand Pearl can independently survey and irrigate rows of saplings.",
              descZh: "增加GPS引导路径规划，使沙珠能够独立巡查并灌溉成排树苗。",
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="sp-next-card">
                <Icon size={20} className="sp-next-icon" />
                <strong>{isZh ? item.zh : item.en}</strong>
                <p>{isZh ? item.descZh : item.descEn}</p>
              </div>
            );
          })}
        </div>
      </FadeSection>

      {/* ── STATUS ── */}
      <FadeSection className="sp-section sp-status-section">
        <div className="sp-status-card">
          <FiAlertCircle size={18} style={{ color: "#4fc3f7" }} />
          <div>
            <strong>{isZh ? "项目状态：原型阶段 · 积极开发中" : "Status: Prototype Stage · Actively in Development"}</strong>
            <p>
              {isZh
                ? "沙珠目前处于早期原型阶段。已在硬地环境中验证核心运动概念，软地性能的提升是当前首要开发目标。我们相信，随着每次迭代，这个平台将逐步具备在真实荒漠化地区作业的能力。"
                : "Sand Pearl is currently in its early prototype stage. The core locomotion concept has been validated on hard surfaces, and improving soft-terrain performance is the primary development focus. We believe that with each iteration, this platform will progressively build towards deployment-ready capability in real desertification zones."}
            </p>
          </div>
        </div>
      </FadeSection>

    </div>
  );
}
