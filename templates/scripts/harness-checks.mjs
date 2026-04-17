#!/usr/bin/env node
/**
 * Harness checks — sensores regex para pegar bugs estruturais antes de prod.
 * Roda em pre-commit (staged files) e CI (changed files no PR).
 *
 * Filosofia: impede degradação em código novo, não força refactor retroativo.
 * Cada bug em produção vira um sensor novo aqui (steerage loop).
 *
 * Uso:
 *   node scripts/harness-checks.mjs                    # varre o repo inteiro
 *   node scripts/harness-checks.mjs <file1> <file2>... # varre específicos
 */
import { readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname ?? new URL('.', import.meta.url).pathname, '..');

// ADAPTE: paths do código server. Múltiplos separados por espaço no git ls-files.
const SERVER_GLOBS = ['server/src/**', 'src/**'];

const violations = [];
function violate(file, line, rule, snippet) {
  violations.push({ file, line, rule, snippet: snippet.trim().slice(0, 140) });
}

function listFiles(args) {
  if (args.length > 0) {
    return args
      .map((f) => resolve(process.cwd(), f))
      .filter((f) => /\.(ts|tsx|js|mjs|vue)$/.test(f))
      .filter((f) => {
        try {
          return statSync(f).isFile();
        } catch {
          return false;
        }
      });
  }
  const globArgs = SERVER_GLOBS.map((g) => `"${g}"`).join(' ');
  const out = execSync(`git ls-files ${globArgs}`, { cwd: ROOT, encoding: 'utf8' });
  return out
    .split('\n')
    .filter(Boolean)
    .filter((f) => /\.(ts|tsx|js|mjs|vue)$/.test(f))
    .map((f) => resolve(ROOT, f));
}

const RULES = [
  // ─── BASE RULES (gerais, úteis em qualquer projeto Node/TS com DB) ──────
  {
    id: 'sql-template-literal-in-raw',
    scope: 'server',
    regex: /\b(?:raw|whereRaw|orderByRaw|havingRaw)\s*\(\s*`[^`]*\$\{/,
    message:
      'SQL com `${var}` dentro de raw()/whereRaw() — use placeholders `?` e binds para evitar injection.',
  },
  {
    // ADAPTE: substitua a alternância pelas colunas JSONB do seu schema.
    // Ex.: (approval_history|plan_snapshot|tags|metadata)
    // Se não houver colunas JSONB conhecidas, comente esta regra.
    id: 'jsonb-array-merge-with-spread',
    scope: 'server',
    regex: /\{\s*\.\.\.(approval_history|approvalHistory|metadata|tags|settings)\s*,/,
    message:
      'Merge de JSONB com spread — arrays são sobrescritos. Use concat (JSONB `||`) para histórico imutável.',
  },
  {
    id: 'external-fetch-without-timeout',
    scope: 'server',
    regex: /\bfetch\s*\(\s*[`'"]https?:\/\//,
    message:
      'fetch() para URL externa sem timeout visível — envolva em AbortSignal.timeout(ms) ou Promise.race.',
    postFilter: (line) => !/signal\s*:|AbortSignal|Promise\.race/.test(line),
  },

  // ─── USER RULES ────────────────────────────────────────────────────────
  // Adicione aqui os padrões vindos de bugs que já aconteceram no seu projeto.
  // Formato:
  // {
  //   id: 'descritor-curto',
  //   scope: 'server' | 'client' | 'any',
  //   regex: /padrão/,
  //   message: 'Por que é proibido + link pra issue se houver.',
  //   postFilter?: (line) => boolean,   // retorna true se deve reportar
  // },
];

const args = process.argv.slice(2);
const files = listFiles(args);

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const isServer = SERVER_GLOBS.some((g) => {
    const prefix = g.replace(/\/\*\*$/, '');
    return rel.startsWith(prefix);
  });
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    for (const rule of RULES) {
      if (rule.scope === 'server' && !isServer) continue;
      if (rule.scope === 'client' && isServer) continue;
      if (!rule.regex.test(line)) continue;
      if (rule.postFilter && !rule.postFilter(line)) continue;
      violate(rel, idx + 1, rule.id, line);
    }
  });
}

if (violations.length === 0) {
  console.log('✅ harness-checks: 0 violations');
  process.exit(0);
}

console.error(`❌ harness-checks: ${violations.length} violation(s)\n`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  [${v.rule}]`);
  console.error(`    ${v.snippet}`);
}
console.error('\nSee HARNESS.md for context and safe patterns.');
process.exit(1);
