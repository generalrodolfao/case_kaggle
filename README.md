# Estrutura do Case — Guia de Navegação

> Esta pasta contém **toda a estrutura inicial** do projeto do case técnico.
> Copie o conteúdo para o raiz do seu repositório Git e siga o PROMPT_INICIAL.md.

## O Que Está Aqui

```
case-structure/
├── README.md                          # este arquivo
├── PROMPT_INICIAL.md                  # prompt para colar no Claude Code
├── CLAUDE.md                          # contexto operacional
├── docs/
│   ├── architecture.md
│   ├── data-profile.md
│   ├── runbook.md
│   └── adr/
│       ├── 0001-redpanda-over-kafka.md
│       ├── 0002-duckdb-over-spark.md
│       ├── 0003-medallion-layers.md
│       └── 0004-no-ml-modeling.md
├── specs/
│   ├── 01-producer.md
│   ├── 02-consumer.md
│   ├── 03-dbt-bronze.md
│   ├── 04-dbt-silver.md
│   ├── 05-dbt-gold.md
│   ├── 06-airflow-dag.md
│   └── 07-infra-compose.md
└── .claude/
    ├── agents/
    │   ├── infra-builder.md
    │   ├── producer-builder.md
    │   ├── consumer-builder.md
    │   ├── dbt-modeler.md
    │   └── test-writer.md
    └── skills/
        ├── data-quality-rules/SKILL.md
        ├── parquet-conventions/SKILL.md
        └── testing-standards/SKILL.md
```

## Como Usar

1. **Crie o repositório** no GitHub: `nyc-taxi-streaming` (privado ou público, sua escolha)
2. **Clone** localmente e entre na pasta
3. **Copie** todo o conteúdo desta pasta para a raiz do repo
4. **Inicialize Claude Code** dentro do repo (`cd repo && claude`)
5. **Cole** o conteúdo de `PROMPT_INICIAL.md` como primeira mensagem
6. **Acompanhe** a execução, valide cada spec antes da próxima

## Ordem de Construção (executada pelo Claude Code)

1. Spec 07 — Docker Compose (infra)
2. Spec 01 — Producer
3. Spec 02 — Consumer
4. Spec 03 — dbt Bronze
5. Spec 04 — dbt Silver
6. Spec 05 — dbt Gold
7. Spec 06 — Airflow DAG
8. Polimento final, README com screenshots, vídeo demo

## Tempo Estimado

- **Terça (hoje):** Esta estrutura + commit inicial
- **Quarta:** Specs 07, 01, 02 (infra + streaming)
- **Quinta:** Specs 03, 04, 05, 06 (dbt + Airflow)
- **Sexta manhã:** Polimento, README final, vídeo demo
- **Sexta tarde:** Envio até 15h

## Diferenciais vs. Caso Padrão

Esses elementos são o que separa esta entrega da média:

1. **SDD + ADRs documentando decisões** — não improviso, método
2. **Sub-agentes especializados** — paralelizam construção sem perder padrão
3. **Skills com regras canônicas** — fonte única de verdade pra qualidade
4. **Specs com critério de aceite** — DoD claro por componente
5. **Discovery formal via NotebookLM** — números reais, não chutes
6. **Decisão explícita de NÃO fazer ML** — leitura crítica do escopo
