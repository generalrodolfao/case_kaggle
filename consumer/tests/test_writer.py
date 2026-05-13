"""Tests for consumer.writer.ParquetWriter."""
import io
from datetime import date
from unittest.mock import MagicMock, patch

import pyarrow.parquet as pq
import pytest

from consumer.writer import ParquetWriter


@pytest.fixture
def mock_s3fs():
    """Mock pyarrow S3FileSystem that captures written bytes."""
    with patch("consumer.writer.S3FileSystem") as MockFS:
        buf = io.BytesIO()
        mock_fs = MagicMock()
        mock_fs.open_output_stream.return_value.__enter__ = lambda s: buf
        mock_fs.open_output_stream.return_value.__exit__ = MagicMock(return_value=False)
        MockFS.return_value = mock_fs
        yield mock_fs


@pytest.fixture
def writer(mock_s3fs):
    return ParquetWriter(
        endpoint="minio:9000",
        access_key="minio",
        secret_key="CHANGE_ME",
        bucket="datalake",
    )


def test_writer_flush_returns_row_count(writer, valid_event):
    with patch("consumer.writer.pq.write_table"):
        count = writer.flush([valid_event], date(2014, 1, 15))
    assert count == 1


def test_writer_flush_empty_list_returns_zero(writer):
    count = writer.flush([], date(2014, 1, 15))
    assert count == 0


def test_writer_parquet_path_contains_ingestion_date(writer, valid_event):
    captured_path = []
    with patch("consumer.writer.pq.write_table") as mock_write:
        mock_write.side_effect = lambda table, where, **kw: captured_path.append(where)
        writer.flush([valid_event], date(2014, 1, 15))
    assert "ingestion_date=2014-01-15" in captured_path[0]


def test_writer_parquet_compression_is_snappy(writer, valid_event):
    captured_kwargs = {}
    with patch("consumer.writer.pq.write_table") as mock_write:
        mock_write.side_effect = lambda table, **kw: captured_kwargs.update(kw)
        writer.flush([valid_event], date(2014, 1, 15))
    assert captured_kwargs.get("compression") == "snappy"


def test_writer_parquet_row_group_size(writer, valid_event):
    captured_kwargs = {}
    with patch("consumer.writer.pq.write_table") as mock_write:
        mock_write.side_effect = lambda table, **kw: captured_kwargs.update(kw)
        writer.flush([valid_event], date(2014, 1, 15))
    assert captured_kwargs.get("row_group_size") == 100_000


def test_writer_reraises_on_error(writer, valid_event):
    with patch("consumer.writer.pq.write_table", side_effect=RuntimeError("disk full")):
        with pytest.raises(RuntimeError, match="disk full"):
            writer.flush([valid_event], date(2014, 1, 15))
