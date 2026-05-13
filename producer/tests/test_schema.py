"""Tests for producer.schema.TaxiRideEvent."""
import pytest
from pydantic import ValidationError

from producer.schema import TaxiRideEvent

_VALID = {
    "key": "2014-01-15 12:00:00.000001",
    "pickup_datetime": "2014-01-15T12:00:00Z",
    "pickup_longitude": -73.985,
    "pickup_latitude": 40.748,
    "dropoff_longitude": -73.778,
    "dropoff_latitude": 40.641,
    "passenger_count": 1,
    "fare_amount": 10.5,
    "event_ts": "2026-05-12T14:00:00Z",
}


def test_schema_valid_row_passes():
    event = TaxiRideEvent(**_VALID)
    assert event.fare_amount == 10.5
    assert event.passenger_count == 1
    assert event.key == "2014-01-15 12:00:00.000001"


def test_schema_accepts_utc_suffix_datetime():
    event = TaxiRideEvent(**{**_VALID, "pickup_datetime": "2014-01-15 12:00:00 UTC"})
    assert event.pickup_datetime.year == 2014


def test_schema_invalid_fare_negative_raises():
    with pytest.raises(ValidationError, match="fare_amount"):
        TaxiRideEvent(**{**_VALID, "fare_amount": -1.0})


def test_schema_invalid_fare_zero_raises():
    with pytest.raises(ValidationError, match="fare_amount"):
        TaxiRideEvent(**{**_VALID, "fare_amount": 0.0})


def test_schema_invalid_passenger_zero_raises():
    with pytest.raises(ValidationError, match="passenger_count"):
        TaxiRideEvent(**{**_VALID, "passenger_count": 0})


def test_schema_high_passenger_count_passes():
    """Silver handles quality cap to 6; schema only rejects 0."""
    event = TaxiRideEvent(**{**_VALID, "passenger_count": 208})
    assert event.passenger_count == 208


def test_schema_to_kafka_payload_has_all_fields():
    event = TaxiRideEvent(**_VALID)
    payload = event.to_kafka_payload()
    expected = {
        "key", "pickup_datetime", "pickup_longitude", "pickup_latitude",
        "dropoff_longitude", "dropoff_latitude", "passenger_count", "fare_amount", "event_ts",
    }
    assert set(payload.keys()) == expected


def test_schema_to_kafka_payload_datetimes_are_strings():
    event = TaxiRideEvent(**_VALID)
    payload = event.to_kafka_payload()
    assert isinstance(payload["pickup_datetime"], str)
    assert isinstance(payload["event_ts"], str)
