"""Tests for consumer.zones."""
import pytest

from consumer.zones import ZONES, VALID_ZONE_NAMES, point_in_bbox, point_in_zone


def test_all_five_zones_defined():
    assert VALID_ZONE_NAMES == {"jfk", "lga", "ewr", "manhattan", "brooklyn"}


def test_point_in_zone_jfk_inside_returns_true():
    # JFK centroid approximately (-73.78, 40.64)
    assert point_in_zone(-73.78, 40.64, "jfk") is True


def test_point_in_zone_jfk_outside_returns_false():
    # Manhattan coords — not in JFK box
    assert point_in_zone(-73.98, 40.75, "jfk") is False


def test_point_in_zone_manhattan_inside_returns_true():
    assert point_in_zone(-73.97, 40.78, "manhattan") is True


def test_point_in_zone_brooklyn_inside_returns_true():
    assert point_in_zone(-73.90, 40.65, "brooklyn") is True


def test_point_in_zone_unknown_raises_key_error():
    with pytest.raises(KeyError):
        point_in_zone(-73.78, 40.64, "unknown_zone")


def test_point_in_bbox_inside_returns_true():
    assert point_in_bbox(-73.78, 40.64, -74.0, 40.0, -73.0, 41.0) is True


def test_point_in_bbox_outside_returns_false():
    assert point_in_bbox(-75.0, 40.64, -74.0, 40.0, -73.0, 41.0) is False


def test_point_in_bbox_on_boundary_returns_true():
    assert point_in_bbox(-74.0, 40.0, -74.0, 40.0, -73.0, 41.0) is True
