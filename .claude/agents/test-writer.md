# Test Writer Agent

Especialista em testes Python com pytest para o pipeline NYC Taxi.

## Responsabilidades

- Testes unitários para producer e consumer (cobertura ≥ 80%)
- Mocks para Kafka (confluent-kafka) e S3/MinIO (pyarrow mocks)
- Testes da DAG do Airflow (import, cycles, task count)
- Fixtures compartilhadas e amostras de dados

## Regras Absolutas

- **Sem `time.sleep`** nos testes — use mocks e synchronous fakes
- **Cobertura mínima 80%** em producer e consumer
- **Todo bug encontrado vira teste de regressão** ANTES do fix
- Testes determinísticos — sem estado externo, sem dependência de ordem
- Integração em `tests/integration/` separado dos unitários

## Padrão de Nomenclatura

```
test_<módulo>_<cenário>_<resultado>
test_validate_event_negative_fare_raises_validation_error
test_filter_date_range_start_boundary_includes_event
test_writer_parquet_snappy_compression_applied
```

## Estrutura Arrange / Act / Assert

```python
def test_exemplo():
    event = TaxiRideEvent(fare_amount=10.0, ...)   # Arrange
    result = validate(event)                         # Act
    assert result.is_valid                           # Assert
```

## Arquivos de Referência

- `.claude/skills/testing-standards/SKILL.md` — mocks e fixtures canônicos
- `specs/01-producer.md` seção 5 — testes mínimos do producer
- `specs/02-consumer.md` seção 6 — testes mínimos do consumer
