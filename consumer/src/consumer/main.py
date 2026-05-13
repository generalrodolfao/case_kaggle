"""Consumer CLI — reads Kafka, filters, writes Parquet to MinIO."""
import signal
import time
from datetime import date, datetime, timezone
from typing import Optional

import structlog
import typer

from consumer.config import ConsumerConfig
from consumer.consumer import KafkaConsumer
from consumer.filters import parse_event, passes_filters
from consumer.writer import ParquetWriter
from consumer.zones import VALID_ZONE_NAMES

logger = structlog.get_logger(__name__)
app = typer.Typer(add_completion=False)


def _configure_logging() -> None:
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(20),
    )


def _parse_bbox(value: str) -> tuple[float, float, float, float]:
    """Parse 'lon_min,lat_min,lon_max,lat_max' into a 4-tuple.

    Args:
        value: Comma-separated coordinate string.

    Returns:
        Tuple of (lon_min, lat_min, lon_max, lat_max).

    Raises:
        ValueError: If the string cannot be parsed into 4 floats.
    """
    parts = value.split(",")
    if len(parts) != 4:
        raise ValueError(f"--bbox must have exactly 4 values, got: {value}")
    return tuple(float(p) for p in parts)  # type: ignore[return-value]


def run_consumer_loop(
    consumer: KafkaConsumer,
    writer: ParquetWriter,
    start: date,
    end: date,
    zone: Optional[str],
    bbox: Optional[tuple[float, float, float, float]],
    batch_size: int,
    max_events: int,
    ingestion_date: Optional[date] = None,
    idle_flush_secs: float = 10.0,
    idle_exit_secs: float = 0.0,
) -> tuple[int, int]:
    """Consume Kafka messages, filter, and flush to Parquet.

    Runs until max_events is reached, a shutdown signal is received,
    or idle_exit_secs of complete silence elapses (if > 0).

    Args:
        consumer: KafkaConsumer to poll messages from.
        writer: ParquetWriter to persist filtered events.
        start: Inclusive start date filter (pickup_datetime).
        end: Inclusive end date filter (pickup_datetime).
        zone: Optional named zone filter.
        bbox: Optional bounding-box filter tuple.
        batch_size: Buffer size before flushing to Parquet.
        max_events: Total events to consume (0 = unlimited).
        ingestion_date: Override partition date (defaults to today UTC).
        idle_flush_secs: Seconds of idle before partial flush.
        idle_exit_secs: Exit after this many idle seconds (0 = never).

    Returns:
        Tuple of (total_consumed, total_written).
    """
    if ingestion_date is None:
        ingestion_date = datetime.now(tz=timezone.utc).date()

    shutdown = False
    buffer: list[dict] = []
    last_flush = time.monotonic()
    last_activity = time.monotonic()
    total_consumed = 0
    total_written = 0
    last_msg = None

    def _handle_signal(sig: int, _frame: object) -> None:
        nonlocal shutdown
        logger.info("shutdown_requested", signal=sig)
        shutdown = True

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    try:
        while not shutdown:
            if max_events > 0 and total_consumed >= max_events:
                break

            msg = consumer.poll()

            if msg is None:
                now = time.monotonic()
                if buffer and (now - last_flush) >= idle_flush_secs:
                    total_written += writer.flush(buffer, ingestion_date)
                    if last_msg is not None:
                        consumer.commit(last_msg)
                    buffer.clear()
                    last_flush = now
                if idle_exit_secs > 0 and (now - last_activity) >= idle_exit_secs:
                    logger.info("idle_exit", idle_secs=round(now - last_activity, 1))
                    break
                continue

            if msg.error():
                logger.warning("kafka_error", error=str(msg.error()))
                consumer.commit(msg)
                continue

            total_consumed += 1
            last_msg = msg
            last_activity = time.monotonic()

            try:
                event = parse_event(msg.value())
            except Exception as exc:
                logger.warning("parse_failed", error=str(exc))
                consumer.commit(msg)
                continue

            if passes_filters(event, start, end, zone, bbox):
                buffer.append(event)

            if len(buffer) >= batch_size:
                total_written += writer.flush(buffer, ingestion_date)
                consumer.commit(msg)
                buffer.clear()
                last_flush = time.monotonic()

    finally:
        if buffer:
            total_written += writer.flush(buffer, ingestion_date)
        consumer.close()
        logger.info("consumer_done", total_consumed=total_consumed, total_written=total_written)

    return total_consumed, total_written


@app.command()
def main(
    start_date: str = typer.Option(..., help="Inclusive start date (YYYY-MM-DD)"),
    end_date: str = typer.Option(..., help="Inclusive end date (YYYY-MM-DD)"),
    zone: Optional[str] = typer.Option(
        None, help=f"Named zone: {', '.join(sorted(VALID_ZONE_NAMES))}"
    ),
    bbox: Optional[str] = typer.Option(
        None, help="Bounding box: lon_min,lat_min,lon_max,lat_max"
    ),
    batch_size: int = typer.Option(10_000, help="Events to buffer before writing Parquet"),
    max_events: int = typer.Option(0, help="Max events to consume (0=unlimited)"),
    idle_exit_secs: float = typer.Option(0.0, help="Exit after N idle seconds (0=never)"),
) -> None:
    """Consume taxi ride events from Kafka, filter, and write Parquet to MinIO."""
    _configure_logging()

    if zone and bbox:
        typer.echo("Error: --zone and --bbox are mutually exclusive.", err=True)
        raise typer.Exit(code=1)

    if zone and zone not in VALID_ZONE_NAMES:
        typer.echo(f"Error: unknown zone '{zone}'. Valid: {sorted(VALID_ZONE_NAMES)}", err=True)
        raise typer.Exit(code=1)

    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    parsed_bbox = _parse_bbox(bbox) if bbox else None

    config = ConsumerConfig()
    writer = ParquetWriter(
        endpoint=config.s3_endpoint_host,
        access_key=config.s3_access_key,
        secret_key=config.s3_secret_key,
        bucket=config.s3_bucket,
    )
    consumer = KafkaConsumer(
        bootstrap_servers=config.kafka_bootstrap_servers,
        topic=config.kafka_topic,
        group_id=config.kafka_group_id,
    )

    logger.info("consumer_starting", start=start_date, end=end_date, zone=zone, bbox=bbox)
    run_consumer_loop(
        consumer, writer, start, end, zone, parsed_bbox, batch_size, max_events,
        idle_exit_secs=idle_exit_secs,
    )


if __name__ == "__main__":
    app()
