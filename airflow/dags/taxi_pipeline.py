"""DAG taxi_pipeline — orquestra consumer → bronze → silver → gold."""
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

with DAG(
    dag_id="taxi_pipeline",
    description="NYC Taxi: consumer Kafka → bronze → silver → gold via dbt-duckdb",
    start_date=datetime(2026, 5, 12),
    schedule="@daily",
    catchup=False,
    default_args=_DEFAULT_ARGS,
    tags=["taxi", "datalake", "case"],
    doc_md="""
## taxi_pipeline

Pipeline diário que:
1. Consome eventos do tópico Kafka `taxi-rides` para a data de execução
2. Roda `dbt run + test` nas camadas bronze, silver e gold
3. Exporta documentação do dbt

**Falha em qualquer camada interrompe as camadas subsequentes.**
""",
) as dag:

    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    # ── Consumer ──────────────────────────────────────────────────────────────
    run_consumer = BashOperator(
        task_id="run_consumer",
        bash_command=(
            "python -m consumer.main "
            "--start-date {{ ds }} "
            "--end-date {{ data_interval_end | ds }} "
            "--max-events 100000 "
            "--idle-exit-secs 60"
        ),
        doc_md="Consome até 100k eventos do Kafka para a data de execução.",
    )

    # Flags comuns: redireciona target e logs pra /tmp (virtiofs no Docker Desktop
    # retorna EAGAIN em leituras/escritas de certos arquivos em bind mounts).
    _DBT_FLAGS = "--profiles-dir /opt/dbt"
    _DBT_GLOBAL = "--log-path /tmp/dbt_logs"
    # DUCKDB_MEMORY_LIMIT: respeita override externo; padrão 3GB (headroom da VM Docker).
    # preserve_insertion_order=false reduz pico de memória no COPY TO particionado.
    _DBT_ENV = (
        "DUCKDB_MEMORY_LIMIT=${DUCKDB_MEMORY_LIMIT:-3GB} "
        "DUCKDB_THREADS=${DUCKDB_THREADS:-2} "
    )

    # ── Bronze ────────────────────────────────────────────────────────────────
    dbt_run_bronze = BashOperator(
        task_id="dbt_run_bronze",
        bash_command=f"cd /opt/dbt && {_DBT_ENV} dbt {_DBT_GLOBAL} run {_DBT_FLAGS} --select bronze_taxi_rides",
        doc_md="Materializa camada bronze: TRY_CAST + dedup por key.",
    )

    dbt_test_bronze = BashOperator(
        task_id="dbt_test_bronze",
        bash_command=f"cd /opt/dbt && {_DBT_ENV} dbt {_DBT_GLOBAL} test {_DBT_FLAGS} --select bronze_taxi_rides",
        doc_md="Testa unique/not_null/range no bronze.",
    )

    # ── Silver ────────────────────────────────────────────────────────────────
    dbt_run_silver = BashOperator(
        task_id="dbt_run_silver",
        bash_command=f"cd /opt/dbt && {_DBT_ENV} dbt {_DBT_GLOBAL} run {_DBT_FLAGS} --select silver_taxi_rides",
        doc_md="Materializa camada silver: filtros de qualidade + enriquecimento.",
    )

    dbt_test_silver = BashOperator(
        task_id="dbt_test_silver",
        bash_command=f"cd /opt/dbt && {_DBT_ENV} dbt {_DBT_GLOBAL} test {_DBT_FLAGS} --select silver_taxi_rides",
        doc_md="Testa qualidade, coordenadas, Null Island no silver.",
    )

    # ── Gold ──────────────────────────────────────────────────────────────────
    dbt_run_gold = BashOperator(
        task_id="dbt_run_gold",
        bash_command=f"cd /opt/dbt && {_DBT_ENV} dbt {_DBT_GLOBAL} run {_DBT_FLAGS} --select gold",
        doc_md="Materializa os 4 modelos gold.",
    )

    dbt_test_gold = BashOperator(
        task_id="dbt_test_gold",
        bash_command=f"cd /opt/dbt && {_DBT_ENV} dbt {_DBT_GLOBAL} test {_DBT_FLAGS} --select gold",
        doc_md="Testa unicidade e ranges nos modelos gold.",
    )

    # ── Pipeline ──────────────────────────────────────────────────────────────
    (
        start
        >> run_consumer
        >> dbt_run_bronze >> dbt_test_bronze
        >> dbt_run_silver >> dbt_test_silver
        >> dbt_run_gold   >> dbt_test_gold
        >> end
    )
