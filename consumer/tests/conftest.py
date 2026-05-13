"""Shared fixtures for consumer tests."""
import json
from datetime import date, timezone
from unittest.mock import MagicMock

import pytest


@pytest.fixture
def valid_event() -> dict:
    """A valid taxi ride event dict (pickup in JFK zone, date 2014-01-15)."""
    return {
        "key": "2014-01-15 12:00:00.000001",
        "pickup_datetime": "2014-01-15T12:00:00+00:00",
        "pickup_longitude": -73.78,
        "pickup_latitude": 40.64,
        "dropoff_longitude": -73.985,
        "dropoff_latitude": 40.748,
        "passenger_count": 1,
        "fare_amount": 52.0,
        "event_ts": "2026-05-12T14:00:00+00:00",
    }


@pytest.fixture
def valid_event_bytes(valid_event) -> bytes:
    return json.dumps(valid_event).encode("utf-8")


@pytest.fixture
def start_date() -> date:
    return date(2014, 1, 1)


@pytest.fixture
def end_date() -> date:
    return date(2014, 1, 31)
