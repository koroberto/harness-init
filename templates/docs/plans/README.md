---
status: ativo
verified: __TODAY__
---

# Planos

Planos de execução versionados no repositório, ao lado do código.

**Por que aqui e não numa ferramenta:** o plano é contexto de trabalho. Se ele
vive num documento externo, quem executa (pessoa ou agente) trabalha sem ele —
e a decisão que justificou o caminho escolhido se perde no momento em que mais
faria falta, seis meses depois, quando alguém perguntar "por que isso é assim?".

## Dois pesos

- **Mudança pequena** (1-2 arquivos, sem decisão em aberto): não precisa de
  plano. Vá direto ao PR.
- **Trabalho complexo** (várias etapas, decisão arquitetural, mais de um dia):
  crie `active/<slug>.md` a partir do formato abaixo e mantenha o log conforme
  avança.

Ao terminar, mova para `completed/`. Não apague: plano concluído é arqueologia.

## Formato

```markdown
---
status: ativo | concluído | abandonado
verified: YYYY-MM-DD
owner: <quem toca>
---

# <título>

## Objetivo
O resultado esperado em 2-3 linhas. O que muda para o usuário.

## Fora do escopo
O que explicitamente não será feito nesta rodada.

## Etapas
- [ ] Etapa 1
- [ ] Etapa 2

## Log de decisões
| Data | Decisão | Por quê | Alternativa descartada |
|---|---|---|---|

## Em aberto
Perguntas que ainda bloqueiam alguma etapa.
```

## O log de decisões é a parte que importa

As etapas envelhecem em dias; a decisão e o motivo dela seguem valendo. É o
registro que impede a próxima pessoa (ou a próxima execução do agente) de
refazer a discussão do zero — ou pior, de desfazer sem saber por quê.
