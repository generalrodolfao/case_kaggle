"""Tests for consumer.consumer.KafkaConsumer and consumer.main.run_consumer_loop."""
import json
from datetime import date
from unittest.mock import MagicMock, patch

import pytest

from consumer.consumer import KafkaConsumer


# ─── KafkaConsumer unit tests ────────────────────────────────────────────────


@pytest.fixture
def mock_confluent_consumer():
    with patch("consumer.consumer.Consumer") as MockC:
        instance = MockC.return_value
        instance.poll = MagicMock(return_value=None)
        instance.commit = MagicMock()
        instance.subscribe = MagicMock()
        instance.close = MagicMock()
        yield instance


def test_kafka_consumer_subscribes_on_init(mock_confluent_consumer):
    KafkaConsumer("localhost:9092", "taxi-rides", "g1")
    mock_confluent_consumer.subscribe.assert_called_once_with(["taxi-rides"])


def test_kafka_consumer_poll_returns_none_on_timeout(mock_confluent_consumer):
    consumer = KafkaConsumer("localhost:9092", "taxi-rides", "g1")
    result = consumer.poll()
    assert result is None
    mock_confluent_consumer.poll.assert_called_once()


def test_kafka_consumer_commit_called(mock_confluent_consumer):
    consumer = KafkaConsumer("localhost:9092", "taxi-rides", "g1")
    msg = MagicMock()
    consumer.commit(msg)
    mock_confluent_consumer.commit.assert_called_once_with(message=msg, asynchronous=False)


def test_kafka_consumer_close_called(mock_confluent_consumer):
    consumer = KafkaConsumer("localhost:9092", "taxi-rides", "g1")
    consumer.close()
    mock_confluent_consumer.close.assert_called_once()


# ─── run_consumer_loop integration tests ──────────────────────────────────────


def _make_kafka_message(payload: dict) -> MagicMock:
    msg = MagicMock()
    msg.error.return_value = None
    msg.value.return_value = json.dumps(payload).encode("utf-8")
    return msg


@pytest.fixture
def fake_consumer(valid_event):
    """KafkaConsumer mock that yields one valid JFK event then None (EOF)."""
    mock = MagicMock(spec=KafkaConsumer)
    msg = _make_kafka_message(valid_event)
    mock.poll.side_effect = [msg, None, None]
    return mock


@pytest.fixture
def fake_writer():
    mock = MagicMock()
    mock.flush.return_value = 1
    return mock


def test_run_loop_consumes_and_filters(fake_consumer, fake_writer, valid_event):
    from consumer.main import run_consumer_loop

    consumed, written = run_consumer_loop(
        consumer=fake_consumer,
        writer=fake_writer,
        start=date(2014, 1, 1),
        end=date(2014, 1, 31),
        zone="jfk",
        bbox=None,
        batch_size=1,
        max_events=1,
        ingestion_date=date(2026, 5, 12),
    )
    assert consumed == 1
    fake_consumer.close.assert_called_once()


def test_run_loop_skips_events_outside_date(fake_consumer, fake_writer):
    from consumer.main import run_consumer_loop

    consumed, written = run_consumer_loop(
        consumer=fake_consumer,
        writer=fake_writer,
        start=date(2015, 1, 1),
        end=date(2015, 12, 31),
        zone=None,
        bbox=None,
        batch_size=100,
        max_events=1,
        ingestion_date=date(2026, 5, 12),
    )
    assert consumed == 1
    assert written == 0  # event filtered out by date — nothing written


def test_run_loop_closes_consumer_on_completion(fake_consumer, fake_writer):
    from consumer.main import run_consumer_loop

    run_consumer_loop(
        consumer=fake_consumer,
        writer=fake_writer,
        start=date(2014, 1, 1),
        end=date(2014, 1, 31),
        zone=None,
        bbox=None,
        batch_size=100,
        max_events=1,
        ingestion_date=date(2026, 5, 12),
    )
    fake_consumer.close.assert_called_once()


def test_run_loop_handles_kafka_error_message(fake_writer, valid_event):
    from consumer.main import run_consumer_loop

    err_msg = MagicMock()
    err_msg.error.return_value = MagicMock()  # truthy = has error

    # Good message after the error — allows max_events=1 to break the loop
    good_msg = _make_kafka_message(valid_event)

    consumer = MagicMock(spec=KafkaConsumer)
    consumer.poll.side_effect = [err_msg, good_msg, None]

    consumed, written = run_consumer_loop(
        consumer=consumer,
        writer=fake_writer,
        start=date(2014, 1, 1),
        end=date(2014, 1, 31),
        zone=None,
        bbox=None,
        batch_size=100,
        max_events=1,
        ingestion_date=date(2026, 5, 12),
    )
    assert consumed == 1  # only good messages count toward consumed
    consumer.close.assert_called_once()


def test_run_loop_handles_unparseable_message(fake_writer):
    from consumer.main import run_consumer_loop

    bad_msg = MagicMock()
    bad_msg.error.return_value = None
    bad_msg.value.return_value = b"not-json"

    consumer = MagicMock(spec=KafkaConsumer)
    consumer.poll.side_effect = [bad_msg, None, None]

    consumed, written = run_consumer_loop(
        consumer=consumer,
        writer=fake_writer,
        start=date(2014, 1, 1),
        end=date(2014, 1, 31),
        zone=None,
        bbox=None,
        batch_size=100,
        max_events=1,
        ingestion_date=date(2026, 5, 12),
    )
    assert consumed == 1
    assert written == 0  # bad message skipped — nothing written
    consumer.close.assert_called_once()
