/**
 * Harness — acesso a git.
 *
 * Este arquivo faz parte do MOTOR. Não edite: ele é sobrescrito no update.
 *
 * Existem duas variantes de propósito. A distinção importa: um sensor que
 * engole erro de git reporta "0 violações" e passa o CI sem ter verificado
 * nada — falha silenciosa é pior que falha barulhenta.
 */
import { execFileSync } from 'node:child_process';

const OPTS = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };

/** Devolve string vazia em erro. Use só onde vazio é resposta legítima. */
export function git(root, args) {
  try {
    return execFileSync('git', args, { cwd: root, ...OPTS });
  } catch {
    return '';
  }
}

/** Aborta o processo em erro, com dica de correção. */
export function gitOrFail(root, args, hint) {
  try {
    return execFileSync('git', args, { cwd: root, ...OPTS, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    console.error(`❌ harness: falha em \`git ${args.join(' ')}\` — ${hint}`);
    const stderr = String(err.stderr ?? '').trim();
    if (stderr) console.error(`   ${stderr.split('\n')[0]}`);
    process.exit(2);
  }
}

/**
 * Arquivos passados explicitamente na linha de comando.
 *
 * Precisa descontar o valor consumido por `--changed <base>`: sem isso a ref
 * entra na lista como se fosse arquivo, o scan resolve zero itens e o sensor
 * reporta "0 violações" sem ter olhado nada.
 */
export function explicitFiles(argv) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--changed') {
      i++; // pula a ref
      continue;
    }
    if (a.startsWith('--')) continue;
    out.push(a);
  }
  return out;
}

/**
 * Resolve a lista de arquivos a partir dos flags de seleção comuns aos
 * sensores (--staged / --changed <base>). Devolve null se nenhum flag foi
 * usado — o chamador decide o comportamento padrão.
 */
export function selectionFromArgv(root, argv) {
  if (argv.includes('--staged')) {
    return gitOrFail(
      root,
      ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
      'não foi possível listar os arquivos staged.',
    ).split('\n');
  }
  if (argv.includes('--changed')) {
    const base = argv[argv.indexOf('--changed') + 1];
    if (!base || base.startsWith('--')) {
      console.error('❌ harness: --changed exige uma ref base (ex.: --changed origin/main)');
      process.exit(2);
    }
    return gitOrFail(
      root,
      ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`],
      `a ref \`${base}\` não existe neste clone. No CI use fetch-depth: 0 e confira a base (origin/main vs origin/master).`,
    ).split('\n');
  }
  return null;
}
