.PHONY: up down demo dbt-run dbt-test test test-ml lint format logs clean frontend-dev

up:
	docker compose up -d --build
	@echo ""
	@echo "Serviços subindo — aguarde os healthchecks (~60s para o Airflow)."
	@echo ""
	@echo "  Redpanda Console: http://localhost:8080"
	@echo "  MinIO Console:    http://localhost:9001  (minio / CHANGE_ME)"
	@echo "  Airflow UI:       http://localhost:8081  (admin / admin)"
	@echo "  API (FastAPI):    http://localhost:8000/docs"
	@echo "  Dashboard:        http://localhost:3000"

down:
	docker compose down

demo:
	@echo "==> [1/3] Publicando eventos no tópico taxi-rides (sample 10k)..."
	PYTHONPATH=producer/src \
	KAFKA_BOOTSTRAP_SERVERS=localhost:19092 \
	DATA_PATH="data/train_sample.csv" \
	python3.11 -m producer.main
	@echo "==> [2/3] Consumindo eventos de jan/2014 (zona JFK)..."
	PYTHONPATH=consumer/src \
	KAFKA_BOOTSTRAP_SERVERS=localhost:19092 \
	S3_ENDPOINT=http://localhost:9000 \
	S3_ACCESS_KEY=minio \
	S3_SECRET_KEY=CHANGE_ME \
	S3_BUCKET=datalake \
	python3.11 -m consumer.main \
		--start-date 2014-01-01 --end-date 2014-01-31 --zone jfk --idle-exit-secs 30
	@echo "==> [3/4] Disparando pipeline dbt via Airflow..."
	docker compose exec airflow-scheduler airflow dags trigger taxi_pipeline
	@echo "==> [4/4] Disparando pipeline de predição via Airflow..."
	docker compose exec airflow-scheduler airflow dags trigger prediction_pipeline
	@echo ""
	@echo "Pipelines disparados. Acompanhe em http://localhost:8081"
	@echo "Dashboard disponível em  http://localhost:3000"
	@echo "API docs disponíveis em  http://localhost:8000/docs"

dbt-run:
	@echo "==> Rodando dbt no host (RAM ilimitada, recomendado para datasets grandes)"
	cd dbt && \
	S3_HOST_PORT=localhost:9000 \
	S3_ACCESS_KEY=minio \
	S3_SECRET_KEY=CHANGE_ME \
	DUCKDB_MEMORY_LIMIT=$${DUCKDB_MEMORY_LIMIT:-10GB} \
	dbt run --profiles-dir .

dbt-test:
	@echo "==> Rodando dbt test no host"
	cd dbt && \
	S3_HOST_PORT=localhost:9000 \
	S3_ACCESS_KEY=minio \
	S3_SECRET_KEY=CHANGE_ME \
	DUCKDB_MEMORY_LIMIT=$${DUCKDB_MEMORY_LIMIT:-10GB} \
	dbt test --profiles-dir .

test:
	pytest producer/tests -v --cov=producer --cov-report=term-missing --cov-fail-under=80
	pytest consumer/tests -v --cov=consumer --cov-report=term-missing --cov-fail-under=80
	$(MAKE) test-ml
	$(MAKE) dbt-test

test-ml:
	PYTHONPATH=ml/src pytest ml/tests -v --cov=prediction --cov-report=term-missing

frontend-dev:
	cd frontend && npm install && npm run dev

lint:
	ruff check .
	black --check .

format:
	ruff check --fix .
	black .

logs:
	docker compose logs -f --tail=200

clean:
	docker compose down -v
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	rm -rf data/raw data/bronze data/silver data/gold
	rm -rf dbt/target dbt/dbt_packages dbt/logs
