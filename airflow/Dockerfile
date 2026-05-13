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
    "pyarrow>=15.0,<16.0" \
    "structlog>=24.0" \
    "typer>=0.12,<1.0" \
    "boto3>=1.34,<2.0" \
    "duckdb>=0.10,<1.0" \
    "xgboost>=2.0,<3.0" \
    "scikit-learn>=1.4,<2.0" \
    "pandas>=2.0,<3.0"

# Pre-install dbt packages at image build time so they live outside the
# virtiofs volume mount (Docker Desktop virtiofs returns EAGAIN on reads
# from bind-mounted directories containing many small files like dbt_packages).
COPY --chown=airflow:airflow dbt/packages.yml /tmp/dbt_init/packages.yml
RUN printf 'name: taxi_pipeline\nversion: "1.0.0"\nconfig-version: 2\nprofile: taxi_pipeline\n' \
        > /tmp/dbt_init/dbt_project.yml \
    && mkdir -p /home/airflow/dbt_packages \
    && cd /tmp/dbt_init \
    && dbt deps --project-dir /tmp/dbt_init \
    && cp -r /tmp/dbt_init/dbt_packages/* /home/airflow/dbt_packages/ \
    && rm -rf /tmp/dbt_init
