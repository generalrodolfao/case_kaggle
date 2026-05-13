{{
  config(
    materialized='external',
    location="s3://datalake/silver/taxi_rides",
    format='parquet',
    options={'partition_by': 'pickup_year, pickup_month', 'overwrite_or_ignore': 'true'}
  )
}}

WITH filtered AS (
  SELECT
    key,
    pickup_datetime,
    pickup_year,
    pickup_month,
    EXTRACT(DAY     FROM pickup_datetime)::TINYINT  AS pickup_day,
    EXTRACT(HOUR    FROM pickup_datetime)::TINYINT  AS pickup_hour,
    EXTRACT(MINUTE  FROM pickup_datetime)::TINYINT  AS pickup_minute,
    EXTRACT(DOW     FROM pickup_datetime)::TINYINT  AS pickup_dow,
    EXTRACT(DOY     FROM pickup_datetime)::SMALLINT AS pickup_dayofyear,
    EXTRACT(WEEK    FROM pickup_datetime)::TINYINT  AS pickup_weekofyear,
    EXTRACT(QUARTER FROM pickup_datetime)::TINYINT  AS pickup_quarter,
    pickup_longitude,
    pickup_latitude,
    dropoff_longitude,
    dropoff_latitude,
    passenger_count,
    fare_amount,
    event_ts,
    ingested_at,
    {{ haversine_km('pickup_latitude', 'pickup_longitude', 'dropoff_latitude', 'dropoff_longitude') }}
      AS trip_distance_km,
    {{ manhattan_km('pickup_latitude', 'pickup_longitude', 'dropoff_latitude', 'dropoff_longitude') }}
      AS trip_distance_manhattan_km,
    {{ pickup_zone('pickup_longitude', 'pickup_latitude') }}   AS pickup_zone,
    {{ pickup_zone('dropoff_longitude', 'dropoff_latitude') }} AS dropoff_zone
  FROM {{ ref('bronze_taxi_rides') }}
  WHERE fare_amount > 0
    AND fare_amount <= 500
    AND passenger_count BETWEEN 1 AND 6
    AND pickup_latitude   BETWEEN 40.55 AND 42.0
    AND pickup_longitude  BETWEEN -76.0 AND -72.0
    AND dropoff_latitude  BETWEEN 40.55 AND 42.0
    AND dropoff_longitude BETWEEN -76.0 AND -72.0
    AND NOT (pickup_latitude  = 0 AND pickup_longitude  = 0)
    AND NOT (dropoff_latitude = 0 AND dropoff_longitude = 0)
    AND pickup_datetime BETWEEN '2009-01-01' AND '2015-07-01'
    AND pickup_datetime IS NOT NULL
    AND dropoff_latitude  IS NOT NULL
    AND dropoff_longitude IS NOT NULL
),

with_airports AS (
  SELECT *,
    -- Airport proximity — pickup
    {{ haversine_km('pickup_latitude', 'pickup_longitude', '40.6413', '-73.7781') }}  AS dist_jfk_pickup_km,
    {{ haversine_km('pickup_latitude', 'pickup_longitude', '40.7769', '-73.8740') }}  AS dist_lga_pickup_km,
    {{ haversine_km('pickup_latitude', 'pickup_longitude', '40.6895', '-74.1745') }}  AS dist_ewr_pickup_km,
    -- Airport proximity — dropoff
    {{ haversine_km('dropoff_latitude', 'dropoff_longitude', '40.6413', '-73.7781') }} AS dist_jfk_dropoff_km,
    {{ haversine_km('dropoff_latitude', 'dropoff_longitude', '40.7769', '-73.8740') }} AS dist_lga_dropoff_km,
    {{ haversine_km('dropoff_latitude', 'dropoff_longitude', '40.6895', '-74.1745') }} AS dist_ewr_dropoff_km,
    -- Manhattan center (Times Square)
    {{ haversine_km('pickup_latitude', 'pickup_longitude', '40.7580', '-73.9855') }}   AS dist_manhattan_center_pickup_km,
    {{ haversine_km('dropoff_latitude', 'dropoff_longitude', '40.7580', '-73.9855') }} AS dist_manhattan_center_dropoff_km,
    -- Bearing (forward azimuth, 0–360°)
    (DEGREES(ATAN2(
      SIN(RADIANS(dropoff_longitude - pickup_longitude)) * COS(RADIANS(dropoff_latitude)),
      COS(RADIANS(pickup_latitude)) * SIN(RADIANS(dropoff_latitude))
        - SIN(RADIANS(pickup_latitude)) * COS(RADIANS(dropoff_latitude))
          * COS(RADIANS(dropoff_longitude - pickup_longitude))
    )) + 360) % 360                                                                   AS bearing_degrees
  FROM filtered
)

SELECT
  -- Identifiers & timestamps
  key,
  pickup_datetime,
  pickup_year,
  pickup_month,
  pickup_day,
  pickup_hour,
  pickup_minute,
  pickup_dow,
  pickup_dayofyear,
  pickup_weekofyear,
  pickup_quarter,
  -- Raw coordinates
  pickup_longitude,
  pickup_latitude,
  dropoff_longitude,
  dropoff_latitude,
  -- Core measures
  passenger_count,
  fare_amount,
  trip_distance_km,
  trip_distance_manhattan_km,
  bearing_degrees,
  -- Zones
  pickup_zone,
  dropoff_zone,
  -- Airport distances
  dist_jfk_pickup_km,
  dist_lga_pickup_km,
  dist_ewr_pickup_km,
  dist_jfk_dropoff_km,
  dist_lga_dropoff_km,
  dist_ewr_dropoff_km,
  dist_manhattan_center_pickup_km,
  dist_manhattan_center_dropoff_km,
  -- Temporal flags
  pickup_dow IN (0, 6)                              AS is_weekend,
  pickup_hour IN (7, 8, 9, 17, 18, 19)             AS is_rush_hour,
  (pickup_hour >= 22 OR pickup_hour < 5)            AS is_night_shift,
  -- Airport flags
  LEAST(dist_jfk_pickup_km, dist_lga_pickup_km, dist_ewr_pickup_km) < 2.0           AS is_airport_pickup,
  LEAST(dist_jfk_dropoff_km, dist_lga_dropoff_km, dist_ewr_dropoff_km) < 2.0        AS is_airport_dropoff,
  (LEAST(dist_jfk_pickup_km, dist_lga_pickup_km, dist_ewr_pickup_km) < 2.0
    OR LEAST(dist_jfk_dropoff_km, dist_lga_dropoff_km, dist_ewr_dropoff_km) < 2.0)  AS is_airport_trip,
  -- Ride context
  (pickup_year - 2009)::TINYINT AS years_since_2009,
  CASE
    WHEN passenger_count = 1        THEN '1'
    WHEN passenger_count = 2        THEN '2'
    WHEN passenger_count IN (3, 4)  THEN '3-4'
    ELSE '5-6'
  END AS passenger_count_bin,
  -- Audit
  event_ts,
  ingested_at
FROM with_airports
