"""Kafka consumer wrapper using confluent-kafka."""
from collections.abc import Iterator
from typing import Any

import structlog
from confluent_kafka import Consumer, KafkaError, Message

logger = structlog.get_logger(__name__)


class KafkaConsumer:
    """Subscribe to a Kafka topic and yield raw message values.

    Args:
        bootstrap_servers: Broker addresses.
        topic: Topic to subscribe to.
        group_id: Consumer group identifier.
        poll_timeout: Seconds to wait per poll call.
    """

    def __init__(
        self,
        bootstrap_servers: str,
        topic: str,
        group_id: str,
        poll_timeout: float = 1.0,
    ) -> None:
        self._topic = topic
        self._poll_timeout = poll_timeout
        self._consumer = Consumer(
            {
                "bootstrap.servers": bootstrap_servers,
                "group.id": group_id,
                "auto.offset.reset": "earliest",
                "enable.auto.commit": False,
            }
        )
        self._consumer.subscribe([topic])

    def poll(self) -> Message | None:
        """Poll once for a message.

        Returns:
            A confluent_kafka.Message, or None on timeout.
        """
        return self._consumer.poll(self._poll_timeout)

    def commit(self, message: Message) -> None:
        """Manually commit the offset for the given message.

        Args:
            message: The message whose offset should be committed.
        """
        self._consumer.commit(message=message, asynchronous=False)

    def close(self) -> None:
        """Close the consumer and release resources."""
        self._consumer.close()
