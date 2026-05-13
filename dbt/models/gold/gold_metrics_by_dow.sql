{{
  config(materialized='external', location="s3://datalake/gold/metrics_by_dow.parquet", format='parquet')
}}

-- Corridas e tarifa por dia da semana — métricas #13-14 do checklist.
SELECT
  pickup_dow,
  COUNT(*)                                                  AS total_rides,
  AVG(fare_amount)                                          AS avg_fare,
  SUM(fare_amount)                                          AS total_revenue,
  AVG(trip_distance_km)                                     AS avg_distance_km,
  SUM(fare_amount) / NULLIF(SUM(trip_distance_km), 0)      AS fare_per_km,
  AVG(passenger_count)                                      AS avg_passenger_count,
  COUNT(*) FILTER (WHERE is_airport_trip)                   AS airport_trips,
  COUNT(*) FILTER (WHERE is_rush_hour)                      AS rush_hour_trips,
  COUNT(*) FILTER (WHERE is_night_shift)                    AS night_shift_trips
FROM {{ ref('silver_taxi_rides') }}
GROUP BY pickup_dow
ORDER BY pickup_dow
