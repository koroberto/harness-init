#!/usr/bin/env node
/**
 * Harness — sensores da base de conhecimento (docs como sistema de registro).
 *
 * Este arquivo faz parte do MOTOR. Não edite: ele é sobrescrito no update.
 * Adaptação por projeto: bloco `docs` do harness.config.json.
 *
 * Premissa: o que o agente não enxerga no repositório não existe. Documentação
 * que apodrece em silêncio é pior que documentação ausente — ela mente. Estes
 * sensores tornam a base de conhecimento verificável mecanicamente.
 *
 * O que valida:
 *   - entrypoint (AGENTS.md) existe e continua sendo ÍNDICE, não enciclopédia
 *   - links relativos resolvem (docs interligadas de verdade)
 *   - paths de código citados na doc ainda existem
 *   - front-matter obrigatório presente
 *   - frescor: `verified:` mais velho que o limite configurado
 *   - órfãos: doc que não é alcançável a partir do índice (só em --full)
 *
 * Uso:
 *   node scripts/harness/docs-check.mjs                    # auditoria completa
 *   node scripts/harness/docs-check.mjs docs/a.md          # arquivos específicos
 *   node scripts/harness/docs-check.mjs --staged
 *   node scripts/harness/docs-check.mjs --changed <base>
 *   node scripts/harness/docs-check.mjs --json
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { loadConfig, matchesAny } from './config.mjs';
import { explicitFiles, git, selectionFromArgv } from './git.mjs';
import { report } from './report.mjs';

const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const CODE_SPAN_RE = /`([^`\n]+)`/g;

function toRel(root, p) {
  return relative(root, resolve(root, p)).replace(/\\/g, '/');
}

function isExternal(href) {
  return /^([a-z]+:|\/\/|#|<)/i.test(href);
}

function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0]?.trim() !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end < 0) return null;
  const out = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function daysSince(iso) {
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return null;
  return Math.floor((Date.now() - d) / 86_400_000);
}

function listDocs(root, docs) {
  return git(root, ['ls-files', '--', docs.root])
    .split('\n')
    .map((s) => s.trim())
    .filter((rel) => rel.endsWith('.md'))
    .filter((rel) => !matchesAny(rel, docs.ignore));
}

function selectTargets(root, docs, argv) {
  const explicit = explicitFiles(argv);
  if (explicit.length > 0) {
    return { files: explicit.map((f) => toRel(root, f)).filter((r) => r.endsWith('.md')), full: false };
  }

  const selected = selectionFromArgv(root, argv);
  if (selected) {
    return { files: selected.map((s) => s.trim()).filter((r) => r.endsWith('.md')), full: false };
  }

  return { files: listDocs(root, docs), full: true };
}

function linksOf(content) {
  const out = [];
  for (const m of content.matchAll(LINK_RE)) out.push(m[1]);
  return out;
}

/** Alcançabilidade a partir do índice — mede se a base está interligada. */
function reachableFrom(root, seeds) {
  const seen = new Set();
  const queue = seeds.filter((s) => existsSync(join(root, s)));
  while (queue.length > 0) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);
    let content;
    try {
      content = readFileSync(join(root, rel), 'utf8');
    } catch {
      continue;
    }
    for (const href of linksOf(content)) {
      if (isExternal(href)) continue;
      const target = toRel(root, join(dirname(rel), href.split('#')[0]));
      if (!target.endsWith('.md')) continue;
      if (!seen.has(target)) queue.push(target);
    }
  }
  return seen;
}

function main() {
  const argv = process.argv.slice(2);
  const { root, config } = loadConfig();
  const docs = config.docs;
  const sev = (key, fallback) => docs.severity?.[key] ?? fallback;
  const violations = [];

  // ── entrypoint: existe e continua sendo índice ────────────────────────
  const entry = docs.entrypoint;
  if (entry) {
    const abs = join(root, entry);
    if (!existsSync(abs)) {
      violations.push({
        file: entry,
        line: 1,
        rule: 'entrypoint-missing',
        message: `${entry} não existe — o agente não tem mapa de entrada para o repositório.`,
        fix: `Crie ${entry} como índice curto: o que é o projeto, onde fica cada coisa, e ponteiros para docs/. Não como manual.`,
        doc: 'entrypoint-e-indice-nao-enciclopedia',
        severity: sev('entrypoint-missing', 'error'),
      });
    } else {
      const total = readFileSync(abs, 'utf8').split('\n').length;
      if (total > docs.entrypointMaxLines) {
        violations.push({
          file: entry,
          line: docs.entrypointMaxLines,
          rule: 'entrypoint-too-long',
          snippet: `${total} linhas (limite ${docs.entrypointMaxLines})`,
          message:
            'Entrypoint virou enciclopédia. Contexto é recurso escasso: instrução demais ofusca a tarefa e o agente passa a ignorar restrição importante.',
          fix: `Mova o detalhe para ${docs.root}/ e deixe em ${entry} só o mapa + ponteiros (divulgação progressiva).`,
          doc: 'entrypoint-e-indice-nao-enciclopedia',
          severity: sev('entrypoint-too-long', 'error'),
        });
      }
    }
  }

  const { files, full } = selectTargets(root, docs, argv);

  // O entrypoint vive fora de docs/, mas os links dele também precisam
  // resolver — é justamente o mapa que não pode apontar para lugar nenhum.
  if (full && entry && existsSync(join(root, entry)) && !files.includes(entry)) {
    files.push(entry);
  }

  // ── índice existe (só faz sentido auditar no modo full) ───────────────
  if (full && docs.index && !existsSync(join(root, docs.index))) {
    violations.push({
      file: docs.index,
      line: 1,
      rule: 'index-missing',
      message: 'Índice da base de conhecimento não existe — sem ele não há como verificar cobertura nem alcançabilidade.',
      fix: `Crie ${docs.index} listando cada documento com uma linha de "quando ler isto".`,
      doc: 'base-de-conhecimento-verificavel',
      severity: sev('index-missing', 'error'),
    });
  }

  // ── por arquivo ───────────────────────────────────────────────────────
  let scanned = 0;
  for (const rel of files) {
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    let content;
    try {
      content = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    scanned++;
    const lines = content.split('\n');

    // links relativos quebrados
    lines.forEach((line, idx) => {
      for (const m of line.matchAll(LINK_RE)) {
        const href = m[1];
        if (isExternal(href)) continue;
        const bare = href.split('#')[0].split('?')[0];
        if (!bare) continue;
        const target = join(root, dirname(rel), bare);
        if (existsSync(target)) continue;
        violations.push({
          file: rel,
          line: idx + 1,
          rule: 'broken-link',
          snippet: href,
          message: 'Link relativo não resolve — a base de conhecimento está desconectada neste ponto.',
          fix: 'Corrija o caminho ou remova o link. Se o alvo foi renomeado, atualize todas as referências.',
          doc: 'base-de-conhecimento-verificavel',
          severity: sev('broken-link', 'error'),
        });
      }
    });

    // paths de código citados que não existem mais
    if ((docs.codeRoots ?? []).length > 0) {
      lines.forEach((line, idx) => {
        for (const m of line.matchAll(CODE_SPAN_RE)) {
          const raw = m[1].trim().replace(/[.,;:)\]]+$/, '').split('#')[0];
          if (!raw.includes('/') || raw.includes('*') || raw.includes(' ')) continue;
          if (!docs.codeRoots.some((r) => raw === r || raw.startsWith(`${r}/`))) continue;
          if (existsSync(join(root, raw))) continue;
          violations.push({
            file: rel,
            line: idx + 1,
            rule: 'stale-code-reference',
            snippet: raw,
            message: 'Documento cita caminho de código que não existe mais — doc que mente é pior que doc ausente.',
            fix: 'Atualize o caminho ou remova o trecho. Se o comportamento mudou, revise o parágrafo inteiro, não só o path.',
            doc: 'frescor-e-manutencao-da-doc',
            severity: sev('stale-code-reference', 'warn'),
          });
        }
      });
    }

    // front-matter obrigatório
    const fm = parseFrontmatter(content);
    const required = docs.requireFrontmatter ?? [];
    if (required.length > 0) {
      const missing = required.filter((k) => !(fm ?? {})[k]);
      if (missing.length > 0) {
        violations.push({
          file: rel,
          line: 1,
          rule: 'frontmatter-missing',
          snippet: missing.join(', '),
          message: 'Front-matter obrigatório ausente — sem metadado não dá para verificar frescor nem propriedade.',
          fix: `Adicione no topo:\n---\n${required.map((k) => `${k}: ...`).join('\n')}\n---`,
          doc: 'frescor-e-manutencao-da-doc',
          severity: sev('frontmatter-missing', 'warn'),
        });
      }
    }

    // frescor
    if (docs.stalenessDays > 0 && fm?.verified) {
      const age = daysSince(fm.verified);
      if (age !== null && age > docs.stalenessDays) {
        violations.push({
          file: rel,
          line: 1,
          rule: 'doc-stale',
          snippet: `verified: ${fm.verified} (${age} dias)`,
          message: `Documento não é verificado há mais de ${docs.stalenessDays} dias.`,
          fix: 'Releia contra o código atual. Se continua verdadeiro, atualize `verified:` para hoje. Se não, corrija (ou marque status: obsoleta).',
          doc: 'frescor-e-manutencao-da-doc',
          severity: sev('doc-stale', 'warn'),
        });
      }
    }
  }

  // ── órfãos (global, só no modo full) ──────────────────────────────────
  if (full && docs.index && existsSync(join(root, docs.index))) {
    const seeds = [docs.index, docs.entrypoint].filter(Boolean);
    const reachable = reachableFrom(root, seeds);
    for (const rel of files) {
      if (reachable.has(rel)) continue;
      if (rel === docs.index) continue;
      violations.push({
        file: rel,
        line: 1,
        rule: 'doc-orphan',
        message: 'Documento não é alcançável a partir do índice — na prática, invisível para quem (ou o que) navega o repositório.',
        fix: `Linke a partir de ${docs.index} (ou de um doc já indexado), ou apague se não vale manter.`,
        doc: 'base-de-conhecimento-verificavel',
        severity: sev('doc-orphan', 'warn'),
      });
    }
  }

  process.exit(
    report({
      label: 'docs-check',
      violations,
      scanned,
      json: argv.includes('--json'),
    }),
  );
}

main();
