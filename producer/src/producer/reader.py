"""Streaming CSV reader — line-by-line via csv.DictReader (avoids mmap SIGBUS on Docker)."""
import csv
from collections.abc import Iterator
from datetime import datetime, timezone

import structlog

from producer.schema import TaxiRideEvent

logger = structlog.get_logger(__name__)


def iter_batches(
    csv_path: str,
    batch_size: int = 1000,
    max_events: int = 0,
) -> Iterator[list[TaxiRideEvent]]:
    """Yield validated TaxiRideEvent batches from a CSV file without loading it whole.

    Args:
        csv_path: Filesystem path to the input CSV.
        batch_size: Number of CSV rows to accumulate per yielded batch.
        max_events: Maximum total validated events to yield (0 = unlimited).

    Yields:
        Non-empty lists of TaxiRideEvent (up to batch_size each).
    """
    total_published = 0
    total_skipped = 0
    batch: list[TaxiRideEvent] = []
    event_ts = datetime.now(tz=timezone.utc)

    with open(csv_path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            if max_events > 0 and total_published + len(batch) >= max_events:
                break
            try:
                event = TaxiRideEvent(
                    key=str(row["key"]),
                    pickup_datetime=str(row["pickup_datetime"]),
                    pickup_longitude=float(row["pickup_longitude"]),
                    pickup_latitude=float(row["pickup_latitude"]),
                    dropoff_longitude=float(row["dropoff_longitude"]),
                    dropoff_latitude=float(row["dropoff_latitude"]),
                    passenger_count=int(row["passenger_count"]),
                    fare_amount=float(row["fare_amount"]),
                    event_ts=event_ts,
                )
                batch.append(event)
            except Exception as exc:
                total_skipped += 1
                logger.warning("row_validation_failed", key=row.get("key"), error=str(exc))
                continue

            if len(batch) >= batch_size:
                yield batch
                total_published += len(batch)
                batch = []
                event_ts = datetime.now(tz=timezone.utc)
                if total_published % 100_000 == 0:
                    logger.info("progress", published=total_published, skipped=total_skipped)

    if batch:
        yield batch
        total_published += len(batch)

    logger.info("reader_done", total_published=total_published, total_skipped=total_skipped)
