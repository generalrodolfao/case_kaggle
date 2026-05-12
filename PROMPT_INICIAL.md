# Prompt Inicial para Claude Code

> Cole o conteúdo abaixo como primeira mensagem no Claude Code, dentro do diretório raiz do projeto, depois de copiar a estrutura `CLAUDE.md`, `docs/`, `specs/`, `.claude/` para o repo.

---

## Texto a colar

Olá. Você está dentro do repositório do **case técnico NYC Taxi Streaming Pipeline**. O projeto precisa estar pronto até sexta, 15/05/2026 às 15h.

**Antes de qualquer coisa, leia nesta ordem:**

1. `CLAUDE.md` — contexto operacional e regras não-negociáveis
2. `docs/architecture.md` — visão arquitetural
3. `docs/data-profile.md` — perfil do dataset
4. `docs/adr/` — todas as 4 ADRs (decisões justificadas)
5. `.claude/skills/data-quality-rules/SKILL.md` — regras de qualidade canônicas
6. `.claude/skills/parquet-conventions/SKILL.md` — convenções de escrita
7. `.claude/skills/testing-standards/SKILL.md` — padrões de teste
8. `specs/01-producer.md` até `specs/07-infra-compose.md` (todas)

**Depois de ler tudo, me confirme em 5 linhas:**
1. O objetivo do projeto (em 1 frase)
2. As 5 peças obrigatórias da entrega
3. A stack escolhida (em 1 linha)
4. A ordem de execução das specs
5. O que NÃO deve ser feito (ML, Spark, etc.)

Em seguida, **execute a Spec 07 (Docker Compose)** invocando o agente `@infra-builder`. Não comece antes de eu confirmar que sua interpretação está correta.

**Regras que você seguirá ao construir:**

- Use os sub-agentes em `.claude/agents/` para cada camada (são especializados)
- Consulte as skills em `.claude/skills/` antes de implementar regras de qualidade, escrever Parquet ou criar testes
- Cada spec tem **critério de aceite** — não avance sem cumprir
- Atualize as specs se você desviar do plano original (com justificativa)
- Logs estruturados (JSON via structlog), sem `print()`
- Type hints + docstrings Google em todas as funções públicas
- Cobertura mínima 80% em producer/consumer (pytest)
- Sem ML, sem Spark, sem over-engineering

**Ao fim de cada spec executada, gere um resumo:**
- O que foi feito
- Critério de aceite cumprido (checklist marcado)
- Próxima spec na ordem
- Eventuais desvios e justificativas

Pronto. Comece pela leitura.
