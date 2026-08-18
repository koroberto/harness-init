/**
 * Harness — escape hatch (`harness-allow`).
 *
 * Este arquivo faz parte do MOTOR. Não edite: ele é sobrescrito no update.
 *
 * Aplicado centralmente pelos sensores, não por regra: se cada regra tivesse
 * que lembrar de honrar o marcador, uma esqueceria — e um escape hatch que
 * funciona em alguns lugares e não em outros é pior que nenhum.
 */

// Aceita `harness-allow: <id>` e `harness-allow <id>` — as duas formas
// aparecem em código real, e recusar a segunda transformaria supressão
// existente em erro novo no dia do update.
const MARKER = /harness-allow(?:[:\s]+([a-z][a-z0-9-]*))?/i;

// Linha que abre um comentário — TS/JS (`//`, `/*`), JSX (`{/*`), shell/YAML
// (`#`), markdown (`<!--`) — ou que continua/fecha um bloco (`*`, `*/`, `-->`).
// Sem o caso JSX, o marcador mais comum em React fica invisível.
const COMMENT_OPEN = /^\s*(\/\/|\/\*|\{\s*\/\*|\*|#|<!--)/;
const COMMENT_CLOSE = /(-->|\*\/\}?)\s*$/;

const MAX_LOOKBACK = 6;

function markerAllows(line, ruleId) {
  const m = line?.match(MARKER);
  if (!m) return false;
  return !m[1] || m[1] === ruleId;
}

/**
 * O marcador vale na própria linha ou em qualquer linha do bloco de comentário
 * imediatamente acima. Aceitar o bloco inteiro (e não só a linha anterior) é o
 * que permite escrever a justificativa em prosa — que é justamente o ponto:
 * um allow sem motivo registrado é um allow que ninguém consegue revisar.
 *
 * @param {string[]} lines   conteúdo do arquivo, já dividido
 * @param {number} idx       índice (0-based) da linha da violação
 * @param {string} ruleId
 */
export function isAllowed(lines, idx, ruleId) {
  if (markerAllows(lines[idx], ruleId)) return true;

  for (let i = idx - 1, steps = 0; i >= 0 && steps < MAX_LOOKBACK; i--, steps++) {
    const line = lines[i];
    if (line === undefined) break;
    if (!COMMENT_OPEN.test(line) && !COMMENT_CLOSE.test(line)) break;
    if (markerAllows(line, ruleId)) return true;
  }
  return false;
}
