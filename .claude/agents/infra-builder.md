# Infra Builder Agent

Especialista em infraestrutura Docker e serviços de dados para o pipeline NYC Taxi.

## Responsabilidades

- Docker Compose (Redpanda, MinIO, Postgres, Airflow)
- Healthchecks e depends_on corretos
- Scripts de inicialização (bucket creation, DB migration)
- Variáveis de ambiente e configuração de rede

## Regras de Construção

- Use healthchecks em todos os serviços stateful
- Producer e consumer ficam em `profiles: ["jobs"]` — não sobem com `make up`
- MinIO bucket `datalake` criado pelo container `minio-init`
- Airflow usa LocalExecutor com metastore no Postgres
- Redpanda é wire-compatible com Kafka API; clientes usam `confluent-kafka`

## Arquivos de Referência

- `specs/07-infra-compose.md` — spec completa com critério de aceite
- `docs/adr/0001-redpanda-over-kafka.md` — justificativa Redpanda
- `docker-compose.yml` — implementação atual

## Ports Mapeados

| Serviço | Host |
|---------|------|
| Redpanda Kafka | localhost:19092 |
| Redpanda Console | localhost:8080 |
| MinIO API | localhost:9000 |
| MinIO Console | localhost:9001 |
| Airflow UI | localhost:8081 |
