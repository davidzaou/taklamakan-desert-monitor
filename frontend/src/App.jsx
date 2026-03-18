import { useState, useEffect, useRef, Suspense, lazy } from "react";
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
import Spinner from "./components/Spinner";
import SatellitePhoto from "./components/SatellitePhoto";
import Timeline from "./components/Timeline";
import { FiRadio } from "react-icons/fi";
import { useLanguage } from "./i18n/LanguageContext";
import { fetchDataSource } from "./api/client";
import useMapState from "./hooks/useMapState";
import useDashboard from "./hooks/useDashboard";
import "./App.css";
import "./components/MapView.css";

const MonitorView = lazy(() => import("./components/MonitorView"));
const ProjectsView = lazy(() => import("./components/ProjectsView"));
const TimelineView = lazy(() => import("./components/TimelineView"));
const MissionView = lazy(() => import("./components/MissionView"));
const SnakeRobotView = lazy(() => import("./components/SnakeRobotView"));
const DonateView = lazy(() => import("./components/DonateView"));
const NewsView = lazy(() => import("./components/NewsView"));
const SatellitePlayground = lazy(() => import("./components/SatellitePlayground"));
const GroundResearchView = lazy(() => import("./components/GroundResearchView"));

function App() {
  const { t } = useLanguage();
  const panelRef = useRef(null);

  const [activeView, setActiveView] = useState("home");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState(null);

  const { dashboardData } = useDashboard();

  useEffect(() => {
    fetchDataSource().then(setDataSource).catch(() => {});
  }, []);

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
    error: mapError,
    setError: setMapError,
    handleToggleFilter,
    handleFeatureClick,
    handleYearChange,
    handleCompare,
    handleSelectFeatureAndGoToMap,
    handleMapYearChange,
  } = useMapState(() => setActiveView("map"));

  // Merge map errors into app error state
  useEffect(() => {
    if (mapError) {
      setError(mapError);
      setMapError(null);
    }
  }, [mapError, setMapError]);

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
          <div className="header-title-row">
            <h1>{t("appTitle")}</h1>
            <span className="header-breadcrumb-sep">/</span>
            <span className="header-breadcrumb-page">{t(`view${activeView.charAt(0).toUpperCase() + activeView.slice(1)}`)}</span>
          </div>
          <p className="subtitle">{t("appSubtitle")}</p>
        </div>
        <div className="header-right">
          <div className={`header-source-badge ${dataSource?.source === "gee" ? "live" : "demo"}`}>
            <span className="header-source-dot" />
            {dataSource?.source === "gee" ? "LIVE" : "Demo"}
          </div>
          <LanguageToggle />
        </div>
      </header>

      {error && <div className="error-banner" role="alert">{error} <button className="error-dismiss" onClick={() => setError(null)} aria-label="Dismiss error">✕</button></div>}

      <div className="app-shell">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <main className="app-main-content">
          {/* ===== MAP (always rendered, hidden via CSS to preserve state) ===== */}
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
                  <ExportButton targetRef={panelRef} timeseriesData={timeseriesData} />
                </div>
              </SlidePanel>
            </div>
          </div>

          {/* ===== MONITOR ===== */}
          {activeView === "monitor" && (
            <div className="view-panel active">
              <Suspense fallback={<Spinner />}>
                <MonitorView />
              </Suspense>
            </div>
          )}

          {/* ===== PROJECTS ===== */}
          {activeView === "projects" && (
            <div className="view-panel active">
              <Suspense fallback={<Spinner />}>
                <ProjectsView features={features} onSelectFeature={handleSelectFeatureAndGoToMap} />
              </Suspense>
            </div>
          )}

          {/* ===== TIMELINE ===== */}
          {activeView === "timeline" && (
            <div className="view-panel active">
              <Suspense fallback={<Spinner />}>
                <TimelineView onNavigateToProject={() => setActiveView("map")} />
              </Suspense>
            </div>
          )}

          {/* ===== HOME ===== */}
          {activeView === "home" && (
            <div className="view-panel active">
              <Suspense fallback={<Spinner />}>
                <MissionView onNavigate={setActiveView} />
              </Suspense>
            </div>
          )}

          {/* ===== SNAKE ROBOT ===== */}
          {activeView === "snake" && (
            <div className="view-panel active">
              <Suspense fallback={<Spinner />}>
                <SnakeRobotView onNavigate={setActiveView} />
              </Suspense>
            </div>
          )}

          {/* ===== SATELLITE PLAYGROUND ===== */}
          {activeView === "playground" && (
            <div className="view-panel active">
              <Suspense fallback={<Spinner />}>
                <SatellitePlayground />
              </Suspense>
            </div>
          )}

          {/* ===== GROUND RESEARCH ===== */}
          {activeView === "research" && (
            <div className="view-panel active">
              <Suspense fallback={<Spinner />}>
                <GroundResearchView onNavigate={setActiveView} />
              </Suspense>
            </div>
          )}

          {/* ===== DONATE ===== */}
          {activeView === "donate" && (
            <div className="view-panel active">
              <Suspense fallback={<Spinner />}>
                <DonateView />
              </Suspense>
            </div>
          )}

          {/* ===== NEWS ===== */}
          {activeView === "news" && (
            <div className="view-panel active">
              <Suspense fallback={<Spinner />}>
                <NewsView onNavigate={setActiveView} />
              </Suspense>
            </div>
          )}
        </main>
      </div>

      <StatusBar dashboardData={dashboardData} />
    </div>
  );
}

export default App;
