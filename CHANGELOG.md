# Changelog

Segue [Keep a Changelog](https://keepachangelog.com/) e [SemVer](https://semver.org/).

## [0.1.0] — 2026-04-17

### Adicionado

- Skill inicial `harness-init`: instala Harness Engineering + SDD spec-anchored leve em projetos Node/TS.
- Templates base: `lefthook.yml`, `biome.json`, `harness-checks.mjs`, `ci-harness.yml`, `HARNESS.md`, `root-package.json`, `docs/specs/TEMPLATE.md`.
- Três regex base no harness-checks:
  1. SQL `${var}` em `raw()`/`whereRaw()` (SQL injection).
  2. Merge de JSONB com spread (sobrescreve arrays).
  3. `fetch()` externo sem timeout.
- Fluxo interativo com 2 modos: aplicar direto ou gerar patch em `.harness-proposed/`.
- Steerage loop inicial: skill pergunta os bugs estruturais já vistos em produção para virarem regex.

### Limitações conhecidas

- Só Node/TS. Python/Go no roadmap.
- SDD é só template markdown, sem tooling.
- Não detecta colunas JSONB automaticamente (depende do input do usuário).
