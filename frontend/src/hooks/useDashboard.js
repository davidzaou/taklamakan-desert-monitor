import { useEffect } from "react";
import { fetchDashboard } from "../api/client";
import { prefetchSatelliteImages } from "../components/SatellitePhoto";
import useDataCache from "./useDataCache";

export default function useDashboard() {
  const { data: dashboardData, loading } = useDataCache("dashboard", fetchDashboard);

  // Prefetch satellite images once on first mount
  useEffect(() => {
    prefetchSatelliteImages();
  }, []);

  return { dashboardData, loading };
}
