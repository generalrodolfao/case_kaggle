"""Tests for producer.publisher.KafkaPublisher."""
import json
from unittest.mock import MagicMock

import pytest

from producer.publisher import KafkaPublisher


def test_publisher_produce_called_with_correct_topic(mock_kafka_producer):
    pub = KafkaPublisher(bootstrap_servers="localhost:9092", topic="taxi-rides")
    pub.publish(key="k1", value={"fare_amount": 10.0})
    mock_kafka_producer.produce.assert_called_once()
    kwargs = mock_kafka_producer.produce.call_args.kwargs
    assert kwargs["topic"] == "taxi-rides"


def test_publisher_key_is_bytes(mock_kafka_producer):
    pub = KafkaPublisher(bootstrap_servers="localhost:9092", topic="taxi-rides")
    pub.publish(key="my-key", value={})
    kwargs = mock_kafka_producer.produce.call_args.kwargs
    assert kwargs["key"] == b"my-key"


def test_publisher_value_is_valid_json_bytes(mock_kafka_producer):
    pub = KafkaPublisher(bootstrap_servers="localhost:9092", topic="taxi-rides")
    pub.publish(key="k1", value={"fare_amount": 52.0})
    kwargs = mock_kafka_producer.produce.call_args.kwargs
    decoded = json.loads(kwargs["value"].decode("utf-8"))
    assert decoded["fare_amount"] == 52.0


def test_publisher_flush_returns_zero_on_success(mock_kafka_producer):
    pub = KafkaPublisher(bootstrap_servers="localhost:9092", topic="taxi-rides")
    result = pub.flush()
    mock_kafka_producer.flush.assert_called_once()
    assert result == 0


def test_publisher_poll_called_after_produce(mock_kafka_producer):
    pub = KafkaPublisher(bootstrap_servers="localhost:9092", topic="taxi-rides")
    pub.publish(key="k1", value={})
    mock_kafka_producer.poll.assert_called_with(0)
