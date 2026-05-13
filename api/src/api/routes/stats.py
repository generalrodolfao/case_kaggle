"""GET /api/stats/* — lê os modelos gold do MinIO."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from api.config import ApiConfig
from api.db import make_conn

router = APIRouter()


def _cfg() -> ApiConfig:
    return ApiConfig()


def _read_gold(key: str, cfg: ApiConfig) -> list[dict[str, Any]]:
    con = make_conn(cfg)
    try:
        df = con.execute(
            f"SELECT * FROM read_parquet('s3://{cfg.s3_bucket}/gold/{key}.parquet')"
        ).df()
    finally:
        con.close()
    return df.to_dict(orient="records")


@router.get("/stats/by_zone", summary="Receita e métricas agregadas por zona de embarque")
def stats_by_zone(cfg: ApiConfig = Depends(_cfg)) -> list[dict[str, Any]]:
    """Return gold_fares_by_zone aggregations."""
    return _read_gold("fares_by_zone", cfg)


@router.get("/stats/by_hour", summary="Corridas e tarifa média por hora do dia")
def stats_by_hour(cfg: ApiConfig = Depends(_cfg)) -> list[dict[str, Any]]:
    """Return gold_fares_by_hour aggregations."""
    return _read_gold("fares_by_hour", cfg)


@router.get("/stats/heatmap", summary="Heatmap de corridas por dia-da-semana × hora")
def stats_heatmap(cfg: ApiConfig = Depends(_cfg)) -> list[dict[str, Any]]:
    """Return gold_fares_hourly_heatmap aggregations."""
    return _read_gold("fares_hourly_heatmap", cfg)


@router.get("/stats/overview", summary="KPIs globais do dataset")
def stats_overview(cfg: ApiConfig = Depends(_cfg)) -> dict[str, Any]:
    """Return single-row global metrics from metrics_overview."""
    rows = _read_gold("metrics_overview", cfg)
    return rows[0] if rows else {}


@router.get("/stats/by_month", summary="Métricas mensais agregadas")
def stats_by_month(cfg: ApiConfig = Depends(_cfg)) -> list[dict[str, Any]]:
    """Return metrics_by_month ordered by year/month."""
    con = make_conn(cfg)
    try:
        df = con.execute(
            f"SELECT * FROM read_parquet('s3://{cfg.s3_bucket}/gold/metrics_by_month.parquet')"
            " ORDER BY pickup_year, pickup_month"
        ).df()
    finally:
        con.close()
    return df.to_dict(orient="records")


@router.get("/stats/by_dow", summary="Métricas por dia da semana")
def stats_by_dow(cfg: ApiConfig = Depends(_cfg)) -> list[dict[str, Any]]:
    """Return metrics_by_dow ordered by day of week (0=Sun … 6=Sat)."""
    con = make_conn(cfg)
    try:
        df = con.execute(
            f"SELECT * FROM read_parquet('s3://{cfg.s3_bucket}/gold/metrics_by_dow.parquet')"
            " ORDER BY pickup_dow"
        ).df()
    finally:
        con.close()
    return df.to_dict(orient="records")
