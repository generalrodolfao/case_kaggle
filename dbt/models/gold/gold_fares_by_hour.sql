{{
  config(materialized='external', location="s3://datalake/gold/fares_by_hour.parquet", format='parquet')
}}

SELECT
  pickup_hour,
  COUNT(*)                                             AS total_rides,
  AVG(fare_amount)                                     AS avg_fare,
  SUM(fare_amount)                                     AS total_revenue,
  AVG(trip_distance_km)                                AS avg_distance_km,
  AVG(fare_amount / NULLIF(trip_distance_km, 0))       AS avg_fare_per_km
FROM {{ ref('silver_taxi_rides') }}
WHERE trip_distance_km > 0
GROUP BY pickup_hour
ORDER BY pickup_hour
