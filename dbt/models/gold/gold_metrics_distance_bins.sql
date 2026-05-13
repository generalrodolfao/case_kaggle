{{
  config(materialized='external', location="s3://datalake/gold/metrics_distance_bins.parquet", format='parquet')
}}

-- $/km por faixa de distância + classificação de tipo de corrida — métricas #43-45 do checklist.
SELECT
  FLOOR(trip_distance_km)::INTEGER                          AS distance_bin_km,
  CASE
    WHEN trip_distance_km <  3.0 THEN 'urban'
    WHEN trip_distance_km <= 20.0 THEN 'suburban'
    ELSE 'long_haul'
  END                                                       AS trip_type,
  COUNT(*)                                                  AS total_rides,
  AVG(fare_amount)                                          AS avg_fare,
  SUM(fare_amount) / NULLIF(SUM(trip_distance_km), 0)      AS fare_per_km,
  AVG(trip_distance_km)                                     AS avg_distance_km,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fare_amount) AS median_fare,
  COUNT(*) FILTER (WHERE is_airport_trip)                   AS airport_trips
FROM {{ ref('silver_taxi_rides') }}
WHERE trip_distance_km > 0
GROUP BY distance_bin_km, trip_type
ORDER BY distance_bin_km
