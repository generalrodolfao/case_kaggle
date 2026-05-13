{{
  config(materialized='external', location="s3://datalake/gold/fares_by_day_zone.parquet", format='parquet')
}}

SELECT
  pickup_year,
  pickup_month,
  pickup_day,
  CAST(pickup_datetime AS DATE) AS pickup_date,
  pickup_zone,
  COUNT(*)             AS total_rides,
  SUM(fare_amount)     AS total_revenue,
  AVG(fare_amount)     AS avg_fare
FROM {{ ref('silver_taxi_rides') }}
GROUP BY pickup_year, pickup_month, pickup_day, CAST(pickup_datetime AS DATE), pickup_zone
ORDER BY pickup_date, pickup_zone
