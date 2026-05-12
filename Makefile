.PHONY: up down demo test lint format logs clean

up:
	docker compose up -d --build
	@echo ""
	@echo "Serviços subindo — aguarde os healthchecks (~60s para o Airflow)."
	@echo ""
	@echo "  Redpanda Console: http://localhost:8080"
	@echo "  MinIO Console:    http://localhost:9001  (minio / CHANGE_ME)"
	@echo "  Airflow UI:       http://localhost:8081  (admin / admin)"

down:
	docker compose down

demo:
	@echo "==> [1/3] Publicando 100k eventos no tópico taxi-rides..."
	docker compose run --rm producer python -m producer.main --max-events 100000
	@echo "==> [2/3] Consumindo eventos de jan/2014 (zona JFK)..."
	docker compose run --rm consumer python -m consumer.main \
		--start-date 2014-01-01 --end-date 2014-01-31 --zone jfk
	@echo "==> [3/3] Disparando pipeline dbt via Airflow..."
	docker compose exec airflow-scheduler airflow dags trigger taxi_pipeline
	@echo ""
	@echo "Pipeline disparado. Acompanhe em http://localhost:8081"

test:
	pytest producer/tests consumer/tests -v \
		--cov=producer --cov=consumer \
		--cov-report=term-missing \
		--cov-fail-under=80
	cd dbt && dbt test

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
