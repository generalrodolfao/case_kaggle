# Spec 01 — Producer (Streaming de Eventos)

> Ordem de execução: 2ª (após `07-infra-compose`)
> Agente sugerido: `@agent-producer-builder`

## 1. Objetivo

Aplicação Python que lê `data/train.csv` (55.4M linhas) de forma eficiente em memória e publica eventos JSON no tópico Kafka `taxi-rides`, simulando uma fonte de streaming real.

## 2. Requisitos do Case Atendidos

- **R1** — Aplicação streaming produzindo eventos

## 3. Contrato

### Entrada
- Arquivo CSV em `data/train.csv` (montado via volume no container)
- Variáveis de ambiente:
  - `KAFKA_BOOTSTRAP_SERVERS` (default: `redpanda:9092`)
  - `KAFKA_TOPIC` (default: `taxi-rides`)
  - `PRODUCER_BATCH_SIZE` (default: `1000`)
  - `PRODUCER_RATE_LIMIT_PER_SEC` (default: `5000`, `0` = sem limite)
  - `PRODUCER_MAX_EVENTS` (default: `0` = todos)

### Saída
- Mensagens JSON no tópico Kafka, schema fixado:

```json
{
  "key": "2014-06-15 12:34:56.0000001",
  "pickup_datetime": "2014-06-15T12:34:56Z",
  "pickup_longitude": -73.9857,
  "pickup_latitude": 40.7484,
  "dropoff_longitude": -73.7781,
  "dropoff_latitude": 40.6413,
  "passenger_count": 2,
  "fare_amount": 52.0,
  "event_ts": "2026-05-12T14:20:00Z"
}
```

- `event_ts` = momento da publicação (UTC, ISO8601)
- Particionamento Kafka: por hash do `key` (paralelismo nos consumers futuros)

### Comportamento
- Lê o CSV em streaming usando `polars.scan_csv` (lazy)
- Processa em batches de `PRODUCER_BATCH_SIZE`
- Aplica rate limit suave (`PRODUCER_RATE_LIMIT_PER_SEC`)
- Loga progresso a cada 100k eventos publicados
- Encerra graciosamente em SIGINT/SIGTERM, fazendo flush
- Em caso de erro de validação de schema, loga e pula a linha (não falha o batch)

## 4. Implementação

### Estrutura
```
producer/
├── src/producer/
│   ├── __init__.py
│   ├── main.py           # entry point + CLI
│   ├── config.py         # Pydantic Settings
│   ├── reader.py         # leitura streaming do CSV via Polars
│   ├── schema.py         # Pydantic model TaxiRideEvent
│   └── publisher.py      # wrapper confluent-kafka
└── tests/
    ├── test_reader.py
    ├── test_schema.py
    ├── test_publisher.py
    └── fixtures/
        └── sample.csv    # 100 linhas representativas
```

### Tecnologias
- `polars` (lazy `scan_csv` para não estourar memória)
- `pydantic` v2 (validação de schema)
- `pydantic-settings` (config via env)
- `confluent-kafka` (cliente C, performático)
- `structlog` (logging estruturado JSON)

### Pontos Críticos
- **Não usar `pd.read_csv` no arquivo todo** — vide CLAUDE.md
- **`event_ts` deve ser gerado no publish**, não na leitura
- **Schema validation falha → log + skip**, nunca crash
- **Flush no SIGTERM** é crítico pra não perder mensagens no shutdown
- **Producer é idempotente?** Não. Em caso de restart, reprocessa do início ou do offset configurado.

## 5. Testes (Critério Mínimo)

| Teste | Cobertura |
|-------|-----------|
| `test_schema_valid` | Aceita linha bem-formada |
| `test_schema_invalid_fare_negative` | Rejeita fare negativo |
| `test_schema_invalid_passenger_zero` | Rejeita passenger=0 (regra de schema, não de qualidade) |
| `test_reader_streams_in_batches` | Não carrega CSV inteiro |
| `test_publisher_mocked` | Verifica chamada `produce()` com payload correto |
| `test_main_smoke` | Roda end-to-end com mock kafka, 100 linhas, sem erro |

## 6. Critério de Aceite

- [ ] `python -m producer.main --max-events 1000` publica 1000 mensagens válidas no tópico
- [ ] Console Redpanda em http://localhost:8080 mostra as mensagens
- [ ] `pytest producer/tests/` passa com cobertura ≥ 80%
- [ ] Logs estruturados JSON visíveis no `docker logs`
- [ ] Não usa pandas; não carrega CSV completo na memória
- [ ] Variáveis de ambiente documentadas no `.env.example`

## 7. Comandos de Verificação

```bash
# Subir infra
make up

# Rodar producer (1000 eventos para teste rápido)
docker compose run --rm producer python -m producer.main --max-events 1000

# Verificar mensagens no tópico
docker compose exec redpanda rpk topic consume taxi-rides --num 10

# Testes
pytest producer/tests/ -v --cov=producer
```

## 8. Referências

- `.claude/skills/data-quality-rules/SKILL.md` (schema canônico)
- `.claude/skills/testing-standards/SKILL.md` (padrões pytest)
