"""Consumer configuration loaded from environment variables."""
from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ConsumerConfig(BaseSettings):
    """Settings for the Kafka consumer and S3 writer.

    Attributes:
        kafka_bootstrap_servers: Kafka broker addresses.
        kafka_topic: Topic to subscribe to.
        kafka_group_id: Consumer group identifier.
        s3_endpoint: MinIO/S3 endpoint URL with protocol.
        s3_access_key: S3 access key.
        s3_secret_key: S3 secret key.
        s3_bucket: Destination bucket name.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    kafka_bootstrap_servers: str = Field(default="redpanda:9092")
    kafka_topic: str = Field(default="taxi-rides")
    kafka_group_id: str = Field(default="taxi-consumer")
    s3_endpoint: str = Field(default="http://minio:9000")
    s3_access_key: str = Field(default="minio")
    s3_secret_key: str = Field(default="CHANGE_ME")
    s3_bucket: str = Field(default="datalake")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def s3_endpoint_host(self) -> str:
        """S3 endpoint without protocol prefix (required by pyarrow.fs.S3FileSystem)."""
        return self.s3_endpoint.replace("http://", "").replace("https://", "")
