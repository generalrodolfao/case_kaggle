"""Date and spatial filters for taxi ride events."""
from datetime import date, datetime, timezone
from typing import Any, Optional

from consumer.zones import point_in_bbox, point_in_zone


def parse_event(raw: bytes) -> dict[str, Any]:
    """Deserialize a Kafka message value to a dict.

    Args:
        raw: UTF-8 encoded JSON bytes from Kafka.

    Returns:
        Parsed event dict.

    Raises:
        ValueError: If raw is not valid JSON.
    """
    import json

    return json.loads(raw.decode("utf-8"))


def passes_date_filter(event: dict[str, Any], start: date, end: date) -> bool:
    """Return True if event's pickup_datetime falls within [start, end] inclusive.

    Args:
        event: Parsed Kafka event dict.
        start: Inclusive start date (applied to pickup_datetime).
        end: Inclusive end date (applied to pickup_datetime).

    Returns:
        True if the ride's pickup date is within the range.
    """
    raw_dt = event.get("pickup_datetime", "")
    try:
        # ISO-8601 — may have Z or +00:00 suffix
        dt = datetime.fromisoformat(str(raw_dt).replace("Z", "+00:00"))
        ride_date = dt.date()
        return start <= ride_date <= end
    except (ValueError, TypeError):
        return False


def passes_zone_filter(
    event: dict[str, Any],
    zone: Optional[str] = None,
    bbox: Optional[tuple[float, float, float, float]] = None,
) -> bool:
    """Return True if the pickup point satisfies the spatial filter.

    At most one of zone/bbox should be set. If neither is set, always returns True.

    Args:
        event: Parsed Kafka event dict.
        zone: Named zone key (e.g. 'jfk').
        bbox: Tuple of (lon_min, lat_min, lon_max, lat_max).

    Returns:
        True if the pickup location passes the filter (or no filter is set).
    """
    if zone is None and bbox is None:
        return True

    lon = event.get("pickup_longitude")
    lat = event.get("pickup_latitude")
    if lon is None or lat is None:
        return False

    lon, lat = float(lon), float(lat)

    if zone is not None:
        return point_in_zone(lon, lat, zone)

    if bbox is not None:
        lon_min, lat_min, lon_max, lat_max = bbox
        return point_in_bbox(lon, lat, lon_min, lat_min, lon_max, lat_max)

    return True


def passes_filters(
    event: dict[str, Any],
    start: date,
    end: date,
    zone: Optional[str] = None,
    bbox: Optional[tuple[float, float, float, float]] = None,
) -> bool:
    """Combine date and spatial filters.

    Args:
        event: Parsed event dict.
        start: Inclusive start date.
        end: Inclusive end date.
        zone: Optional named zone.
        bbox: Optional bounding box.

    Returns:
        True if the event passes all active filters.
    """
    return passes_date_filter(event, start, end) and passes_zone_filter(event, zone, bbox)
