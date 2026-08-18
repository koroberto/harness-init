#!/usr/bin/env node
/**
 * Harness — sensores de padrão estrutural (feedforward).
 *
 * Este arquivo faz parte do MOTOR. Não edite: ele é sobrescrito no update.
 *   - Adaptação do projeto  → harness.config.json
 *   - Regras deste projeto  → harness.rules.mjs   (steerage loop)
 *
 * Uso:
 *   node scripts/harness/check.mjs                    # repo inteiro
 *   node scripts/harness/check.mjs --full             # idem, explícito
 *   node scripts/harness/check.mjs a.ts b.ts          # arquivos específicos
 *   node scripts/harness/check.mjs --staged           # o que está staged
 *   node scripts/harness/check.mjs --changed <base>   # diff contra base (CI)
 *   node scripts/harness/check.mjs --json             # saída maquinal
 *   node scripts/harness/check.mjs --version
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ENGINE_VERSION, loadConfig, matchesAny, scopeOf, versionNotice } from './config.mjs';
import { explicitFiles, git, selectionFromArgv } from './git.mjs';
import { baseRules } from './rules-base.mjs';
import { report } from './report.mjs';

const ALLOW_MARKER = /harness-allow(?::\s*([a-z0-9-]+))?/i;

function hasExtension(rel, extensions) {
  const dot = rel.lastIndexOf('.');
  if (dot < 0) return false;
  return extensions.includes(rel.slice(dot + 1));
}

function allScopeGlobs(scopes) {
  return [...(scopes.server ?? []), ...(scopes.client ?? []), ...(scopes.any ?? [])];
}

function listFiles(root, config, argv) {
  const { extensions, scopes } = config;
  const explicit = explicitFiles(argv);

  let rels;
  const selected = selectionFromArgv(root, argv);
  if (explicit.length > 0) {
    rels = explicit.map((f) => relative(root, resolve(process.cwd(), f)).replace(/\\/g, '/'));
  } else if (selected) {
    rels = selected;
  } else {
    const globs = allScopeGlobs(scopes);
    rels = git(root, ['ls-files'])
      .split('\n')
      .filter((rel) => globs.length === 0 || matchesAny(rel, globs));
  }

  return rels
    .map((r) => r.trim())
    .filter(Boolean)
    .filter((rel) => hasExtension(rel, extensions))
    .filter((rel) => {
      const abs = join(root, rel);
      try {
        return statSync(abs).isFile();
      } catch {
        return false;
      }
    });
}

async function loadUserRules(root) {
  const path = join(root, 'harness.rules.mjs');
  if (!existsSync(path)) return [];
  try {
    const mod = await import(pathToFileURL(path).href);
    const rules = mod.default ?? mod.rules ?? [];
    return Array.isArray(rules) ? rules : [];
  } catch (err) {
    console.error(`❌ harness: falha ao carregar harness.rules.mjs — ${err.message}`);
    process.exit(2);
  }
}

/** Escape hatch: `harness-allow` na linha ou na linha imediatamente acima. */
function isAllowed(lines, idx, ruleId) {
  for (const candidate of [lines[idx], lines[idx - 1]]) {
    if (!candidate) continue;
    const m = candidate.match(ALLOW_MARKER);
    if (!m) continue;
    if (!m[1] || m[1] === ruleId) return true;
  }
  return false;
}

async function main() {
  const argv = process.argv.slice(2);
  const { root, config } = loadConfig();

  if (argv.includes('--version')) {
    console.log(`harness motor ${ENGINE_VERSION} | config ${config.harnessVersion}`);
    const n = versionNotice(config);
    if (n) console.warn(`⚠️  ${n}`);
    process.exit(0);
  }

  const disabled = new Set(config.rules.disable ?? []);
  const severityOf = (rule) => config.rules.severity?.[rule.id] ?? rule.severity ?? 'error';

  const rules = [...baseRules(config.rules.options ?? {}), ...(await loadUserRules(root))].filter(
    (r) => !disabled.has(r.id),
  );

  const files = listFiles(root, config, argv);
  const violations = [];

  for (const rel of files) {
    let content;
    try {
      content = readFileSync(join(root, rel), 'utf8');
    } catch {
      continue;
    }
    const lines = content.split('\n');
    const scope = scopeOf(rel, config.scopes);

    for (const rule of rules) {
      if (rule.scope === 'server' && scope !== 'server') continue;
      if (rule.scope === 'client' && scope !== 'client') continue;

      if (rule.kind === 'file') {
        const hit = rule.test?.(content, rel);
        if (!hit) continue;
        if (isAllowed(lines, (hit.line ?? 1) - 1, rule.id)) continue;
        violations.push({
          file: rel,
          line: hit.line ?? 1,
          rule: rule.id,
          snippet: hit.snippet,
          message: rule.message,
          fix: rule.fix,
          doc: rule.doc,
          severity: severityOf(rule),
        });
        continue;
      }

      lines.forEach((line, idx) => {
        if (!rule.regex?.test(line)) return;
        if (rule.nextLineRegex && !rule.nextLineRegex.test(lines[idx + 1] ?? '')) return;
        if (rule.postFilter && !rule.postFilter(line, { rel, lines, idx })) return;
        if (isAllowed(lines, idx, rule.id)) return;
        violations.push({
          file: rel,
          line: idx + 1,
          rule: rule.id,
          snippet: line.trim().slice(0, 140),
          message: rule.message,
          fix: rule.fix,
          doc: rule.doc,
          severity: severityOf(rule),
        });
      });
    }
  }

  const notices = [];
  const vn = versionNotice(config);
  if (vn) notices.push(vn);

  process.exit(
    report({
      label: 'harness-checks',
      violations,
      notices,
      scanned: files.length,
      json: argv.includes('--json'),
    }),
  );
}

main();
