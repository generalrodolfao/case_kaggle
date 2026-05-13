"""Tests for producer.reader.iter_batches."""
import pytest

from producer.reader import iter_batches


def test_reader_streams_in_batches(sample_csv):
    """Deve yield múltiplos batches pequenos sem carregar o CSV inteiro."""
    batches = list(iter_batches(sample_csv, batch_size=3))
    assert len(batches) >= 1
    for batch in batches:
        assert 1 <= len(batch) <= 3


def test_reader_max_events_limits_total(sample_csv):
    batches = list(iter_batches(sample_csv, batch_size=100, max_events=3))
    total = sum(len(b) for b in batches)
    assert total <= 3


def test_reader_skips_invalid_rows(sample_csv):
    """sample_csv tem 10 linhas; 3 inválidas pelo schema → 7 válidas."""
    batches = list(iter_batches(sample_csv, batch_size=100))
    total = sum(len(b) for b in batches)
    assert total == 7


def test_reader_yields_taxi_ride_events(sample_csv):
    from producer.schema import TaxiRideEvent

    batches = list(iter_batches(sample_csv, batch_size=100))
    for batch in batches:
        for event in batch:
            assert isinstance(event, TaxiRideEvent)


def test_reader_event_ts_is_utc(sample_csv):
    from datetime import timezone

    batches = list(iter_batches(sample_csv, batch_size=100))
    first_event = batches[0][0]
    assert first_event.event_ts.tzinfo == timezone.utc


def test_reader_empty_csv_yields_nothing(tmp_path):
    csv = tmp_path / "empty.csv"
    csv.write_text(
        "key,fare_amount,pickup_datetime,pickup_longitude,pickup_latitude,"
        "dropoff_longitude,dropoff_latitude,passenger_count\n"
    )
    batches = list(iter_batches(str(csv), batch_size=10))
    assert batches == []
