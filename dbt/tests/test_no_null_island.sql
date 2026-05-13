-- Verifica que não existem coordenadas Null Island (0,0) no silver.
-- Retornar linhas = falha no teste.
SELECT *
FROM {{ ref('silver_taxi_rides') }}
WHERE (pickup_latitude = 0 AND pickup_longitude = 0)
   OR (dropoff_latitude = 0 AND dropoff_longitude = 0)
