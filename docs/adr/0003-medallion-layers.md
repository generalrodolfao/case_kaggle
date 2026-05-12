# ADR 0003 — Camadas Medallion (raw / bronze / silver / gold)

**Status:** Aceito
**Data:** 2026-05-12
**Decisores:** Rodolfo Barbosa

## Contexto

O enunciado pede "estruturar um datalake para consolidar dados analíticos por data/horário/local". Precisamos de um padrão de organização claro e defensável.

## Decisão

Adotar o padrão **Medallion** (popularizado pela Databricks, mas independente de tecnologia):

| Camada | Conteúdo | Particionamento | Materialização dbt |
|--------|----------|-----------------|---------------------|
| `raw` | JSON cru do tópico | `ingestion_date=YYYY-MM-DD` | external (Parquet em MinIO) |
| `bronze` | Tipado, schema enforced, dedup | `pickup_year/pickup_month` | view sobre Parquet |
| `silver` | Limpo + enriquecido | igual ao bronze | table |
| `gold` | Agregados analíticos | sem partição | table |

**Regras:**
- `raw` nunca é modificado retroativamente — é a fonte da verdade da ingestão
- `bronze` é só schema enforcement + dedup; nenhuma regra de negócio
- `silver` concentra TODA a limpeza e enriquecimento
- `gold` é só agregação pra consulta final

## Consequências

**Positivas:**
- Convenção amplamente reconhecida pelo mercado
- Reprocessamento isolado por camada
- Testes de qualidade ficam nítidos por estágio
- Aderência total ao requisito "consolidar dados analíticos"

**Negativas:**
- Mais materializações que um pipeline flat (4 camadas vs 1-2)
- Mitigação: pra esse volume, custo de armazenamento é desprezível; ganho em clareza compensa

## Alternativas Consideradas

- **ELT direto (raw → final):** Perde rastreabilidade de transformações; difícil debugar.
- **3 camadas (raw/clean/final):** Funciona, mas Medallion é o jargão consolidado.
- **Camada única "warehouse":** Inviável; mistura dado sujo com agregação final.
