{{
  config(
    materialized='external',
    location="s3://datalake/bronze/taxi_rides",
    format='parquet',
    options={'partition_by': 'pickup_year, pickup_month', 'overwrite_or_ignore': 'true'}
  )
}}

-- Dedup via QUALIFY omitted: QUALIFY ROW_NUMBER() requer sort de todos os rows em memória
-- e causa OOM com datasets >=5M rows no ambiente de desenvolvimento (Docker VM com <4GB).
-- Garantia de unicidade: raw é limpo antes de cada run do consumer; consumer não re-lê offsets.
SELECT
  key,
  TRY_CAST(pickup_datetime AS TIMESTAMP)  AS pickup_datetime,
  EXTRACT(YEAR  FROM TRY_CAST(pickup_datetime AS TIMESTAMP))::SMALLINT AS pickup_year,
  EXTRACT(MONTH FROM TRY_CAST(pickup_datetime AS TIMESTAMP))::TINYINT  AS pickup_month,
  TRY_CAST(pickup_longitude  AS DOUBLE)   AS pickup_longitude,
  TRY_CAST(pickup_latitude   AS DOUBLE)   AS pickup_latitude,
  TRY_CAST(dropoff_longitude AS DOUBLE)   AS dropoff_longitude,
  TRY_CAST(dropoff_latitude  AS DOUBLE)   AS dropoff_latitude,
  TRY_CAST(passenger_count   AS TINYINT)  AS passenger_count,
  TRY_CAST(fare_amount       AS DOUBLE)   AS fare_amount,
  TRY_CAST(event_ts          AS TIMESTAMP) AS event_ts,
  CURRENT_TIMESTAMP AS ingested_at
FROM {{ source('raw', 'taxi_rides_raw') }}
WHERE key IS NOT NULL
