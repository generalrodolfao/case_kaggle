"""Tests for consumer.filters."""
from datetime import date

import pytest

from consumer.filters import parse_event, passes_date_filter, passes_filters, passes_zone_filter


def test_parse_event_valid_json(valid_event_bytes, valid_event):
    result = parse_event(valid_event_bytes)
    assert result["fare_amount"] == valid_event["fare_amount"]


def test_parse_event_invalid_json_raises():
    with pytest.raises(Exception):
        parse_event(b"not-json")


def test_filter_date_range_inside_passes(valid_event, start_date, end_date):
    assert passes_date_filter(valid_event, start_date, end_date) is True


def test_filter_date_range_boundary_start_passes(valid_event):
    assert passes_date_filter(valid_event, date(2014, 1, 15), date(2014, 1, 31)) is True


def test_filter_date_range_boundary_end_passes(valid_event):
    event = {**valid_event, "pickup_datetime": "2014-01-31T23:59:59+00:00"}
    assert passes_date_filter(event, date(2014, 1, 1), date(2014, 1, 31)) is True


def test_filter_date_range_before_start_fails(valid_event):
    assert passes_date_filter(valid_event, date(2014, 2, 1), date(2014, 2, 28)) is False


def test_filter_date_range_after_end_fails(valid_event):
    assert passes_date_filter(valid_event, date(2013, 1, 1), date(2013, 12, 31)) is False


def test_filter_zone_jfk_inside_passes(valid_event, start_date, end_date):
    # valid_event has pickup in JFK zone
    assert passes_zone_filter(valid_event, zone="jfk") is True


def test_filter_zone_jfk_outside_fails(valid_event):
    event = {**valid_event, "pickup_longitude": -73.985, "pickup_latitude": 40.748}
    assert passes_zone_filter(event, zone="jfk") is False


def test_filter_bbox_custom_inside_passes(valid_event):
    bbox = (-74.0, 40.0, -73.0, 41.0)
    assert passes_zone_filter(valid_event, bbox=bbox) is True


def test_filter_bbox_custom_outside_fails(valid_event):
    bbox = (-75.0, 40.0, -74.5, 40.5)
    assert passes_zone_filter(valid_event, bbox=bbox) is False


def test_filter_no_spatial_filter_always_passes(valid_event, start_date, end_date):
    assert passes_zone_filter(valid_event) is True


def test_passes_filters_combines_date_and_zone(valid_event, start_date, end_date):
    assert passes_filters(valid_event, start_date, end_date, zone="jfk") is True


def test_passes_filters_rejects_wrong_zone(valid_event, start_date, end_date):
    assert passes_filters(valid_event, start_date, end_date, zone="ewr") is False
