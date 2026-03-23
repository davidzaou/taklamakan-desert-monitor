/**
 * Geographic shape data for the illustrated Taklamakan Desert map.
 * All coordinates are [longitude, latitude] and get projected via toSVG().
 */

// Simplified Taklamakan Desert outline (~real shape)
export const DESERT_OUTLINE = [
  [78.0, 38.8], [78.5, 39.5], [79.0, 40.0], [79.5, 40.4],
  [80.0, 40.7], [80.8, 41.0], [81.5, 41.2], [82.5, 41.3],
  [83.5, 41.2], [84.5, 41.1], [85.5, 41.0], [86.0, 40.8],
  [86.5, 40.5], [87.0, 40.2], [87.5, 39.8], [87.8, 39.3],
  [88.0, 38.8], [87.5, 38.2], [87.0, 37.8], [86.5, 37.5],
  [86.0, 37.3], [85.5, 37.2], [85.0, 37.1], [84.0, 37.0],
  [83.0, 36.9], [82.0, 36.9], [81.0, 37.0], [80.0, 37.1],
  [79.0, 37.5], [78.5, 38.0], [78.0, 38.8],
];

// Green belt segments around the desert (thicker = more established)
export const GREEN_BELT_SEGMENTS = [
  {
    id: "north_belt",
    label_en: "Northern Green Belt",
    label_zh: "北部绿化带",
    thickness: 3,
    startYear: 1995,
    maturityYear: 2018,
    points: [
      [79.0, 40.2], [79.5, 40.6], [80.0, 40.9], [80.8, 41.2],
      [81.5, 41.4], [82.5, 41.5], [83.5, 41.4], [84.5, 41.3],
      [85.5, 41.2], [86.0, 41.0], [86.5, 40.7],
    ],
  },
  {
    id: "south_belt",
    label_en: "Southern Green Belt",
    label_zh: "南部绿化带",
    thickness: 2,
    startYear: 2000,
    maturityYear: 2020,
    points: [
      [78.5, 38.2], [79.0, 37.7], [80.0, 37.3], [81.0, 37.2],
      [82.0, 37.1], [83.0, 37.1], [84.0, 37.2], [85.0, 37.3],
      [85.5, 37.4], [86.0, 37.5], [86.5, 37.7], [87.0, 38.0],
    ],
  },
  {
    id: "west_belt",
    label_en: "Western Green Belt",
    label_zh: "西部绿化带",
    thickness: 2,
    startYear: 1998,
    maturityYear: 2015,
    points: [
      [78.0, 39.0], [78.2, 39.5], [78.5, 39.8], [79.0, 40.2],
    ],
  },
  {
    id: "east_belt",
    label_en: "Eastern Green Belt",
    label_zh: "东部绿化带",
    thickness: 1.5,
    dashed: true,
    startYear: 2010,
    maturityYear: 2024,
    points: [
      [87.0, 38.0], [87.5, 38.5], [87.8, 39.0], [87.8, 39.5],
      [87.5, 40.0], [87.0, 40.4], [86.5, 40.7],
    ],
  },
];

// River courses
export const RIVERS = [
  {
    id: "tarim",
    name_en: "Tarim River",
    name_zh: "塔里木河",
    labelPos: [82.0, 41.8],
    points: [
      [76.5, 41.0], [77.5, 41.2], [78.5, 41.0], [79.5, 41.0],
      [80.5, 41.3], [81.5, 41.6], [82.5, 41.5], [83.5, 41.5],
      [84.5, 41.4], [85.5, 41.3], [86.5, 41.2], [87.0, 41.0],
      [87.5, 40.8], [88.0, 40.5],
    ],
  },
  {
    id: "hotan",
    name_en: "Hotan River",
    name_zh: "和田河",
    labelPos: [80.0, 38.5],
    points: [
      [79.5, 36.0], [79.8, 36.5], [80.0, 37.0], [80.2, 37.8],
      [80.3, 38.5], [80.5, 39.2], [80.8, 40.0], [81.0, 40.8],
    ],
  },
  {
    id: "yarkand",
    name_en: "Yarkand River",
    name_zh: "叶尔羌河",
    labelPos: [77.0, 38.0],
    points: [
      [76.0, 36.0], [76.5, 36.8], [77.0, 37.5], [77.5, 38.2],
      [78.0, 39.0], [78.5, 39.5],
    ],
  },
  {
    id: "konqi",
    name_en: "Konqi River",
    name_zh: "孔雀河",
    labelPos: [87.0, 41.5],
    points: [
      [87.0, 42.0], [86.5, 41.6], [86.0, 41.3], [85.5, 41.1],
    ],
  },
];

// Mountain ranges (drawn as ridgeline paths)
export const MOUNTAINS = [
  {
    id: "kunlun",
    name_en: "Kunlun Mountains",
    name_zh: "昆仑山脉",
    labelPos: [82.0, 36.0],
    // Each sub-array is a peak [lng, lat, height_factor]
    peaks: [
      [76.0, 36.2, 0.9], [77.0, 36.0, 1.0], [78.0, 36.3, 0.8],
      [79.0, 36.5, 1.0], [80.0, 36.5, 0.9], [81.0, 36.4, 0.7],
      [82.0, 36.3, 1.0], [83.0, 36.2, 0.8], [84.0, 36.3, 0.9],
      [85.0, 36.4, 1.0], [86.0, 36.5, 0.7], [87.0, 36.8, 0.8],
      [88.0, 37.0, 0.6],
    ],
  },
  {
    id: "tianshan",
    name_en: "Tianshan Mountains",
    name_zh: "天山山脉",
    labelPos: [82.0, 42.8],
    peaks: [
      [76.0, 42.5, 0.8], [77.0, 42.3, 1.0], [78.0, 42.5, 0.9],
      [79.0, 42.3, 0.7], [80.0, 42.2, 1.0], [81.0, 42.3, 0.8],
      [82.0, 42.5, 1.0], [83.0, 42.3, 0.9], [84.0, 42.2, 0.7],
      [85.0, 42.3, 1.0], [86.0, 42.5, 0.8], [87.0, 42.3, 0.9],
      [88.0, 42.2, 0.7], [89.0, 42.5, 0.8],
    ],
  },
];

// Bosten Lake
export const LAKES = [
  {
    id: "bosten",
    name_en: "Bosten Lake",
    name_zh: "博斯腾湖",
    center: [87.0, 42.0],
    rx: 0.6,
    ry: 0.3,
  },
];

// Desert Highway
export const HIGHWAYS = [
  {
    id: "tarim_highway",
    name_en: "Tarim Desert Highway",
    name_zh: "塔里木沙漠公路",
    points: [
      [83.6, 41.2], [83.6, 40.5], [83.5, 39.8], [83.5, 39.0],
      [83.6, 38.2], [83.7, 37.5], [83.8, 37.0],
    ],
  },
];

// Projection: convert [lng, lat] to SVG [x, y]
export const MAP_BOUNDS = { minLng: 75, maxLng: 90, minLat: 35.5, maxLat: 43 };
const SVG_WIDTH = 1200;
const SVG_HEIGHT = 800;

export function toSVG(lng, lat) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * SVG_WIDTH;
  const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * SVG_HEIGHT;
  return [x, y];
}

export function pointsToPath(points, closed = false) {
  return points
    .map((p, i) => {
      const [x, y] = toSVG(p[0], p[1]);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ") + (closed ? " Z" : "");
}

export function pointsToSmoothPath(points) {
  if (points.length < 2) return "";
  const svgPoints = points.map((p) => toSVG(p[0], p[1]));
  let d = `M${svgPoints[0][0].toFixed(1)},${svgPoints[0][1].toFixed(1)}`;
  for (let i = 1; i < svgPoints.length; i++) {
    const prev = svgPoints[i - 1];
    const curr = svgPoints[i];
    const cpx = (prev[0] + curr[0]) / 2;
    const cpy = (prev[1] + curr[1]) / 2;
    d += ` Q${prev[0].toFixed(1)},${prev[1].toFixed(1)} ${cpx.toFixed(1)},${cpy.toFixed(1)}`;
  }
  const last = svgPoints[svgPoints.length - 1];
  d += ` L${last[0].toFixed(1)},${last[1].toFixed(1)}`;
  return d;
}
