# Harness Engineering

Controles automatizados (feedforward + feedback) que cercam o desenvolvimento
deste projeto. Objetivo: pegar bugs estruturais antes que cheguem em produção.

Contexto: https://martinfowler.com/articles/harness-engineering.html

## Sensores ativos

| Sensor | Onde roda | O que valida |
|---|---|---|
| `harness-checks.mjs` | pre-commit + CI | Regex: SQL `${var}` em `raw()`, JSONB spread, `fetch` externo sem timeout |
| Biome lint | pre-commit (staged) + CI (changed) | Apenas regras de lint (format opt-in via `npm run format`) |
| `tsc --noEmit` | pre-push + CI | Tipagem |

**Política**: lint e harness-checks **só mordem arquivos novos/modificados** no PR
(ou staged no commit). Código legado permanece como está — o harness impede
**degradação**, não força refactor retroativo.

Auditoria manual do repo inteiro: `npm run harness` (raiz).

### Arquivos legados isentos de Biome

Arquivos ≥2000 linhas podem ser listados em `files.ignore` do `biome.json`.
Motivo: Biome roda no arquivo inteiro quando 1 linha muda, bloqueando fixes
cirúrgicos em arquivos legados grandes.

**Regras ao trabalhar com arquivos da lista:**

1. **Prefira criar arquivo novo** — nova feature, mesmo tocando o legado,
   deveria extrair lógica em composables/helpers/services menores. O arquivo
   novo passa pelo lint normalmente.
2. **Se precisar editar o legado**, o commit passa sem Biome (continua
   validando harness-checks e typecheck via pre-push).
3. **Para remover da lista**, refatore primeiro (reduza para <2000 linhas ou
   extraia em módulos) e garanta que `npm run lint` passa.

`harness-checks` e `typecheck` continuam ativos em TODOS os arquivos — só o
Biome é relaxado no legado.

## Setup local

```bash
npm install      # raiz: instala lefthook + configura hooks
```

Pronto. Todo commit passa pelo pre-commit; todo push passa pelo pre-push.

## Desabilitar temporariamente (emergência)

```bash
LEFTHOOK=0 git commit ...   # skip pre-commit
git push --no-verify        # skip pre-push
```

Use com parcimônia. Cada bypass é dívida — abra issue explicando o motivo.

## Padrões seguros para situações que o harness pega

O harness proíbe padrões inseguros, mas às vezes a alternativa óbvia
(`?` no lugar de `${}`) não funciona. Este guia evita o "fix do fix".

### SQL com `INTERVAL`

Postgres **não aceita bind param na unidade** do INTERVAL.

```ts
// ❌ Proibido pelo harness (SQL injection em vars externas)
.whereRaw(`updated_at < NOW() - INTERVAL '${n} minutes'`)

// ❌ Parece OK mas quebra em runtime (syntax error na unidade)
.whereRaw('updated_at < NOW() - INTERVAL ? minutes', [n])

// ✅ Correto: multiplicação com INTERVAL literal
.whereRaw("updated_at < NOW() - (? * INTERVAL '1 minute')", [n])
```

Vale pra qualquer unidade (`hour`, `day`, `week`, etc).

### SQL dinâmico com identifiers (nomes de coluna/tabela)

Identifiers também não aceitam bind param. Use whitelist + query builder:

```ts
// ❌ SQL injection se `column` vier de user input
.orderByRaw(`${column} ASC`)

// ✅ Valida contra whitelist de strings conhecidas
const SORT_COLUMNS = { name: 'name', date: 'created_at' } as const;
const col = SORT_COLUMNS[input] ?? SORT_COLUMNS.date;
.orderBy(col, 'asc')   // query builder — sem raw
```

### JSONB merge preservando arrays

```ts
// ❌ Spread sobrescreve arrays
update({ metadata: { ...row.metadata, ...extra } })

// ✅ Concatena arrays no nível SQL
update({
  metadata: knex.raw(
    "COALESCE(metadata, '[]'::jsonb) || ?::jsonb",
    [JSON.stringify(extra)]
  )
})
```

### Fetch externo com timeout

```ts
// ❌ Sem timeout — trava o job se provedor ficar lento
await fetch('https://api.example.com/...', { method: 'POST', body });

// ✅ AbortSignal com timeout + cleanup no finally
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 15_000);
try {
  const res = await fetch(url, { signal: controller.signal, ... });
} finally {
  clearTimeout(timer);
}
```

## Adicionando uma nova regra (steerage loop)

Fluxo: todo bug em produção vira um sensor novo.

1. **Regex simples** → edite `scripts/harness-checks.mjs`, adicione objeto na seção `// USER RULES` do array `RULES`.
2. **Regra de lint** → edite `biome.json`.
3. **Teste de regressão** → crie test (Vitest/Jest) para cobrir o bug específico.
4. **Fitness arquitetural complexa** → abra discussão antes (provavelmente vira script próprio).

## SDD spec-anchored leve (opcional)

Para features ≥3 arquivos, use o template em `docs/specs/TEMPLATE.md`.
Copie, renomeie para `docs/specs/<issue>-<slug>.md`, preencha, linke no PR.

Nível alvo: **spec-anchored** (a spec é âncora, código é fonte de verdade),
não *spec-as-source* (evita *Verschlimmbesserung*).

Referência: [Böckeler — SDD parte 3](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html).
