"""Feature engineering for the fare prediction model."""
from __future__ import annotations

import pandas as pd

ZONE_ORDER = ["manhattan", "brooklyn", "jfk", "lga", "ewr", "other"]
_ZONE_MAP: dict[str, int] = {z: i for i, z in enumerate(ZONE_ORDER)}

NUMERIC_FEATURES = [
    "trip_distance_km",
    "trip_distance_manhattan_km",
    "pickup_hour",
    "pickup_dow",
    "pickup_month",
    "passenger_count",
]
FEATURE_COLS = NUMERIC_FEATURES + ["pickup_zone_enc"]
TARGET_COL = "fare_amount"


def encode_zone(df: pd.DataFrame) -> pd.DataFrame:
    """Add integer-encoded pickup_zone column.

    Args:
        df: DataFrame with a ``pickup_zone`` string column.

    Returns:
        Same DataFrame with a new ``pickup_zone_enc`` int column.
    """
    df = df.copy()
    df["pickup_zone_enc"] = df["pickup_zone"].map(_ZONE_MAP).fillna(len(ZONE_ORDER)).astype("int8")
    return df


def build_Xy(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Return feature matrix X and target series y.

    Args:
        df: Silver-layer DataFrame already loaded from MinIO.

    Returns:
        Tuple of (X, y) ready for sklearn/XGBoost fit.
    """
    df = encode_zone(df)
    missing = [c for c in FEATURE_COLS + [TARGET_COL] if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")
    return df[FEATURE_COLS].copy(), df[TARGET_COL].copy()
