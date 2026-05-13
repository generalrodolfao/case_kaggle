FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    "fastapi>=0.111,<1.0" \
    "uvicorn[standard]>=0.29,<1.0" \
    "duckdb>=0.10,<1.0" \
    "pydantic-settings>=2.0,<3.0" \
    "pyarrow>=15.0,<16.0" \
    "pandas>=2.0,<3.0"

COPY src/ /app/src/
ENV PYTHONPATH=/app/src

EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
