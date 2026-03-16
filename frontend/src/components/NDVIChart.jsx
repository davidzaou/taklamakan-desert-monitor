import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useLanguage } from "../i18n/LanguageContext";
import SkeletonCard from "./SkeletonCard";

export default function NDVIChart({ data, loading }) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="chart-container">
        <h3>{t("vegetationTrend")}</h3>
        <SkeletonCard variant="chart" height={220} />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div className="chart-container">
      <h3>{t("vegetationTrend")}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
          <XAxis dataKey="year" stroke="#666" />
          <YAxis
            domain={[0, 0.5]}
            stroke="#666"
            label={{
              value: "NDVI",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#666" },
            }}
          />
          <Tooltip
            formatter={(value) => [value?.toFixed(4), t("meanNDVI")]}
            contentStyle={{
              backgroundColor: "#1a1a2e",
              border: "1px solid #333",
              borderRadius: "8px",
              color: "#e0e0e0",
            }}
          />
          <ReferenceLine
            y={0.2}
            stroke="#fc8d59"
            strokeDasharray="5 5"
            label={{ value: t("sparse"), fill: "#fc8d59", fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="mean_ndvi"
            stroke="#1a9850"
            strokeWidth={3}
            dot={{ fill: "#1a9850", r: 4 }}
            activeDot={{ r: 6, fill: "#91cf60" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
