/**
 * Pure JS CSV export utility — no external dependencies.
 * Converts an array of objects to a CSV file and triggers download.
 */

function escapeCSV(value) {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * @param {Object[]} data - Array of objects to export
 * @param {string} filename - Download filename (without .csv)
 * @param {string[]} [columns] - Optional column order; defaults to keys of first row
 */
export function exportCSV(data, filename, columns) {
  if (!data || !data.length) return;

  const cols = columns || Object.keys(data[0]);
  const header = cols.map(escapeCSV).join(",");
  const rows = data.map(row =>
    cols.map(col => escapeCSV(row[col])).join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export timeseries data as CSV
 * @param {Object[]} timeseries - [{year, mean_ndvi}, ...]
 * @param {string} [filename] - Default "taklimakan-timeseries"
 */
export function exportTimeseriesCSV(timeseries, filename = "taklimakan-timeseries") {
  exportCSV(timeseries, filename, ["year", "mean_ndvi"]);
}

/**
 * Export NDVI grid data as CSV
 * @param {Object[]} grid - [{lat, lng, ndvi}, ...]
 * @param {string} [filename] - Default "taklimakan-ndvi-grid"
 */
export function exportGridCSV(grid, filename = "taklimakan-ndvi-grid") {
  exportCSV(grid, filename, ["lat", "lng", "ndvi"]);
}
