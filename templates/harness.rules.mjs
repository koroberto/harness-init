/**
 * Regras do harness nascidas de bugs DESTE projeto — o steerage loop.
 *
 * Este arquivo é seu. O update do harness nunca o sobrescreve.
 * Regras universais (SQL injection, fetch sem timeout, `any` no boundary…)
 * vivem no motor, em scripts/harness/rules-base.mjs.
 *
 * Regra de convivência: todo bug estrutural que chegou em produção vira uma
 * entrada aqui, com comentário explicando o incidente. O comentário é o que
 * impede a regra de virar folclore daqui a seis meses.
 *
 * Contrato:
 *   {
 *     id: 'kebab-case-estavel',          // usado no escape hatch harness-allow
 *     scope: 'server' | 'client' | 'any',
 *     regex: /padrão/,
 *     nextLineRegex?: /padrão/,          // exige match também na linha seguinte
 *     postFilter?: (line, ctx) => bool,  // true = reportar
 *     message: 'O QUE está errado e por quê (cite a issue/incidente).',
 *     fix: 'COMO consertar — vai direto pro contexto de quem for corrigir.',
 *     doc?: 'ancora-em-HARNESS-md',
 *     severity?: 'error' | 'warn',       // default error
 *   }
 *
 * Alternativa a `regex`, para regra de arquivo inteiro:
 *   { kind: 'file', test: (content, rel) => ({ line, snippet }) | null }
 */

export default [
  // {
  //   id: 'exemplo-bug-recorrente',
  //   scope: 'server',
  //   regex: /padrão\.perigoso\(/,
  //   message: 'Descreva o incidente: o que quebrou, quando, qual issue.',
  //   fix: 'A alternativa correta, em uma linha de código se possível.',
  // },
];
