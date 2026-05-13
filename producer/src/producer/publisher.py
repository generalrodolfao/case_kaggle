"""Kafka producer wrapper using confluent-kafka."""
import json
from typing import Any

import structlog
from confluent_kafka import Producer

logger = structlog.get_logger(__name__)


class KafkaPublisher:
    """Wraps confluent-kafka Producer for publishing taxi ride events.

    Args:
        bootstrap_servers: Comma-separated Kafka broker addresses.
        topic: Kafka topic to publish to.
    """

    def __init__(self, bootstrap_servers: str, topic: str) -> None:
        self._topic = topic
        self._producer = Producer(
            {
                "bootstrap.servers": bootstrap_servers,
                "queue.buffering.max.ms": 50,
                "compression.type": "lz4",
            }
        )

    def publish(self, key: str, value: dict[str, Any]) -> None:
        """Publish one event to the configured Kafka topic.

        Args:
            key: Message key used for partition assignment.
            value: Event payload; must be JSON-serializable.
        """
        self._producer.produce(
            topic=self._topic,
            key=key.encode("utf-8"),
            value=json.dumps(value).encode("utf-8"),
            on_delivery=self._on_delivery,
        )
        self._producer.poll(0)

    def flush(self, timeout: float = 30.0) -> int:
        """Flush all buffered messages.

        Args:
            timeout: Maximum seconds to wait for delivery.

        Returns:
            Number of messages still in the internal queue.
        """
        return self._producer.flush(timeout)

    @staticmethod
    def _on_delivery(err: Any, msg: Any) -> None:
        if err:
            logger.error("delivery_failed", topic=msg.topic(), error=str(err))
