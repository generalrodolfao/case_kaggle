# Placeholder — substituído pela implementação da Spec 02
FROM python:3.11-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc librdkafka-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .
RUN pip install --no-cache-dir .

ENTRYPOINT ["python", "-m", "consumer.main"]
