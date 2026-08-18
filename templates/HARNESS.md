# Harness Engineering

Controles automatizados que cercam o desenvolvimento deste projeto. Dois
objetivos, não um:

1. **Pegar bug estrutural antes de produção** (sensores feedforward).
2. **Manter o repositório legível para quem chega depois** — pessoa nova ou
   agente. O que não está no repositório, para efeitos práticos, não existe.

Referências: [Harness Engineering (Fowler)](https://martinfowler.com/articles/harness-engineering.html) ·
[Codex num mundo centrado no agente (OpenAI)](https://openai.com/index/harness-engineering/)

## Sensores ativos

| Sensor | Onde roda | O que valida |
|---|---|---|
| `check.mjs` | pre-commit (staged) + CI (alterados) | Padrões estruturais: SQL sem bind, fetch sem timeout, `any` no boundary, `console.log` no server, loop de CI runaway, tamanho de arquivo |
| `docs-check.mjs` | pre-commit (staged) + CI (alterados) | Base de conhecimento: entrypoint é índice, links resolvem, paths de código citados existem, front-matter, frescor, órfãos |
| Biome lint | pre-commit (staged) + CI (alterados) | Só regras de lint (format é opt-in) |
| `tsc --noEmit` | pre-push + CI | Tipagem |

**Política**: os sensores **só mordem arquivo novo ou modificado**. Código
legado fica como está — o harness impede **degradação**, não força refactor
retroativo.

Auditoria do repositório inteiro:

```bash
npm run harness         # sensores estruturais, tudo
npm run harness:docs    # base de conhecimento, incluindo órfãos
npm run harness:version # versão do motor vs. versão da config
```

## Motor e configuração

O harness é dividido em duas metades — e a divisão é o que permite atualizar
sem perder customização:

| | Onde | Quem edita |
|---|---|---|
| **Motor** | `scripts/harness/` | Ninguém. É sobrescrito no update da skill |
| **Configuração** | `harness.config.json` | Você. Escopos, extensões, severidades, opções |
| **Regras do projeto** | `harness.rules.mjs` | Você. Uma entrada por bug que já aconteceu |

Se você se pegar editando um arquivo em `scripts/harness/`, pare: ou a mudança
cabe na configuração, ou ela é genérica o bastante para virar melhoria do motor
(nesse caso, contribua na skill em vez de fazer fork local).

### Atualizar o motor

```bash
cd ~/.claude/skills/harness-init && git pull
```

Depois, no projeto, peça: *"roda o harness-init em modo update"*. A skill
sobrescreve `scripts/harness/` e **nunca** toca em `harness.config.json`,
`harness.rules.mjs` ou `docs/`.

## Escape hatch

Quando uma regra dá falso positivo num caso legítimo:

```ts
// harness-allow: external-fetch-without-timeout
await fetch('https://...');   // timeout controlado pelo caller
```

O marcador vale na própria linha ou na linha imediatamente acima. Sem o id da
regra, libera todas as regras naquela linha — prefira sempre nomear a regra.

Emergência (bypass do hook inteiro):

```bash
LEFTHOOK=0 git commit ...    # pula pre-commit
git push --no-verify         # pula pre-push
```

Cada bypass é dívida: registre em [docs/TECH_DEBT.md](docs/TECH_DEBT.md).

## Padrões seguros

O harness proíbe o padrão inseguro, mas às vezes a alternativa óbvia não
funciona. Esta seção evita o "fix do fix" — e é para cá que as mensagens de
erro apontam.

<a id="sql-dinamico-com-seguranca"></a>

### SQL dinâmico com segurança

```ts
// ❌ Interpolação direta — injection
prisma.$queryRawUnsafe(`SELECT * FROM users WHERE id = '${userId}'`)

// ✅ Tagged template: o Prisma faz o bind
prisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`

// ✅ Query montada em partes
import { Prisma } from '@prisma/client';
const cond = Prisma.sql`status = ${status}`;
prisma.$queryRaw`SELECT * FROM jobs WHERE ${cond}`
```

**INTERVAL**: Postgres não aceita bind na unidade.

```ts
// ❌ Quebra em runtime
prisma.$queryRaw`... NOW() - INTERVAL ${n} minutes`

// ✅ Multiplicação com literal
prisma.$queryRaw`... NOW() - (${n} * INTERVAL '1 minute')`
```

**Identifiers** (coluna/tabela) também não aceitam bind — use whitelist:

```ts
const SORT = { name: 'name', date: 'created_at' } as const;
const col = SORT[input] ?? SORT.date;   // nunca o input cru
```

<a id="jsonb-merge-preservando-arrays"></a>

### JSONB merge preservando arrays

```ts
// ❌ Spread sobrescreve o array inteiro
update({ metadata: { ...row.metadata, ...extra } })

// ✅ Concatena no nível SQL
update({
  metadata: sql`COALESCE(metadata, '[]'::jsonb) || ${JSON.stringify(extra)}::jsonb`,
})
```

<a id="fetch-externo-com-timeout"></a>

### Fetch externo com timeout

```ts
// ❌ Provedor lento trava o request
await fetch('https://api.exemplo.com/x', { method: 'POST', body });

// ✅ Timeout declarativo
await fetch(url, { method: 'POST', body, signal: AbortSignal.timeout(15_000) });

// ✅ Quando precisa cancelar por outro motivo também
const ac = new AbortController();
const timer = setTimeout(() => ac.abort(), 15_000);
try {
  await fetch(url, { signal: ac.signal });
} finally {
  clearTimeout(timer);
}
```

<a id="validar-no-boundary"></a>

### Validar no boundary

Dado que entra no sistema sem validação vira formato adivinhado — e código
construído sobre suposição quebra longe da causa.

```ts
// ❌ any no handler
fastify.post('/users', async (request: any, reply: any) => { ... })

// ✅ Schema + tipo derivado
const Body = z.object({ name: z.string(), email: z.string().email() });
type Body = z.infer<typeof Body>;

fastify.post<{ Body: Body }>('/users', async (request, reply) => {
  const data = Body.parse(request.body);
});
```

A invariante é **validar na borda**; a biblioteca é escolha livre.

<a id="logging-estruturado"></a>

### Logging estruturado

```ts
// ❌ Perde nível, contexto de request e correlação
console.log('user criado', id);

// ✅ Logger com contexto
request.log.info({ userId: id }, 'user criado');
```

<a id="automacao-de-ci-sem-runaway"></a>

### Automação de CI sem runaway

```bash
# ❌ `gh workflow run` devolve stdout vazio em sucesso: a condição nunca
#    satisfaz e o loop dispara deploy até alguém perceber
until gh workflow run deploy.yml | grep -q "ok"; do sleep 10; done

# ✅ Dispara uma vez, consulta o status em chamada separada
gh workflow run deploy.yml
gh run watch "$(gh run list --workflow=deploy.yml --limit=1 --json databaseId -q '.[0].databaseId')"
```

Defesa complementar: pre-flight de rate-limit no próprio workflow de deploy.

<a id="limite-de-tamanho-de-arquivo"></a>

### Limite de tamanho de arquivo

Arquivo grande demais deixa de caber no contexto de quem vai editá-lo e vira
ímã de drift: o agente lê um trecho, replica o padrão local e o arquivo cresce
mais. O limite vive em `harness.config.json` (`max-file-lines`), por padrão
como **aviso**, não bloqueio.

Ao esbarrar nele: extraia módulo em vez de continuar empilhando. Se não der
agora, mantenha a mudança cirúrgica e registre em
[docs/TECH_DEBT.md](docs/TECH_DEBT.md).

## Base de conhecimento

<a id="entrypoint-e-indice-nao-enciclopedia"></a>

### O entrypoint é índice, não enciclopédia

[AGENTS.md](AGENTS.md) é o ponto de entrada do repositório para qualquer agente,
e tem limite de linhas verificado. O motivo não é estética:

- **Contexto é recurso escasso.** Arquivo de instrução gigante ocupa espaço e
  ofusca a tarefa, o código e a documentação relevante.
- **Orientação demais vira nenhuma orientação.** Quando tudo é importante, nada
  é — e o leitor passa a reconhecer padrão local em vez de navegar de propósito.
- **Apodrece.** Manual monolítico vira cemitério de regra obsoleta que ninguém
  mantém.
- **Não dá para verificar.** Um amontoado não se presta a checagem mecânica.

O padrão é **divulgação progressiva**: entrada pequena e estável, com ponteiros
para onde olhar depois. O detalhe mora em `docs/`.

<a id="base-de-conhecimento-verificavel"></a>

### A base de conhecimento é verificável

`docs/` é o sistema de registro do projeto, e o `docs-check` trata isso como
invariante, não como boa intenção:

- todo documento é alcançável a partir de [docs/index.md](docs/index.md);
- todo link relativo resolve;
- todo caminho de código citado existe.

O que fica em chat, ticket ou na cabeça de alguém é ilegível para quem chega
depois — exatamente como seria para uma pessoa que entrasse no time três meses
adiante. Alinhou algo relevante num PR ou numa conversa? O alinhamento vira
documento (ou linha em documento existente) no mesmo PR.

<a id="frescor-e-manutencao-da-doc"></a>

### Frescor e manutenção

Front-matter dá ao documento o metadado que permite verificá-lo:

```yaml
---
status: ativo | rascunho | obsoleto
verified: YYYY-MM-DD    # quando alguém conferiu isto contra o código
owner: <pessoa ou time>
---
```

Documento parado além do limite configurado (`docs.stalenessDays`) vira aviso.
Ao mexer numa área, confira o documento correspondente e atualize `verified:` —
doc que mente é pior que doc ausente, porque a mentira é seguida com confiança.

## Adicionar uma regra (steerage loop)

Todo bug estrutural que chegou em produção vira sensor. O fluxo:

1. **Padrão detectável por regex** → nova entrada em `harness.rules.mjs`.
   Escreva `message` explicando o incidente e `fix` com a alternativa correta:
   a mensagem de erro é a instrução de correção que vai chegar em quem (ou o
   que) for consertar.
2. **Regra de estilo** → `biome.json`.
3. **Comportamento específico** → teste de regressão cobrindo aquele bug.
4. **Invariante arquitetural** (direção de dependência, camadas) → discuta
   antes; provavelmente vira sensor próprio.

O comentário acima da regra é obrigatório na prática: sem o incidente
registrado, em seis meses ninguém sabe por que a regra existe e ela é removida
no primeiro falso positivo.

## Spec para trabalho maior

Feature que toca ≥3 arquivos: copie [docs/specs/TEMPLATE.md](docs/specs/TEMPLATE.md)
para `docs/specs/<issue>-<slug>.md` e linke no PR. Trabalho com várias etapas ou
decisão arquitetural: use [docs/plans/](docs/plans/README.md).

Nível alvo: **spec-anchored** — a spec é âncora, o código é a fonte de verdade.
