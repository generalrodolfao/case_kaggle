{{
  config(materialized='external', location="s3://datalake/gold/metrics_time_flags.parquet", format='parquet')
}}

-- Breakdown por combinação rush/night/weekend — métricas #20-22 do checklist.
SELECT
  is_rush_hour,
  is_night_shift,
  is_weekend,
  COUNT(*)                                                  AS total_rides,
  AVG(fare_amount)                                          AS avg_fare,
  SUM(fare_amount)                                          AS total_revenue,
  AVG(trip_distance_km)                                     AS avg_distance_km,
  SUM(fare_amount) / NULLIF(SUM(trip_distance_km), 0)      AS fare_per_km,
  AVG(passenger_count)                                      AS avg_passenger_count
FROM {{ ref('silver_taxi_rides') }}
GROUP BY is_rush_hour, is_night_shift, is_weekend
ORDER BY is_rush_hour, is_night_shift, is_weekend
