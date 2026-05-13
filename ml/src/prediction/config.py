"""Prediction module settings."""
from pydantic_settings import BaseSettings


class PredictionConfig(BaseSettings):
    """Runtime config loaded from environment / .env."""

    s3_endpoint: str = "http://minio:9000"
    s3_access_key: str = "minio"
    s3_secret_key: str = "CHANGE_ME"
    s3_bucket: str = "datalake"

    silver_path: str = "silver/taxi_rides"
    model_s3_key: str = "models/fare_predictor.pkl"
    predictions_s3_key: str = "gold/fare_predictions.parquet"

    train_sample_rows: int = 5_000_000
    test_size: float = 0.2
    random_state: int = 42

    # XGBoost hyper-params — kept conservative for a case context
    n_estimators: int = 300
    max_depth: int = 6
    learning_rate: float = 0.1

    model_config = {"env_file": ".env", "extra": "ignore"}
