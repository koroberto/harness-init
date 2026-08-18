/**
 * Harness — carregamento de configuração.
 *
 * Este arquivo faz parte do MOTOR. Não edite: ele é sobrescrito no update.
 * Toda adaptação por projeto vive em `harness.config.json` (raiz) e em
 * `harness.rules.mjs` (regras nascidas de bugs deste projeto).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const CONFIG_FILENAME = 'harness.config.json';
export const ENGINE_VERSION = '0.2.1';

const DEFAULTS = {
  harnessVersion: ENGINE_VERSION,
  scopes: { server: [], client: [], any: [] },
  extensions: ['ts', 'tsx', 'js', 'mjs', 'cjs', 'vue'],
  rules: { disable: [], severity: {}, options: {} },
  docs: {
    root: 'docs',
    index: 'docs/index.md',
    entrypoint: 'AGENTS.md',
    entrypointMaxLines: 120,
    requireFrontmatter: [],
    stalenessDays: 0,
    codeRoots: [],
    ignore: [],
    severity: {},
  },
};

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base, override) {
  const out = { ...base };
  for (const [k, v] of Object.entries(override ?? {})) {
    out[k] = isPlainObject(v) && isPlainObject(base?.[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}

/** Sobe a árvore de diretórios procurando o harness.config.json. */
export function findRoot(start = process.cwd()) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, CONFIG_FILENAME))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function loadConfig(start = process.cwd()) {
  const root = findRoot(start);
  if (!root) {
    console.error(
      `❌ harness: ${CONFIG_FILENAME} não encontrado a partir de ${start}.\n` +
        '   Rode a skill harness-init neste projeto para gerar a configuração.',
    );
    process.exit(2);
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(join(root, CONFIG_FILENAME), 'utf8'));
  } catch (err) {
    console.error(`❌ harness: ${CONFIG_FILENAME} inválido — ${err.message}`);
    process.exit(2);
  }
  return { root, config: deepMerge(DEFAULTS, raw) };
}

function cmpVersion(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

/**
 * Compara a versão declarada no projeto com a do motor instalado.
 * Retorna string de aviso ou null. Nunca falha o build — motor desatualizado
 * é sinal, não erro.
 */
export function versionNotice(config) {
  const declared = String(config.harnessVersion ?? '0.0.0');
  if (declared === ENGINE_VERSION) return null;
  if (cmpVersion(declared, ENGINE_VERSION) < 0) {
    return `motor ${ENGINE_VERSION} rodando com config ${declared} — rode a skill harness-init em modo update e revise harness.config.json.`;
  }
  return `config pede harness ${declared} mas o motor instalado é ${ENGINE_VERSION} — atualize scripts/harness/ (git pull na skill + update).`;
}

const REGEX_META = /[.+^${}()|[\]\\]/g;

/** Converte glob (`**`, `*`, `?`) em RegExp ancorada. */
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else {
          re += '.*';
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(REGEX_META, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

export function matchesAny(rel, globs) {
  return (globs ?? []).some((g) => globToRegExp(g).test(rel));
}

/**
 * Resolve o escopo de um arquivo: 'server' | 'client' | 'any' | null.
 * Arquivo fora de todos os globs devolve null — regras de escopo 'any'
 * continuam valendo para ele.
 */
export function scopeOf(rel, scopes) {
  if (matchesAny(rel, scopes.server)) return 'server';
  if (matchesAny(rel, scopes.client)) return 'client';
  if (matchesAny(rel, scopes.any)) return 'any';
  return null;
}
