"""Training pipeline: load silver → train XGBoost → return artifacts."""
from __future__ import annotations

import logging

import duckdb
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from prediction.config import PredictionConfig
from prediction.features import FEATURE_COLS, TARGET_COL, build_Xy

logger = logging.getLogger(__name__)


def _s3_base_url(cfg: PredictionConfig) -> str:
    return f"s3://{cfg.s3_bucket}/{cfg.silver_path}/**/*.parquet"


def load_silver(cfg: PredictionConfig) -> pd.DataFrame:
    """Read a sample of the silver layer from MinIO using DuckDB httpfs.

    Args:
        cfg: Runtime config with S3 credentials and sampling params.

    Returns:
        Pandas DataFrame with feature and target columns.
    """
    host = cfg.s3_endpoint.removeprefix("http://").removeprefix("https://")
    con = duckdb.connect()
    con.execute(f"""
        INSTALL httpfs; LOAD httpfs;
        SET s3_endpoint='{host}';
        SET s3_access_key_id='{cfg.s3_access_key}';
        SET s3_secret_access_key='{cfg.s3_secret_key}';
        SET s3_use_ssl=false;
        SET s3_url_style='path';
    """)
    # pickup_zone_enc is computed by build_Xy; only raw columns exist in silver
    cols = ", ".join(NUMERIC_FEATURES + [TARGET_COL, "pickup_zone"])
    # WHERE must wrap the USING SAMPLE subquery — DuckDB parser rejects
    # "USING SAMPLE … WHERE" in the same SELECT level.
    df = con.execute(f"""
        SELECT {cols}
        FROM (
            SELECT * FROM read_parquet('{_s3_base_url(cfg)}')
            USING SAMPLE {cfg.train_sample_rows} ROWS
        )
        WHERE {TARGET_COL} IS NOT NULL
          AND trip_distance_km IS NOT NULL
    """).df()
    con.close()
    logger.info("Loaded %d rows from silver", len(df))
    return df


def train(cfg: PredictionConfig | None = None) -> dict:
    """Train XGBoost regressor and evaluate on a hold-out set.

    Args:
        cfg: Optional config; uses defaults (env vars / .env) if None.

    Returns:
        Dict with keys ``model``, ``metrics``, ``predictions_df``.
    """
    if cfg is None:
        cfg = PredictionConfig()

    df = load_silver(cfg)
    X, y = build_Xy(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=cfg.test_size, random_state=cfg.random_state
    )

    model = xgb.XGBRegressor(
        n_estimators=cfg.n_estimators,
        max_depth=cfg.max_depth,
        learning_rate=cfg.learning_rate,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=cfg.random_state,
        n_jobs=-1,
        eval_metric="rmse",
    )
    logger.info("Training XGBoost (%d rows)…", len(X_train))
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    y_pred = model.predict(X_test)
    metrics = {
        "rmse": float(np.sqrt(mean_squared_error(y_test, y_pred))),
        "mae": float(mean_absolute_error(y_test, y_pred)),
        "r2": float(r2_score(y_test, y_pred)),
        "n_train": len(X_train),
        "n_test": len(X_test),
    }
    logger.info(
        "RMSE=%.2f  MAE=%.2f  R²=%.3f",
        metrics["rmse"], metrics["mae"], metrics["r2"],
    )

    predictions_df = X_test[["trip_distance_km", "pickup_hour", "pickup_dow",
                               "passenger_count", "pickup_zone_enc"]].copy()
    predictions_df["fare_amount_actual"] = y_test.values
    predictions_df["fare_amount_predicted"] = y_pred.round(2)
    predictions_df["abs_error"] = np.abs(
        predictions_df["fare_amount_actual"] - predictions_df["fare_amount_predicted"]
    ).round(2)

    return {"model": model, "metrics": metrics, "predictions_df": predictions_df}
