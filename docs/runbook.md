# Runbook

> Como operar, depurar e estender o pipeline.

## 1. Subindo o Ambiente

```bash
cp .env.example .env
./scripts/seed_data.sh    # baixa train.csv (Kaggle CLI)
make up                    # sobe infra
```

Aguarde ~60s para todos os healthchecks ficarem verdes.

### Verificar saúde
```bash
docker compose ps           # todos com status "healthy" ou "running"
make logs                   # logs agregados
```

### Acessos
| Serviço | URL | Credenciais |
|---------|-----|-------------|
| Redpanda Console | http://localhost:8080 | — |
| MinIO Console | http://localhost:9001 | minio / CHANGE_ME |
| Airflow UI | http://localhost:8081 | admin / admin |

## 2. Rodando a Demo

```bash
make demo
```

Executa:
1. Producer: publica 100k eventos
2. Consumer: filtra `2014-01-01` a `2014-01-31`, zona JFK, grava raw
3. Airflow: dispara DAG `taxi_pipeline` que roda bronze/silver/gold

## 3. Consultando os Resultados

### Via DuckDB CLI
```bash
docker compose exec airflow-scheduler duckdb /opt/dbt/target/taxi.duckdb
```

```sql
-- Top horas por receita
SELECT * FROM gold.gold_fares_by_hour ORDER BY total_revenue DESC LIMIT 5;

-- Receita por zona
SELECT * FROM gold.gold_fares_by_zone ORDER BY total_revenue DESC;
```

### Via Parquet direto (silver)
```sql
INSTALL httpfs; LOAD httpfs;
SET s3_endpoint='localhost:9000';
SET s3_use_ssl=false;
SET s3_url_style='path';

SELECT pickup_zone, COUNT(*), AVG(fare_amount)
FROM 's3://datalake/silver/taxi_rides/**/*.parquet'
GROUP BY pickup_zone;
```

## 4. Operações Comuns

### Re-rodar uma camada
```bash
docker compose exec airflow-scheduler bash -c "cd /opt/dbt && dbt run --select silver"
```

### Forçar full refresh de bronze
```bash
docker compose exec airflow-scheduler bash -c "cd /opt/dbt && dbt run --select bronze --full-refresh"
```

### Limpar storage e recomeçar
```bash
make down
docker volume rm nyc-taxi_minio-data
make up
```

## 5. Debug: Producer não publica

```bash
# Logs
docker compose logs producer

# Verificar tópico
docker compose exec redpanda rpk topic list
docker compose exec redpanda rpk topic describe taxi-rides

# Consumir manualmente
docker compose exec redpanda rpk topic consume taxi-rides --num 10
```

Causas comuns:
- `KAFKA_BOOTSTRAP_SERVERS` errado → checar `.env`
- `data/train.csv` ausente → rodar `seed_data.sh`
- Schema inválido em todas as linhas → log mostrará warnings

## 6. Debug: Consumer não grava Parquet

```bash
docker compose logs consumer

# Verificar bucket
docker compose exec minio mc ls local/datalake/raw/
```

Causas comuns:
- Filtros muito restritos (nenhum evento passa)
- Offset commit não está acontecendo (zera consumer group):
  ```bash
  docker compose exec redpanda rpk group delete taxi-consumer
  ```
- Credenciais S3 erradas → `.env`

## 7. Debug: dbt falha

```bash
# Rodar com verbose
docker compose exec airflow-scheduler bash -c "cd /opt/dbt && dbt run --debug"

# Inspecionar SQL compilado
cat dbt/target/compiled/.../silver_taxi_rides.sql
```

Causas comuns:
- Source raw vazio (consumer não rodou)
- Profile `profiles.yml` aponta para endpoint errado
- Permissão MinIO

## 8. Debug: Airflow DAG não aparece

```bash
docker compose logs airflow-scheduler
```

Causas comuns:
- Erro de import: `python airflow/dags/taxi_pipeline.py` para reproduzir
- DAG file fora de `airflow/dags/`

## 9. Performance Tuning

### Producer lento
- Aumentar `PRODUCER_BATCH_SIZE`
- Reduzir validação Pydantic se schema estável (`model_validate` → construção direta)

### Consumer lento
- Aumentar `--batch-size`
- Aumentar partições do tópico Kafka (precisa recriar tópico)

### dbt lento
- Reduzir partições (ex: `pickup_year` só)
- Verificar se houve full-refresh desnecessário

## 10. Reset Completo

```bash
make clean   # down -v + remove dados locais
```

## 11. Backup

Não é objetivo do case, mas em produção:
- MinIO → snapshot via `mc mirror`
- Postgres Airflow → `pg_dump`
- Definições dbt → versionado no git (já é)

## 12. Saúde dos Tests

```bash
make test           # roda pytest + dbt test
pytest -v --cov     # detalhado
```

## 13. Atualizando Dependências

Producer/consumer: `pyproject.toml`
Airflow: `_PIP_ADDITIONAL_REQUIREMENTS` no compose (ou imagem custom)
dbt: `packages.yml`

Rebuild:
```bash
docker compose build --no-cache
```

## 14. Referências

- `docs/architecture.md` — visão arquitetural
- `specs/*` — detalhes por componente
- `docs/adr/*` — decisões
