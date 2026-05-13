{{
  config(materialized='external', location="s3://datalake/gold/metrics_overview.parquet", format='parquet')
}}

-- KPIs globais: #1-9, percentis P25-P99, flags de qualidade — seção 1.1 + 1.4 do checklist.
SELECT
  COUNT(*)                                                                 AS total_rides,
  AVG(fare_amount)                                                         AS avg_fare,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fare_amount)                AS median_fare,
  SUM(fare_amount)                                                         AS total_revenue,
  AVG(trip_distance_km)                                                    AS avg_distance_km,
  SUM(trip_distance_km)                                                    AS total_distance_km,
  SUM(fare_amount) / NULLIF(SUM(trip_distance_km), 0)                     AS fare_per_km,
  AVG(passenger_count)                                                     AS avg_passenger_count,
  STDDEV(fare_amount)                                                      AS stddev_fare,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY fare_amount)               AS p25_fare,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fare_amount)               AS p75_fare,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY fare_amount)               AS p90_fare,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY fare_amount)               AS p95_fare,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY fare_amount)               AS p99_fare,
  COUNT(*) FILTER (WHERE trip_distance_km < 0.5)                          AS short_trips_count,
  COUNT(*) FILTER (WHERE trip_distance_km < 0.5)::DOUBLE / COUNT(*)       AS short_trips_pct,
  COUNT(*) FILTER (WHERE is_airport_trip)                                  AS airport_trips_count,
  COUNT(*) FILTER (WHERE is_airport_trip)::DOUBLE / COUNT(*)               AS airport_trips_pct,
  COUNT(*) FILTER (WHERE is_rush_hour)::DOUBLE / COUNT(*)                  AS rush_hour_pct,
  COUNT(*) FILTER (WHERE is_night_shift)::DOUBLE / COUNT(*)                AS night_shift_pct,
  COUNT(*) FILTER (WHERE is_weekend)::DOUBLE / COUNT(*)                    AS weekend_pct
FROM {{ ref('silver_taxi_rides') }}
WHERE trip_distance_km > 0
