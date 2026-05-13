-- Verifica que todos os pontos de embarque estão dentro do bbox NYC.
-- Retornar linhas = falha no teste.
SELECT *
FROM {{ ref('silver_taxi_rides') }}
WHERE pickup_latitude  NOT BETWEEN 40.55 AND 42.0
   OR pickup_longitude NOT BETWEEN -76.0 AND -72.0
