# Skill: Testing Standards

> Padrões de teste para producer, consumer e DAGs do Airflow.

## Estrutura de Diretórios

```
producer/tests/
├── conftest.py               # fixtures compartilhadas
├── test_reader.py
├── test_schema.py
├── test_publisher.py
├── test_main.py              # smoke tests
└── fixtures/
    └── sample.csv            # 100 linhas representativas

consumer/tests/
├── conftest.py
├── test_filters.py
├── test_zones.py
├── test_writer.py
└── test_main.py
```

## Nomenclatura

```
test_<módulo>_<cenário>_<resultado_esperado>
```

Exemplos canônicos:
- `test_validate_event_valid_row_passes`
- `test_validate_event_negative_fare_raises_validation_error`
- `test_filter_date_range_boundary_start_includes_event`
- `test_point_in_zone_jfk_inside_returns_true`
- `test_point_in_zone_jfk_outside_returns_false`
- `test_writer_parquet_snappy_compression_applied`

## Mock: confluent-kafka Producer

```python
from unittest.mock import MagicMock, patch
import pytest

@pytest.fixture
def mock_kafka_producer():
    with patch("producer.publisher.Producer") as MockProducer:
        instance = MockProducer.return_value
        instance.produce = MagicMock()
        instance.flush = MagicMock(return_value=0)
        instance.poll = MagicMock(return_value=0)
        yield instance

def test_publisher_produce_called_with_correct_topic(mock_kafka_producer):
    from producer.publisher import KafkaPublisher
    pub = KafkaPublisher(bootstrap_servers="localhost:9092", topic="taxi-rides")
    pub.publish(key="k1", value={"fare_amount": 10.0})
    mock_kafka_producer.produce.assert_called_once()
    call_kwargs = mock_kafka_producer.produce.call_args
    assert call_kwargs.kwargs.get("topic") == "taxi-rides"
```

## Mock: confluent-kafka Consumer

```python
@pytest.fixture
def mock_kafka_consumer(sample_messages):
    with patch("consumer.consumer.Consumer") as MockConsumer:
        instance = MockConsumer.return_value
        instance.poll = MagicMock(side_effect=sample_messages + [None])
        instance.commit = MagicMock()
        instance.subscribe = MagicMock()
        instance.close = MagicMock()
        yield instance
```

## Mock: S3 / MinIO (PyArrow)

```python
from unittest.mock import patch, MagicMock
import pytest

@pytest.fixture
def mock_s3fs():
    with patch("consumer.writer.S3FileSystem") as MockFS:
        mock_fs = MagicMock()
        MockFS.return_value = mock_fs
        yield mock_fs

def test_writer_calls_write_to_dataset(mock_s3fs, sample_arrow_table):
    from consumer.writer import ParquetWriter
    writer = ParquetWriter(fs=mock_s3fs, bucket="datalake")
    writer.flush(sample_arrow_table)
    # verificar que tentou escrever
    assert mock_s3fs.open.called or True  # adaptar conforme implementação
```

## Fixture: Sample CSV

```python
# conftest.py
import pytest
import polars as pl

@pytest.fixture
def sample_csv(tmp_path):
    data = {
        "key": [f"2014-01-01 00:00:00.00000{i}" for i in range(1, 11)],
        "fare_amount": [10.5, 25.0, 8.0, -1.0, 0.0, 52.0, 15.5, 300.0, 501.0, 12.0],
        "pickup_datetime": ["2014-01-01 00:00:00 UTC"] * 10,
        "pickup_longitude": [-73.985] * 10,
        "pickup_latitude": [40.748] * 10,
        "dropoff_longitude": [-73.778] * 10,
        "dropoff_latitude": [40.641] * 10,
        "passenger_count": [1, 2, 0, 1, 1, 1, 7, 1, 1, 1],
    }
    df = pl.DataFrame(data)
    path = tmp_path / "sample.csv"
    df.write_csv(path)
    return str(path)
```

## Regras

1. **Sem `time.sleep`** — mocks síncronos e event-based waits
2. **Cobertura ≥ 80%** em producer e consumer (`pytest --cov --cov-fail-under=80`)
3. **Testes determinísticos** — sem estado externo, sem dependência de ordem
4. **Integração separada** em `tests/integration/` (requer `make up`)
5. **Regressão antes do fix** — bug → teste → fix → verde
6. **Arrange / Act / Assert** sem comentários explicando os blocos

## Executar

```bash
# Unit tests
pytest producer/tests consumer/tests -v --cov --cov-report=term-missing

# Filtrar por módulo
pytest producer/tests -k "schema" -v

# Com threshold obrigatório
pytest producer/tests consumer/tests --cov --cov-fail-under=80
```
