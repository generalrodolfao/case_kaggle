"""Named geographic zones for NYC taxi data filtering."""

# (lon_min, lat_min, lon_max, lat_max)
ZONES: dict[str, tuple[float, float, float, float]] = {
    "jfk": (-73.83, 40.62, -73.74, 40.67),
    "lga": (-73.89, 40.76, -73.85, 40.79),
    "ewr": (-74.20, 40.67, -74.16, 40.71),
    "manhattan": (-74.02, 40.70, -73.93, 40.88),
    "brooklyn": (-74.05, 40.57, -73.83, 40.74),
}

VALID_ZONE_NAMES: frozenset[str] = frozenset(ZONES.keys())


def point_in_zone(lon: float, lat: float, zone_name: str) -> bool:
    """Return True if (lon, lat) falls within the named zone bounding box.

    Args:
        lon: Longitude of the point.
        lat: Latitude of the point.
        zone_name: One of the keys in ZONES.

    Returns:
        True if the point is inside the zone.

    Raises:
        KeyError: If zone_name is not a known zone.
    """
    lon_min, lat_min, lon_max, lat_max = ZONES[zone_name]
    return lon_min <= lon <= lon_max and lat_min <= lat <= lat_max


def point_in_bbox(
    lon: float,
    lat: float,
    lon_min: float,
    lat_min: float,
    lon_max: float,
    lat_max: float,
) -> bool:
    """Return True if (lon, lat) falls within the given bounding box.

    Args:
        lon: Longitude of the point.
        lat: Latitude of the point.
        lon_min: Western boundary.
        lat_min: Southern boundary.
        lon_max: Eastern boundary.
        lat_max: Northern boundary.

    Returns:
        True if the point is inside the bounding box.
    """
    return lon_min <= lon <= lon_max and lat_min <= lat <= lat_max
