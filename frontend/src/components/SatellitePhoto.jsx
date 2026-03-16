import { useState, useEffect, useRef } from "react";
import "./SatellitePhoto.css";

const API = import.meta.env.DEV ? "http://localhost:8001/api" : "/api";

// In-memory cache: "bounds|year|band" → url
const _cache = {};
function cacheKey(bounds, year, band) { return `${bounds.join(",")}|${year}|${band}`; }

/**
 * Fetches and displays a real Sentinel-2 satellite photo from GEE.
 * Falls back to a gradient placeholder when GEE is unavailable.
 *
 * Props:
 *  - bounds: [minLng, minLat, maxLng, maxLat]
 *  - year: number
 *  - band: "ndvi" | "truecolor" | "falsecolor"
 *  - width: pixel width for the thumbnail (default 600)
 *  - className: optional CSS class
 *  - style: optional inline styles
 *  - showLabel: show year/source label overlay (default true)
 */
export default function SatellitePhoto({ bounds, year, band = "truecolor", width = 600, className = "", style = {}, showLabel = true }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const key = cacheKey(bounds, year, band);
    if (_cache[key]) {
      setUrl(_cache[key]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    setImgLoaded(false);

    fetch(`${API}/satellite/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bounds, year, band, width }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.url) {
          _cache[key] = data.url;
          setUrl(data.url);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [bounds, year, band, width]);

  return (
    <div className={`sat-photo ${className}`} style={style}>
      {loading && (
        <div className="sat-photo-skeleton">
          <div className="sat-photo-pulse" />
          <span>Loading satellite image...</span>
        </div>
      )}
      {error && !loading && (
        <div className="sat-photo-placeholder">
          <span>Satellite image unavailable</span>
        </div>
      )}
      {url && !error && (
        <img
          src={url}
          alt={`Sentinel-2 ${band} composite ${year}`}
          className={`sat-photo-img ${imgLoaded ? "loaded" : ""}`}
          onLoad={() => setImgLoaded(true)}
          onError={() => setError(true)}
        />
      )}
      {showLabel && imgLoaded && (
        <div className="sat-photo-label">
          <span>{year}</span>
          <span className="sat-photo-src">Sentinel-2</span>
        </div>
      )}
    </div>
  );
}

/**
 * Before/After satellite comparison slider.
 * Uses react-compare-slider for the drag interaction.
 */
export function SatelliteBeforeAfter({ bounds, yearBefore, yearAfter, band = "truecolor", width = 800 }) {
  const [urlBefore, setUrlBefore] = useState(null);
  const [urlAfter, setUrlAfter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  useEffect(() => {
    setLoading(true);
    const fetchOne = (yr) => {
      const key = cacheKey(bounds, yr, band);
      if (_cache[key]) return Promise.resolve(_cache[key]);
      return fetch(`${API}/satellite/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bounds, year: yr, band, width }),
      }).then(r => r.json()).then(d => { if (d.url) { _cache[key] = d.url; return d.url; } return null; });
    };

    Promise.all([fetchOne(yearBefore), fetchOne(yearAfter)]).then(([b, a]) => {
      setUrlBefore(b);
      setUrlAfter(a);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bounds, yearBefore, yearAfter, band, width]);

  const handleMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    setSliderPos(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  };

  const handleDown = () => { dragging.current = true; };
  const handleUp = () => { dragging.current = false; };

  return (
    <div className="sat-ba-container">
      {loading && (
        <div className="sat-ba-loading">
          <div className="sat-ba-pulse" />
          <span>Loading satellite imagery...</span>
        </div>
      )}
      {!loading && urlBefore && urlAfter && (
        <div
          className="sat-ba-slider"
          ref={containerRef}
          onMouseMove={e => dragging.current && handleMove(e)}
          onTouchMove={handleMove}
          onMouseDown={(e) => { handleDown(); handleMove(e); }}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
          onTouchStart={(e) => { handleDown(); handleMove(e); }}
          onTouchEnd={handleUp}
        >
          {/* After image (full) */}
          <img src={urlAfter} alt={`${yearAfter}`} className="sat-ba-img" />
          {/* Before image (clipped) */}
          <div className="sat-ba-before" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
            <img src={urlBefore} alt={`${yearBefore}`} className="sat-ba-img" />
          </div>
          {/* Slider line */}
          <div className="sat-ba-line" style={{ left: `${sliderPos}%` }}>
            <div className="sat-ba-handle">⟨ ⟩</div>
          </div>
          {/* Year labels */}
          <div className="sat-ba-label-left">{yearBefore}</div>
          <div className="sat-ba-label-right">{yearAfter}</div>
        </div>
      )}
      {!loading && (!urlBefore || !urlAfter) && (
        <div className="sat-ba-fallback">
          <span>Satellite comparison unavailable — connect GEE for real imagery</span>
        </div>
      )}
    </div>
  );
}

/**
 * Pre-fetch common satellite thumbnails in the background.
 * Call once on app mount.
 */
export function prefetchSatelliteImages() {
  const currentYear = new Date().getFullYear();
  const presets = [
    { bounds: [79.5, 36.8, 80.5, 37.5], year: currentYear, band: "truecolor" },
    { bounds: [79.5, 36.8, 80.5, 37.5], year: 2017, band: "truecolor" },
    { bounds: [79.5, 36.8, 80.5, 37.5], year: currentYear, band: "ndvi" },
  ];
  for (const p of presets) {
    const key = cacheKey(p.bounds, p.year, p.band);
    if (_cache[key]) continue;
    fetch(`${API}/satellite/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, width: 800 }),
    }).then(r => r.json()).then(d => { if (d.url) _cache[key] = d.url; }).catch(() => {});
  }
}
