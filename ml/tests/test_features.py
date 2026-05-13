"""Unit tests for the features module."""
import pandas as pd
import pytest

from prediction.features import build_Xy, encode_zone, FEATURE_COLS, ZONE_ORDER


def _make_df(**overrides) -> pd.DataFrame:
    base = {
        "trip_distance_km": [5.0, 10.0, 2.0],
        "trip_distance_manhattan_km": [6.0, 12.0, 2.5],
        "pickup_hour": [8, 17, 23],
        "pickup_dow": [0, 4, 6],
        "pickup_month": [1, 6, 12],
        "passenger_count": [1, 2, 1],
        "pickup_zone": ["manhattan", "jfk", "other"],
        "fare_amount": [12.5, 52.0, 7.0],
    }
    base.update(overrides)
    return pd.DataFrame(base)


def test_encode_zone_known():
    df = _make_df()
    out = encode_zone(df)
    assert "pickup_zone_enc" in out.columns
    assert out.loc[0, "pickup_zone_enc"] == ZONE_ORDER.index("manhattan")
    assert out.loc[1, "pickup_zone_enc"] == ZONE_ORDER.index("jfk")


def test_encode_zone_unknown_maps_to_fallback():
    df = _make_df(pickup_zone=["nowhere", "manhattan", "jfk"])
    out = encode_zone(df)
    assert out.loc[0, "pickup_zone_enc"] == len(ZONE_ORDER)


def test_build_Xy_returns_correct_shape():
    df = _make_df()
    X, y = build_Xy(df)
    assert list(X.columns) == FEATURE_COLS
    assert len(y) == len(df)


def test_build_Xy_raises_on_missing_column():
    df = _make_df().drop(columns=["trip_distance_km"])
    with pytest.raises(ValueError, match="Missing columns"):
        build_Xy(df)


def test_fare_amount_values_preserved():
    df = _make_df()
    _, y = build_Xy(df)
    assert list(y) == [12.5, 52.0, 7.0]
