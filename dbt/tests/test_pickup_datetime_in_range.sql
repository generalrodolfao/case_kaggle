-- Verifica que todas as datas de embarque estão no range esperado do dataset.
-- Retornar linhas = falha no teste.
SELECT *
FROM {{ ref('silver_taxi_rides') }}
WHERE pickup_datetime < '2009-01-01'
   OR pickup_datetime > '2015-07-01'
