import { useState, useEffect, useRef } from "react";
import IllustratedMap from "./components/IllustratedMap";
import NDVIChart from "./components/NDVIChart";
import NDVICompareSlider from "./components/NDVICompareSlider";
import ChangeStats from "./components/ChangeStats";
import Legend from "./components/Legend";
import SearchFilterBar from "./components/SearchFilterBar";
import SlidePanel from "./components/SlidePanel";
import FeatureDetails from "./components/FeatureDetails";
import FullscreenButton from "./components/FullscreenButton";
import ExportButton from "./components/ExportButton";
import LanguageToggle from "./components/LanguageToggle";
import Sidebar from "./components/Sidebar";
import StatusBar from "./components/StatusBar";
import MapYearSlider from "./components/MapYearSlider";
import MonitorView from "./components/MonitorView";
import ProjectsView from "./components/ProjectsView";
import TimelineView from "./components/TimelineView";
import MissionView from "./components/MissionView";
import SnakeRobotView from "./components/SnakeRobotView";
import DonateView from "./components/DonateView";
import NewsView from "./components/NewsView";
import SatellitePlayground from "./components/SatellitePlayground";
import GroundResearchView from "./components/GroundResearchView";
import SatellitePhoto from "./components/SatellitePhoto";
import Timeline from "./components/Timeline";
import { FiRadio } from "react-icons/fi";
import { useLanguage } from "./i18n/LanguageContext";
import useMapState from "./hooks/useMapState";
import useDashboard from "./hooks/useDashboard";
import "./App.css";
import "./components/MapView.css";

function App() {
  const { t } = useLanguage();
  const panelRef = useRef(null);

  const [activeView, setActiveView] = useState("map");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(null);

  const { dashboardData } = useDashboard();

  const {
    filteredFeatures,
    features,
    activeFilters,
    searchQuery,
    setSearchQuery,
    selectedFeature,
    panelOpen,
    setPanelOpen,
    mapYear,
    showSatBg,
    setShowSatBg,
    ndviGrid,
    timeseriesData,
    changeData,
    gridYear1,
    gridYear2,
    compareYears,
    loadingTs,
    loadingChange,
    handleToggleFilter,
    handleFeatureClick,
    handleYearChange,
    handleCompare,
    handleSelectFeatureAndGoToMap,
    handleMapYearChange,
  } = useMapState(() => setActiveView("map"));

  // Escape exits fullscreen
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  return (
    <div className={`app ${isFullscreen ? "fullscreen" : ""}`}>
      <header className="app-header">
        <div className="header-left">
          <h1>{t("appTitle")}</h1>
          <p className="subtitle">{t("appSubtitle")}</p>
        </div>
        <LanguageToggle />
      </header>

      {error && <div className="error-banner">{error} <button className="error-dismiss" onClick={() => setError(null)}>✕</button></div>}

      <div className="app-shell">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <div className="app-main-content">
          {/* ===== MAP ===== */}
          <div className={`view-panel ${activeView === "map" ? "active" : ""}`}>
            <div className="map-area map-fullbleed">
              {showSatBg && (
                <SatellitePhoto bounds={[75, 36, 90, 43]} year={mapYear} band="truecolor" width={1200} className="map-sat-bg" showLabel={false} />
              )}
              <IllustratedMap features={filteredFeatures} onFeatureClick={handleFeatureClick} selectedFeature={selectedFeature} year={mapYear} ndviGrid={ndviGrid} />

              <div className="map-overlay-top">
                <SearchFilterBar activeFilters={activeFilters} onToggleFilter={handleToggleFilter} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
              </div>

              <button className={`map-sat-toggle ${showSatBg ? "active" : ""}`} onClick={() => setShowSatBg(!showSatBg)} title={showSatBg ? "Hide satellite" : "Show satellite"}>
                <FiRadio size={16} />
              </button>
              <FullscreenButton isFullscreen={isFullscreen} onToggle={() => setIsFullscreen(!isFullscreen)} />
              <MapYearSlider year={mapYear} onYearChange={handleMapYearChange} />

              <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)}>
                <div ref={panelRef}>
                  <FeatureDetails feature={selectedFeature} />
                  {selectedFeature?.geometry && (
                    <>
                      <NDVIChart data={timeseriesData} loading={loadingTs} />
                      <Legend />
                      <Timeline onYearChange={handleYearChange} onCompare={handleCompare} />
                      <NDVICompareSlider gridYear1={gridYear1} gridYear2={gridYear2} year1={compareYears?.year1} year2={compareYears?.year2} />
                      <ChangeStats data={changeData} loading={loadingChange} />
                    </>
                  )}
                  <ExportButton targetRef={panelRef} />
                </div>
              </SlidePanel>
            </div>
          </div>

          {/* ===== MONITOR ===== */}
          <div className={`view-panel ${activeView === "monitor" ? "active" : ""}`}>
            <MonitorView />
          </div>

          {/* ===== PROJECTS ===== */}
          <div className={`view-panel ${activeView === "projects" ? "active" : ""}`}>
            <ProjectsView features={features} onSelectFeature={handleSelectFeatureAndGoToMap} />
          </div>

          {/* ===== TIMELINE ===== */}
          <div className={`view-panel ${activeView === "timeline" ? "active" : ""}`}>
            <TimelineView onNavigateToProject={() => setActiveView("map")} />
          </div>

          {/* ===== MISSION ===== */}
          <div className={`view-panel ${activeView === "mission" ? "active" : ""}`}>
            <MissionView onNavigate={setActiveView} />
          </div>

          {/* ===== SNAKE ROBOT ===== */}
          <div className={`view-panel ${activeView === "snake" ? "active" : ""}`}>
            <SnakeRobotView onNavigate={setActiveView} />
          </div>

          {/* ===== SATELLITE PLAYGROUND ===== */}
          <div className={`view-panel ${activeView === "playground" ? "active" : ""}`}>
            <SatellitePlayground />
          </div>

          {/* ===== GROUND RESEARCH ===== */}
          <div className={`view-panel ${activeView === "research" ? "active" : ""}`}>
            <GroundResearchView onNavigate={setActiveView} />
          </div>

          {/* ===== DONATE ===== */}
          <div className={`view-panel ${activeView === "donate" ? "active" : ""}`}>
            <DonateView />
          </div>

          {/* ===== NEWS ===== */}
          <div className={`view-panel ${activeView === "news" ? "active" : ""}`}>
            <NewsView onNavigate={setActiveView} />
          </div>
        </div>
      </div>

      <StatusBar dashboardData={dashboardData} />
    </div>
  );
}

export default App;
