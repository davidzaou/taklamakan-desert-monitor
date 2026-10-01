"""Satellite image and NDVI stats endpoints backed by Microsoft Planetary Computer."""

import asyncio
import logging

from fastapi import APIRouter, Request
from pydantic import BaseModel, field_validator

from rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/satellite", tags=["satellite"])

_TAK_BBOX = {"min_lng": 73, "max_lng": 92, "min_lat": 34, "max_lat": 45}


def _check_bounds(v: list) -> list:
    if len(v) != 4:
        raise ValueError("bounds must be [minLng, minLat, maxLng, maxLat]")
    minx, miny, maxx, maxy = v
    if not (_TAK_BBOX["min_lng"] <= minx < maxx <= _TAK_BBOX["max_lng"]):
        raise ValueError("longitude outside Taklamakan region")
    if not (_TAK_BBOX["min_lat"] <= miny < maxy <= _TAK_BBOX["max_lat"]):
        raise ValueError("latitude outside Taklamakan region")
    return v


def _check_year(v: int, field: str = "year") -> int:
    if v < 2015 or v > 2030:
        raise ValueError(f"{field} must be 2015-2030")
    return v


class ImageRequest(BaseModel):
    bounds: list[float]
    year: int
    band: str = "truecolor"
    width: int = 600

    @field_validator("bounds")
    @classmethod
    def check_bounds(cls, v): return _check_bounds(v)

    @field_validator("band")
    @classmethod
    def check_band(cls, v):
        if v not in ("truecolor", "ndvi", "falsecolor"):
            raise ValueError("band must be truecolor, ndvi, or falsecolor")
        return v

    @field_validator("year")
    @classmethod
    def check_year(cls, v): return _check_year(v)

    @field_validator("width")
    @classmethod
    def check_width(cls, v):
        if not (100 <= v <= 1200):
            raise ValueError("width must be 100-1200")
        return v


class StatsRequest(BaseModel):
    bounds: list[float]
    year: int

    @field_validator("bounds")
    @classmethod
    def check_bounds(cls, v): return _check_bounds(v)

    @field_validator("year")
    @classmethod
    def check_year(cls, v): return _check_year(v)


class ChangeRequest(BaseModel):
    bounds: list[float]
    year1: int
    year2: int

    @field_validator("bounds")
    @classmethod
    def check_bounds(cls, v): return _check_bounds(v)

    @field_validator("year1", "year2")
    @classmethod
    def check_year(cls, v, info): return _check_year(v, info.field_name)


def _svc():
    """Lazy-load pc_service so the app starts even if pystac-client isn't installed yet."""
    try:
        from services import pc_service
        return pc_service
    except ImportError as e:
        logger.warning("pc_service unavailable (pystac-client not installed?): %s", e)
        return None


@router.get("/debug")
async def satellite_debug(request: Request):  # noqa: C901
    """Test NASA GIBS WMS connectivity."""
    import httpx, base64
    try:
        r = httpx.get("https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", params={
            "SERVICE": "WMS", "VERSION": "1.1.1", "REQUEST": "GetMap",
            "FORMAT": "image/png", "LAYERS": "MODIS_Terra_CorrectedReflectance_TrueColor",
            "BBOX": "79.5,36.8,80.5,37.5", "WIDTH": "256", "HEIGHT": "179",
            "SRS": "EPSG:4326", "TIME": "2024-07-15",
        }, timeout=30)
        ct = r.headers.get("content-type", "")
        return {
            "gibs_status": r.status_code,
            "content_type": ct,
            "bytes": len(r.content),
            "is_image": "image" in ct,
            "error": r.text[:200] if "image" not in ct else None,
        }
    except Exception as e:
        return {"gibs_status": "exception", "error": str(e)}


@router.post("/image")
@limiter.limit("20/minute")
async def satellite_image(request: Request, body: ImageRequest):
    """Return a base64 PNG data URL for a satellite image of the given bounds/year/band."""
    svc = _svc()
    if svc:
        url = await asyncio.to_thread(svc.get_image_url, body.bounds, body.year, body.band, body.width)
        if url:
            return {"url": url, "source": "pc"}
    return {"url": None, "source": "unavailable"}


@router.post("/stats")
@limiter.limit("30/minute")
async def satellite_stats(request: Request, body: StatsRequest):
    """Return NDVI statistics (mean, max, vegPct, barePct) for bounds/year."""
    svc = _svc()
    if svc:
        return await asyncio.to_thread(svc.get_stats, body.bounds, body.year)
    return {"mean": 0.12, "max": 0.44, "min": 0.02, "vegPct": 12.5, "barePct": 65.3, "source": "demo"}


@router.post("/change")
@limiter.limit("30/minute")
async def satellite_change(request: Request, body: ChangeRequest):
    """Return vegetation change statistics between year1 and year2."""
    svc = _svc()
    if svc:
        return await asyncio.to_thread(svc.get_change, body.bounds, body.year1, body.year2)
    return {"gainedPct": 4.2, "stablePct": 91.8, "lostPct": 4.0, "meanChange": 0.012, "source": "demo"}
