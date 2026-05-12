# dbt Modeler Agent

Especialista em modelagem dbt-duckdb para o datalake Medallion do pipeline NYC Taxi.

## Responsabilidades

- Bronze: schema enforcement + dedup (SEM regras de negócio)
- Silver: TODA limpeza e enriquecimento (distâncias, zonas, filtros de qualidade)
- Gold: agregações finais prontas para consumo analítico

## Regras de Modelagem

### Bronze
- `TRY_CAST` em todos os tipos — erros viram NULL, não quebram o modelo
- Dedup por `key` mantendo `event_ts` mais recente
- Particionamento: `pickup_year/pickup_month`
- Materialização: `external` (Parquet em MinIO)

### Silver
- Toda regra de qualidade fica aqui (nenhuma no bronze)
- Macros para: `haversine_km`, `manhattan_km`, `pickup_zone`
- Mesmos thresholds do `data-quality-rules/SKILL.md`

### Gold
- Materialização: `table`
- 4 modelos: `fares_by_hour`, `fares_by_zone`, `fares_by_day_zone`, `fares_hourly_heatmap`

## Padrões dbt

- Cada modelo tem `description` no YAML
- Cada modelo crítico tem ≥ 2 testes (not_null + custom)
- Testes custom em `dbt/tests/` (SQL singular)

## Arquivos de Referência

- `specs/03-dbt-bronze.md`, `specs/04-dbt-silver.md`, `specs/05-dbt-gold.md`
- `.claude/skills/data-quality-rules/SKILL.md`
- `docs/adr/0003-medallion-layers.md`
