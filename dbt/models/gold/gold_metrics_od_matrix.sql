{{
  config(materialized='external', location="s3://datalake/gold/metrics_od_matrix.parquet", format='parquet')
}}

-- Matriz origem-destino (OD) — métricas #24-26, #30-32 do checklist.
SELECT
  pickup_zone,
  dropoff_zone,
  COUNT(*)                                                  AS total_rides,
  AVG(fare_amount)                                          AS avg_fare,
  SUM(fare_amount)                                          AS total_revenue,
  AVG(trip_distance_km)                                     AS avg_distance_km,
  SUM(fare_amount) / NULLIF(SUM(trip_distance_km), 0)      AS fare_per_km,
  -- Convenience flags
  (pickup_zone = dropoff_zone)                              AS is_intra_zone,
  (pickup_zone = 'manhattan' AND dropoff_zone = 'manhattan') AS is_intra_manhattan
FROM {{ ref('silver_taxi_rides') }}
GROUP BY pickup_zone, dropoff_zone
ORDER BY total_rides DESC
