"""Parquet writer to MinIO via PyArrow S3FileSystem."""
import uuid
from datetime import date, datetime, timezone
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq
import structlog
from pyarrow.fs import S3FileSystem

logger = structlog.get_logger(__name__)

_SCHEMA = pa.schema(
    [
        pa.field("key", pa.string()),
        pa.field("pickup_datetime", pa.string()),
        pa.field("pickup_longitude", pa.float32()),
        pa.field("pickup_latitude", pa.float32()),
        pa.field("dropoff_longitude", pa.float32()),
        pa.field("dropoff_latitude", pa.float32()),
        pa.field("passenger_count", pa.int32()),
        pa.field("fare_amount", pa.float32()),
        pa.field("event_ts", pa.string()),
        pa.field("ingestion_date", pa.string()),
    ]
)


def _make_fs(endpoint: str, access_key: str, secret_key: str) -> S3FileSystem:
    """Build a PyArrow S3FileSystem pointed at MinIO.

    Args:
        endpoint: Host:port without protocol (e.g. 'minio:9000').
        access_key: S3 access key.
        secret_key: S3 secret key.

    Returns:
        Configured S3FileSystem instance.
    """
    return S3FileSystem(
        endpoint_override=endpoint,
        access_key=access_key,
        secret_key=secret_key,
        scheme="http",
    )


class ParquetWriter:
    """Accumulates events and flushes them as partitioned Parquet files to S3.

    Args:
        endpoint: S3/MinIO host:port (no protocol).
        access_key: S3 access key.
        secret_key: S3 secret key.
        bucket: Destination bucket name.
    """

    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
    ) -> None:
        self._fs = _make_fs(endpoint, access_key, secret_key)
        self._bucket = bucket

    def flush(self, events: list[dict[str, Any]], ingestion_date: date) -> int:
        """Write a batch of events to Parquet, partitioned by ingestion_date.

        Args:
            events: List of parsed event dicts.
            ingestion_date: The partition date to assign to this batch.

        Returns:
            Number of rows written.

        Raises:
            Exception: Re-raises any write error after logging.
        """
        if not events:
            return 0

        date_str = ingestion_date.isoformat()

        rows = {
            "key": [e.get("key", "") for e in events],
            "pickup_datetime": [str(e.get("pickup_datetime", "")) for e in events],
            "pickup_longitude": [float(e.get("pickup_longitude", 0.0)) for e in events],
            "pickup_latitude": [float(e.get("pickup_latitude", 0.0)) for e in events],
            "dropoff_longitude": [float(e.get("dropoff_longitude", 0.0)) for e in events],
            "dropoff_latitude": [float(e.get("dropoff_latitude", 0.0)) for e in events],
            "passenger_count": [int(e.get("passenger_count", 0)) for e in events],
            "fare_amount": [float(e.get("fare_amount", 0.0)) for e in events],
            "event_ts": [str(e.get("event_ts", "")) for e in events],
            "ingestion_date": [date_str] * len(events),
        }

        table = pa.table(rows, schema=_SCHEMA)
        filename = f"part-{uuid.uuid4()}.parquet"
        path = f"{self._bucket}/raw/ingestion_date={date_str}/{filename}"

        try:
            pq.write_table(
                table,
                where=path,
                filesystem=self._fs,
                compression="snappy",
                row_group_size=100_000,
            )
            logger.info("parquet_written", path=path, rows=len(events))
        except Exception as exc:
            logger.error("parquet_write_failed", path=path, error=str(exc))
            raise

        return len(events)
