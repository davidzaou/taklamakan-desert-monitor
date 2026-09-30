"""
Microsoft Planetary Computer — Sentinel-2 satellite service.

All raster rendering is done server-side by PC's titiler (no GDAL/rasterio needed).
Only requires: pystac-client, planetary-computer, httpx (already in requirements).

API used:
  STAC search: https://planetarycomputer.microsoft.com/api/stac/v1
  Titiler:     https://planetarycomputer.microsoft.com/api/data/v1
"""

import base64
import logging
import random
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
TITILER  = "https://planetarycomputer.microsoft.com/api/data/v1"
COLLECTION = "sentinel-2-l2a"

# Simple in-memory cache: key → value
_cache: dict = {}


def _cache_key(*args) -> str:
    return "|".join(str(a) for a in args)


def _find_item(bounds: list, year: int, max_cloud: int = 30) -> Optional[object]:
    """Find the least-cloudy Sentinel-2 item for bounds during growing season."""
    key = _cache_key("item", bounds, year, max_cloud)
    if key in _cache:
        return _cache[key]

    try:
        import pystac_client
        import planetary_computer

        client = pystac_client.Client.open(
            STAC_URL,
            modifier=planetary_computer.sign_inplace,
        )
        search = client.search(
            collections=[COLLECTION],
            bbox=bounds,
            datetime=f"{year}-04-01T00:00:00Z/{year}-10-31T23:59:59Z",
            query={"eo:cloud_cover": {"lt": max_cloud}},
            max_items=20,
            sortby=["+eo:cloud_cover"],
        )
        items = list(search.items())
        item = items[0] if items else None
        _cache[key] = item
        return item
    except Exception as e:
        logger.error("STAC search error: %s", e)
        return None


def get_image_url(bounds: list, year: int, band: str = "truecolor", width: int = 600) -> Optional[str]:
    """
    Return a base64-encoded PNG data URL for the given bounds/year/band.
    All rendering is handled by PC's titiler — no local raster processing.
    """
    key = _cache_key("img", bounds, year, band, width)
    if key in _cache:
        return _cache[key]

    item = _find_item(bounds, year)
    if not item:
        logger.warning("No Sentinel-2 item found for bounds=%s year=%d", bounds, year)
        return None

    minx, miny, maxx, maxy = bounds
    height = max(1, int(width * (maxy - miny) / (maxx - minx)))
    crop_url = f"{TITILER}/item/crop/{minx},{miny},{maxx},{maxy}.png"

    if band == "ndvi":
        params = [
            ("collection", COLLECTION),
            ("item", item.id),
            ("expression", "(B08-B04)/(B08+B04)"),
            ("rescale", "-0.1,0.8"),
            ("colormap_name", "rdylgn"),
            ("width", str(width)),
            ("height", str(height)),
        ]
    elif band == "falsecolor":
        params = [
            ("collection", COLLECTION),
            ("item", item.id),
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
            ("item", item.id),
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
        resp = httpx.get(crop_url, params=params, timeout=60)
        if resp.status_code == 200 and "image" in resp.headers.get("content-type", ""):
            b64 = base64.b64encode(resp.content).decode()
            url = f"data:image/png;base64,{b64}"
            _cache[key] = url
            return url
        logger.warning("PC titiler crop returned HTTP %d: %s", resp.status_code, resp.text[:300])
    except Exception as e:
        logger.error("PC image fetch error: %s", e)

    return None


def get_stats(bounds: list, year: int) -> dict:
    """
    Compute NDVI statistics via PC titiler statistics endpoint.
    Falls back to demo data if unavailable.
    """
    key = _cache_key("stats", bounds, year)
    if key in _cache:
        return _cache[key]

    item = _find_item(bounds, year)
    if not item:
        return _demo_stats()

    minx, miny, maxx, maxy = bounds
    stats_url = f"{TITILER}/item/statistics"
    params = [
        ("collection", COLLECTION),
        ("item", item.id),
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
            b4 = (data.get("B04") or data.get("properties", {}).get("B04") or {})
            b8 = (data.get("B08") or data.get("properties", {}).get("B08") or {})
            # Handle nested statistics key
            if "statistics" in b4:
                b4 = b4["statistics"]
            if "statistics" in b8:
                b8 = b8["statistics"]

            r_mean  = float(b4.get("mean") or 0)
            nir_mean = float(b8.get("mean") or 0)
            denom = nir_mean + r_mean
            ndvi_mean = (nir_mean - r_mean) / denom if denom else 0.0

            r_pct98  = float(b4.get("percentile_98") or r_mean * 2)
            nir_pct98 = float(b8.get("percentile_98") or nir_mean * 2)
            ndvi_max  = (nir_pct98 - r_pct98) / (nir_pct98 + r_pct98 + 1e-6)

            r_pct2   = float(b4.get("percentile_2")  or 0)
            nir_pct2  = float(b8.get("percentile_2")  or 0)
            ndvi_min  = (nir_pct2 - r_pct2) / (nir_pct2 + r_pct2 + 1e-6)

            veg_pct  = min(max(ndvi_mean * 120, 5), 45)
            bare_pct = min(max(100 - veg_pct * 4, 40), 85)

            result = {
                "mean":    round(ndvi_mean, 4),
                "max":     round(ndvi_max, 4),
                "min":     round(ndvi_min, 4),
                "vegPct":  round(veg_pct, 1),
                "barePct": round(bare_pct, 1),
                "source":  "pc",
            }
            _cache[key] = result
            return result

        logger.warning("PC stats returned HTTP %d: %s", resp.status_code, resp.text[:200])
    except Exception as e:
        logger.error("PC stats error: %s", e)

    return _demo_stats()


def get_change(bounds: list, year1: int, year2: int) -> dict:
    """Compare NDVI between two years using per-year stats."""
    stats1 = get_stats(bounds, year1)
    stats2 = get_stats(bounds, year2)

    if stats1.get("source") == "demo" or stats2.get("source") == "demo":
        return _demo_change(year1, year2)

    mean1 = stats1.get("mean", 0.1)
    mean2 = stats2.get("mean", 0.1)
    mean_change = round(mean2 - mean1, 4)

    veg1 = stats1.get("vegPct", 10)
    veg2 = stats2.get("vegPct", 10)
    gained = max(0.0, round(veg2 - veg1, 1))
    lost   = max(0.0, round(veg1 - veg2, 1))
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
        "mean":    round(random.uniform(0.06, 0.22), 4),
        "max":     round(random.uniform(0.35, 0.60), 4),
        "min":     round(random.uniform(-0.05, 0.03), 4),
        "vegPct":  round(random.uniform(8, 20), 1),
        "barePct": round(random.uniform(58, 72), 1),
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
