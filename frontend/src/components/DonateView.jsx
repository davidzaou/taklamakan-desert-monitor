import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { FiHeart, FiEye, FiMapPin, FiAward, FiChevronRight, FiPlay, FiPause, FiMaximize2 } from "react-icons/fi";
import "./DonateView.css";

// ─── TIERS ────────────────────────────────────────

const TIERS = [
  {
    id: "supporter",
    price: 5,
    period: "mo",
    color: "#4fc3f7",
    icon: "🐍",
    perks: ["liveFeed", "communityAccess", "monthlyDigest"],
  },
  {
    id: "patron",
    price: 25,
    period: "mo",
    color: "#66bb6a",
    icon: "🌿",
    featured: true,
    perks: ["adoptSnake", "nameSnake", "patrolRoute", "weeklyReport", "liveFeed", "communityAccess"],
  },
  {
    id: "guardian",
    price: 100,
    period: "mo",
    color: "#FFC107",
    icon: "🛡️",
    perks: ["priorityFeed", "snakeDashboard", "videoHighlights", "certificate", "adoptSnake", "nameSnake", "patrolRoute", "liveFeed"],
  },
  {
    id: "founder",
    price: 500,
    period: "once",
    color: "#E040FB",
    icon: "⭐",
    perks: ["permanentName", "timelinePlaque", "lifetimeAccess", "priorityFeed", "snakeDashboard", "adoptSnake", "nameSnake"],
  },
];

// ─── SNAKE ROSTER (simulated adopted snakes) ─────

const SNAKES = [
  { id: "EXP-07", name: "Explorer-7", zone: "Hotan Green Belt", km: 1247, status: "patrolling", donor: "Zhang W.", color: "#4fc3f7" },
  { id: "DUN-12", name: "Dune Runner", zone: "Desert Highway", km: 893, status: "charging", donor: "Sarah K.", color: "#66bb6a" },
  { id: "OAS-03", name: "Oasis Watch", zone: "Korla Oasis", km: 2104, status: "patrolling", donor: "Li M.", color: "#FFC107" },
  { id: "SDW-19", name: "Sandwalker", zone: "Minfeng Belt", km: 567, status: "patrolling", donor: "Anonymous", color: "#E040FB" },
  { id: "GRN-05", name: "Green Scout", zone: "Alar Shelterbelt", km: 1532, status: "scanning", donor: "David R.", color: "#4fc3f7" },
];

// ─── SIMULATED LIVE FEED ─────────────────────────

function SnakeLiveFeed({ snake, expanded, onToggleExpand }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const [playing, setPlaying] = useState(true);

  // Simulate desert POV footage on canvas
  useEffect(() => {
    if (!canvasRef.current || !playing) return;
    const ctx = canvasRef.current.getContext("2d");
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    let raf;

    function draw() {
      frameRef.current += 0.5;
      const t = frameRef.current;

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      skyGrad.addColorStop(0, "#1a237e");
      skyGrad.addColorStop(0.5, "#4a6fa5");
      skyGrad.addColorStop(1, "#c8a24e");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.45);

      // Horizon glow
      ctx.fillStyle = "rgba(255,200,100,0.15)";
      ctx.fillRect(0, h * 0.38, w, h * 0.1);

      // Desert ground
      const groundGrad = ctx.createLinearGradient(0, h * 0.45, 0, h);
      groundGrad.addColorStop(0, "#D4A843");
      groundGrad.addColorStop(0.3, "#C89B3C");
      groundGrad.addColorStop(1, "#8B6914");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, h * 0.45, w, h * 0.55);

      // Moving dune lines
      ctx.strokeStyle = "rgba(139,105,20,0.3)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const yy = h * 0.5 + i * h * 0.06;
        ctx.beginPath();
        for (let x = 0; x < w; x += 4) {
          const dy = Math.sin((x + t * 2 + i * 40) * 0.02) * (3 + i);
          x === 0 ? ctx.moveTo(x, yy + dy) : ctx.lineTo(x, yy + dy);
        }
        ctx.stroke();
      }

      // Occasional green patches (vegetation detected)
      if (snake.status === "patrolling") {
        const greenX = ((t * 3) % (w + 200)) - 100;
        if (greenX > 0 && greenX < w) {
          ctx.fillStyle = "rgba(76,175,80,0.3)";
          ctx.beginPath();
          ctx.ellipse(greenX, h * 0.6, 30, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          // Small tree shapes
          for (let j = -1; j <= 1; j++) {
            ctx.fillStyle = "#2E7D32";
            ctx.beginPath();
            ctx.moveTo(greenX + j * 15, h * 0.57);
            ctx.lineTo(greenX + j * 15 - 4, h * 0.62);
            ctx.lineTo(greenX + j * 15 + 4, h * 0.62);
            ctx.fill();
          }
        }
      }

      // Scan line effect
      const scanY = (t * 4) % h;
      ctx.fillStyle = "rgba(79,195,247,0.04)";
      ctx.fillRect(0, scanY, w, 2);

      // HUD overlay
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, w, 28);
      ctx.fillRect(0, h - 24, w, 24);

      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "#4fc3f7";
      ctx.fillText(`◉ ${snake.id} — ${snake.name}`, 8, 16);
      ctx.fillStyle = "#66bb6a";
      ctx.textAlign = "right";
      ctx.fillText(snake.status.toUpperCase(), w - 8, 16);

      ctx.textAlign = "left";
      ctx.fillStyle = "#999";
      ctx.font = "9px monospace";
      const now = new Date();
      ctx.fillText(`${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")} UTC+8  |  ${snake.zone}  |  ${(snake.km + Math.floor(t / 60)).toLocaleString()} km total`, 8, h - 8);

      // Corner brackets
      ctx.strokeStyle = "rgba(79,195,247,0.4)";
      ctx.lineWidth = 1.5;
      const m = 12, s = 20;
      // top-left
      ctx.beginPath(); ctx.moveTo(m, m + s); ctx.lineTo(m, m); ctx.lineTo(m + s, m); ctx.stroke();
      // top-right
      ctx.beginPath(); ctx.moveTo(w - m - s, m); ctx.lineTo(w - m, m); ctx.lineTo(w - m, m + s); ctx.stroke();
      // bottom-left
      ctx.beginPath(); ctx.moveTo(m, h - m - s); ctx.lineTo(m, h - m); ctx.lineTo(m + s, h - m); ctx.stroke();
      // bottom-right
      ctx.beginPath(); ctx.moveTo(w - m - s, h - m); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m, h - m - s); ctx.stroke();

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, [playing, snake]);

  return (
    <div className={`snake-feed ${expanded ? "expanded" : ""}`}>
      <canvas ref={canvasRef} width={expanded ? 800 : 400} height={expanded ? 450 : 225} className="snake-feed-canvas" />
      <div className="snake-feed-controls">
        <button onClick={() => setPlaying(!playing)} className="feed-ctrl-btn">
          {playing ? <FiPause size={12} /> : <FiPlay size={12} />}
        </button>
        <span className="feed-live-dot" />
        <span className="feed-live-text">LIVE</span>
        <div className="feed-spacer" />
        <button onClick={onToggleExpand} className="feed-ctrl-btn">
          <FiMaximize2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── MAIN DONATE VIEW ────────────────────────────

export default function DonateView() {
  const { lang } = useLanguage();
  const [selectedTier, setSelectedTier] = useState(null);
  const [adoptStep, setAdoptStep] = useState(0); // 0=tiers, 1=name snake, 2=feed
  const [snakeName, setSnakeName] = useState("");
  const [selectedSnake, setSelectedSnake] = useState(SNAKES[0]);
  const [feedExpanded, setFeedExpanded] = useState(false);

  const zh = lang === "zh";

  const tierLabels = {
    supporter: { name: zh ? "支持者" : "Supporter", desc: zh ? "加入社区，观看所有蛇形机器人的实时画面" : "Join the community. Watch live feeds from any patrol snake." },
    patron: { name: zh ? "守护者" : "Patron", desc: zh ? "认领一条蛇形机器人，为它命名，追踪它的巡逻路线" : "Adopt a snake. Name it. Track its patrol route on the map." },
    guardian: { name: zh ? "卫士" : "Guardian", desc: zh ? "优先直播、专属仪表盘、视频精选集" : "Priority live feed, personal dashboard, video highlights reel." },
    founder: { name: zh ? "创始人" : "Founder", desc: zh ? "永久命名权、时间线铭牌、终身访问" : "Permanent naming rights. Timeline plaque. Lifetime access." },
  };

  const perkLabels = {
    liveFeed: zh ? "实时视频" : "Live video feed",
    communityAccess: zh ? "社区访问" : "Community access",
    monthlyDigest: zh ? "月度简报" : "Monthly digest",
    adoptSnake: zh ? "认领蛇形机器人" : "Adopt a patrol snake",
    nameSnake: zh ? "为机器人命名" : "Name your snake",
    patrolRoute: zh ? "地图巡逻路线" : "Patrol route on map",
    weeklyReport: zh ? "周报" : "Weekly report",
    priorityFeed: zh ? "优先直播" : "Priority live feed",
    snakeDashboard: zh ? "专属仪表盘" : "Snake dashboard",
    videoHighlights: zh ? "视频精选集" : "Video highlights",
    certificate: zh ? "捐赠证书" : "Certificate",
    permanentName: zh ? "永久命名权" : "Permanent name",
    timelinePlaque: zh ? "时间线铭牌" : "Timeline plaque",
    lifetimeAccess: zh ? "终身访问" : "Lifetime access",
  };

  return (
    <div className="donate-view">
      {/* Hero */}
      <div className="donate-hero">
        <div className="donate-hero-content">
          <h1>{zh ? "认领一条沙漠巡逻蛇" : "Adopt a Desert Patrol Snake"}</h1>
          <p>{zh
            ? "捐赠支持塔克拉玛干沙漠绿化工程。认领一条蛇形巡逻机器人，通过它的眼睛实时观察沙漠。"
            : "Fund the Taklimakan green belt mission. Adopt a patrol snake robot and see the desert through its eyes — live."
          }</p>
          <div className="donate-hero-stats">
            <div className="dh-stat"><strong>1,247</strong><span>{zh ? "蛇形机器人" : "Patrol Snakes"}</span></div>
            <div className="dh-stat"><strong>38,400</strong><span>{zh ? "公里巡逻" : "km Patrolled"}</span></div>
            <div className="dh-stat"><strong>2,891</strong><span>{zh ? "捐赠者" : "Donors"}</span></div>
          </div>
        </div>
      </div>

      {/* Live feed showcase */}
      <div className="donate-feed-section">
        <h2><FiEye size={18} /> {zh ? "实时巡逻画面" : "Live Patrol Feed"}</h2>
        <p className="donate-feed-desc">{zh ? "从我们的蛇形机器人视角实时观察沙漠" : "Watch the desert in real-time through our snake robots' eyes"}</p>

        <div className="donate-feed-layout">
          <SnakeLiveFeed snake={selectedSnake} expanded={feedExpanded} onToggleExpand={() => setFeedExpanded(!feedExpanded)} />

          <div className="snake-roster">
            <h3>{zh ? "活跃机器人" : "Active Snakes"}</h3>
            {SNAKES.map(s => (
              <button
                key={s.id}
                className={`snake-roster-item ${selectedSnake.id === s.id ? "active" : ""}`}
                onClick={() => setSelectedSnake(s)}
              >
                <span className="snake-roster-dot" style={{ background: s.color }} />
                <div className="snake-roster-info">
                  <span className="snake-roster-name">{s.name}</span>
                  <span className="snake-roster-zone">{s.zone}</span>
                </div>
                <span className={`snake-roster-status ${s.status}`}>{s.status === "patrolling" ? "●" : s.status === "charging" ? "⚡" : "◎"}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tiers */}
      <div className="donate-tiers-section">
        <h2>{zh ? "选择你的支持方式" : "Choose Your Support"}</h2>

        <div className="donate-tiers">
          {TIERS.map(tier => (
            <div
              key={tier.id}
              className={`donate-tier ${tier.featured ? "featured" : ""} ${selectedTier === tier.id ? "selected" : ""}`}
              onClick={() => setSelectedTier(tier.id)}
            >
              {tier.featured && <div className="tier-badge">{zh ? "最受欢迎" : "MOST POPULAR"}</div>}
              <div className="tier-icon">{tier.icon}</div>
              <h3 style={{ color: tier.color }}>{tierLabels[tier.id].name}</h3>
              <div className="tier-price">
                <span className="tier-currency">$</span>
                <span className="tier-amount">{tier.price}</span>
                <span className="tier-period">/{tier.period === "mo" ? (zh ? "月" : "mo") : (zh ? "一次性" : "once")}</span>
              </div>
              <p className="tier-desc">{tierLabels[tier.id].desc}</p>
              <ul className="tier-perks">
                {tier.perks.map(p => (
                  <li key={p}><span className="perk-check" style={{ color: tier.color }}>✓</span> {perkLabels[p]}</li>
                ))}
              </ul>
              <button className="tier-btn" style={{ background: tier.color, color: tier.color === "#FFC107" ? "#333" : "#fff" }}>
                {zh ? "选择" : "Select"} <FiChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="donate-how">
        <h2>{zh ? "如何运作" : "How It Works"}</h2>
        <div className="donate-steps">
          <div className="donate-step">
            <div className="step-num">1</div>
            <h4>{zh ? "选择支持等级" : "Pick a Tier"}</h4>
            <p>{zh ? "选择适合你的捐赠方案" : "Choose the support level that works for you"}</p>
          </div>
          <div className="donate-step">
            <div className="step-num">2</div>
            <h4>{zh ? "认领你的蛇" : "Meet Your Snake"}</h4>
            <p>{zh ? "为你的蛇形机器人命名，选择巡逻区域" : "Name your patrol snake and pick its zone"}</p>
          </div>
          <div className="donate-step">
            <div className="step-num">3</div>
            <h4>{zh ? "实时观看" : "Watch Live"}</h4>
            <p>{zh ? "通过蛇的摄像头实时观察沙漠变化" : "See the desert through your snake's camera in real-time"}</p>
          </div>
          <div className="donate-step">
            <div className="step-num">4</div>
            <h4>{zh ? "见证改变" : "See the Impact"}</h4>
            <p>{zh ? "接收巡逻报告，追踪绿化进展" : "Get patrol reports and track greening progress"}</p>
          </div>
        </div>
      </div>

      {/* Impact numbers */}
      <div className="donate-impact">
        <h2>{zh ? "你的捐赠影响" : "Your Donation Impact"}</h2>
        <div className="impact-grid">
          <div className="impact-card">
            <span className="impact-icon">🌱</span>
            <strong>$5</strong>
            <span>{zh ? "= 监测1公里绿化带一周" : "= monitors 1km of green belt for a week"}</span>
          </div>
          <div className="impact-card">
            <span className="impact-icon">🐍</span>
            <strong>$25</strong>
            <span>{zh ? "= 蛇形机器人运行一天" : "= one snake patrol day"}</span>
          </div>
          <div className="impact-card">
            <span className="impact-icon">🌳</span>
            <strong>$100</strong>
            <span>{zh ? "= 种植50棵抗旱树苗" : "= 50 drought-resistant seedlings planted"}</span>
          </div>
          <div className="impact-card">
            <span className="impact-icon">🛰️</span>
            <strong>$500</strong>
            <span>{zh ? "= 一个月卫星监测数据" : "= one month of satellite monitoring data"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
