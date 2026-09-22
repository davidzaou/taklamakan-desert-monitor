import { useLanguage } from "../i18n/LanguageContext";
import { FiMap, FiActivity, FiFolder, FiClock, FiHome, FiGift, FiGlobe, FiFileText, FiSun, FiCompass } from "react-icons/fi";
import SnakeIcon from "./icons/SnakeIcon";
import "./Sidebar.css";

const MAIN_VIEWS = [
  { id: "home", icon: FiHome, labelKey: "viewHome" },
  { id: "map", icon: FiMap, labelKey: "viewMap" },
  { id: "monitor", icon: FiActivity, labelKey: "viewMonitor" },
  { id: "projects", icon: FiFolder, labelKey: "viewProjects" },
  { id: "research", icon: FiCompass, labelKey: "viewResearch" },
  { id: "playground", icon: FiGlobe, labelKey: "viewPlayground" },
  { id: "snake", icon: SnakeIcon, labelKey: "viewSnake" },
  { id: "sandpearl", icon: FiSun, labelKey: "viewSandPearl" },
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
        aria-current={activeView === v.id ? "page" : undefined}
        aria-label={t(v.labelKey)}
      >
        <Icon size={20} />
        <span className="sidebar-tooltip">{t(v.labelKey)}</span>
      </button>
    );
  };

  return (
    <nav className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-brand">
        <FiSun size={16} />
      </div>
      <span className="sidebar-label">{t("sidebarMain")}</span>
      {MAIN_VIEWS.map(renderButton)}
      <span className="sidebar-label">{t("sidebarMore")}</span>
      {SECONDARY_VIEWS.map(renderButton)}
      <div className="sidebar-spacer" />
    </nav>
  );
}
