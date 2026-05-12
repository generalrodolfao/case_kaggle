# Data Profile — NYC Taxi Fare Prediction

> Perfil consolidado a partir de EDA pública do dataset.
> Fontes: 6 notebooks de referência analisados em fase de discovery, documentação Kaggle, e síntese via NotebookLM.

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| Origem | [Kaggle Competition](https://www.kaggle.com/competitions/new-york-city-taxi-fare-prediction/data) |
| Arquivo | `train.csv` |
| Total de linhas | 55.423.856 |
| Tamanho descomprimido | ~5.5 GB |
| Range temporal | 2009-01-01 → 2015-06-30 |
| Gap conhecido | 2015 parcial (somente H1) |

## 2. Schema Observado

| Coluna | Tipo otimizado | Notas |
|--------|---------------|-------|
| `key` | string | `pickup_datetime + N`; chave única |
| `fare_amount` | float32 | USD; valores válidos `> 0` |
| `pickup_datetime` | timestamp UTC | string ISO no CSV |
| `pickup_longitude` | float32 | NYC bbox: `[-76, -72]` |
| `pickup_latitude` | float32 | NYC bbox: `[40.55, 42]` |
| `dropoff_longitude` | float32 | idem |
| `dropoff_latitude` | float32 | idem |
| `passenger_count` | uint8 | Válidos: `1-6`; observados: `0-208` |

## 3. Distribuição de `passenger_count` (observada)

- `1` → ~70% da base
- `2` → ~14%
- `5` → ~7%
- demais → distribuídos
- `0` e `> 6` → anomalias a descartar

## 4. Anomalias Conhecidas

| Anomalia | Detalhe | Estratégia |
|----------|---------|------------|
| Null Island | `pickup_lat = 0 AND pickup_lon = 0` | Descartar no silver |
| `fare_amount` negativo ou zero | Erros de captura | Descartar (`> 0`) |
| `fare_amount` muito alto | > $500 | Descartar (cap 500) |
| `passenger_count` zero | Erro | Descartar |
| `passenger_count` extremo | Até 208 | Descartar (cap 6) |
| Coordenadas fora de NYC | GPS errado | Descartar via bbox |

## 5. Bounding Boxes

### NYC estendida (filtro do silver)
- Latitude: `[40.55, 42.0]`
- Longitude: `[-76.0, -72.0]`

### Zonas nomeadas (enriquecimento do silver)

| Zona | lon_min | lat_min | lon_max | lat_max |
|------|---------|---------|---------|---------|
| `jfk` | -73.83 | 40.62 | -73.74 | 40.67 |
| `lga` | -73.89 | 40.76 | -73.85 | 40.79 |
| `ewr` | -74.20 | 40.67 | -74.16 | 40.71 |
| `manhattan` | -74.02 | 40.70 | -73.93 | 40.88 |
| `brooklyn` | -74.05 | 40.57 | -73.83 | 40.74 |
| `other` | qualquer ponto dentro do bbox NYC mas fora das anteriores | | | |

## 6. Taxas de Descarte Estimadas (referência)

Baseado em EDA pública; pode variar:

| Filtro | % descartado (estimado) |
|--------|--------------------------|
| Nulls | < 0.1% |
| `fare_amount <= 0` | ~0.5% |
| `passenger_count` fora de 1-6 | ~0.1% |
| Fora do bbox NYC | ~1-2% |
| Null Island | < 0.5% |
| **Total estimado** | **~2-3%** |

Após silver, espera-se preservar ~97% das linhas.

## 7. Decisões Derivadas

### Tipos otimizados (para producer)
Usar `float32` em coordenadas e `uint8` em `passenger_count` reduz consumo de memória em ~40%.

### Particionamento (para datalake)
- `raw`: por `ingestion_date` (eixo de ingestão)
- `bronze`/`silver`: por `pickup_year/pickup_month` (eixo de análise)

### Streaming respeitando tempo
O producer pode publicar respeitando ordem cronológica de `pickup_datetime` — o arquivo aparenta estar ordenado nos primeiros milhares de linhas analisados, mas confirme antes de assumir.

## 8. Fontes Consultadas

1. `nyc-taxi-fare-data-exploration.ipynb` (van Breemen, 114 cells) — EDA detalhado
2. `pyspark-big-data.ipynb` — schema PySpark
3. `nyc-taxi-fare-starter-kernel-simple-linear-model.ipynb` — regras básicas
4. Documentação oficial Kaggle
5. Síntese NotebookLM (regras consolidadas)

Notebooks de modelagem ML descartados como referência por estarem fora do escopo deste case.
