import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Tooltip,
  CircleMarker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { createCategoryIcon } from "./MapMarkerIcons";

const TAKLAMAKAN_CENTER = [39.0, 83.0];
const TAKLAMAKAN_BOUNDS = [
  [35, 74],
  [44, 91],
];

function ndviToColor(ndvi) {
  if (ndvi < 0.1) return "#d73027";
  if (ndvi < 0.2) return "#fc8d59";
  if (ndvi < 0.3) return "#fee08b";
  if (ndvi < 0.4) return "#d9ef8b";
  if (ndvi < 0.6) return "#91cf60";
  return "#1a9850";
}

function getCategoryFill(category) {
  const colors = {
    vegetation: "rgba(26, 152, 80, 0.15)",
    project: "rgba(224, 123, 57, 0.15)",
    desert: "rgba(232, 168, 56, 0.08)",
  };
  return colors[category] || "transparent";
}

function getCategoryStroke(category) {
  const colors = {
    vegetation: "#1a9850",
    project: "#e07b39",
    desert: "#e8a838",
  };
  return colors[category] || "#4a90d9";
}

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
    }
  }, [bounds, map]);
  return null;
}

function NDVIGrid({ gridData }) {
  if (!gridData || gridData.length === 0) return null;
  return (
    <>
      {gridData.map((point, i) => (
        <CircleMarker
          key={i}
          center={[point.lat, point.lng]}
          radius={4}
          pathOptions={{
            color: "transparent",
            fillColor: ndviToColor(point.ndvi),
            fillOpacity: 0.6,
          }}
        >
          <Tooltip>NDVI: {point.ndvi.toFixed(3)}</Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

export default function MapView({ features, onFeatureClick, gridData, selectedFeature }) {
  let fitBounds = null;
  if (selectedFeature?.geometry) {
    const coords = selectedFeature.geometry.coordinates[0];
    const lats = coords.map((c) => c[1]);
    const lngs = coords.map((c) => c[0]);
    fitBounds = [
      [Math.min(...lats) - 0.3, Math.min(...lngs) - 0.3],
      [Math.max(...lats) + 0.3, Math.max(...lngs) + 0.3],
    ];
  }

  return (
    <MapContainer
      center={TAKLAMAKAN_CENTER}
      zoom={7}
      minZoom={6}
      maxZoom={14}
      maxBounds={TAKLAMAKAN_BOUNDS}
      maxBoundsViscosity={1.0}
      className="leaflet-map"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {fitBounds && <FitBounds bounds={fitBounds} />}

      {/* Feature polygons */}
      {features
        .filter((f) => f.geometry)
        .map((f) => (
          <GeoJSON
            key={f.id}
            data={{ type: "Feature", geometry: f.geometry, properties: {} }}
            style={{
              color: getCategoryStroke(f.category),
              weight: selectedFeature?.id === f.id ? 3 : 1.5,
              fillColor: getCategoryFill(f.category),
              fillOpacity: 1,
              dashArray: selectedFeature?.id === f.id ? "" : "4 4",
            }}
            eventHandlers={{ click: () => onFeatureClick(f) }}
          />
        ))}

      {/* Feature markers */}
      {features.map((f) => (
        <Marker
          key={f.id}
          position={[f.lat, f.lng]}
          icon={createCategoryIcon(f.category)}
          eventHandlers={{ click: () => onFeatureClick(f) }}
        >
          <Tooltip direction="top" offset={[0, -30]}>
            {f.name_en}
          </Tooltip>
        </Marker>
      ))}

      <NDVIGrid gridData={gridData} />
    </MapContainer>
  );
}
