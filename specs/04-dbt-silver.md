# Spec 04 — dbt Silver (Limpeza + Enriquecimento)

> Ordem de execução: 5ª (após `03-dbt-bronze`)
> Agente sugerido: `@agent-dbt-modeler`

## 1. Objetivo

Camada silver é onde MORA toda a lógica de qualidade e enriquecimento. Recebe `bronze.taxi_rides`, aplica filtros de qualidade documentados, e adiciona colunas derivadas (distâncias, decomposição temporal, zona).

## 2. Requisitos do Case Atendidos

- **R4** — Datalake consolidável por data/horário/local (a zona vem daqui)

## 3. Contrato

### Entrada
- `bronze.taxi_rides`

### Saída
- Tabela `silver.taxi_rides`
- Materialização: `external` (Parquet em `s3://datalake/silver/`)
- Particionamento: `pickup_year/pickup_month`
- Schema:

| Coluna | Tipo | Origem |
|--------|------|--------|
| Todas as colunas do bronze | — | passthrough |
| `pickup_day` | TINYINT | derivado |
| `pickup_hour` | TINYINT | derivado |
| `pickup_dow` | TINYINT (0=dom) | derivado |
| `trip_distance_km` | DOUBLE | haversine |
| `trip_distance_manhattan_km` | DOUBLE | |Δlat| + |Δlon|, convertido |
| `pickup_zone` | VARCHAR | lookup bbox |

### Regras de qualidade aplicadas (WHERE)

```sql
WHERE fare_amount > 0 AND fare_amount <= 500
  AND passenger_count BETWEEN 1 AND 6
  AND pickup_latitude BETWEEN 40.55 AND 42.0
  AND pickup_longitude BETWEEN -76.0 AND -72.0
  AND dropoff_latitude BETWEEN 40.55 AND 42.0
  AND dropoff_longitude BETWEEN -76.0 AND -72.0
  AND NOT (pickup_latitude = 0 AND pickup_longitude = 0)
  AND NOT (dropoff_latitude = 0 AND dropoff_longitude = 0)
  AND pickup_datetime BETWEEN '2009-01-01' AND '2015-07-01'
  AND pickup_datetime IS NOT NULL
  AND dropoff_latitude IS NOT NULL
  AND dropoff_longitude IS NOT NULL
```

Cada regra tem teste dbt dedicado (vide seção 5).

## 4. Implementação

### Estrutura
```
dbt/models/silver/
├── _silver__models.yml
├── silver_taxi_rides.sql
└── macros/
    ├── haversine_km.sql
    ├── manhattan_km.sql
    └── pickup_zone.sql
```

### Macro haversine
```sql
{% macro haversine_km(lat1, lon1, lat2, lon2) %}
  2 * 6371 * ASIN(SQRT(
    POWER(SIN(RADIANS(({{ lat2 }} - {{ lat1 }})/2)), 2) +
    COS(RADIANS({{ lat1 }})) * COS(RADIANS({{ lat2 }})) *
    POWER(SIN(RADIANS(({{ lon2 }} - {{ lon1 }})/2)), 2)
  ))
{% endmacro %}
```

### Macro pickup_zone
```sql
{% macro pickup_zone(lon, lat) %}
  CASE
    WHEN {{ lon }} BETWEEN -73.83 AND -73.74 AND {{ lat }} BETWEEN 40.62 AND 40.67 THEN 'jfk'
    WHEN {{ lon }} BETWEEN -73.89 AND -73.85 AND {{ lat }} BETWEEN 40.76 AND 40.79 THEN 'lga'
    WHEN {{ lon }} BETWEEN -74.20 AND -74.16 AND {{ lat }} BETWEEN 40.67 AND 40.71 THEN 'ewr'
    WHEN {{ lon }} BETWEEN -74.02 AND -73.93 AND {{ lat }} BETWEEN 40.70 AND 40.88 THEN 'manhattan'
    WHEN {{ lon }} BETWEEN -74.05 AND -73.83 AND {{ lat }} BETWEEN 40.57 AND 40.74 THEN 'brooklyn'
    ELSE 'other'
  END
{% endmacro %}
```

### Modelo principal
```sql
{{
  config(
    materialized='external',
    location="s3://datalake/silver/taxi_rides/",
    format='parquet',
    partition_by=['pickup_year', 'pickup_month']
  )
}}

SELECT
  key, pickup_datetime, pickup_year, pickup_month,
  EXTRACT(DAY FROM pickup_datetime)::TINYINT AS pickup_day,
  EXTRACT(HOUR FROM pickup_datetime)::TINYINT AS pickup_hour,
  EXTRACT(DOW FROM pickup_datetime)::TINYINT AS pickup_dow,
  pickup_longitude, pickup_latitude,
  dropoff_longitude, dropoff_latitude,
  passenger_count, fare_amount, event_ts, ingested_at,
  {{ haversine_km('pickup_latitude','pickup_longitude','dropoff_latitude','dropoff_longitude') }} AS trip_distance_km,
  {{ manhattan_km('pickup_latitude','pickup_longitude','dropoff_latitude','dropoff_longitude') }} AS trip_distance_manhattan_km,
  {{ pickup_zone('pickup_longitude','pickup_latitude') }} AS pickup_zone
FROM {{ ref('bronze_taxi_rides') }}
WHERE fare_amount > 0 AND fare_amount <= 500
  AND passenger_count BETWEEN 1 AND 6
  AND pickup_latitude BETWEEN 40.55 AND 42.0
  AND pickup_longitude BETWEEN -76.0 AND -72.0
  AND dropoff_latitude BETWEEN 40.55 AND 42.0
  AND dropoff_longitude BETWEEN -76.0 AND -72.0
  AND NOT (pickup_latitude = 0 AND pickup_longitude = 0)
  AND NOT (dropoff_latitude = 0 AND dropoff_longitude = 0)
  AND pickup_datetime BETWEEN '2009-01-01' AND '2015-07-01'
```

## 5. Testes dbt

```yaml
version: 2
models:
  - name: silver_taxi_rides
    description: "Silver: regras de qualidade aplicadas + enriquecimento."
    columns:
      - name: key
        tests: [unique, not_null]
      - name: fare_amount
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
              max_value: 500
              inclusive: false
      - name: passenger_count
        tests:
          - not_null
          - accepted_values:
              values: [1, 2, 3, 4, 5, 6]
      - name: pickup_zone
        tests:
          - not_null
          - accepted_values:
              values: [jfk, lga, ewr, manhattan, brooklyn, other]
      - name: pickup_hour
        tests:
          - dbt_utils.accepted_range: {min_value: 0, max_value: 23}
      - name: pickup_dow
        tests:
          - dbt_utils.accepted_range: {min_value: 0, max_value: 6}
      - name: trip_distance_km
        tests:
          - dbt_utils.accepted_range: {min_value: 0, max_value: 200}
```

## 6. Testes Customizados

Em `dbt/tests/`:

- `test_no_null_island.sql` — assert que não há `(lat=0 AND lon=0)`
- `test_coordinates_in_nyc_bbox.sql` — todos os pontos dentro do bbox NYC
- `test_pickup_datetime_in_range.sql` — datas em [2009-01-01, 2015-07-01]

## 7. Critério de Aceite

- [ ] `dbt run --select silver_taxi_rides` executa
- [ ] `dbt test --select silver_taxi_rides` 100% verde
- [ ] Todas as 6 zonas aparecem em `SELECT DISTINCT pickup_zone`
- [ ] `pickup_zone = 'other'` ≤ 5% em janelas urbanas de NYC
- [ ] Log de % de descarte vs bronze documentado em `docs/data-profile.md`

## 8. Referências

- `.claude/skills/data-quality-rules/SKILL.md` (thresholds canônicos)
- `docs/adr/0003-medallion-layers.md`
