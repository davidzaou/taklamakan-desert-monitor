import { useLanguage } from "../i18n/LanguageContext";
import { FiDownload, FiFileText } from "react-icons/fi";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { exportTimeseriesCSV } from "../utils/exportCSV";

export default function ExportButton({ targetRef, timeseriesData }) {
  const { t } = useLanguage();

  async function handleExportPNG() {
    if (!targetRef?.current) return;
    const canvas = await html2canvas(targetRef.current, {
      backgroundColor: "#1a1a2e",
      scale: 2,
    });
    const link = document.createElement("a");
    link.download = "taklimakan-analysis.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function handleExportPDF() {
    if (!targetRef?.current) return;
    const canvas = await html2canvas(targetRef.current, {
      backgroundColor: "#1a1a2e",
      scale: 2,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.setFontSize(16);
    pdf.text("Taklimakan Desert Monitor - Analysis Report", 10, 15);
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 10, 22);
    pdf.addImage(imgData, "PNG", 10, 28, imgWidth, imgHeight);
    pdf.save("taklimakan-analysis.pdf");
  }

  function handleExportCSV() {
    if (!timeseriesData || !timeseriesData.length) return;
    exportTimeseriesCSV(timeseriesData);
  }

  return (
    <div className="export-buttons">
      <button className="export-btn" onClick={handleExportPNG}>
        <FiDownload size={14} />
        {t("exportPNG")}
      </button>
      <button className="export-btn" onClick={handleExportPDF}>
        <FiDownload size={14} />
        {t("exportPDF")}
      </button>
      {timeseriesData && timeseriesData.length > 0 && (
        <button className="export-btn" onClick={handleExportCSV}>
          <FiFileText size={14} />
          {t("exportCSV")}
        </button>
      )}
    </div>
  );
}
