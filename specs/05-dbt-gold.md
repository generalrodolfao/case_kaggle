# Spec 05 — dbt Gold (Agregações Analíticas)

> Ordem de execução: 6ª (após `04-dbt-silver`)
> Agente sugerido: `@agent-dbt-modeler`

## 1. Objetivo

Camada gold entrega as **consultas batch** pedidas no requisito R5. Cada modelo é uma agregação pronta pra consumo (BI, dashboard, ad-hoc).

## 2. Requisitos do Case Atendidos

- **R5** — Consultas batch sobre dados consolidados
- **R4** — Consolidação por data/horário/local

## 3. Modelos

### 3.1. `gold_fares_by_hour`

Receita e volume por hora do dia (agregado por todo o período disponível).

```sql
SELECT
  pickup_hour,
  COUNT(*) AS total_rides,
  AVG(fare_amount) AS avg_fare,
  SUM(fare_amount) AS total_revenue,
  AVG(trip_distance_km) AS avg_distance_km,
  AVG(fare_amount / NULLIF(trip_distance_km, 0)) AS avg_fare_per_km
FROM {{ ref('silver_taxi_rides') }}
WHERE trip_distance_km > 0
GROUP BY pickup_hour
ORDER BY pickup_hour
```

### 3.2. `gold_fares_by_zone`

Receita e volume por zona.

```sql
SELECT
  pickup_zone,
  COUNT(*) AS total_rides,
  AVG(fare_amount) AS avg_fare,
  SUM(fare_amount) AS total_revenue,
  AVG(trip_distance_km) AS avg_distance_km,
  AVG(passenger_count) AS avg_passengers
FROM {{ ref('silver_taxi_rides') }}
GROUP BY pickup_zone
ORDER BY total_revenue DESC
```

### 3.3. `gold_fares_by_day_zone`

Cubo de data x zona — base pra consultas customizadas.

```sql
SELECT
  pickup_year, pickup_month, pickup_day,
  CAST(pickup_datetime AS DATE) AS pickup_date,
  pickup_zone,
  COUNT(*) AS total_rides,
  SUM(fare_amount) AS total_revenue,
  AVG(fare_amount) AS avg_fare
FROM {{ ref('silver_taxi_rides') }}
GROUP BY pickup_year, pickup_month, pickup_day, pickup_date, pickup_zone
ORDER BY pickup_date, pickup_zone
```

### 3.4. `gold_fares_hourly_heatmap`

Heatmap dow × hour (dia da semana × hora) — útil pra visualização.

```sql
SELECT
  pickup_dow,
  pickup_hour,
  COUNT(*) AS total_rides,
  AVG(fare_amount) AS avg_fare
FROM {{ ref('silver_taxi_rides') }}
GROUP BY pickup_dow, pickup_hour
ORDER BY pickup_dow, pickup_hour
```

## 4. Configuração

Materialização: `table` (volumes baixos, sem necessidade de external Parquet, mas viável).

```yaml
# dbt_project.yml
models:
  taxi_pipeline:
    gold:
      +materialized: table
      +schema: gold
```

## 5. Testes dbt

```yaml
version: 2
models:
  - name: gold_fares_by_hour
    description: "Receita e volume agregados por hora do dia."
    columns:
      - name: pickup_hour
        tests:
          - unique
          - not_null
          - dbt_utils.accepted_range: {min_value: 0, max_value: 23}
      - name: total_rides
        tests:
          - dbt_utils.accepted_range: {min_value: 1}

  - name: gold_fares_by_zone
    columns:
      - name: pickup_zone
        tests:
          - unique
          - accepted_values:
              values: [jfk, lga, ewr, manhattan, brooklyn, other]

  - name: gold_fares_by_day_zone
    tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns: [pickup_date, pickup_zone]
```

## 6. Critério de Aceite

- [ ] `dbt run --select gold.*` executa todos sem erro
- [ ] `dbt test --select gold.*` 100% verde
- [ ] `gold_fares_by_hour` retorna 24 linhas
- [ ] `gold_fares_by_zone` retorna 6 linhas (1 por zona)
- [ ] `gold_fares_by_day_zone` é consultável por `WHERE pickup_date BETWEEN ...`
- [ ] Lineage do dbt mostra dependência clara: raw → bronze → silver → gold

## 7. Queries Demo (vão no README)

```sql
-- Top 10 dias com maior receita
SELECT pickup_date, SUM(total_revenue) AS revenue
FROM gold.fares_by_day_zone
GROUP BY pickup_date
ORDER BY revenue DESC LIMIT 10;

-- Receita por zona em jan/2014
SELECT pickup_zone, SUM(total_revenue) AS revenue
FROM gold.fares_by_day_zone
WHERE pickup_date BETWEEN '2014-01-01' AND '2014-01-31'
GROUP BY pickup_zone ORDER BY revenue DESC;

-- Hora de pico
SELECT pickup_hour, total_rides FROM gold.fares_by_hour
ORDER BY total_rides DESC LIMIT 5;
```

## 8. Referências

- `docs/adr/0003-medallion-layers.md`
- `.claude/skills/data-quality-rules/SKILL.md`
