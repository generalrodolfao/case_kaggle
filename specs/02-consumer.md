# Spec 02 — Consumer (Filtros + Persistência Parquet)

> Ordem de execução: 3ª (após `01-producer`)
> Agente sugerido: `@agent-consumer-builder`

## 1. Objetivo

Aplicação Python que consome do tópico Kafka `taxi-rides`, aplica filtros por data e local (zona ou bounding box), e persiste o resultado em Parquet particionado no MinIO (camada `raw`).

## 2. Requisitos do Case Atendidos

- **R2** — Consumer com filtros por data e local
- **R3** — Armazenamento em Parquet
- **R4** — Parte da estruturação do datalake (camada raw)

## 3. Contrato

### CLI
```bash
python -m consumer.main \
  --start-date 2014-01-01 \
  --end-date 2014-01-31 \
  --zone jfk \
  --batch-size 10000 \
  --max-events 100000
```

### Argumentos

| Argumento | Tipo | Obrigatório | Default |
|-----------|------|-------------|---------|
| `--start-date` | ISO date | sim | — |
| `--end-date` | ISO date | sim | — |
| `--zone` | enum: jfk, lga, ewr, manhattan, brooklyn | não | — |
| `--bbox` | "lon_min,lat_min,lon_max,lat_max" | não | — |
| `--batch-size` | int | não | 10000 |
| `--max-events` | int (0 = ilimitado) | não | 0 |

`--zone` e `--bbox` são mutuamente exclusivos. Se nenhum for passado, sem filtro espacial (só data).

### Variáveis de ambiente
- `KAFKA_BOOTSTRAP_SERVERS`
- `KAFKA_TOPIC`
- `KAFKA_GROUP_ID` (default: `taxi-consumer`)
- `S3_ENDPOINT` (MinIO)
- `S3_ACCESS_KEY` / `S3_SECRET_KEY`
- `S3_BUCKET` (default: `datalake`)

### Saída
- Parquet em `s3://datalake/raw/ingestion_date=YYYY-MM-DD/part-<uuid>.parquet`
- Compressão Snappy
- Row group size: 100k linhas
- Tamanho alvo por arquivo: 64-128 MB

## 4. Implementação

### Estrutura
```
consumer/
├── src/consumer/
│   ├── __init__.py
│   ├── main.py           # CLI + loop principal
│   ├── config.py         # Pydantic Settings
│   ├── filters.py        # filtro por data + espacial
│   ├── zones.py          # bounding boxes nomeadas
│   ├── writer.py         # Parquet → MinIO via pyarrow
│   └── consumer.py       # wrapper confluent-kafka
└── tests/
    ├── test_filters.py
    ├── test_zones.py
    ├── test_writer.py
    └── test_main.py
```

### Tecnologias
- `confluent-kafka` (consumer)
- `pyarrow` (Parquet writing, S3 via `pyarrow.fs.S3FileSystem`)
- `pydantic` v2 (validação de eventos recebidos)
- `click` ou `typer` (CLI)
- `structlog`

### Pontos Críticos
- **Filtro de data:** aplicar sobre `pickup_datetime` (do payload), não `event_ts`
- **Filtro espacial:** se `--zone`, lookup em `zones.py`; se `--bbox`, parse direto
- **Consumer group:** uso de `KAFKA_GROUP_ID` permite re-execução com offset persistente
- **Commit de offset:** manual, após escrita Parquet bem-sucedida (at-least-once)
- **Buffer interno:** acumula `batch-size` eventos antes de escrever; se idle > 10s, flush parcial
- **Particionamento Hive:** `ingestion_date=YYYY-MM-DD` (não `pickup_date`; pickup_date é pro bronze)

## 5. Zonas (em `consumer/zones.py`)

```python
ZONES = {
    "jfk":       (-73.83, 40.62, -73.74, 40.67),
    "lga":       (-73.89, 40.76, -73.85, 40.79),
    "ewr":       (-74.20, 40.67, -74.16, 40.71),
    "manhattan": (-74.02, 40.70, -73.93, 40.88),
    "brooklyn":  (-74.05, 40.57, -73.83, 40.74),
}
```

Função `point_in_zone(lon, lat, zone_name)` retorna bool.

## 6. Testes (Critério Mínimo)

| Teste | Cobertura |
|-------|-----------|
| `test_filter_date_range` | Inclui/exclui corretamente nas bordas |
| `test_filter_zone_jfk_inside` | Coordenada JFK retorna True |
| `test_filter_zone_jfk_outside` | Coordenada Manhattan retorna False |
| `test_filter_bbox_custom` | Bbox arbitrário funciona |
| `test_writer_parquet_partitioning` | Particiona por `ingestion_date` |
| `test_writer_compression_snappy` | Verifica compressão |
| `test_main_zone_and_bbox_mutually_exclusive` | CLI rejeita ambos |
| `test_main_smoke` | End-to-end com mocks, 100 eventos |

## 7. Critério de Aceite

- [ ] CLI aceita todos os argumentos documentados
- [ ] Mensagens fora do range de data são descartadas
- [ ] Mensagens fora da zona/bbox são descartadas
- [ ] Parquet escrito em `s3://datalake/raw/ingestion_date=.../...parquet`
- [ ] Inspeção via DuckDB confirma schema e contagem
- [ ] `pytest consumer/tests/` passa com cobertura ≥ 80%
- [ ] `--zone` e `--bbox` mutuamente exclusivos

## 8. Comandos de Verificação

```bash
# Rodar consumer
docker compose run --rm consumer python -m consumer.main \
  --start-date 2014-01-01 --end-date 2014-01-31 --zone jfk

# Inspecionar Parquet via DuckDB
docker compose exec duckdb duckdb -c "
  INSTALL httpfs; LOAD httpfs;
  SET s3_endpoint='minio:9000'; SET s3_url_style='path';
  SELECT COUNT(*), MIN(pickup_datetime), MAX(pickup_datetime)
  FROM 's3://datalake/raw/**/*.parquet';
"
```

## 9. Referências

- `.claude/skills/parquet-conventions/SKILL.md` (particionamento, sizing)
- `.claude/skills/testing-standards/SKILL.md`
