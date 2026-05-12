# ADR 0001 — Redpanda over Kafka

**Status:** Aceito
**Data:** 2026-05-12
**Decisores:** Rodolfo Barbosa

## Contexto

O case pede uma camada de streaming. Kafka é o padrão da indústria, mas tem custo operacional alto: requer ZooKeeper (ou KRaft em config complexa), múltiplos brokers para tolerância a falhas, e configuração de tópicos não-trivial. Para um case com 3 dias de execução e foco em demonstrar método de engenharia, esse setup compete em horas com a entrega real.

## Decisão

Usar **Redpanda** como broker. Redpanda é wire-compatible com a API Kafka — todo cliente, ferramenta e código Kafka funciona sem alteração. Diferenças relevantes:

- Single binary, sem JVM, sem ZooKeeper
- Sobe em 1 container Docker
- Performance comparável ou superior em workloads pequenas/médias
- Console web embutido (porta 8080) facilita demonstração

## Consequências

**Positivas:**
- Tempo economizado em setup vai pra qualidade de código e testes
- Demo mais limpa: 1 container vs 3-4
- Código portável pra Kafka real sem mudanças

**Negativas:**
- Avaliador pode preferir ver Kafka "de verdade"
- Mitigação: ADR documenta a escolha; código usa `confluent-kafka` cliente padrão; substituir broker é mudança no compose, não no código

## Alternativas Consideradas

- **Kafka + ZooKeeper:** Setup pesado, ZK depreciado.
- **Kafka KRaft mode:** Mais novo, ainda mais complexo no Compose.
- **RabbitMQ:** Modelo diferente (queue, não log), não combina com replay/consumer groups.
- **Server-Sent Events (Flask-SSE):** Citado no enunciado como sugestão; descartado por ser menos representativo de streaming real.
