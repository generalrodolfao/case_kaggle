{{
  config(materialized='external', location="s3://datalake/gold/fares_hourly_heatmap.parquet", format='parquet')
}}

SELECT
  pickup_dow,
  pickup_hour,
  COUNT(*)         AS total_rides,
  AVG(fare_amount) AS avg_fare
FROM {{ ref('silver_taxi_rides') }}
GROUP BY pickup_dow, pickup_hour
ORDER BY pickup_dow, pickup_hour
