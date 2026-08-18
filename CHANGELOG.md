# Changelog

Segue [Keep a Changelog](https://keepachangelog.com/) e [SemVer](https://semver.org/).

## [0.2.2] — 2026-08-18

Regressão da 0.2.1, encontrada ao rodar a migração completa do besaliel.

### Corrigido

- **O lookback do `harness-allow` não reconhecia comentário JSX.** Ao trocar
  "uma linha acima" por "bloco de comentário acima", a 0.2.1 passou a exigir que
  a linha começasse com `//`, `/*`, `*`, `#` ou `<!--`. A forma mais comum em
  React — `{/* harness-allow ... */}` — não casa com nenhuma, então supressão
  que funcionava antes do update virou erro novo no dia seguinte. Agora
  reconhece `{/*`, além de linha que fecha bloco (`*/`, `-->`).
- **Marcador sem dois-pontos não vinculava à regra.** `harness-allow <id>` é
  como o marcador já aparecia em código real; era interpretado como "libera
  todas as regras desta linha" em vez de "libera esta regra".

## [0.2.1] — 2026-08-18

Correções encontradas ao aplicar a 0.2.0 num repositório real (besaliel, ~690
arquivos e 51 documentos). Todas eram do motor, nenhuma do projeto.

### Corrigido

- **`harness-allow` só enxergava uma linha acima.** Justificativa em duas ou
  três linhas de comentário — que é o formato natural para explicar por que o
  padrão é seguro — não silenciava nada. O marcador agora vale em qualquer
  linha do bloco de comentário imediatamente acima (até 6 linhas).
- **`docs-check` anunciava o escape hatch no rodapé mas não o implementava.**
  Agora honra `harness-allow` (inclusive como comentário HTML em markdown) nas
  regras `broken-link`, `stale-code-reference`, `frontmatter-missing` e
  `doc-stale`.
- **Link relativo à raiz do repositório era reportado como quebrado.** Muita
  documentação escreve `apps/api/src/x.ts` para o link ficar clicável no
  editor. Agora o link resolve se apontar para algo real a partir da pasta do
  documento **ou** da raiz — o sensor procura link morto, não impõe convenção.
- **Referência de código com sufixo de linha não era reconhecida.**
  `arquivo.ts:42`, `arquivo.ts:16,63-74` e `arquivo.ts#L42` eram tratados como
  caminho inexistente.
- **Dotfile citado em doc virava falso positivo.** `docker/.env.prod` não está
  versionado de propósito; ausência ali não é doc apodrecida.

### Adicionado

- `scripts/harness/allow.mjs` — escape hatch centralizado, aplicado pelos
  sensores em vez de repetido regra a regra.

## [0.2.0] — 2026-08-18

Duas mudanças de fundo: o harness deixa de ser copiado-e-adaptado (vira motor
atualizável + configuração), e passa a cuidar também da **legibilidade do
repositório**, não só do código.

### Adicionado

- **Motor separado da configuração.** `scripts/harness/` é idêntico em todo
  projeto e sobrescrito no update; adaptação vive em `harness.config.json`
  (escopos, extensões, severidades, opções de regra) e `harness.rules.mjs`
  (regras nascidas de bugs do projeto). Nenhum dos dois é tocado no update.
- **Modo `update` na skill**, com resumo do que muda entre versões e
  verificação pós-update. `harness:version` compara motor vs. config.
- **`docs-check.mjs`** — sensores da base de conhecimento: entrypoint acima do
  limite de linhas (índice, não enciclopédia), link relativo quebrado, caminho
  de código citado que não existe mais, front-matter obrigatório, frescor por
  `verified:`, e doc órfã do índice.
- **Base de conhecimento como template**: `AGENTS.md` (índice, com `CLAUDE.md`
  apontando para ele — serve Codex e Claude Code), `docs/index.md`,
  `docs/TECH_DEBT.md` (inclui registro de bypass de hook), `docs/QUALITY.md`,
  `docs/plans/` com log de decisões.
- **Regras base novas**, vindas de bugs reais: `any` em handler HTTP,
  `console.log` em código server, loop de CI em torno de `gh workflow run`
  (runaway deploy), e `max-file-lines` (aviso por padrão).
- **Escape hatch** `harness-allow: <rule-id>`, aplicado pelo motor — antes cada
  regra repetia o próprio `postFilter`.
- **Campo `fix` em toda regra.** A saída passa a trazer o que está errado, como
  consertar e a âncora no `HARNESS.md`: mensagem de erro escrita como instrução
  de correção, para entrar no contexto de quem (ou o que) for arrumar.
- **Modos de seleção** `--staged`, `--changed <base>`, `--json`, além de lista
  de arquivos e varredura completa.
- Suporte a regra de arquivo inteiro (`kind: 'file'`) e a `nextLineRegex`.

### Corrigido

- **`sql-template-literal-in-raw` nunca pegava Prisma.** A regex usava `\b`
  antes de `$queryRawUnsafe`, mas o limite entre `.` e `$` não é fronteira de
  palavra — a regra passava batido em `prisma.$queryRawUnsafe(...)` desde a
  0.1.0. Fronteira agora é explícita por alternativa.
- **`--changed <base>` podia passar sem verificar nada.** A ref era interpretada
  como nome de arquivo (zero arquivos, exit 0), e erro de git era engolido.
  Agora a ref é descontada da lista de arquivos e falha de git aborta com
  exit 2 e dica de correção.
- CI deixou de depender de `grep` com paths hardcoded — os sensores descobrem
  sozinhos o que mudou. Não há mais nada para adaptar no workflow.

### Mudanças incompatíveis

- `scripts/harness-checks.mjs` foi substituído por `scripts/harness/check.mjs`.
  Projetos na 0.1.0 precisam do modo `update`, que também move as regras
  específicas do projeto para `harness.rules.mjs`.
- `package.json`: `harness` agora aponta para `scripts/harness/check.mjs`; novos
  scripts `harness:docs` e `harness:version`.

### Limitações conhecidas

- Só Node/TS. Python/Go no roadmap.
- Sem sensor de invariante arquitetural (`arch-check`) — roadmap.
- Sem job recorrente de anti-entropia — roadmap.
- SDD é template markdown, sem tooling.

## [0.1.0] — 2026-04-17

### Adicionado

- Skill inicial `harness-init`: instala Harness Engineering + SDD spec-anchored
  leve em projetos Node/TS.
- Templates base: `lefthook.yml`, `biome.json`, `harness-checks.mjs`,
  `ci-harness.yml`, `HARNESS.md`, `root-package.json`, `docs/specs/TEMPLATE.md`.
- Três regex base: SQL `${var}` em `raw()`/`whereRaw()`, merge de JSONB com
  spread, `fetch()` externo sem timeout.
- Fluxo interativo com dois modos: aplicar direto ou gerar patch em
  `.harness-proposed/`.
- Steerage loop inicial: a skill pergunta os bugs estruturais já vistos em
  produção para virarem regex.
