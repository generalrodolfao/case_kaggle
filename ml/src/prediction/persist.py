"""Save model and predictions to MinIO."""
from __future__ import annotations

import io
import logging
import pickle

import boto3
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import xgboost as xgb

from prediction.config import PredictionConfig

logger = logging.getLogger(__name__)


def _s3_client(cfg: PredictionConfig):
    return boto3.client(
        "s3",
        endpoint_url=cfg.s3_endpoint,
        aws_access_key_id=cfg.s3_access_key,
        aws_secret_access_key=cfg.s3_secret_key,
    )


def save_model(model: xgb.XGBRegressor, cfg: PredictionConfig) -> None:
    """Pickle the model and upload to MinIO.

    Args:
        model: Trained XGBoost regressor.
        cfg: Config with S3 credentials and target key.
    """
    s3 = _s3_client(cfg)
    buf = io.BytesIO()
    pickle.dump(model, buf)
    buf.seek(0)
    s3.put_object(Bucket=cfg.s3_bucket, Key=cfg.model_s3_key, Body=buf)
    logger.info("Model → s3://%s/%s", cfg.s3_bucket, cfg.model_s3_key)


def save_predictions(df: pd.DataFrame, cfg: PredictionConfig) -> None:
    """Write predictions DataFrame as Parquet (Snappy) to MinIO.

    Args:
        df: DataFrame with actual, predicted, and error columns.
        cfg: Config with S3 credentials and target key.
    """
    s3 = _s3_client(cfg)
    table = pa.Table.from_pandas(df, preserve_index=False)
    buf = io.BytesIO()
    pq.write_table(table, buf, compression="snappy")
    buf.seek(0)
    s3.put_object(Bucket=cfg.s3_bucket, Key=cfg.predictions_s3_key, Body=buf)
    logger.info("Predictions → s3://%s/%s", cfg.s3_bucket, cfg.predictions_s3_key)
