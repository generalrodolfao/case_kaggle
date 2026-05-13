FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    "xgboost>=2.0,<3.0" \
    "scikit-learn>=1.4,<2.0" \
    "duckdb>=0.10,<1.0" \
    "boto3>=1.34,<2.0" \
    "pandas>=2.0,<3.0" \
    "pyarrow>=15.0,<16.0" \
    "pydantic-settings>=2.0,<3.0"

COPY src/ /app/src/
ENV PYTHONPATH=/app/src
