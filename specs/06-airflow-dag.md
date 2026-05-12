# Spec 06 — Airflow DAG (Orquestração)

> Ordem de execução: 7ª (última)
> Agente sugerido: `@agent-infra-builder` (Airflow é metade infra, metade pipeline)

## 1. Objetivo

DAG do Airflow que orquestra o pipeline completo: consumo de eventos → bronze → silver → gold → testes. Demonstra "orquestração" do enunciado e fecha o ciclo `up and running`.

## 2. Requisitos do Case Atendidos

- Citado explicitamente no enunciado: "Airflow – Orquestração do processamento"

## 3. Contrato

### DAG ID
`taxi_pipeline`

### Schedule
`@daily` (mas pode rodar manualmente)

### Estrutura
```
start
  → run_consumer (consome 1h de eventos)
  → dbt_run_bronze
  → dbt_test_bronze
  → dbt_run_silver
  → dbt_test_silver
  → dbt_run_gold
  → dbt_test_gold
  → end (publica artefato de docs do dbt)
```

### Falhas
- Bronze falha → para a DAG
- Silver falha → para a DAG
- Gold falha → para a DAG
- Testes falham → mandam pra DAG state `failed` mas exportam relatório

## 4. Implementação

### Estrutura
```
airflow/
├── dags/
│   └── taxi_pipeline.py
├── plugins/                  # vazio inicialmente
└── requirements.txt          # dbt-duckdb, etc.
```

### Esqueleto da DAG
```python
from __future__ import annotations
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.empty import EmptyOperator

default_args = {
    "owner": "data-squad",
    "depends_on_past": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=2),
}

with DAG(
    dag_id="taxi_pipeline",
    description="NYC Taxi: consumer → bronze → silver → gold",
    start_date=datetime(2026, 5, 12),
    schedule="@daily",
    catchup=False,
    default_args=default_args,
    tags=["taxi", "datalake", "case"],
) as dag:
    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    run_consumer = BashOperator(
        task_id="run_consumer",
        bash_command=(
            "python -m consumer.main "
            "--start-date {{ ds }} "
            "--end-date {{ next_ds }} "
            "--max-events 100000"
        ),
    )

    dbt_bronze = BashOperator(
        task_id="dbt_run_bronze",
        bash_command="cd /opt/dbt && dbt run --select bronze",
    )
    test_bronze = BashOperator(
        task_id="dbt_test_bronze",
        bash_command="cd /opt/dbt && dbt test --select bronze",
    )

    dbt_silver = BashOperator(
        task_id="dbt_run_silver",
        bash_command="cd /opt/dbt && dbt run --select silver",
    )
    test_silver = BashOperator(
        task_id="dbt_test_silver",
        bash_command="cd /opt/dbt && dbt test --select silver",
    )

    dbt_gold = BashOperator(
        task_id="dbt_run_gold",
        bash_command="cd /opt/dbt && dbt run --select gold",
    )
    test_gold = BashOperator(
        task_id="dbt_test_gold",
        bash_command="cd /opt/dbt && dbt test --select gold",
    )

    (start >> run_consumer
       >> dbt_bronze >> test_bronze
       >> dbt_silver >> test_silver
       >> dbt_gold >> test_gold >> end)
```

## 5. Testes

- `test_dag_imports.py` — verifica que a DAG importa sem erro
- `test_dag_has_no_cycles` — usa `airflow.models.DAG.test()` ou pytest-airflow
- `test_dag_task_count` — assert 9 tasks

## 6. Critério de Aceite

- [ ] DAG aparece na UI do Airflow em http://localhost:8081
- [ ] Trigger manual completa todas as 9 tasks com sucesso
- [ ] Logs de cada task acessíveis pela UI
- [ ] Em caso de falha do silver, gold não roda
- [ ] `python -c "from airflow.models import DagBag; assert not DagBag().import_errors"` passa

## 7. Comandos de Verificação

```bash
# Subir Airflow (já está no compose)
make up

# Acessar UI: http://localhost:8081 (admin/admin)

# Trigger via CLI
docker compose exec airflow airflow dags trigger taxi_pipeline

# Logs
docker compose logs airflow-scheduler -f
```

## 8. Notas

- Em produção, separar `dbt run` e `dbt test` em DAGs/grupos próprios
- `KubernetesPodOperator` seria o ideal em prod; `BashOperator` é suficiente aqui
- Configurar `dbt-duckdb` profile para apontar ao MinIO já no entrypoint do container

## 9. Referências

- `docs/adr/0003-medallion-layers.md`
- `specs/07-infra-compose.md`
