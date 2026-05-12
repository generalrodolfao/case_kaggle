"""Shared fixtures for consumer tests."""
import pytest


@pytest.fixture
def sample_kafka_message():
    """Mensagem Kafka simulada com evento válido."""
    import json

    payload = {
        "key": "2014-01-15 12:00:00.000001",
        "pickup_datetime": "2014-01-15T12:00:00Z",
        "pickup_longitude": -73.9857,
        "pickup_latitude": 40.7484,
        "dropoff_longitude": -73.7781,
        "dropoff_latitude": 40.6413,
        "passenger_count": 1,
        "fare_amount": 52.0,
        "event_ts": "2026-05-12T14:00:00Z",
    }
    return json.dumps(payload).encode("utf-8")
