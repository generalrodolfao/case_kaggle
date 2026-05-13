"""API runtime settings."""
from pydantic_settings import BaseSettings

VALID_ZONES = {"jfk", "lga", "ewr", "manhattan", "brooklyn", "other"}


class ApiConfig(BaseSettings):
    """Loaded from environment variables or .env."""

    s3_endpoint: str = "http://minio:9000"
    s3_access_key: str = "minio"
    s3_secret_key: str = "CHANGE_ME"
    s3_bucket: str = "datalake"

    model_config = {"env_file": ".env", "extra": "ignore"}
