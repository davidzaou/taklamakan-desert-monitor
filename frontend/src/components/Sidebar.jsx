import { useLanguage } from "../i18n/LanguageContext";
import { FiMap, FiActivity, FiFolder, FiClock, FiHeart, FiGift, FiGlobe, FiFileText, FiSun, FiCompass } from "react-icons/fi";
import SnakeIcon from "./icons/SnakeIcon";
import "./Sidebar.css";

const MAIN_VIEWS = [
  { id: "mission", icon: FiHeart, labelKey: "viewMission" },
  { id: "map", icon: FiMap, labelKey: "viewMap" },
  { id: "monitor", icon: FiActivity, labelKey: "viewMonitor" },
  { id: "playground", icon: FiGlobe, labelKey: "viewPlayground" },
  { id: "research", icon: FiCompass, labelKey: "viewResearch" },
  { id: "projects", icon: FiFolder, labelKey: "viewProjects" },
  { id: "snake", icon: SnakeIcon, labelKey: "viewSnake" },
];

const SECONDARY_VIEWS = [
  { id: "donate", icon: FiGift, labelKey: "viewDonate" },
  { id: "timeline", icon: FiClock, labelKey: "viewTimeline" },
  { id: "news", icon: FiFileText, labelKey: "viewNews" },
];

export default function Sidebar({ activeView, onViewChange }) {
  const { t } = useLanguage();

  const renderButton = (v) => {
    const Icon = v.icon;
    return (
      <button
        key={v.id}
        className={`sidebar-icon ${activeView === v.id ? "active" : ""}`}
        onClick={() => onViewChange(v.id)}
      >
        <Icon size={20} />
        <span className="sidebar-tooltip">{t(v.labelKey)}</span>
      </button>
    );
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <FiSun size={16} />
      </div>
      {MAIN_VIEWS.map(renderButton)}
      <div className="sidebar-divider" />
      {SECONDARY_VIEWS.map(renderButton)}
      <div className="sidebar-spacer" />
    </nav>
  );
}
