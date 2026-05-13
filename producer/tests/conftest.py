"""Shared fixtures for producer tests."""
from unittest.mock import MagicMock, patch

import polars as pl
import pytest


@pytest.fixture
def sample_csv(tmp_path):
    """CSV de 10 linhas: 7 válidas pelo schema, 3 inválidas (fare<=0, passenger=0)."""
    data = {
        "key": [f"2014-01-15 12:00:00.00000{i}" for i in range(1, 11)],
        "fare_amount": [10.5, 25.0, 8.0, -1.0, 0.0, 52.0, 15.5, 300.0, 501.0, 12.0],
        "pickup_datetime": ["2014-01-15 12:00:00 UTC"] * 10,
        "pickup_longitude": [-73.985] * 10,
        "pickup_latitude": [40.748] * 10,
        "dropoff_longitude": [-73.778] * 10,
        "dropoff_latitude": [40.641] * 10,
        "passenger_count": [1, 2, 0, 1, 1, 1, 7, 1, 1, 1],
        # row 3: pc=0 → invalid schema
        # row 4: fare=-1 → invalid schema
        # row 5: fare=0 → invalid schema
    }
    df = pl.DataFrame(data)
    path = tmp_path / "sample.csv"
    df.write_csv(path)
    return str(path)


@pytest.fixture
def mock_kafka_producer():
    """Mock confluent-kafka Producer instance."""
    with patch("producer.publisher.Producer") as MockProducer:
        instance = MockProducer.return_value
        instance.produce = MagicMock()
        instance.flush = MagicMock(return_value=0)
        instance.poll = MagicMock(return_value=0)
        yield instance
