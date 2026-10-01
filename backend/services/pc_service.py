"""
NASA GIBS (Global Imagery Browse Services) — satellite imagery service.

Completely free, no authentication required, works immediately.
Data: MODIS Terra (250m resolution), daily data back to 2000.
API: Standard OGC WMS — simple HTTP GET, returns PNG directly.

Docs: https://nasa-gibs.github.io/gibs-api-docs/
"""

import base64
import logging
import math
import random
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

WMS_URL  = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1/search"

# Simple in-memory cache
_cache: dict = {}


# ── GIBS imagery ────────────────────────────────

# Map band name → GIBS layer name
_LAYERS = {
    "truecolor":  "MODIS_Terra_CorrectedReflectance_TrueColor",
    "falsecolor": "MODIS_Terra_CorrectedReflectance_Bands721",
    "ndvi":       "MODIS_Terra_NDVI_8Day",
}

# Peak growing season date per year (July 15)
def _best_date(year: int) -> str:
    return f"{year}-07-15"


def get_image_url(bounds: list, year: int, band: str = "truecolor", width: int = 600) -> Optional[str]:
    """
    Fetch a satellite image via NASA GIBS WMS.
    Returns a base64-encoded PNG data URL, or None on failure.
    """
    key = f"img|{tuple(bounds)}|{year}|{band}|{width}"
    if key in _cache:
        return _cache[key]

    layer = _LAYERS.get(band, _LAYERS["truecolor"])
    minx, miny, maxx, maxy = bounds
    height = max(1, int(width * (maxy - miny) / (maxx - minx)))
    date   = _best_date(year)

    params = {
        "SERVICE":     "WMS",
        "VERSION":     "1.1.1",
        "REQUEST":     "GetMap",
        "FORMAT":      "image/png",
        "TRANSPARENT": "true",
        "LAYERS":      layer,
        "BBOX":        f"{minx},{miny},{maxx},{maxy}",
        "WIDTH":       str(width),
        "HEIGHT":      str(height),
        "SRS":         "EPSG:4326",
        "TIME":        date,
    }

    try:
        resp = httpx.get(WMS_URL, params=params, timeout=30)
        ct = resp.headers.get("content-type", "")
        if resp.status_code == 200 and "image" in ct:
            b64 = base64.b64encode(resp.content).decode()
            url = f"data:image/png;base64,{b64}"
            _cache[key] = url
            logger.info("GIBS image OK: %d bytes, layer=%s, date=%s", len(resp.content), layer, date)
            return url
        logger.warning("GIBS WMS HTTP %d (ct=%s): %s", resp.status_code, ct, resp.text[:200])
    except Exception as e:
        logger.error("GIBS image error: %s", e)

    return None


# ── NDVI stats via PC STAC ───────────────────────

def _find_item(bounds: list, year: int) -> Optional[dict]:
    """Search PC STAC for least-cloudy Sentinel-2 item (for stats only)."""
    key = f"item|{tuple(bounds)}|{year}"
    if key in _cache:
        return _cache[key]
    try:
        resp = httpx.post(STAC_URL, json={
            "collections": ["sentinel-2-l2a"],
            "bbox": bounds,
            "datetime": f"{year}-04-01T00:00:00Z/{year}-10-31T23:59:59Z",
            "query": {"eo:cloud_cover": {"lt": 50}},
            "limit": 5,
            "sortby": [{"field": "eo:cloud_cover", "direction": "asc"}],
        }, timeout=20)
        if resp.status_code == 200:
            features = resp.json().get("features", [])
            item = features[0] if features else None
            _cache[key] = item
            return item
    except Exception as e:
        logger.error("STAC search error: %s", e)
    _cache[key] = None
    return None


def _register_mosaic(item_id: str) -> Optional[str]:
    """Register a titiler-pgstac mosaic for a single item."""
    key = f"mosaic|{item_id}"
    if key in _cache:
        return _cache[key]
    try:
        resp = httpx.post(
            "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/register",
            json={
                "collections": ["sentinel-2-l2a"],
                "filter": {"op": "=", "args": [{"property": "id"}, item_id]},
                "filter-lang": "cql2-json",
            },
            timeout=20,
        )
        if resp.status_code == 200:
            sid = resp.json().get("searchid")
            _cache[key] = sid
            return sid
    except Exception as e:
        logger.error("Mosaic register error: %s", e)
    return None


def _tile_coords(lat: float, lng: float, zoom: int):
    """Convert lat/lng to XYZ tile coordinates."""
    n = 2 ** zoom
    x = int((lng + 180.0) / 360.0 * n)
    lat_r = math.radians(lat)
    y = int((1.0 - math.asinh(math.tan(lat_r)) / math.pi) / 2.0 * n)
    return x, y


def _tile_to_deg(x: int, y: int, zoom: int):
    """Convert XYZ tile to NW corner lat/lng."""
    n = 2 ** zoom
    lng = x / n * 360.0 - 180.0
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    return lat, lng


def _fetch_ndvi_from_tiles(bounds: list, year: int) -> Optional[dict]:
    """
    Download NDVI XYZ tiles from PC titiler and compute stats using Pillow.
    Zoom level 9 (~300m/pixel): manageable number of tiles.
    """
    try:
        from PIL import Image
        import io
    except ImportError:
        logger.warning("Pillow not installed — skipping tile stats")
        return None

    item = _find_item(bounds, year)
    if not item:
        return None

    sid = _register_mosaic(item["id"])
    if not sid:
        return None

    ZOOM  = 9
    TILE_URL = f"https://planetarycomputer.microsoft.com/api/data/v1/mosaic/{sid}/tiles/{ZOOM}/{{x}}/{{y}}.png"
    PARAMS = [("assets", "B04"), ("assets", "B08"), ("rescale", "0,3000"), ("rescale", "0,3000")]

    minx, miny, maxx, maxy = bounds
    x0, y0 = _tile_coords(maxy, minx, ZOOM)  # NW corner (y inverted)
    x1, y1 = _tile_coords(miny, maxx, ZOOM)  # SE corner

    red_vals, nir_vals = [], []

    for ty in range(y0, y1 + 1):
        for tx in range(x0, x1 + 1):
            try:
                r = httpx.get(TILE_URL.format(x=tx, y=ty), params=PARAMS, timeout=30)
                if r.status_code == 200 and "image" in r.headers.get("content-type", ""):
                    img = Image.open(io.BytesIO(r.content))
                    arr = list(img.getdata())
                    # Tile has 2 bands (B04=R, B08=G in a 2-band png via assets)
                    # Actually response may be RGBA — first channel is B04, second B08
                    for px in arr:
                        if isinstance(px, (list, tuple)) and len(px) >= 2:
                            red_vals.append(px[0] / 255.0 * 3000)
                            nir_vals.append(px[1] / 255.0 * 3000)
            except Exception:
                continue

    if not red_vals:
        return None

    import numpy as np
    red = np.array(red_vals, dtype=float)
    nir = np.array(nir_vals, dtype=float)
    denom = nir + red
    ndvi = np.where(denom > 0, (nir - red) / denom, 0.0)
    valid = ndvi[ndvi != 0]
    if len(valid) == 0:
        return None

    veg  = float(np.mean(valid > 0.2)) * 100
    bare = float(np.mean(valid < 0.1)) * 100

    return {
        "mean":    round(float(np.mean(valid)), 4),
        "max":     round(float(np.percentile(valid, 95)), 4),
        "min":     round(float(np.percentile(valid, 5)), 4),
        "vegPct":  round(veg, 1),
        "barePct": round(bare, 1),
        "source":  "pc",
    }


def get_stats(bounds: list, year: int) -> dict:
    """Return NDVI stats. Tries PC tiles, falls back to demo."""
    key = f"stats|{tuple(bounds)}|{year}"
    if key in _cache:
        return _cache[key]

    result = _fetch_ndvi_from_tiles(bounds, year)
    if result:
        _cache[key] = result
        return result

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
