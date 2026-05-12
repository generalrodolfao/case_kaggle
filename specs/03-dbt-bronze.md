# Spec 03 — dbt Bronze (Tipagem + Dedup)

> Ordem de execução: 4ª (após `02-consumer`)
> Agente sugerido: `@agent-dbt-modeler`

## 1. Objetivo

Modelar a camada `bronze` em dbt-duckdb: ler os Parquets de `raw/`, aplicar tipagem forte, deduplicar por `key`, e particionar por `pickup_year/pickup_month`.

**Bronze NÃO faz limpeza de qualidade.** Essa responsabilidade é do silver.

## 2. Requisitos do Case Atendidos

- **R4** — Parte da estruturação do datalake (camada bronze)

## 3. Contrato

### Entrada
- Parquets em `s3://datalake/raw/ingestion_date=*/*.parquet`

### Saída
- Tabela `bronze.taxi_rides`
- Materialização: `external` (Parquet em `s3://datalake/bronze/`)
- Particionamento: `pickup_year=YYYY/pickup_month=MM`
- Schema:

| Coluna | Tipo |
|--------|------|
| `key` | VARCHAR (PK) |
| `pickup_datetime` | TIMESTAMP |
| `pickup_year` | SMALLINT |
| `pickup_month` | TINYINT |
| `pickup_longitude` | DOUBLE |
| `pickup_latitude` | DOUBLE |
| `dropoff_longitude` | DOUBLE |
| `dropoff_latitude` | DOUBLE |
| `passenger_count` | TINYINT |
| `fare_amount` | DOUBLE |
| `event_ts` | TIMESTAMP |
| `ingested_at` | TIMESTAMP DEFAULT NOW() |

### Comportamento
- Lê de `raw/` via `read_parquet` do DuckDB
- Cast de tipos com `TRY_CAST` (erros viram NULL, não quebram o modelo)
- Dedup por `key` mantendo o `event_ts` mais recente
- Adiciona `pickup_year`, `pickup_month` derivados de `pickup_datetime` (pro particionamento)

## 4. Implementação

### Estrutura
```
dbt/
├── dbt_project.yml
├── profiles.yml
└── models/bronze/
    ├── _bronze__sources.yml      # define raw/ como source
    ├── _bronze__models.yml       # docs + tests do bronze
    └── bronze_taxi_rides.sql
```

### SQL (esqueleto)
```sql
{{
  config(
    materialized='external',
    location="s3://datalake/bronze/taxi_rides/",
    format='parquet',
    partition_by=['pickup_year', 'pickup_month']
  )
}}

WITH raw AS (
  SELECT
    key,
    TRY_CAST(pickup_datetime AS TIMESTAMP) AS pickup_datetime,
    TRY_CAST(pickup_longitude AS DOUBLE) AS pickup_longitude,
    TRY_CAST(pickup_latitude AS DOUBLE) AS pickup_latitude,
    TRY_CAST(dropoff_longitude AS DOUBLE) AS dropoff_longitude,
    TRY_CAST(dropoff_latitude AS DOUBLE) AS dropoff_latitude,
    TRY_CAST(passenger_count AS TINYINT) AS passenger_count,
    TRY_CAST(fare_amount AS DOUBLE) AS fare_amount,
    TRY_CAST(event_ts AS TIMESTAMP) AS event_ts
  FROM {{ source('raw', 'taxi_rides_raw') }}
),
deduped AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY key ORDER BY event_ts DESC) AS rn
  FROM raw
  WHERE key IS NOT NULL
)
SELECT
  key,
  pickup_datetime,
  EXTRACT(YEAR FROM pickup_datetime)::SMALLINT AS pickup_year,
  EXTRACT(MONTH FROM pickup_datetime)::TINYINT AS pickup_month,
  pickup_longitude,
  pickup_latitude,
  dropoff_longitude,
  dropoff_latitude,
  passenger_count,
  fare_amount,
  event_ts,
  CURRENT_TIMESTAMP AS ingested_at
FROM deduped
WHERE rn = 1
```

## 5. Testes dbt (Critério Mínimo)

Em `_bronze__models.yml`:

```yaml
version: 2
models:
  - name: bronze_taxi_rides
    description: "Camada bronze: tipos enforçados, dedup por key."
    columns:
      - name: key
        tests:
          - unique
          - not_null
      - name: pickup_datetime
        tests:
          - not_null
      - name: pickup_year
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 2009
              max_value: 2015
      - name: pickup_month
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 1
              max_value: 12
```

## 6. Critério de Aceite

- [ ] `dbt run --select bronze_taxi_rides` executa sem erro
- [ ] `dbt test --select bronze_taxi_rides` 100% verde
- [ ] Parquet escrito em `s3://datalake/bronze/taxi_rides/pickup_year=YYYY/pickup_month=MM/`
- [ ] Sem duplicatas de `key` (testado)
- [ ] `dbt docs generate` produz documentação navegável
- [ ] `dbt build --select bronze_taxi_rides` (run + test) ≤ 2 min para 1M linhas

## 7. Comandos de Verificação

```bash
cd dbt
dbt deps
dbt run --select bronze_taxi_rides
dbt test --select bronze_taxi_rides
dbt docs generate
dbt docs serve  # http://localhost:8080
```

## 8. Referências

- `.claude/skills/data-quality-rules/SKILL.md`
- `.claude/skills/parquet-conventions/SKILL.md`
- `docs/adr/0003-medallion-layers.md`
