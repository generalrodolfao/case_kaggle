"""DAG metrics_pipeline — enriches silver and materializes analytics metrics to gold."""
from __future__ import annotations

from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.empty import EmptyOperator

_DEFAULT_ARGS = {
    "owner": "data-squad",
    "depends_on_past": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=2),
}

_DBT_FLAGS = "--profiles-dir /opt/dbt"
_DBT_GLOBAL = "--log-path /tmp/dbt_logs"
_DBT_ENV = (
    "DUCKDB_MEMORY_LIMIT=${DUCKDB_MEMORY_LIMIT:-3GB} "
    "DUCKDB_THREADS=${DUCKDB_THREADS:-2} "
)

_METRICS_MODELS = [
    "gold_metrics_overview",
    "gold_metrics_by_dow",
    "gold_metrics_by_month",
    "gold_metrics_time_flags",
    "gold_metrics_od_matrix",
    "gold_metrics_fare_bins",
    "gold_metrics_fare_by_passenger",
    "gold_metrics_distance_bins",
    "gold_data_quality",
]


def _dbt_run(model: str) -> str:
    return f"cd /opt/dbt && {_DBT_ENV} dbt {_DBT_GLOBAL} run {_DBT_FLAGS} --select {model}"


def _dbt_test(model: str) -> str:
    return f"cd /opt/dbt && {_DBT_ENV} dbt {_DBT_GLOBAL} test {_DBT_FLAGS} --select {model}"


with DAG(
    dag_id="metrics_pipeline",
    description="Enriches silver and materializes 9 analytics metrics tables to gold.",
    start_date=datetime(2026, 5, 12),
    schedule=None,  # trigger manually after taxi_pipeline
    catchup=False,
    default_args=_DEFAULT_ARGS,
    tags=["taxi", "metrics", "datalake", "case"],
    doc_md="""
## metrics_pipeline

Reconstrói o silver com colunas enriquecidas e materializa 9 tabelas gold de métricas.

### Pré-requisito
`taxi_pipeline` deve ter rodado o **bronze** antes desta DAG (o silver será rebuild aqui).

### Silver — novas colunas
`dropoff_zone`, `is_weekend`, `is_rush_hour`, `is_night_shift`, `is_airport_trip`,
`dist_jfk/lga/ewr_pickup/dropoff_km`, `dist_manhattan_center_pickup/dropoff_km`,
`bearing_degrees`, `pickup_minute/dayofyear/weekofyear/quarter`,
`years_since_2009`, `passenger_count_bin`.

### Gold — tabelas geradas
| Modelo | Conteúdo |
|---|---|
| `gold_metrics_overview` | KPIs globais + percentis P25–P99 |
| `gold_metrics_by_dow` | Análise por dia da semana |
| `gold_metrics_by_month` | Análise mensal (ano × mês) |
| `gold_metrics_time_flags` | Rush / night / weekend breakdown |
| `gold_metrics_od_matrix` | Matriz OD pickup_zone × dropoff_zone |
| `gold_metrics_fare_bins` | Histograma de fare em bins de $5 |
| `gold_metrics_fare_by_passenger` | Box-plot por passenger_count |
| `gold_metrics_distance_bins` | $/km por faixa de distância + trip_type |
| `gold_data_quality` | Auditoria de qualidade do silver |
""",
) as dag:

    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    # ── Silver refresh ─────────────────────────────────────────────────────────
    refresh_silver = BashOperator(
        task_id="refresh_silver",
        bash_command=_dbt_run("silver_taxi_rides"),
        doc_md="Rebuilds silver with enriched columns (zones, flags, airport distances, bearing).",
    )

    test_silver = BashOperator(
        task_id="test_silver",
        bash_command=_dbt_test("silver_taxi_rides"),
        doc_md="Validates silver quality before running metrics models.",
    )

    # ── Gold metrics — run (all in parallel after silver) ─────────────────────
    run_tasks = [
        BashOperator(
            task_id=f"run_{model}",
            bash_command=_dbt_run(model),
            doc_md=f"Materializes {model}.",
        )
        for model in _METRICS_MODELS
    ]

    # ── Gold metrics — test (each after its own run task) ─────────────────────
    test_tasks = [
        BashOperator(
            task_id=f"test_{model}",
            bash_command=_dbt_test(model),
            doc_md=f"Tests {model}.",
        )
        for model in _METRICS_MODELS
    ]

    # ── Pipeline wiring ────────────────────────────────────────────────────────
    start >> refresh_silver >> test_silver >> run_tasks

    for run_task, test_task in zip(run_tasks, test_tasks):
        run_task >> test_task

    test_tasks >> end
