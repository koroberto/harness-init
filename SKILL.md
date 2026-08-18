---
name: harness-init
description: Instala ou atualiza o harness de qualidade num projeto Node/TS — sensores estruturais (pre-commit + CI), base de conhecimento verificável (AGENTS.md como índice + docs/ como sistema de registro) e SDD spec-anchored leve. O motor é compartilhado entre projetos e atualizável; a adaptação vive em harness.config.json. Use quando o usuário pedir "instalar o harness aqui", "atualizar o harness", "configurar o harness-init", "setar os controles de qualidade neste projeto", ou invocar /harness-init.
---

# harness-init

Instala (ou atualiza) o harness de qualidade **adaptado ao projeto atual**.

## Princípio que rege a skill

O harness tem duas metades, e a separação é o que impede o fork manual:

| Metade | Onde | Quem escreve |
|---|---|---|
| **Motor** | `scripts/harness/*.mjs` | A skill. Sobrescrito em todo update |
| **Configuração** | `harness.config.json` | O projeto. **Nunca** sobrescrever |
| **Regras do projeto** | `harness.rules.mjs` | O projeto. **Nunca** sobrescrever |
| **Base de conhecimento** | `AGENTS.md`, `docs/` | O projeto. Só criar se ausente |

Se você se pegar editando um `.mjs` do motor para adaptar ao projeto, pare: ou
a adaptação cabe no `harness.config.json`, ou é melhoria genérica e deve virar
mudança na própria skill (não fork local).

## Pré-requisitos

- Working directory = raiz do projeto alvo.
- Projeto Node/TS. Outra stack: avise e pare (ver roadmap no README).
- Projeto com git. Sem git não há hook — avise e pare.

## Modo 0 — Decidir install vs update

Verifique se `scripts/harness/` já existe.

- **Não existe** → modo **install** (Passos 1-7).
- **Existe** → modo **update** (Passo U).

Se o usuário pedir explicitamente um dos modos, respeite o pedido.

---

## Passo U — Update

1. Rode `node scripts/harness/check.mjs --version` para ver motor vs. config.
2. Leia o [CHANGELOG](CHANGELOG.md) da skill e resuma ao usuário o que muda
   entre a versão dele e a atual — em linguagem de consequência ("passa a pegar
   X", "deixa de exigir Y"), não de commit.
3. Copie de `~/.claude/skills/harness-init/templates/scripts/harness/` **todos**
   os `.mjs` para `scripts/harness/` do projeto, sobrescrevendo.
4. **Não toque** em `harness.config.json`, `harness.rules.mjs`, `docs/`,
   `AGENTS.md`, `CLAUDE.md`, `HARNESS.md`.
5. Se a nova versão introduziu chave de config nova, **mostre o diff sugerido**
   e peça confirmação antes de editar o `harness.config.json`. Atualize o campo
   `harnessVersion` junto.
6. Rode `node scripts/harness/check.mjs` e `node scripts/harness/docs-check.mjs`.
   Se aparecerem violações novas em código legado, **não corrija em massa**:
   explique ao usuário e ofereça (a) baixar a severidade no config, ou (b) abrir
   issue para pagar aos poucos. O harness impede degradação, não força refactor.

---

## Passo 1 — Detectar estrutura

Em paralelo:

- `Read` do `package.json` da raiz.
- `Glob` por `**/package.json` (fora de `node_modules`) → flat ou monorepo.
- `Glob` por `**/biome.json`, `**/lefthook.yml`, `**/eslint.config.*` →
  ferramenta conflitante já instalada.
- `Glob` por `.github/workflows/*.yml` → CI existente.
- `Glob` por `AGENTS.md`, `CLAUDE.md`, `docs/**/*.md` → base de conhecimento
  existente.

Se já houver Biome/Lefthook, avise e pergunte: **continuar (sobrescreve)** ou
**abortar**.

Anote os paths reais do código server e client — eles viram `scopes` no
`harness.config.json`. Em monorepo, um glob por app
(`apps/api/src/**`, `apps/web/src/**`).

## Passo 2 — Coletar bugs estruturais (steerage loop inicial)

Apresente, conciso:

> Quais bugs estruturais o time já teve em produção? Cada um vira uma regra em
> `harness.rules.mjs`.
>
> Já vêm por padrão no motor: SQL com `${var}` em raw, fetch externo sem
> timeout, `any` em handler HTTP, `console.log` no server, loop de CI runaway,
> limite de tamanho de arquivo.
>
> Me diz 2-3 que mais doeram (ou "nenhum" se o projeto é novo).

Para cada bug relatado, escreva a regra com **comentário do incidente**,
`message` (o que houve) e `fix` (a alternativa correta). Sem o incidente
registrado, a regra vira folclore e é removida no primeiro falso positivo.

Pergunte também: **o schema tem coluna JSONB com array?** Se sim, colete os
nomes e preencha `rules.options["jsonb-array-merge-with-spread"].columns`.
Sem nomes, deixe a lista vazia — a regra fica inativa em vez de virar ruído.

## Passo 3 — Base de conhecimento

Texto:

> Quer instalar também a base de conhecimento verificável? São 3 coisas:
>
> 1. `AGENTS.md` — índice do repositório (limite de linhas verificado), com
>    `CLAUDE.md` apontando para ele.
> 2. `docs/` — índice, TECH_DEBT, QUALITY, plans/.
> 3. `docs-check` no pre-commit e no CI — links que resolvem, paths de código
>    citados que existem, doc órfã, frescor.
>
> [S/n]

Guarde em `INCLUDE_KB`. Se o projeto **já tem** `CLAUDE.md` com conteúdo real,
**não sobrescreva**: proponha extrair o índice para `AGENTS.md` e deixar o
`CLAUDE.md` como ponteiro, mostrando o resultado antes de aplicar.

Pergunte ainda se inclui `docs/specs/TEMPLATE.md` (SDD spec-anchored) →
`INCLUDE_SPECS`.

## Passo 4 — Modo de aplicação

> **1. Aplicar direto** — escrevo os arquivos e te digo o que rodar.
> **2. Entregar patch** — crio `.harness-proposed/` para você revisar e mover.
>
> [1/2]

## Passo 5 — Preparar arquivos

Fonte: `~/.claude/skills/harness-init/templates/`. Leia cada um e adapte antes
de escrever.

**Sempre:**

| Template | Adaptação |
|---|---|
| `scripts/harness/*.mjs` | Nenhuma — cópia literal. É o motor |
| `harness.config.json` | `scopes` com os paths reais; `extensions` conforme a stack; `docs.codeRoots` = raízes de código |
| `harness.rules.mjs` | Regras do Passo 2 |
| `lefthook.yml` | Blocos de biome/typecheck conforme flat ou monorepo |
| `biome.json` | Um por app (monorepo) ou um na raiz (flat) |
| `.github/workflows/ci-harness.yml` | Nenhuma — já é genérico via `--changed` |
| `HARNESS.md` | Tabela de sensores e comandos conforme o gerenciador (npm/pnpm) |
| `root-package.json` | Nome do projeto; **se já existir `package.json`, não sobrescreva** — mostre os `scripts` e `devDependencies` a somar |

**Se `INCLUDE_KB`:** `AGENTS.md`, `CLAUDE.md`, `docs/index.md`,
`docs/TECH_DEBT.md`, `docs/QUALITY.md`, `docs/plans/README.md` +
`docs/plans/{active,completed}/.gitkeep`.

**Se `INCLUDE_SPECS`:** `docs/specs/TEMPLATE.md`.

**Placeholders a substituir em todos os arquivos:**

- `__PROJECT_NAME__` → nome do projeto.
- `__TODAY__` → data de hoje em `YYYY-MM-DD`.
- Trechos entre `<...>` no `AGENTS.md` e nos docs → preencha com o que você
  descobriu no Passo 1. Não deixe placeholder cru: índice com lacuna é pior que
  índice ausente, porque parece pronto.

Se `INCLUDE_KB` for falso, ajuste o `harness.config.json` removendo o bloco
`docs` ou apontando `entrypoint`/`index` para o que existe — senão o
`docs-check` reclama de arquivo que ninguém pediu.

## Passo 6 — Aplicar e verificar

**Modo 1 (direto):** escreva os arquivos nos paths finais.

**Modo 2 (patch):** escreva em `.harness-proposed/` mantendo a estrutura.

Em ambos os casos, **verifique antes de declarar pronto** (no modo patch,
rodando de dentro de `.harness-proposed/` se possível):

```bash
node scripts/harness/check.mjs
node scripts/harness/docs-check.mjs
```

Uma instalação limpa tem que passar nos próprios sensores. Se não passar:

- violação em código **legado** → esperado; explique a política (só morde
  arquivo modificado) e siga.
- violação nos arquivos que a própria skill acabou de escrever → **conserte
  antes de entregar**. Isso é bug da instalação, não do projeto.

Mensagem final (modo 1):

```
✅ harness-init aplicado. Próximos passos:
  1. npm install         (raiz — ativa o lefthook via prepare)
  2. Revise AGENTS.md    (troque os <placeholders> pelo real)
  3. git add . && git commit -m "chore: harness engineering setup"
  4. Leia HARNESS.md — política, padrões seguros e como adicionar regra nova
```

## Passo 7 — Salvar memória

Salve/atualize a entidade do projeto no knowledge graph:

```json
{
  "name": "PROJECT_<nome>",
  "entityType": "project",
  "observations": [
    "harness-init <versão> aplicado em <data>",
    "Modo: <install|update> | <direto|patch>",
    "Base de conhecimento: <incluída|não>",
    "Regras de projeto: <lista de ids>"
  ]
}
```

## Quando NÃO usar

- Projeto já tem harness robusto e estabelecido — pergunte antes de sobrescrever.
- Stack não-Node/TS — avise e saia.
- Projeto sem git — avise e saia.

## Limitações atuais

- Só Node/TS.
- Invariante arquitetural (direção de dependência entre camadas) ainda não tem
  sensor — está no roadmap como `arch-check`.
- Não há job recorrente de anti-entropia (GC de drift) — roadmap.
- SDD é template markdown, sem slash commands.
- Não instala devDependencies sozinha.
