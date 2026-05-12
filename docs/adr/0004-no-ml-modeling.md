# ADR 0004 — Sem Modelagem ML

**Status:** Aceito
**Data:** 2026-05-12
**Decisores:** Rodolfo Barbosa

## Contexto

O dataset NYC Taxi Fare Prediction é amplamente conhecido como uma competição Kaggle de regressão. A tentação natural ao receber esse case é treinar XGBoost/LightGBM e incluir métricas de RMSE como diferencial.

O enunciado do case, no entanto, é explícito:

> "O objetivo do exercício não é avaliar a melhor performance, mas entender como você estrutura, organiza e apresenta a solução de um problema."

Os requisitos listados são todos de engenharia de dados:
- Aplicação streaming
- Consumo com filtros
- Armazenamento Parquet
- Datalake consolidável
- Consultas batch

Nenhum item menciona modelo, predição, RMSE ou ML.

## Decisão

**Não treinar nenhum modelo de ML.** O campo `fare_amount` é tratado como métrica analítica (somas, médias, distribuições), não como target de predição.

## Consequências

**Positivas:**
- Foco total no que está sendo avaliado: estrutura, design, testes, organização
- Tempo poupado vai pra polimento do pipeline, documentação e demo
- Decisão demonstra leitura crítica do escopo — diferencial em si

**Negativas:**
- Avaliador pode achar que "faltou" um modelo
- Mitigação: esta ADR documenta a decisão; README inclui seção "O que ficou fora" explicando

## Alternativas Consideradas

- **Modelo simples (regressão linear):** Mesmo simples, consome tempo significativo de feature engineering, treino, validação, integração. Não agrega ao requisito.
- **Modelo + serving:** Iria muito além do escopo, multiplica complexidade.
- **Notebook exploratório anexo:** Adiciona ruído sem agregar valor à avaliação de engenharia.

## Referências

- Enunciado do case, seção de critérios de avaliação.
- Lista de tópicos relevantes citados: "Testes unitários, Desenho de solução, Estrutura de código, Aplicação up and running" — nenhum sobre ML.
