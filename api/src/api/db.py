"""DuckDB connection factory with MinIO/S3 configuration."""
import duckdb

from api.config import ApiConfig


def make_conn(cfg: ApiConfig) -> duckdb.DuckDBPyConnection:
    """Open an in-memory DuckDB connection pointed at MinIO via httpfs.

    Args:
        cfg: API config carrying S3 credentials.

    Returns:
        Configured DuckDB connection (caller must close it).
    """
    host = cfg.s3_endpoint.removeprefix("http://").removeprefix("https://")
    con = duckdb.connect()
    con.execute(f"""
        INSTALL httpfs; LOAD httpfs;
        SET s3_endpoint='{host}';
        SET s3_access_key_id='{cfg.s3_access_key}';
        SET s3_secret_access_key='{cfg.s3_secret_key}';
        SET s3_use_ssl=false;
        SET s3_url_style='path';
    """)
    return con
