/**
 * Harness — formatação de saída.
 *
 * Este arquivo faz parte do MOTOR. Não edite: ele é sobrescrito no update.
 *
 * A saída é escrita para ser lida por AGENTE, não só por humano: cada violação
 * carrega o que está errado, COMO consertar e onde ler mais. Mensagem de erro
 * é instrução de correção injetada no contexto de quem for corrigir.
 */

/**
 * @typedef {{
 *   file: string, line: number, rule: string, snippet?: string,
 *   message: string, fix?: string, doc?: string, severity?: 'error'|'warn'
 * }} Violation
 */

/**
 * @param {{ label: string, violations: Violation[], notices?: string[], scanned?: number, json?: boolean }} input
 * @returns {number} exit code
 */
export function report({ label, violations, notices = [], scanned = 0, json = false }) {
  const errors = violations.filter((v) => (v.severity ?? 'error') === 'error');
  const warns = violations.filter((v) => (v.severity ?? 'error') === 'warn');

  if (json) {
    console.log(JSON.stringify({ label, scanned, errors: errors.length, warnings: warns.length, violations, notices }, null, 2));
    return errors.length > 0 ? 1 : 0;
  }

  for (const n of notices) console.warn(`⚠️  ${label}: ${n}`);

  if (violations.length === 0) {
    console.log(`✅ ${label}: 0 violações (${scanned} arquivo(s) verificado(s))`);
    return 0;
  }

  const head = [
    errors.length > 0 ? `${errors.length} erro(s)` : null,
    warns.length > 0 ? `${warns.length} aviso(s)` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const icon = errors.length > 0 ? '❌' : '⚠️ ';
  console.error(`${icon} ${label}: ${head} — ${scanned} arquivo(s) verificado(s)\n`);

  for (const v of [...errors, ...warns]) {
    const sev = (v.severity ?? 'error') === 'warn' ? 'aviso' : 'erro';
    console.error(`${v.file}:${v.line}  [${v.rule}]  ${sev}`);
    console.error(`  ${v.message}`);
    if (v.snippet) console.error(`  código: ${v.snippet}`);
    if (v.fix) console.error(`  fix:    ${v.fix}`);
    if (v.doc) console.error(`  doc:    HARNESS.md#${v.doc}`);
    console.error('');
  }

  if (errors.length > 0) {
    console.error('Escape hatch pontual (justifique em code review): comentário `harness-allow: <rule-id>` na linha ou logo acima.');
  }

  return errors.length > 0 ? 1 : 0;
}
