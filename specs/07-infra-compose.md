# Spec 07 — Infra Docker Compose

> Ordem de execução: 1ª (é o chão de tudo)
> Agente sugerido: `@agent-infra-builder`

## 1. Objetivo

Docker Compose que sobe TODA a infra com `make up`. Atende ao requisito "up and running" do enunciado.

## 2. Requisitos do Case Atendidos

- **R7** — Up and running (`docker compose up`)
- Sugestão do enunciado: "Docker / Compose – Para deploy da aplicação"

## 3. Serviços

| Serviço | Imagem | Portas | Volumes |
|---------|--------|--------|---------|
| `redpanda` | `docker.redpanda.com/redpandadata/redpanda:latest` | 9092 (kafka), 9644 (admin) | `redpanda-data` |
| `redpanda-console` | `docker.redpanda.com/redpandadata/console:latest` | 8080 | — |
| `minio` | `minio/minio:latest` | 9000 (api), 9001 (console) | `minio-data` |
| `minio-init` | `minio/mc:latest` | — | — |
| `postgres` | `postgres:16-alpine` | 5432 (interno) | `postgres-data` |
| `airflow-webserver` | `apache/airflow:2.9.2-python3.11` | 8081 | dags, plugins |
| `airflow-scheduler` | mesmo | — | dags, plugins |
| `airflow-init` | mesmo (run once) | — | — |
| `producer` | build local | — | data:/data |
| `consumer` | build local | — | — |
| `dbt` | build local | — | dbt:/opt/dbt |

## 4. Especificação do `docker-compose.yml`

> **Desvio registrado:** A spec original usava `_PIP_ADDITIONAL_REQUIREMENTS` no Airflow.
> Substituído por `build: ./airflow/Dockerfile` para evitar instalação de ~500 MB em cada
> `make up`. O comportamento é idêntico; apenas o momento de instalação muda (build-time
> vs runtime). Arquivo: `airflow/Dockerfile`.

### Esqueleto (resumido)
```yaml
name: nyc-taxi

x-airflow-common: &airflow-common
  build:
    context: ./airflow   # instala dbt-duckdb, confluent-kafka, polars no build
  environment: &airflow-env
    AIRFLOW__CORE__EXECUTOR: LocalExecutor
    AIRFLOW__CORE__LOAD_EXAMPLES: "false"
    AIRFLOW__DATABASE__SQL_ALCHEMY_CONN: postgresql+psycopg2://airflow:airflow@postgres/airflow
    AIRFLOW__CORE__FERNET_KEY: ${FERNET_KEY:-}
  volumes:
    - ./airflow/dags:/opt/airflow/dags
    - ./airflow/plugins:/opt/airflow/plugins
    - ./dbt:/opt/dbt
  depends_on:
    postgres:
      condition: service_healthy

services:
  redpanda:
    image: docker.redpanda.com/redpandadata/redpanda:latest
    command:
      - redpanda start
      - --kafka-addr internal://0.0.0.0:9092,external://0.0.0.0:19092
      - --advertise-kafka-addr internal://redpanda:9092,external://localhost:19092
      - --smp 1
      - --memory 1G
      - --reserve-memory 0M
      - --node-id 0
      - --check=false
    ports:
      - "19092:19092"
      - "9644:9644"
    volumes:
      - redpanda-data:/var/lib/redpanda/data
    healthcheck:
      test: ["CMD", "rpk", "cluster", "health"]
      interval: 10s
      timeout: 5s
      retries: 5

  redpanda-console:
    image: docker.redpanda.com/redpandadata/console:latest
    environment:
      KAFKA_BROKERS: redpanda:9092
    ports:
      - "8080:8080"
    depends_on:
      - redpanda

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY:-minio}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY:-CHANGE_ME}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 ${S3_ACCESS_KEY:-minio} ${S3_SECRET_KEY:-CHANGE_ME};
      mc mb -p local/datalake;
      exit 0;
      "

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: airflow
      POSTGRES_PASSWORD: airflow
      POSTGRES_DB: airflow
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "airflow"]
      interval: 10s
      timeout: 5s
      retries: 5

  airflow-init:
    <<: *airflow-common
    entrypoint: /bin/bash
    command:
      - -c
      - |
        airflow db migrate
        airflow users create -r Admin -u admin -p admin -e admin@example.com -f Admin -l User
    restart: "no"

  airflow-webserver:
    <<: *airflow-common
    command: webserver
    ports:
      - "8081:8080"
    depends_on:
      airflow-init:
        condition: service_completed_successfully

  airflow-scheduler:
    <<: *airflow-common
    command: scheduler
    depends_on:
      airflow-init:
        condition: service_completed_successfully

  producer:
    build: ./producer
    environment:
      KAFKA_BOOTSTRAP_SERVERS: redpanda:9092
      KAFKA_TOPIC: taxi-rides
    volumes:
      - ./data:/data
    depends_on:
      redpanda:
        condition: service_healthy
    profiles: ["jobs"]

  consumer:
    build: ./consumer
    environment:
      KAFKA_BOOTSTRAP_SERVERS: redpanda:9092
      KAFKA_TOPIC: taxi-rides
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: ${S3_ACCESS_KEY:-minio}
      S3_SECRET_KEY: ${S3_SECRET_KEY:-CHANGE_ME}
      S3_BUCKET: datalake
    depends_on:
      redpanda:
        condition: service_healthy
      minio:
        condition: service_healthy
    profiles: ["jobs"]

volumes:
  redpanda-data:
  minio-data:
  postgres-data:
```

### Profile `jobs`
Producer e consumer ficam em `profiles: ["jobs"]` para não subirem automaticamente — são executados via `make demo` ou via Airflow.

## 5. Makefile (esqueleto)

```makefile
.PHONY: up down demo test lint logs clean

up:
	docker compose up -d --build
	@echo "Aguardando serviços..."
	@sleep 10
	@echo "Redpanda Console: http://localhost:8080"
	@echo "MinIO Console:    http://localhost:9001 (minio/CHANGE_ME)"
	@echo "Airflow UI:       http://localhost:8081 (admin/admin)"

down:
	docker compose down

demo:
	docker compose run --rm producer python -m producer.main --max-events 100000
	docker compose run --rm consumer python -m consumer.main \
		--start-date 2014-01-01 --end-date 2014-01-31 --zone jfk
	docker compose exec airflow-scheduler airflow dags trigger taxi_pipeline

test:
	pytest producer/tests consumer/tests -v --cov
	cd dbt && dbt test

lint:
	ruff check .
	black --check .

logs:
	docker compose logs -f --tail=200

clean:
	docker compose down -v
	rm -rf data/raw data/bronze data/silver data/gold
```

## 6. Critério de Aceite

- [ ] `make up` sobe tudo sem erros
- [ ] Todos os healthchecks ficam verdes
- [ ] Redpanda Console acessível
- [ ] MinIO Console acessível, bucket `datalake` criado
- [ ] Airflow UI acessível, DAG `taxi_pipeline` visível
- [ ] `make demo` executa o fluxo end-to-end
- [ ] `make down -v` limpa tudo (volumes incluídos)

## 7. Notas

- Memória total estimada: ~4 GB ocupados (Airflow é o maior consumidor)
- Se memória < 8 GB, ajustar `--memory` do Redpanda pra `512M`
- Em CI/CD, usar `docker compose --profile jobs run` em vez de up

## 8. Referências

- `docs/adr/0001-redpanda-over-kafka.md`
- `specs/06-airflow-dag.md`
