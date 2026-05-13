{{
  config(materialized='external', location="s3://datalake/gold/fares_by_zone.parquet", format='parquet')
}}

SELECT
  pickup_zone,
  COUNT(*)              AS total_rides,
  AVG(fare_amount)      AS avg_fare,
  SUM(fare_amount)      AS total_revenue,
  AVG(trip_distance_km) AS avg_distance_km,
  AVG(passenger_count)  AS avg_passengers
FROM {{ ref('silver_taxi_rides') }}
GROUP BY pickup_zone
ORDER BY total_revenue DESC
