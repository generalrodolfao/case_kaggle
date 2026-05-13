"""DAG prediction_pipeline — treina XGBoost na silver e salva predições na gold."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.operators.python import PythonOperator

_DEFAULT_ARGS = {
    "owner": "data-squad",
    "depends_on_past": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}


def _train_and_save() -> None:
    """Load silver, train model, persist model + predictions to MinIO."""
    logging.basicConfig(level=logging.INFO)
    from prediction.config import PredictionConfig
    from prediction.persist import save_model, save_predictions
    from prediction.train import train

    cfg = PredictionConfig()
    result = train(cfg)
    save_model(result["model"], cfg)
    save_predictions(result["predictions_df"], cfg)
    m = result["metrics"]
    logging.getLogger(__name__).info(
        "Done — RMSE=%.2f  MAE=%.2f  R²=%.3f  n_train=%d  n_test=%d",
        m["rmse"], m["mae"], m["r2"], m["n_train"], m["n_test"],
    )


with DAG(
    dag_id="prediction_pipeline",
    description="Treina XGBoost na silver e exporta predições para gold/",
    start_date=datetime(2026, 5, 12),
    schedule="@weekly",
    catchup=False,
    default_args=_DEFAULT_ARGS,
    tags=["taxi", "ml", "prediction", "case"],
    doc_md="""
## prediction_pipeline

Pipeline semanal **independente** do taxi_pipeline principal.

### O que faz
1. Lê a camada **silver** (MinIO) via DuckDB + httpfs
   (amostra de até `TRAIN_SAMPLE_ROWS` linhas — padrão 5 M)
2. Features: `trip_distance_km`, `trip_distance_manhattan_km`, `pickup_hour`,
   `pickup_dow`, `pickup_month`, `passenger_count`, `pickup_zone`
3. Treina **XGBoost regressor** (80 % treino / 20 % teste)
4. Avalia RMSE / MAE / R² no hold-out
5. Salva modelo → `s3://datalake/models/fare_predictor.pkl`
6. Salva predições → `s3://datalake/gold/fare_predictions.parquet`

### Pré-requisito
`taxi_pipeline` (camada silver) deve ter rodado antes desta DAG.
""",
) as dag:

    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    train_and_save = PythonOperator(
        task_id="train_and_save",
        python_callable=_train_and_save,
        doc_md="Carrega silver, treina XGBoost, salva modelo e predições no MinIO.",
    )

    start >> train_and_save >> end
