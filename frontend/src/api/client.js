const API_BASE = import.meta.env.DEV ? "http://localhost:8001/api" : "/api";

export async function fetchPresets() {
  const res = await fetch(`${API_BASE}/presets`);
  return res.json();
}

export async function fetchTimeseries(geometry, startYear = 2015, endYear = new Date().getFullYear()) {
  const res = await fetch(`${API_BASE}/timeseries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      geometry,
      start_year: startYear,
      end_year: endYear,
    }),
  });
  return res.json();
}

export async function fetchAnalysis(geometry, year1, year2) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ geometry, year1, year2 }),
  });
  return res.json();
}

export async function fetchGrid(geometry, year, resolution = 40) {
  const res = await fetch(`${API_BASE}/grid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ geometry, year, resolution }),
  });
  return res.json();
}

export async function fetchFeatures(category = null, search = null) {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (search) params.append("search", search);
  const res = await fetch(`${API_BASE}/features?${params}`);
  return res.json();
}

export async function fetchFeatureById(id) {
  const res = await fetch(`${API_BASE}/features/${id}`);
  return res.json();
}

export async function fetchDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`);
  return res.json();
}

export async function fetchRegionalDashboard() {
  const res = await fetch(`${API_BASE}/dashboard/regional`);
  return res.json();
}

export async function fetchDataSource() {
  const res = await fetch(`${API_BASE}/data-source`);
  return res.json();
}

export async function fetchNdviGridCache() {
  const res = await fetch(`${API_BASE}/ndvi-grid-cache`);
  return res.json();
}
