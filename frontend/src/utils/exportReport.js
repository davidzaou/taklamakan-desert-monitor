import { jsPDF } from "jspdf";

/**
 * Generate a branded A4 PDF report for Taklamakan Desert Monitor.
 *
 * @param {Object} opts
 * @param {string} opts.region - Region name (e.g. "Hotan Green Belt")
 * @param {number} opts.yearA - Start year
 * @param {number} opts.yearB - End year
 * @param {Object} [opts.stats] - { mean_change, area_improved_pct, area_degraded_pct }
 * @param {Object[]} [opts.timeseries] - [{year, mean_ndvi}, ...]
 * @param {Object} [opts.regionStats] - { mean, max, min, vegPct, barePct, count }
 */
export function exportReport({ region, yearA, yearB, stats, timeseries, regionStats }) {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // ── Title page ──
  pdf.setFillColor(13, 17, 23);
  pdf.rect(0, 0, pageW, 60, "F");

  pdf.setTextColor(145, 207, 96);
  pdf.setFontSize(22);
  pdf.text("Taklamakan Desert Monitor", margin, y + 16);

  pdf.setFontSize(12);
  pdf.setTextColor(138, 154, 170);
  pdf.text("NDVI Analysis Report", margin, y + 26);

  pdf.setFontSize(10);
  pdf.setTextColor(200, 200, 200);
  pdf.text(`Region: ${region}`, margin, y + 38);
  pdf.text(`Period: ${yearA} \u2013 ${yearB}`, margin, y + 45);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y + 52);

  y = 72;

  // ── Summary stats table ──
  pdf.setTextColor(60, 60, 60);
  pdf.setFontSize(14);
  pdf.text("Summary Statistics", margin, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);

  const tableData = [];

  if (regionStats) {
    tableData.push(
      ["Mean NDVI", regionStats.mean?.toFixed(4) ?? "N/A"],
      ["Peak NDVI", regionStats.max?.toFixed(4) ?? "N/A"],
      ["Min NDVI", regionStats.min?.toFixed(4) ?? "N/A"],
      ["Vegetated %", `${regionStats.vegPct ?? "N/A"}%`],
      ["Bare %", `${regionStats.barePct ?? "N/A"}%`],
      ["Data Points", String(regionStats.count ?? "N/A")],
    );
  }

  if (stats) {
    tableData.push(
      ["Mean NDVI Change", `${stats.mean_change >= 0 ? "+" : ""}${stats.mean_change?.toFixed(4) ?? "N/A"}`],
      ["Area Improved", `${stats.area_improved_pct ?? "N/A"}%`],
      ["Area Degraded", `${stats.area_degraded_pct ?? "N/A"}%`],
    );
  }

  if (tableData.length === 0) {
    tableData.push(["No statistics available", ""]);
  }

  // Draw simple table
  const colW1 = 60;
  const rowH = 7;

  for (const [label, value] of tableData) {
    pdf.setTextColor(100, 100, 100);
    pdf.text(label, margin, y);
    pdf.setTextColor(40, 40, 40);
    pdf.setFont(undefined, "bold");
    pdf.text(value, margin + colW1, y);
    pdf.setFont(undefined, "normal");
    y += rowH;
  }

  y += 10;

  // ── Bar chart from timeseries ──
  if (timeseries && timeseries.length > 0) {
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(14);
    pdf.text("NDVI Trend Over Time", margin, y);
    y += 8;

    // Render bar chart on offscreen canvas
    const chartW = 500;
    const chartH = 200;
    const canvas = document.createElement("canvas");
    canvas.width = chartW;
    canvas.height = chartH;
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#f8f8f8";
    ctx.fillRect(0, 0, chartW, chartH);

    const maxNdvi = Math.max(...timeseries.map(d => d.mean_ndvi || 0), 0.5);
    const barPad = 8;
    const barAreaW = chartW - 60;
    const barW = Math.max(8, (barAreaW / timeseries.length) - barPad);
    const startX = 50;

    // Grid lines
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const gy = chartH - 30 - ((chartH - 50) * (i / 4));
      ctx.beginPath();
      ctx.moveTo(startX - 5, gy);
      ctx.lineTo(chartW - 10, gy);
      ctx.stroke();
      ctx.fillStyle = "#888";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText((maxNdvi * i / 4).toFixed(2), startX - 8, gy + 3);
    }

    // Bars
    timeseries.forEach((d, i) => {
      const v = d.mean_ndvi || 0;
      const h = (v / maxNdvi) * (chartH - 50);
      const x = startX + i * (barW + barPad);
      const barY = chartH - 30 - h;

      // Color based on NDVI value
      if (v < 0.15) ctx.fillStyle = "#d73027";
      else if (v < 0.25) ctx.fillStyle = "#fc8d59";
      else if (v < 0.35) ctx.fillStyle = "#91cf60";
      else ctx.fillStyle = "#1a9850";

      ctx.fillRect(x, barY, barW, h);

      // Year label
      ctx.fillStyle = "#666";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(d.year).slice(-2), x + barW / 2, chartH - 16);
    });

    // Embed chart into PDF
    const imgData = canvas.toDataURL("image/png");
    const imgW = pageW - margin * 2;
    const imgH = imgW * (chartH / chartW);
    pdf.addImage(imgData, "PNG", margin, y, imgW, imgH);
    y += imgH + 8;
  }

  // ── Footer ──
  y = pdf.internal.pageSize.getHeight() - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text("Taklamakan Desert Monitor \u2022 Data: Sentinel-2 via Google Earth Engine", margin, y);
  pdf.text("Generated by Guarding the Green Wall Project", pageW - margin, y, { align: "right" });

  pdf.save(`taklamakan-report-${region.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
