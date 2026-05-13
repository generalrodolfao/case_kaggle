{{
  config(materialized='external', location="s3://datalake/gold/metrics_fare_bins.parquet", format='parquet')
}}

-- Histograma de fare_amount em bins de $5 — métrica #33 do checklist.
SELECT
  (FLOOR(fare_amount / 5) * 5)::INTEGER       AS fare_bin_start,
  (FLOOR(fare_amount / 5) * 5 + 5)::INTEGER   AS fare_bin_end,
  COUNT(*)                                      AS total_rides,
  AVG(fare_amount)                              AS avg_fare_in_bin
FROM {{ ref('silver_taxi_rides') }}
GROUP BY fare_bin_start, fare_bin_end
ORDER BY fare_bin_start
