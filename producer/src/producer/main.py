"""Producer CLI entry point."""
import argparse
import signal
import time
from types import FrameType
from typing import Any, Optional

import structlog

from producer.config import ProducerConfig
from producer.publisher import KafkaPublisher
from producer.reader import iter_batches

logger = structlog.get_logger(__name__)


def _configure_logging() -> None:
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(20),
    )


def run_pipeline(
    config: ProducerConfig,
    publisher: KafkaPublisher,
    max_events: int,
) -> int:
    """Execute the producer pipeline until completion or shutdown signal.

    Args:
        config: Producer configuration (batch size, rate limit, data path).
        publisher: Kafka publisher to send events to.
        max_events: Max events to publish; 0 means unlimited.

    Returns:
        Total number of events successfully published.
    """
    shutdown = False
    total = 0

    def _handle_signal(sig: int, _frame: Optional[FrameType]) -> None:
        nonlocal shutdown
        logger.info("shutdown_requested", signal=sig)
        shutdown = True

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    rate_limit = config.producer_rate_limit_per_sec

    for batch in iter_batches(config.data_path, config.producer_batch_size, max_events):
        if shutdown:
            break

        t0 = time.monotonic()
        for event in batch:
            publisher.publish(key=event.key, value=event.to_kafka_payload())
            total += 1

        if rate_limit > 0:
            elapsed = time.monotonic() - t0
            target = len(batch) / rate_limit
            if elapsed < target:
                time.sleep(target - elapsed)

    remaining = publisher.flush()
    logger.info("producer_done", total_published=total, queue_remaining=remaining)
    return total


def main() -> None:
    """Parse CLI args and run the producer."""
    _configure_logging()

    parser = argparse.ArgumentParser(description="NYC Taxi Kafka Producer")
    parser.add_argument(
        "--max-events",
        type=int,
        default=None,
        metavar="N",
        help="Maximum events to publish (default: from env / unlimited)",
    )
    args = parser.parse_args()

    config = ProducerConfig()
    max_events = args.max_events if args.max_events is not None else config.producer_max_events

    publisher = KafkaPublisher(
        bootstrap_servers=config.kafka_bootstrap_servers,
        topic=config.kafka_topic,
    )

    logger.info(
        "producer_starting",
        topic=config.kafka_topic,
        batch_size=config.producer_batch_size,
        max_events=max_events,
        data_path=config.data_path,
    )
    run_pipeline(config, publisher, max_events)


if __name__ == "__main__":
    main()
