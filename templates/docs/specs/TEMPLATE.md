# Spec — <título curto da feature>

> **Issue**: #XXX
> **Autor**: <seu nome>
> **Status**: draft | em análise | aprovada | obsoleta
> **Última atualização**: YYYY-MM-DD

Nível: **spec-anchored** — esta spec é uma âncora para o trabalho, não a fonte de verdade. O código é a verdade; a spec precisa ficar em sincronia o suficiente para ser útil.

## Contexto

O que provocou esta feature? Que bug, pedido de cliente, ou decisão de produto?
Link para a issue/Slack/PR original. Uma observação de 3-5 linhas — não conte a história toda.

## Problema

O que está quebrado ou faltando hoje? Evite falar de solução aqui.

## Solução proposta

Visão geral em 1 parágrafo. Depois, bullets com:

- **Mudança 1**: onde, o quê, por quê (não como)
- **Mudança 2**: ...
- **Mudança 3**: ...

## Fora do escopo

Lista explícita do que NÃO vai ser feito nesta iteração. Isso economiza review e evita scope creep.

- Não vamos X
- Não vamos Y

## Impacto

- **Dados**: migrations? backfill? perda de dados possível?
- **APIs**: breaking? compatibilidade retroativa? versionamento?
- **UI**: mudanças visíveis ao usuário final?
- **Performance**: queries novas? N+1 risk? cache invalidation?
- **Segurança**: auth novo? PII exposta? superfície nova?

## Plano de validação

Como vamos saber que funcionou?

- Testes automatizados (unit, integration, e2e) — quais?
- Métricas (logs, dashboards) — quais?
- Smoke test manual — roteiro curto?

## Perguntas em aberto

Coisas que você não tem certeza e precisam decisão antes de codar. Se esta lista ficar vazia, a spec está pronta pra virar PR.

- [ ] Dúvida 1
- [ ] Dúvida 2

---

**Quando mover esta spec pra `obsoleta`**: quando a feature estiver em prod e não houver mais trabalho ativo. Mantenha o arquivo — serve como arqueologia para quem vier depois.
