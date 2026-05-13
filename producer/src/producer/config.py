"""Producer configuration loaded from environment variables."""
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ProducerConfig(BaseSettings):
    """Settings for the Kafka producer.

    Attributes:
        kafka_bootstrap_servers: Comma-separated broker addresses.
        kafka_topic: Kafka topic to publish to.
        producer_batch_size: Rows per Polars read batch.
        producer_rate_limit_per_sec: Max events/second (0 = unlimited).
        producer_max_events: Max events total (0 = all).
        data_path: Path to the input CSV file.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    kafka_bootstrap_servers: str = Field(default="redpanda:9092")
    kafka_topic: str = Field(default="taxi-rides")
    producer_batch_size: int = Field(default=1000, ge=1)
    producer_rate_limit_per_sec: int = Field(default=5000, ge=0)
    producer_max_events: int = Field(default=0, ge=0)
    data_path: str = Field(default="/data/train.csv")
