# ADR 0002 — DuckDB + dbt over Spark

**Status:** Aceito
**Data:** 2026-05-12
**Decisores:** Rodolfo Barbosa

## Contexto

O enunciado sugere "Spark com Scala, DuckDB, DBT" como opções de extração e consolidação. Precisamos escolher o engine analítico que melhor demonstra engenharia de dados sólida dentro do escopo e prazo.

Características do dataset:
- 55.4M linhas, 5.5 GB descomprimido
- Cabe em uma máquina com 8 GB RAM
- Não há requisito de escalabilidade horizontal
- Não há requisito de processamento distribuído

## Decisão

Usar **DuckDB como engine analítico + dbt-duckdb como camada de modelagem**.

DuckDB lê Parquet do MinIO diretamente via extensão `httpfs`. dbt-duckdb provê:
- Modelagem incremental e materializada
- Lineage automático
- Testes de dados nativos
- Geração de documentação navegável

## Consequências

**Positivas:**
- Setup em minutos, não horas
- Lineage visual do dbt vira screenshot poderoso na entrega
- SQL puro nas transformações — code review fácil
- Performance excelente em single-node pra esse volume
- Testes de dados (`dbt test`) são primeira classe

**Negativas:**
- Não escala horizontalmente (single-node)
- Avaliador pode esperar Spark
- Mitigação: ADR documenta; volume não justifica Spark; arquitetura é substituível (silver/gold em SQL puro porta pra Trino/Athena/Spark SQL)

## Alternativas Consideradas

- **Spark com Scala:** Adequado para volumes > 100 GB ou cluster distribuído. Over-engineering aqui. Setup local consome 30%+ do tempo de execução.
- **Pandas + Parquet:** Estoura memória em 55M linhas. Sem lineage. Sem testes de dados nativos.
- **Polars puro:** Excelente performance, mas sem camada de modelagem; teríamos que reimplementar dbt do zero.
- **PySpark local:** Mesma complexidade operacional do Spark Scala sem ganho proporcional.
