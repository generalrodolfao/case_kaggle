"""GET /api/events — consulta paginada da camada silver com filtros."""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from api.config import ApiConfig, VALID_ZONES
from api.db import make_conn

router = APIRouter()


def _cfg() -> ApiConfig:
    return ApiConfig()


@router.get("/events", summary="Lista de corridas (silver), paginada e filtrável")
def get_events(
    start_date: Optional[str] = Query(None, example="2014-01-01"),
    end_date: Optional[str] = Query(None, example="2014-01-31"),
    zone: Optional[str] = Query(None, example="jfk"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    cfg: ApiConfig = Depends(_cfg),
) -> list[dict[str, Any]]:
    """Return paginated taxi rides from the silver layer.

    Args:
        start_date: ISO date lower bound for pickup_datetime.
        end_date: ISO date upper bound (inclusive day).
        zone: Named pickup zone (jfk | lga | ewr | manhattan | brooklyn | other).
        limit: Max rows to return (1–1000).
        offset: Rows to skip for pagination.
        cfg: Injected API config.

    Returns:
        List of ride dicts.
    """
    if zone and zone not in VALID_ZONES:
        raise HTTPException(status_code=422, detail=f"Invalid zone '{zone}'. Choose from {sorted(VALID_ZONES)}")

    clauses: list[str] = []
    if start_date:
        clauses.append(f"pickup_datetime >= '{start_date}'")
    if end_date:
        clauses.append(f"pickup_datetime <= '{end_date} 23:59:59'")
    if zone:
        clauses.append(f"pickup_zone = '{zone}'")

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    con = make_conn(cfg)
    try:
        df = con.execute(f"""
            SELECT key, pickup_datetime, pickup_zone,
                   pickup_hour, pickup_dow, pickup_month,
                   passenger_count, fare_amount,
                   trip_distance_km, trip_distance_manhattan_km
            FROM read_parquet('s3://{cfg.s3_bucket}/silver/taxi_rides/**/*.parquet')
            {where}
            ORDER BY pickup_datetime DESC
            LIMIT {limit} OFFSET {offset}
        """).df()
    finally:
        con.close()

    return df.to_dict(orient="records")
