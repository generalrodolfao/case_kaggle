"""Tests for consumer.main CLI."""
import pytest
from typer.testing import CliRunner

from consumer.main import app, _parse_bbox


runner = CliRunner()


def test_parse_bbox_valid():
    result = _parse_bbox("-74.0,40.0,-73.0,41.0")
    assert result == (-74.0, 40.0, -73.0, 41.0)


def test_parse_bbox_invalid_count_raises():
    with pytest.raises(ValueError, match="4 values"):
        _parse_bbox("1,2,3")


def test_cli_zone_and_bbox_mutually_exclusive():
    result = runner.invoke(
        app,
        ["--start-date", "2014-01-01", "--end-date", "2014-01-31",
         "--zone", "jfk", "--bbox", "-74,40,-73,41"],
    )
    assert result.exit_code == 1
    assert "mutually exclusive" in result.output


def test_cli_unknown_zone_rejected():
    result = runner.invoke(
        app,
        ["--start-date", "2014-01-01", "--end-date", "2014-01-31",
         "--zone", "atlantis"],
    )
    assert result.exit_code == 1
    assert "unknown zone" in result.output
