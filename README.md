# harness-init

Claude Code skill que instala **Harness Engineering** (Fowler) + **SDD "spec-anchored" leve** (Böckeler) num projeto Node/TS.

Objetivo: trazer para projetos novos a mesma trilha de controles automatizados — pre-commit, CI seletivo, regex anti-padrões, template de spec enxuto — sem precisar reconstruir do zero a cada vez.

## Filosofia

Adoção **seletiva**, não pacote completo. Cobre o que dá retorno rápido em time pequeno:

- **Harness Engineering** ([Fowler](https://martinfowler.com/articles/harness-engineering.html)): agent = model + harness. Sensores feedforward (pre-commit, CI) pegam bugs estruturais antes de produção. Cada bug em produção vira um sensor novo (*steerage loop*).
- **SDD spec-anchored** ([Böckeler, parte 3](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)): specs como âncora, não fonte de verdade. Template único, sem tooling pesado. Evita *Verschlimmbesserung*.

Regra de ouro: **o harness impede degradação, não força refactor retroativo**. Lint e checks rodam só em arquivos modificados.

## Instalação

Clone dentro do diretório de skills do Claude Code:

```bash
git clone https://github.com/<seu-user>/harness-init ~/.claude/skills/harness-init
```

Pronto. Agora em qualquer projeto você pode pedir ao Claude: "roda o harness-init aqui" ou invocar via `/harness-init`.

## Atualização

```bash
cd ~/.claude/skills/harness-init && git pull
```

Cada release traz melhorias nos templates (novas regex, suporte a stacks novas, etc). Veja o [CHANGELOG](CHANGELOG.md).

## O que a skill faz quando invocada

1. **Detecta a estrutura do projeto** (monorepo vs flat, presença de `server/`/`client/`, stack).
2. **Pergunta quais bugs estruturais o time já viu em produção** — cada um vira um regex no `harness-checks.mjs` (isso é o *steerage loop* inicializado).
3. **Pergunta se inclui `docs/specs/`** (template SDD spec-anchored). Opcional.
4. **Pergunta o modo de aplicação:**
   - **Aplicar direto** — escreve todos os arquivos no projeto e sugere `npm install`.
   - **Entregar patch** — cria `.harness-proposed/` com os arquivos para você revisar e mover manualmente.
5. Instala/entrega e mostra próximos passos (setup local, comandos úteis).

## Estrutura dos templates

```
templates/
├── root-package.json              ← raiz com lefthook + script harness
├── lefthook.yml                   ← pre-commit (biome+harness staged) + pre-push (typecheck)
├── biome.json                     ← lint-only; format opt-in
├── scripts/harness-checks.mjs     ← 3 regex base + seção para adicionar específicas do projeto
├── .github/workflows/ci-harness.yml  ← CI roda só em arquivos modificados no PR
├── HARNESS.md                     ← política + setup + padrões seguros + steerage loop
└── docs/specs/TEMPLATE.md         ← spec-anchored leve (opcional)
```

## Customização pós-instalação

Todo arquivo instalado é editável. Pontos principais:

- **Adicionar novo regex**: edite `scripts/harness-checks.mjs` — há uma seção marcada `// USER RULES` onde novos objetos são adicionados ao array `RULES`.
- **Isentar arquivos legados**: adicione em `files.ignore` do `biome.json`. Regra: arquivos ≥2000 linhas ganham isenção até serem refatorados (harness-checks e typecheck continuam ativos).
- **Desativar temporariamente (emergência)**: `LEFTHOOK=0 git commit ...` (pre-commit) ou `git push --no-verify` (pre-push). Cada bypass é dívida — documente em issue.

## Roadmap (evolução futura)

A skill evolui — issues e PRs bem-vindos. Próximos candidatos:

- **Stack Python/Go**: hoje só Node/TS. Equivalentes: Ruff + Pre-commit (Python), golangci-lint + Lefthook (Go).
- **SDD formal (Spec Kit)**: hoje usamos só `docs/specs/<issue>.md` manual (spec-anchored). Upgrade para slash commands `/spec-new`, `/spec-check` quando Böckeler ou outras referências indicarem tooling maduro.
- **Fitness functions arquiteturais**: além dos regex, métricas trimestrais de acoplamento/dependência.
- **Dashboard de harness**: contagem de bugs que chegaram em produção vs pegos pelo harness.

Esses itens **não estão incluídos hoje** — o README existe pra deixar isso explícito e convidar contribuição.

## Referências

- Martin Fowler — [Harness Engineering](https://martinfowler.com/articles/harness-engineering.html)
- Birgitta Böckeler — [Spec-Driven Development: parte 3 — tools](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- Heeki Park — [SDD with Claude Code](https://heeki.medium.com/) (workflow 3 fases)

## Licença

MIT — ver [LICENSE](LICENSE).
