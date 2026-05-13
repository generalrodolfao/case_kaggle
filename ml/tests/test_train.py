"""Unit tests for the training pipeline (mocked silver load)."""
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest

from prediction.config import PredictionConfig


def _silver_df(n: int = 500) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    zones = ["manhattan", "brooklyn", "jfk", "lga", "ewr", "other"]
    return pd.DataFrame({
        "trip_distance_km": rng.uniform(0.5, 30, n),
        "trip_distance_manhattan_km": rng.uniform(0.5, 35, n),
        "pickup_hour": rng.integers(0, 24, n),
        "pickup_dow": rng.integers(0, 7, n),
        "pickup_month": rng.integers(1, 13, n),
        "passenger_count": rng.integers(1, 7, n),
        "pickup_zone": rng.choice(zones, n),
        "fare_amount": rng.uniform(2.5, 80, n),
    })


@patch("prediction.train.load_silver", return_value=_silver_df())
def test_train_returns_required_keys(mock_load):
    from prediction.train import train
    cfg = PredictionConfig(train_sample_rows=500, n_estimators=10)
    result = train(cfg)
    assert {"model", "metrics", "predictions_df"} <= result.keys()


@patch("prediction.train.load_silver", return_value=_silver_df())
def test_metrics_are_finite(mock_load):
    from prediction.train import train
    cfg = PredictionConfig(train_sample_rows=500, n_estimators=10)
    m = train(cfg)["metrics"]
    assert np.isfinite(m["rmse"])
    assert np.isfinite(m["mae"])
    assert np.isfinite(m["r2"])


@patch("prediction.train.load_silver", return_value=_silver_df())
def test_predictions_df_has_required_columns(mock_load):
    from prediction.train import train
    cfg = PredictionConfig(train_sample_rows=500, n_estimators=10)
    df = train(cfg)["predictions_df"]
    for col in ("fare_amount_actual", "fare_amount_predicted", "abs_error"):
        assert col in df.columns, f"Missing column: {col}"


@patch("prediction.train.load_silver", return_value=_silver_df())
def test_abs_error_is_non_negative(mock_load):
    from prediction.train import train
    cfg = PredictionConfig(train_sample_rows=500, n_estimators=10)
    df = train(cfg)["predictions_df"]
    assert (df["abs_error"] >= 0).all()
