{{
  config(materialized='external', location="s3://datalake/gold/data_quality.parquet", format='parquet')
}}

-- Auditoria de qualidade do silver — métricas #47-50 do checklist.
-- Nota: contagens do raw (#46, #48, #49) requerem acesso ao bronze e estão fora deste escopo.
SELECT
  COUNT(*)                                                                   AS total_rides_silver,
  -- Nulos por coluna
  COUNT(*) FILTER (WHERE fare_amount IS NULL)                               AS null_fare_count,
  COUNT(*) FILTER (WHERE passenger_count IS NULL)                           AS null_passenger_count,
  COUNT(*) FILTER (WHERE pickup_longitude IS NULL)                          AS null_pickup_lon,
  COUNT(*) FILTER (WHERE pickup_latitude IS NULL)                           AS null_pickup_lat,
  COUNT(*) FILTER (WHERE dropoff_longitude IS NULL)                         AS null_dropoff_lon,
  COUNT(*) FILTER (WHERE dropoff_latitude IS NULL)                          AS null_dropoff_lat,
  COUNT(*) FILTER (WHERE trip_distance_km IS NULL)                          AS null_distance,
  -- Percentuais de nulo
  COUNT(*) FILTER (WHERE fare_amount IS NULL)::DOUBLE / COUNT(*)            AS pct_null_fare,
  COUNT(*) FILTER (WHERE trip_distance_km IS NULL)::DOUBLE / COUNT(*)       AS pct_null_distance,
  -- Corridas suspeitas
  COUNT(*) FILTER (WHERE trip_distance_km < 0.5)                           AS suspicious_short_trips,
  COUNT(*) FILTER (WHERE trip_distance_km < 0.5)::DOUBLE / COUNT(*)        AS pct_short_trips,
  -- Aeroporto
  COUNT(*) FILTER (WHERE is_airport_trip)                                   AS airport_trips,
  COUNT(*) FILTER (WHERE is_airport_trip)::DOUBLE / COUNT(*)                AS pct_airport_trips,
  -- Ranges
  MIN(pickup_datetime)                                                       AS min_pickup_dt,
  MAX(pickup_datetime)                                                       AS max_pickup_dt,
  MIN(fare_amount)                                                           AS min_fare,
  MAX(fare_amount)                                                           AS max_fare,
  MIN(trip_distance_km)                                                      AS min_distance_km,
  MAX(trip_distance_km)                                                      AS max_distance_km,
  MIN(passenger_count)                                                       AS min_passenger_count,
  MAX(passenger_count)                                                       AS max_passenger_count
FROM {{ ref('silver_taxi_rides') }}
