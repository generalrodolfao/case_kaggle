{{
  config(materialized='external', location="s3://datalake/gold/metrics_fare_by_passenger.parquet", format='parquet')
}}

-- Box-plot de fare_amount por passenger_count — métrica #36 do checklist.
SELECT
  passenger_count,
  COUNT(*)                                                               AS total_rides,
  MIN(fare_amount)                                                       AS min_fare,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY fare_amount)             AS q1_fare,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY fare_amount)             AS median_fare,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fare_amount)             AS q3_fare,
  MAX(fare_amount)                                                       AS max_fare,
  AVG(fare_amount)                                                       AS avg_fare,
  STDDEV(fare_amount)                                                    AS stddev_fare,
  AVG(trip_distance_km)                                                  AS avg_distance_km,
  SUM(fare_amount) / NULLIF(SUM(trip_distance_km), 0)                   AS fare_per_km
FROM {{ ref('silver_taxi_rides') }}
GROUP BY passenger_count
ORDER BY passenger_count
