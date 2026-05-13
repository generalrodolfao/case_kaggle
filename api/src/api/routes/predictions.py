"""GET /api/predictions — lê predições XGBoost da gold."""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from api.config import ApiConfig, VALID_ZONES
from api.db import make_conn

router = APIRouter()


def _cfg() -> ApiConfig:
    return ApiConfig()


@router.get("/predictions", summary="Predições de tarifa geradas pelo modelo XGBoost")
def get_predictions(
    zone: Optional[str] = Query(None, example="jfk"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    cfg: ApiConfig = Depends(_cfg),
) -> list[dict[str, Any]]:
    """Return fare predictions from the gold layer, sorted by absolute error DESC.

    Args:
        zone: Filter by encoded zone (optional).
        limit: Max rows (1–1000).
        offset: Pagination offset.
        cfg: Injected API config.

    Returns:
        List of prediction records with actual, predicted, and error columns.
    """
    if zone and zone not in VALID_ZONES:
        raise HTTPException(status_code=422, detail=f"Invalid zone '{zone}'.")

    con = make_conn(cfg)
    try:
        where = f"WHERE pickup_zone_enc = {list(VALID_ZONES).index(zone)}" if zone else ""
        df = con.execute(f"""
            SELECT *
            FROM read_parquet('s3://{cfg.s3_bucket}/gold/fare_predictions.parquet')
            {where}
            ORDER BY abs_error DESC
            LIMIT {limit} OFFSET {offset}
        """).df()
    finally:
        con.close()

    return df.to_dict(orient="records")
