"""Pydantic schema for a taxi ride Kafka event."""
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, field_validator


class TaxiRideEvent(BaseModel):
    """A single taxi ride event published to Kafka.

    Attributes:
        key: Unique ride identifier (pickup_datetime + suffix).
        pickup_datetime: When the ride started (UTC).
        pickup_longitude: Pickup longitude.
        pickup_latitude: Pickup latitude.
        dropoff_longitude: Dropoff longitude.
        dropoff_latitude: Dropoff latitude.
        passenger_count: Number of passengers (must be > 0).
        fare_amount: Ride fare in USD (must be > 0).
        event_ts: Timestamp of Kafka publish (UTC).
    """

    key: str
    pickup_datetime: datetime
    pickup_longitude: float
    pickup_latitude: float
    dropoff_longitude: float
    dropoff_latitude: float
    passenger_count: int
    fare_amount: float
    event_ts: datetime

    @field_validator("pickup_datetime", "event_ts", mode="before")
    @classmethod
    def parse_datetime_with_utc_suffix(cls, v: Any) -> Any:
        """Accept 'YYYY-MM-DD HH:MM:SS UTC' in addition to ISO-8601."""
        if isinstance(v, str):
            cleaned = v.strip().replace(" UTC", "+00:00")
            if "T" not in cleaned and "+" not in cleaned and "Z" not in cleaned:
                cleaned = cleaned.replace(" ", "T", 1)
            return cleaned
        return v

    @field_validator("fare_amount")
    @classmethod
    def fare_must_be_positive(cls, v: float) -> float:
        """Reject fare_amount <= 0 at schema level."""
        if v <= 0:
            raise ValueError(f"fare_amount must be > 0, got {v}")
        return v

    @field_validator("passenger_count")
    @classmethod
    def passenger_must_be_positive(cls, v: int) -> int:
        """Reject passenger_count = 0 at schema level (quality rules are in silver)."""
        if v <= 0:
            raise ValueError(f"passenger_count must be > 0, got {v}")
        return v

    def to_kafka_payload(self) -> dict[str, Any]:
        """Return a JSON-serializable dict for the Kafka message value.

        Returns:
            Dictionary with all event fields, datetimes as ISO-8601 strings.
        """
        return {
            "key": self.key,
            "pickup_datetime": self.pickup_datetime.isoformat(),
            "pickup_longitude": self.pickup_longitude,
            "pickup_latitude": self.pickup_latitude,
            "dropoff_longitude": self.dropoff_longitude,
            "dropoff_latitude": self.dropoff_latitude,
            "passenger_count": self.passenger_count,
            "fare_amount": self.fare_amount,
            "event_ts": self.event_ts.isoformat(),
        }
