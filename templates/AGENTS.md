# __PROJECT_NAME__

> Este arquivo é um **índice**, não um manual. Ele existe para que um agente
> (ou uma pessoa nova) saiba **onde olhar** — não para conter as respostas.
> Limite: 120 linhas, verificado pelo harness (`docs-check`).
> Detalhe vai para `docs/`. Se você está tentado a explicar algo aqui, o lugar
> provavelmente é um documento em `docs/` + uma linha de ponteiro neste índice.

## O que é

<Uma frase sobre o produto. Uma frase sobre o estágio: greenfield, em produção,
migração de legado. Uma frase sobre quem usa.>

## Stack e layout

| Onde | O quê |
|---|---|
| `src/` | <descrição> |
| `scripts/harness/` | Motor do harness — não editar (sobrescrito no update) |
| `docs/` | Base de conhecimento — sistema de registro do projeto |

Comandos: `<dev>`, `<test>`, `<build>`.

## Onde procurar cada coisa

| Preciso de… | Vá para |
|---|---|
| Panorama da documentação | [docs/index.md](docs/index.md) |
| Controles de qualidade e padrões seguros | [HARNESS.md](HARNESS.md) |
| Dívida técnica conhecida | [docs/TECH_DEBT.md](docs/TECH_DEBT.md) |
| Estado de qualidade por área | [docs/QUALITY.md](docs/QUALITY.md) |
| Trabalho em andamento | [docs/plans/active/](docs/plans/active/) |
| Spec de uma feature | [docs/specs/](docs/specs/) |

## Como o trabalho anda

<Fluxo real do projeto em 3-5 linhas: issue → branch → PR → deploy. Nome da
branch. Keyword de fechamento de issue. Onde vive o backlog.>

## Invariantes

Regras que o harness aplica mecanicamente — quebrar não passa no commit:

- Validar dados no boundary (schema explícito, sem `any` em handler).
- SQL sempre com bind; nunca `${}` em raw.
- Chamada externa sempre com timeout.
- Logging estruturado no server; nada de `console.log`.

Detalhe e padrões seguros: [HARNESS.md](HARNESS.md).

## Regras de convivência com o repositório

1. **O repositório é o sistema de registro.** Decisão que ficou só no chat não
   existe. Se alinhou algo relevante, o alinhamento vira documento em `docs/`
   (ou uma linha em um documento existente) no mesmo PR.
2. **Todo bug estrutural vira sensor.** Quando algo quebra em produção por um
   padrão que pode se repetir, adicione a regra em `harness.rules.mjs` junto
   com o fix.
3. **Documentação tocada é documentação verificada.** Ao mexer numa área,
   confira se o doc correspondente ainda é verdadeiro e atualize `verified:`.
4. **Prefira o utilitário compartilhado ao helper novo.** Duplicar um helper
   espalha invariante; centralizar mantém uma correção valendo em todo lugar.
5. **Tecnologia chata ganha da esperta.** Dependência estável e previsível é
   mais fácil de modelar — para agente e para gente.
