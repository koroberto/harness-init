/**
 * Harness — regras base (universais para projetos Node/TS).
 *
 * Este arquivo faz parte do MOTOR. Não edite: ele é sobrescrito no update.
 * Regras nascidas de bugs DESTE projeto vão em `harness.rules.mjs` (raiz).
 *
 * Contrato de uma regra:
 *   {
 *     id: string,                       // kebab-case, estável (usado em harness-allow)
 *     scope: 'server'|'client'|'any',
 *     kind?: 'line' | 'file',           // default 'line'
 *     regex?: RegExp,                   // kind 'line'
 *     nextLineRegex?: RegExp,           // exige match também na linha seguinte
 *     postFilter?: (line, ctx) => bool, // true = reportar
 *     test?: (content, rel) => hit|null // kind 'file'
 *     message: string,                  // O QUE está errado
 *     fix?: string,                     // COMO consertar (vai pro contexto do agente)
 *     doc?: string,                     // âncora em HARNESS.md
 *   }
 *
 * O escape hatch (`harness-allow`) é aplicado pelo motor, não por regra.
 */

/**
 * @param {Record<string, any>} options  config.rules.options
 * @returns {Array<object>}
 */
export function baseRules(options = {}) {
  const opt = (id) => options[id] ?? {};
  const rules = [];

  rules.push({
    id: 'sql-template-literal-in-raw',
    scope: 'server',
    // Atenção: `\b` NÃO funciona antes de `$queryRawUnsafe` — o limite entre
    // `.` e `$` não é fronteira de palavra (ambos são não-\w), e a regra
    // silenciosamente nunca pegava Prisma. Fronteira explícita por alternativa.
    regex:
      /(?:\$queryRawUnsafe|\$executeRawUnsafe|\braw|\bwhereRaw|\borderByRaw|\bhavingRaw)\s*\(\s*`[^`]*\$\{/,
    message: 'SQL com `${var}` interpolado em raw() — superfície de SQL injection.',
    fix: 'Prisma: `prisma.$queryRaw`SELECT ... WHERE id = ${id}`` (tagged template, bind seguro). Knex: placeholders `?` + array de binds.',
    doc: 'sql-dinamico-com-seguranca',
  });

  const jsonbColumns = opt('jsonb-array-merge-with-spread').columns ?? [];
  if (jsonbColumns.length > 0) {
    const alt = jsonbColumns.map((c) => c.replace(/[^\w]/g, '')).join('|');
    rules.push({
      id: 'jsonb-array-merge-with-spread',
      scope: 'server',
      regex: new RegExp(`\\{\\s*\\.\\.\\.(?:\\w+\\.)?(${alt})\\s*,`),
      message: 'Merge de coluna JSONB com spread — arrays são sobrescritos, não concatenados.',
      fix: "Concatene no nível SQL: `COALESCE(col, '[]'::jsonb) || ?::jsonb`.",
      doc: 'jsonb-merge-preservando-arrays',
    });
  }

  rules.push({
    id: 'external-fetch-without-timeout',
    scope: 'server',
    regex: /\bfetch\s*\(\s*[`'"]https?:\/\//,
    postFilter: (line) => !/signal\s*:|AbortSignal|Promise\.race/.test(line),
    message: 'fetch() para URL externa sem timeout visível — provedor lento trava o request.',
    fix: 'Passe `signal: AbortSignal.timeout(15_000)` (ou AbortController + clearTimeout no finally).',
    doc: 'fetch-externo-com-timeout',
  });

  rules.push({
    id: 'any-in-request-handler',
    scope: 'server',
    regex: /\b(request|reply|req|res|ctx)\s*:\s*any\b/,
    message: 'Handler HTTP com `any` no boundary — o agente passa a construir sobre formatos adivinhados.',
    fix: 'Declare schema (Zod/TypeBox) e derive o tipo: `fastify.post<{ Body: Body }>(...)` ou `z.infer<typeof Body>`.',
    doc: 'validar-no-boundary',
  });

  rules.push({
    id: 'console-log-in-server',
    scope: 'server',
    regex: /\bconsole\.(log|debug|info)\s*\(/,
    message: 'console.log em código server — perde nível, contexto de request e correlação.',
    fix: 'Use o logger estruturado do projeto (pino: `request.log.info({ ... }, "msg")`).',
    doc: 'logging-estruturado',
  });

  rules.push({
    id: 'bash-loop-gh-workflow-run',
    scope: 'any',
    // Exige `until/while` antes de qualquer aspas — evita match dentro de string.
    regex: /^[^'"`]*\b(until|while)\b[^\n]*\bgh\s+workflow\s+run\b/,
    postFilter: (line) => !/^\s*(\/\/|\*|#)/.test(line),
    message:
      'Loop bash em torno de `gh workflow run` — stdout vazio em sucesso faz a condição de parada nunca satisfazer e o CI é spammado.',
    fix: 'Dispare uma vez e consulte o status em chamada separada, ou imponha cooldown + contador máximo de tentativas.',
    doc: 'automacao-de-ci-sem-runaway',
  });

  const maxLines = opt('max-file-lines').limit;
  if (maxLines) {
    rules.push({
      id: 'max-file-lines',
      scope: opt('max-file-lines').scope ?? 'any',
      kind: 'file',
      test: (content) => {
        const total = content.split('\n').length;
        if (total <= maxLines) return null;
        return { line: 1, snippet: `arquivo com ${total} linhas (limite ${maxLines})` };
      },
      message: 'Arquivo acima do limite de linhas — deixa de caber no contexto do agente e vira ímã de drift.',
      fix: 'Extraia módulos (hooks/services/helpers). Enquanto não der, mantenha a mudança cirúrgica e registre em docs/TECH_DEBT.md.',
      doc: 'limite-de-tamanho-de-arquivo',
    });
  }

  return rules;
}
