FROM apache/airflow:2.9.2-python3.11

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

USER airflow
RUN pip install --no-cache-dir \
    "dbt-duckdb>=1.8,<2.0" \
    "confluent-kafka>=2.3,<3.0" \
    "pydantic-settings>=2.0,<3.0" \
    "polars>=0.20,<1.0" \
    "pyarrow>=15.0,<16.0"
