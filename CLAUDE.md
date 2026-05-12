# CLAUDE.md — Contexto Operacional

> Este arquivo é lido automaticamente pelo Claude Code a cada sessão.
> Contém o contexto mínimo necessário para executar o projeto com qualidade e consistência.

---

## 1. Identidade do Projeto

**Nome:** NYC Taxi Fare — Streaming + Datalake Pipeline
**Tipo:** Case técnico de Engenharia de Dados
**Dataset:** NYC Taxi Fare Prediction (Kaggle) — 55.4M linhas, 5.5 GB
**Prazo de entrega:** Sexta, 15/05/2026, 15h
**Owner:** Rodolfo Barbosa (Data Squad)

---

## 2. O Que Estamos Construindo

Um pipeline end-to-end com 5 peças obrigatórias:

1. **Producer streaming** — publica eventos do CSV em tópico Kafka (Redpanda)
2. **Consumer com filtros** — consome com `--start-date`, `--end-date`, `--zone`, `--bbox`
3. **Storage Parquet** — em MinIO (S3-compatible), particionado Hive-style
4. **Datalake Medallion** — raw → bronze → silver → gold via dbt-duckdb
5. **Up and running** — `docker compose up` sobe tudo, `make demo` roda fim-a-fim

**Avaliação:** método de engenharia (testes, design, organização). **Não é avaliada performance** — confirmado no enunciado.

---

## 3. Regras de Engenharia (Não Negociáveis)

### Stack
- Python 3.11
- Polars (não pandas) pra leitura/escrita de dataset grande
- `confluent-kafka` (não kafka-python) pelo C client
- DuckDB + dbt-duckdb pra modelagem
- Airflow 2.x pra orquestração
- Docker Compose pra infra
- pytest + dbt test pra cobertura

### Estrutura
- **Toda função pública tem docstring** estilo Google
- **Toda função pública tem type hints** completos
- **Toda função pública tem teste pytest** correspondente
- **Sem `print()` em código de produção** — use `logging` com nível configurável
- **Sem variáveis hardcoded** — usar `.env` + Pydantic Settings
- **Sem secrets no repo** — `.env.example` documenta, `.env` é gitignored

### Estilo
- **ruff** + **black** com configuração no `pyproject.toml`
- Imports ordenados via ruff
- Linhas até 100 chars
- Commits no padrão Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`)

### Testes
- Cobertura mínima 80% no producer e consumer
- Todo bug encontrado vira teste de regressão antes do fix
- Testes determinísticos (sem `time.sleep` arbitrário, sem dependência de ordem)
- Mocks pra Kafka e S3 nos unit tests; integração só em `tests/integration/`

### Modelagem dbt
- Cada modelo tem `description` no YAML
- Cada modelo crítico tem pelo menos 2 testes (não-nulo + um custom)
- Bronze é só schema enforcement + dedup; nenhuma regra de negócio
- Silver concentra TODA limpeza e enriquecimento
- Gold é só agregação pra consulta final

### Documentação
- README é o ponto de entrada — vide `SDD_README.md`
- ADRs em `docs/adr/` justificam decisões arquiteturais
- Cada componente tem spec em `specs/` antes de codar
- Sempre atualize a spec se o código divergir da intenção original

---

## 4. Estrutura do Repositório

```
nyc-taxi-streaming/
├── README.md                    # SDD principal (vide SDD_README.md)
├── CLAUDE.md                    # este arquivo
├── Makefile                     # atalhos: up, down, demo, test, lint
├── docker-compose.yml
├── pyproject.toml
├── .env.example
├── docs/
│   ├── architecture.md
│   ├── data-profile.md
│   ├── runbook.md
│   └── adr/
│       ├── 0001-redpanda-over-kafka.md
│       ├── 0002-duckdb-over-spark.md
│       ├── 0003-medallion-layers.md
│       └── 0004-no-ml-modeling.md
├── specs/                       # specs SDD-style (consulte antes de codar)
│   ├── 01-producer.md
│   ├── 02-consumer.md
│   ├── 03-dbt-bronze.md
│   ├── 04-dbt-silver.md
│   ├── 05-dbt-gold.md
│   ├── 06-airflow-dag.md
│   └── 07-infra-compose.md
├── .claude/
│   ├── agents/                  # sub-agentes especializados
│   └── skills/                  # skills reutilizáveis
├── producer/
├── consumer/
├── dbt/
├── airflow/dags/
├── infra/
├── scripts/
└── data/                        # gitignored
```

---

## 5. Ordem de Execução (Para Claude Code)

Quando construir do zero, **siga esta ordem**:

1. **`specs/07-infra-compose.md`** — Docker Compose (Redpanda + MinIO + Postgres). É o chão.
2. **`specs/01-producer.md`** — primeiro produz eventos, mesmo sem consumer ainda
3. **`specs/02-consumer.md`** — consome e grava Parquet em raw/
4. **`specs/03-dbt-bronze.md`** — leitura do raw, tipagem
5. **`specs/04-dbt-silver.md`** — limpeza + enriquecimento
6. **`specs/05-dbt-gold.md`** — agregações finais
7. **`specs/06-airflow-dag.md`** — orquestração amarrando tudo

Cada spec tem **critério de aceite** explícito. Não avance sem cumprir.

---

## 6. Sub-Agentes Disponíveis

Em `.claude/agents/`:

- **`infra-builder.md`** — Docker Compose, MinIO, Redpanda, networking
- **`producer-builder.md`** — leitura CSV, schema, publish Kafka
- **`consumer-builder.md`** — CLI, filtros, escrita Parquet
- **`dbt-modeler.md`** — modelos bronze/silver/gold, testes de dados
- **`test-writer.md`** — pytest, mocks, fixtures, cobertura

Use `@agent-<nome>` para invocar.

---

## 7. Skills Disponíveis

Em `.claude/skills/`:

- **`data-quality-rules`** — regras canônicas do dataset NYC Taxi com thresholds reais
- **`parquet-conventions`** — particionamento, naming, compressão, tamanho de arquivo
- **`testing-standards`** — padrões de teste para producer, consumer, dbt

Consulte antes de implementar qualquer regra de qualidade ou escrita Parquet.

---

## 8. O Que NÃO Fazer

- **Não treinar modelo de ML.** O enunciado é explícito: não é avaliada performance.
- **Não usar pandas pra ler o CSV completo.** Polars em modo `scan_csv` (lazy).
- **Não usar Spark.** Volume cabe em DuckDB; ADR 0002 documenta.
- **Não criar tabelas dbt fora do padrão Medallion.** Bronze/silver/gold é o contrato.
- **Não escrever Parquet sem particionamento.** Mínimo: `pickup_year/pickup_month` no bronze.
- **Não commitar `.env`, `data/`, `target/`, `__pycache__/`.**
- **Não usar `time.sleep` em testes.** Use mocks e fakes.
- **Não criar over-engineering** (Iceberg, Schema Registry, K8s, etc.) — fora de escopo.

---

## 9. Pontos de Atenção do Dataset

Resumido do `docs/data-profile.md`:

- 55.423.856 linhas, 5.5 GB
- Range temporal: **2009-01-01 a 2015-06-30** (2015 é parcial — só H1)
- Anomalias: `(0,0)` Null Island, `passenger_count` de 0 a 208, `fare_amount` negativo
- `passenger_count = 1` é ~70% da base
- Bbox NYC consensual: lat `[40.55, 42.0]`, lon `[-76.0, -72.0]`

Detalhes completos em `.claude/skills/data-quality-rules/SKILL.md`.

---

## 10. Critérios de Pronto (Definition of Done)

Um componente está pronto quando:

- [ ] Spec correspondente foi lida e seguida
- [ ] Código com type hints + docstrings em funções públicas
- [ ] Testes pytest passando, cobertura ≥ 80%
- [ ] `make lint` passa sem warnings
- [ ] Documentado no README ou nas specs se houve desvio
- [ ] Integração com componentes anteriores validada (smoke test manual ou na DAG)
