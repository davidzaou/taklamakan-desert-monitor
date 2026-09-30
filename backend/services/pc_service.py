"""
Microsoft Planetary Computer — Sentinel-2 satellite service.

Uses only httpx (already in requirements) — no pystac-client or rasterio needed.
- STAC search via direct HTTP POST to the PC STAC API
- Image rendering via PC's hosted titiler (handles signing internally)
"""

import base64
import logging
import random
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

STAC_SEARCH = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
TITILER     = "https://planetarycomputer.microsoft.com/api/data/v1"
COLLECTION  = "sentinel-2-l2a"

# Simple in-memory cache to avoid redundant network calls
_cache: dict = {}


def _cache_key(*args) -> str:
    return "|".join(str(a) for a in args)


def _find_item(bounds: list, year: int, max_cloud: int = 50) -> Optional[dict]:
    """Search PC STAC API for the least-cloudy Sentinel-2 item during growing season."""
    key = _cache_key("item", tuple(bounds), year)
    if key in _cache:
        return _cache[key]

    try:
        resp = httpx.post(
            STAC_SEARCH,
            json={
                "collections": [COLLECTION],
                "bbox": bounds,
                "datetime": f"{year}-04-01T00:00:00Z/{year}-10-31T23:59:59Z",
                "query": {"eo:cloud_cover": {"lt": max_cloud}},
                "limit": 10,
                "sortby": [{"field": "eo:cloud_cover", "direction": "asc"}],
            },
            timeout=30,
        )
        if resp.status_code == 200:
            features = resp.json().get("features", [])
            if features:
                item = features[0]
                logger.info(
                    "Found Sentinel-2 item %s (cloud=%.1f%%) for year=%d",
                    item["id"],
                    item.get("properties", {}).get("eo:cloud_cover", 0),
                    year,
                )
                _cache[key] = item
                return item
            logger.warning("No Sentinel-2 items found for bounds=%s year=%d cloud<%d%%", bounds, year, max_cloud)
        else:
            logger.error("STAC search HTTP %d: %s", resp.status_code, resp.text[:200])
    except Exception as e:
        logger.error("STAC search error: %s", e)

    _cache[key] = None
    return None


def get_image_url(bounds: list, year: int, band: str = "truecolor", width: int = 600) -> Optional[str]:
    """
    Return a base64-encoded PNG data URL.
    PC's titiler handles all COG fetching and signing internally.
    """
    key = _cache_key("img", tuple(bounds), year, band, width)
    if key in _cache:
        return _cache[key]

    item = _find_item(bounds, year)
    if not item:
        return None

    item_id = item["id"]
    minx, miny, maxx, maxy = bounds
    height = max(1, int(width * (maxy - miny) / (maxx - minx)))
    crop_url = f"{TITILER}/item/crop/{minx},{miny},{maxx},{maxy}.png"

    if band == "ndvi":
        params = [
            ("collection", COLLECTION),
            ("item", item_id),
            ("expression", "(B08-B04)/(B08+B04)"),
            ("rescale", "-0.1,0.8"),
            ("colormap_name", "rdylgn"),
            ("width", str(width)),
            ("height", str(height)),
        ]
    elif band == "falsecolor":
        params = [
            ("collection", COLLECTION),
            ("item", item_id),
            ("assets", "B08"),
            ("assets", "B04"),
            ("assets", "B03"),
            ("rescale", "0,3000"),
            ("rescale", "0,3000"),
            ("rescale", "0,3000"),
            ("width", str(width)),
            ("height", str(height)),
        ]
    else:  # truecolor
        params = [
            ("collection", COLLECTION),
            ("item", item_id),
            ("assets", "B04"),
            ("assets", "B03"),
            ("assets", "B02"),
            ("rescale", "0,2000"),
            ("rescale", "0,2000"),
            ("rescale", "0,2000"),
            ("width", str(width)),
            ("height", str(height)),
        ]

    try:
        logger.info("Requesting titiler crop: item=%s band=%s", item_id, band)
        resp = httpx.get(crop_url, params=params, timeout=60)
        ct = resp.headers.get("content-type", "")
        if resp.status_code == 200 and "image" in ct:
            b64 = base64.b64encode(resp.content).decode()
            url = f"data:image/png;base64,{b64}"
            _cache[key] = url
            logger.info("Titiler image OK: %d bytes, band=%s", len(resp.content), band)
            return url
        logger.warning("Titiler crop HTTP %d (ct=%s): %s", resp.status_code, ct, resp.text[:300])
    except Exception as e:
        logger.error("Titiler image error: %s", e)

    return None


def get_stats(bounds: list, year: int) -> dict:
    """Fetch NDVI statistics from the PC titiler statistics endpoint."""
    key = _cache_key("stats", tuple(bounds), year)
    if key in _cache:
        return _cache[key]

    item = _find_item(bounds, year)
    if not item:
        return _demo_stats()

    item_id = item["id"]
    minx, miny, maxx, maxy = bounds
    stats_url = f"{TITILER}/item/statistics"
    params = [
        ("collection", COLLECTION),
        ("item", item_id),
        ("assets", "B04"),
        ("assets", "B08"),
        ("coord_crs", "EPSG:4326"),
        ("bbox", f"{minx},{miny},{maxx},{maxy}"),
        ("max_size", "256"),
    ]

    try:
        resp = httpx.get(stats_url, params=params, timeout=60)
        if resp.status_code == 200:
            data = resp.json()
            b4 = data.get("B04") or {}
            b8 = data.get("B08") or {}
            if "statistics" in b4:
                b4 = b4["statistics"]
            if "statistics" in b8:
                b8 = b8["statistics"]

            r_mean   = float(b4.get("mean") or 0)
            nir_mean = float(b8.get("mean") or 0)
            denom = nir_mean + r_mean
            ndvi_mean = (nir_mean - r_mean) / denom if denom else 0.0

            r98  = float(b4.get("percentile_98") or r_mean * 1.5)
            n98  = float(b8.get("percentile_98") or nir_mean * 1.5)
            ndvi_max = (n98 - r98) / (n98 + r98 + 1e-6)

            r2   = float(b4.get("percentile_2") or 0)
            n2   = float(b8.get("percentile_2") or 0)
            ndvi_min = (n2 - r2) / (n2 + r2 + 1e-6)

            veg_pct  = min(max(ndvi_mean * 120, 3), 40)
            bare_pct = min(max(100 - veg_pct * 4, 40), 90)

            result = {
                "mean":    round(ndvi_mean, 4),
                "max":     round(ndvi_max,  4),
                "min":     round(ndvi_min,  4),
                "vegPct":  round(veg_pct,   1),
                "barePct": round(bare_pct,  1),
                "source":  "pc",
            }
            _cache[key] = result
            return result
        logger.warning("Stats HTTP %d: %s", resp.status_code, resp.text[:200])
    except Exception as e:
        logger.error("Stats error: %s", e)

    return _demo_stats()


def get_change(bounds: list, year1: int, year2: int) -> dict:
    """Compare NDVI between two years."""
    s1 = get_stats(bounds, year1)
    s2 = get_stats(bounds, year2)

    if s1.get("source") == "demo" or s2.get("source") == "demo":
        return _demo_change(year1, year2)

    mean_change = round(s2["mean"] - s1["mean"], 4)
    gained = max(0.0, round(s2["vegPct"] - s1["vegPct"], 1))
    lost   = max(0.0, round(s1["vegPct"] - s2["vegPct"], 1))
    stable = round(max(0.0, 100 - gained - lost), 1)

    return {
        "gainedPct":  gained,
        "stablePct":  stable,
        "lostPct":    lost,
        "meanChange": mean_change,
        "source":     "pc",
    }


# ── Fallback demo data ────────────────────────────

def _demo_stats() -> dict:
    return {
        "mean":    round(random.uniform(0.06, 0.18), 4),
        "max":     round(random.uniform(0.30, 0.55), 4),
        "min":     round(random.uniform(-0.05, 0.03), 4),
        "vegPct":  round(random.uniform(6, 18), 1),
        "barePct": round(random.uniform(60, 75), 1),
        "source":  "demo",
    }


def _demo_change(year1: int, year2: int) -> dict:
    diff = max(1, year2 - year1)
    gained = round(random.uniform(1.5, 5.0) * (diff / 6), 1)
    lost   = round(random.uniform(0.5, 2.5), 1)
    return {
        "gainedPct":  gained,
        "stablePct":  round(max(0.0, 100 - gained - lost), 1),
        "lostPct":    lost,
        "meanChange": round(random.uniform(0.003, 0.018) * (diff / 6), 4),
        "source":     "demo",
    }
