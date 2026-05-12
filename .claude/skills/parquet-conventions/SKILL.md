# Skill: Parquet Conventions

> Padrões de escrita e particionamento Parquet para o datalake NYC Taxi.

## Particionamento por Camada

### Raw (Consumer → MinIO)
- **Partição:** `ingestion_date=YYYY-MM-DD/` (eixo de ingestão, não pickup_date)
- **Path:** `s3://datalake/raw/ingestion_date=2014-01-15/part-<uuid>.parquet`
- **Motivo:** raw é append-only; particionar por data de ingestão preserva reprocessamento

### Bronze (dbt)
- **Partição:** `pickup_year=YYYY/pickup_month=MM/`
- **Path:** `s3://datalake/bronze/taxi_rides/pickup_year=2014/pickup_month=01/`

### Silver (dbt)
- **Partição:** igual ao bronze
- **Path:** `s3://datalake/silver/taxi_rides/pickup_year=2014/pickup_month=01/`

### Gold
- Materialização `table` no DuckDB — sem arquivos Parquet externos

## Configurações de Arquivo

| Parâmetro | Valor |
|-----------|-------|
| Compressão | Snappy |
| Row group size | 100.000 linhas |
| Tamanho alvo por arquivo | 64–128 MB |
| Naming | `part-{uuid4()}.parquet` |

## Escrita no Consumer (PyArrow)

```python
import uuid
import pyarrow as pa
import pyarrow.parquet as pq
from pyarrow.fs import S3FileSystem

fs = S3FileSystem(
    endpoint_override="minio:9000",  # sem protocolo
    access_key="minio",
    secret_key="CHANGE_ME",
    scheme="http",
)

pq.write_to_dataset(
    table,
    root_path="datalake/raw",
    partition_cols=["ingestion_date"],
    filesystem=fs,
    compression="snappy",
    row_group_size=100_000,
    basename_template=f"part-{uuid.uuid4()}-{{i}}.parquet",
)
```

## Leitura no dbt (DuckDB Source)

```sql
-- Source definido em _bronze__sources.yml aponta para:
SELECT *
FROM read_parquet('s3://datalake/raw/**/*.parquet', hive_partitioning=true)

-- Pushdown de partição (DuckDB otimiza automaticamente)
WHERE ingestion_date = '2014-01-15'
```

## Naming Conventions dos Modelos dbt

| Modelo | Path no MinIO |
|--------|--------------|
| `bronze_taxi_rides` | `s3://datalake/bronze/taxi_rides/` |
| `silver_taxi_rides` | `s3://datalake/silver/taxi_rides/` |
| `gold_fares_by_hour` | DuckDB table |
| `gold_fares_by_zone` | DuckDB table |
| `gold_fares_by_day_zone` | DuckDB table |
| `gold_fares_hourly_heatmap` | DuckDB table |
