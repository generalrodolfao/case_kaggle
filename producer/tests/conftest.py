"""Shared fixtures for producer tests."""
import pytest
import polars as pl


@pytest.fixture
def sample_csv(tmp_path):
    """CSV de amostra com 10 linhas representativas, incluindo casos inválidos."""
    data = {
        "key": [f"2014-01-01 00:00:00.00000{i}" for i in range(1, 11)],
        "fare_amount": [10.5, 25.0, 8.0, -1.0, 0.0, 52.0, 15.5, 300.0, 501.0, 12.0],
        "pickup_datetime": ["2014-01-01 00:00:00 UTC"] * 10,
        "pickup_longitude": [-73.985] * 10,
        "pickup_latitude": [40.748] * 10,
        "dropoff_longitude": [-73.778] * 10,
        "dropoff_latitude": [40.641] * 10,
        "passenger_count": [1, 2, 0, 1, 1, 1, 7, 1, 1, 1],
    }
    df = pl.DataFrame(data)
    path = tmp_path / "sample.csv"
    df.write_csv(path)
    return str(path)
