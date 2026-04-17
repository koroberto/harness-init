---
name: harness-init
description: Instala Harness Engineering (Fowler) + SDD spec-anchored leve (Böckeler) num projeto Node/TS. Ao invocar, a skill detecta a estrutura do projeto, pergunta quais bugs estruturais virar regex no harness, e oferece dois modos de aplicação (direto ou via patch). Use quando o usuário pedir "instalar o harness aqui", "configurar o harness-init", "setar os controles de qualidade neste projeto novo", ou invocar /harness-init.
---

# harness-init — skill de instalação

Você vai instalar o harness de qualidade (pre-commit + CI + regex anti-padrões + template de spec) **adaptado ao projeto atual**. Siga o fluxo abaixo rigorosamente, confirmando com o usuário a cada passo crítico.

## Pré-requisitos

- Skill roda de dentro do projeto alvo (working directory = raiz do projeto a ser instrumentado).
- Projeto deve ser Node/TS. Se não for, avise o usuário e pare — a skill ainda não suporta Python/Go (ver [README roadmap](README.md#roadmap-evolução-futura)).

## Fluxo

### Passo 1 — Detectar estrutura

Em paralelo:

- `Read` do `package.json` da raiz.
- `Glob` por `**/package.json` (excluir `node_modules`) para detectar monorepo.
- `Glob` por `**/biome.json`, `**/lefthook.yml`, `**/eslint.config.*` para saber se já existe ferramenta conflitante.
- `Glob` por `**/.github/workflows/*.yml` para ver CI existente.

Classifique o projeto como:
- **flat**: um `package.json` na raiz, código em `src/`.
- **monorepo**: múltiplos `package.json` (ex: `server/` + `client/`).

Se encontrar Biome/Lefthook já instalados, avise o usuário e pergunte: **continuar (vai sobrescrever)** ou **abortar**.

### Passo 2 — Coletar bugs estruturais do time (steerage loop inicial)

Apresente ao usuário o texto abaixo (em português, conciso):

> Quais bugs estruturais o time já teve em produção? Vou transformar cada um em um regex no harness-checks.mjs.
>
> Exemplos comuns:
> - SQL com `${var}` em `raw()` → já incluso por padrão
> - fetch externo sem timeout → já incluso por padrão
> - merge de JSONB com spread (perde arrays) → já incluso, mas preciso dos **nomes das colunas JSONB do seu schema**
> - `console.log` esquecido em prod
> - migrations sem rollback
> - uso de `any` em boundary de API
>
> Me diz 2-3 que mais doeram no seu time (ou "nenhum" se for projeto novo).

Com base na resposta, prepare o `harness-checks.mjs` customizado (ver Passo 5).

### Passo 3 — Perguntar se inclui SDD spec-anchored

Texto:

> Quer incluir o template `docs/specs/TEMPLATE.md` (SDD spec-anchored leve)? É um markdown único pra features ≥3 arquivos — sem tooling, sem slash commands, só uma âncora.
>
> [s/N]

Guarde a resposta em `INCLUDE_SPECS` (boolean).

### Passo 4 — Perguntar modo de aplicação

Texto:

> Modo de aplicação:
>
> **1. Aplicar direto** — escrevo os arquivos no projeto e te aviso quando rodar `npm install`.
> **2. Entregar patch** — crio `.harness-proposed/` com tudo lá dentro pra você revisar e mover manualmente.
>
> [1/2]

Guarde em `MODE`.

### Passo 5 — Preparar arquivos

Baseado nas respostas:

**Sempre:**
- `root-package.json` → adapta ao nome do projeto (lê `package.json` existente para o nome).
- `lefthook.yml` → adapta os `glob` e `root` de acordo com estrutura (flat vs monorepo).
- `biome.json` → uma cópia por app (monorepo) ou uma só na raiz (flat).
- `scripts/harness-checks.mjs` → preenche as regex base + adiciona regex dos bugs do Passo 2 na seção `// USER RULES`.
- `.github/workflows/ci-harness.yml` → adapta os paths dos `grep` ao projeto.
- `HARNESS.md` → adapta a tabela de sensores e caminhos.

**Se `INCLUDE_SPECS`:**
- `docs/specs/TEMPLATE.md`

**Fontes**: tudo vem de `~/.claude/skills/harness-init/templates/`. Use `Read` para pegar o conteúdo e adapte antes de escrever.

### Passo 6 — Aplicar

**Se `MODE == 1` (aplicar direto):**
- `Write` cada arquivo no path final (raiz do projeto alvo).
- Se já existir `package.json` na raiz, **não sobrescreva** — mostre o `scripts` e `devDependencies` a adicionar e peça confirmação de merge manual OU deixe o usuário escolher.
- Ao final, imprima:
  ```
  ✅ harness-init aplicado. Próximos passos:
    1. npm install    (raiz — ativa lefthook via prepare)
    2. Commit dos arquivos: git add . && git commit -m "chore: harness engineering setup via harness-init"
    3. Leia HARNESS.md — política e padrões seguros
  ```

**Se `MODE == 2` (entregar patch):**
- Crie pasta `.harness-proposed/` na raiz.
- `Write` cada arquivo lá dentro mantendo a estrutura relativa.
- Ao final, imprima:
  ```
  ✅ Patch gerado em .harness-proposed/. Revise e mova o que aprovar:
    cp -r .harness-proposed/. .
    rm -rf .harness-proposed
  Depois: npm install && git add . && git commit
  ```

### Passo 7 — Salvar memória

Após aplicar com sucesso, salve uma memória de projeto:

```json
{
  "name": "PROJECT_<nome>",
  "entityType": "project",
  "observations": [
    "harness-init aplicado em <data>",
    "Modo: <direto|patch>",
    "SDD specs: <incluído|não>",
    "User rules adicionadas: <lista>"
  ]
}
```

Use `mcp__memory__create_entities` ou `mcp__memory__add_observations` se já existir entidade do projeto.

## Notas sobre adaptação dos templates

### lefthook.yml

Template traz bloco comentado para monorepo (`server/` + `client/`). Para **flat**, remova os blocos `-client` e troque `root: 'intelexia-publisher/server'` por removê-lo (roda na raiz).

### harness-checks.mjs

- `SERVER_GLOB` no topo: ajuste para o path do código server do projeto (ex: `src/` para flat, `server/src/` para monorepo).
- Regex `jsonb-array-merge-with-spread`: o grupo de captura `(approval_history|plan_snapshot|...)` deve ser **substituído pelas colunas JSONB reais do projeto** (coletadas no Passo 2). Se o usuário não souber, deixe a regex comentada.
- Seção `// USER RULES` no final do array `RULES`: adicione um objeto por bug relatado.

### biome.json

- Monorepo: copiar um em `server/` e outro em `client/`. Diferença entre eles: `noConsole` = `error` (server) vs `warn` (client).
- Flat: um só na raiz.
- `files.ignore` vem vazio — o usuário adiciona arquivos legados ≥2000 linhas depois.

### ci-harness.yml

Paths do `grep` precisam bater com estrutura:
- Flat: `^src/.*\.(ts|tsx|js|mjs|vue)$`
- Monorepo: `^<app-path>/src/.*\.(ts|tsx|js|mjs|vue)$` para cada app

## Quando NÃO usar esta skill

- Projeto já tem harness bem estabelecido (Husky + ESLint + testes robustos). Pergunte antes de sobrescrever.
- Projeto Python/Go/outro — avise e saia.
- Projeto sem Git — o lefthook depende de git hooks. Avise e saia.

## Limitações atuais

- Só Node/TS (ver [README roadmap](README.md)).
- SDD é apenas template markdown; não há slash commands `/spec-new` etc.
- Não detecta automaticamente colunas JSONB do schema — depende de o usuário informar.
- Não instala devDependencies sozinha — sempre sugere `npm install` como passo manual.
