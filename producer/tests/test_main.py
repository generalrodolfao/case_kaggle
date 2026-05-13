"""Tests for producer.main.run_pipeline (smoke tests)."""
from unittest.mock import MagicMock

import pytest

from producer.config import ProducerConfig
from producer.main import run_pipeline
from producer.publisher import KafkaPublisher


def _make_config(sample_csv: str) -> ProducerConfig:
    return ProducerConfig(
        kafka_bootstrap_servers="localhost:9092",
        kafka_topic="test-topic",
        producer_batch_size=10,
        producer_rate_limit_per_sec=0,
        producer_max_events=0,
        data_path=sample_csv,
    )


def test_main_smoke_publishes_limited_events(sample_csv):
    config = _make_config(sample_csv)
    pub = MagicMock(spec=KafkaPublisher)
    pub.flush.return_value = 0

    total = run_pipeline(config, pub, max_events=3)

    assert total == 3
    assert pub.publish.call_count == 3
    pub.flush.assert_called_once()


def test_main_smoke_publishes_all_valid_rows(sample_csv):
    """sample_csv has 7 valid rows → all published when max_events=0."""
    config = _make_config(sample_csv)
    pub = MagicMock(spec=KafkaPublisher)
    pub.flush.return_value = 0

    total = run_pipeline(config, pub, max_events=0)

    assert total == 7


def test_main_smoke_flush_called_even_with_zero_events(tmp_path):
    csv = tmp_path / "empty.csv"
    csv.write_text(
        "key,fare_amount,pickup_datetime,pickup_longitude,pickup_latitude,"
        "dropoff_longitude,dropoff_latitude,passenger_count\n"
    )
    config = _make_config(str(csv))
    pub = MagicMock(spec=KafkaPublisher)
    pub.flush.return_value = 0

    total = run_pipeline(config, pub, max_events=0)

    assert total == 0
    pub.flush.assert_called_once()
