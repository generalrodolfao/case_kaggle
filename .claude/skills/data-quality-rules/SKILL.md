# Skill: Data Quality Rules — NYC Taxi Dataset

> Regras canônicas derivadas do `docs/data-profile.md` e EDA pública.
> Use este arquivo como fonte única de verdade para thresholds de qualidade.

## Schema Canônico

| Campo | Tipo otimizado | Regra de validade |
|-------|---------------|-------------------|
| `key` | string | NOT NULL, única por evento |
| `fare_amount` | float32 | > 0 AND <= 500 |
| `pickup_datetime` | timestamp UTC | BETWEEN 2009-01-01 AND 2015-07-01 |
| `pickup_longitude` | float32 | BETWEEN -76.0 AND -72.0 |
| `pickup_latitude` | float32 | BETWEEN 40.55 AND 42.0 |
| `dropoff_longitude` | float32 | BETWEEN -76.0 AND -72.0 |
| `dropoff_latitude` | float32 | BETWEEN 40.55 AND 42.0 |
| `passenger_count` | uint8 | BETWEEN 1 AND 6 |

## Regras de Qualidade Completas (camada Silver)

```sql
WHERE fare_amount > 0 AND fare_amount <= 500
  AND passenger_count BETWEEN 1 AND 6
  AND pickup_latitude  BETWEEN 40.55 AND 42.0
  AND pickup_longitude BETWEEN -76.0 AND -72.0
  AND dropoff_latitude  BETWEEN 40.55 AND 42.0
  AND dropoff_longitude BETWEEN -76.0 AND -72.0
  AND NOT (pickup_latitude = 0  AND pickup_longitude = 0)   -- Null Island
  AND NOT (dropoff_latitude = 0 AND dropoff_longitude = 0)  -- Null Island
  AND pickup_datetime BETWEEN '2009-01-01' AND '2015-07-01'
  AND pickup_datetime IS NOT NULL
  AND dropoff_latitude IS NOT NULL
  AND dropoff_longitude IS NOT NULL
```

**Bronze NÃO aplica estas regras** — apenas schema enforcement + dedup por `key`.

## Bounding Box NYC (Estendida)

```python
NYC_BBOX = {
    "lat_min": 40.55,
    "lat_max": 42.0,
    "lon_min": -76.0,
    "lon_max": -72.0,
}
```

## Zonas Nomeadas

```python
ZONES = {
    "jfk":       (-73.83, 40.62, -73.74, 40.67),  # lon_min, lat_min, lon_max, lat_max
    "lga":       (-73.89, 40.76, -73.85, 40.79),
    "ewr":       (-74.20, 40.67, -74.16, 40.71),
    "manhattan": (-74.02, 40.70, -73.93, 40.88),
    "brooklyn":  (-74.05, 40.57, -73.83, 40.74),
    # "other" = qualquer ponto dentro do bbox NYC não coberto acima
}
```

## Taxas de Descarte Estimadas

| Filtro | % estimado |
|--------|-----------|
| Nulls | < 0.1% |
| `fare_amount` fora do range | ~0.5% |
| `passenger_count` fora de 1-6 | ~0.1% |
| Fora do bbox NYC | ~1-2% |
| Null Island | < 0.5% |
| **Total** | **~2-3%** |

Após silver, espera-se preservar ~97% das linhas do bronze.

## Fatos do Dataset

- 55.423.856 linhas, ~5.5 GB
- Range temporal: 2009-01-01 → 2015-06-30 (2015 parcial, só H1)
- `passenger_count = 1` → ~70% da base
- `passenger_count = 2` → ~14%
- Arquivo aparenta estar ordenado cronologicamente (não garantido)
