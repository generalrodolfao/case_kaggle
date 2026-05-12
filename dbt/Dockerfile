FROM python:3.11-slim

RUN pip install --no-cache-dir \
    "dbt-duckdb>=1.8,<2.0" \
    "dbt-utils>=1.2,<2.0"

WORKDIR /opt/dbt

ENTRYPOINT ["dbt"]
CMD ["--help"]
