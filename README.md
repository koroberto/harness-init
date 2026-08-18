# harness-init

Claude Code skill que instala — e depois **atualiza** — o harness de qualidade
de um projeto Node/TS.

Objetivo: não reconstruir do zero a mesma trilha de controles a cada projeto
novo, e não deixar cada projeto virar um fork manual que nunca mais recebe
melhoria.

## Filosofia

Adoção **seletiva**, não pacote completo. Duas frentes, porque bug estrutural e
repositório ilegível são problemas diferentes:

**1. Sensores estruturais** ([Fowler — Harness Engineering](https://martinfowler.com/articles/harness-engineering.html)):
agente = modelo + harness. Controles feedforward (pre-commit, CI) pegam o bug
estrutural antes de produção. Cada bug que passa vira sensor novo — o
*steerage loop*.

**2. Repositório legível** ([OpenAI — Codex num mundo centrado no agente](https://openai.com/index/harness-engineering/)):
o que não está no repositório não existe para quem chega depois — pessoa nova
ou agente. Entrypoint é índice, não enciclopédia; `docs/` é sistema de registro;
e a base de conhecimento é **verificada mecanicamente**, não mantida na base da
boa vontade.

**3. Spec como âncora** ([Böckeler — SDD parte 3](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)):
template único, sem tooling pesado. A spec ancora o trabalho; o código continua
sendo a fonte de verdade. Evita *Verschlimmbesserung*.

Regra de ouro: **o harness impede degradação, não força refactor retroativo.**
Os sensores só mordem arquivo novo ou modificado.

## Motor vs. configuração

A divisão que faz a skill ser atualizável:

| | Onde | Quem edita | No update |
|---|---|---|---|
| Motor | `scripts/harness/*.mjs` | ninguém | sobrescrito |
| Configuração | `harness.config.json` | você | preservado |
| Regras do projeto | `harness.rules.mjs` | você | preservado |
| Base de conhecimento | `AGENTS.md`, `docs/` | você | preservado |

Adaptar o harness a um projeto é editar **JSON**, não editar script. É isso que
permite `git pull` na skill e propagar melhoria para todos os projetos.

## Instalação

```bash
git clone https://github.com/koroberto/harness-init ~/.claude/skills/harness-init
```

Depois, em qualquer projeto: *"roda o harness-init aqui"* ou `/harness-init`.

## Atualização

```bash
cd ~/.claude/skills/harness-init && git pull
```

E no projeto: *"roda o harness-init em modo update"*. A skill troca só o motor,
resume o que mudou e nunca toca na sua configuração. Veja o [CHANGELOG](CHANGELOG.md).

## O que a skill faz

1. Detecta a estrutura (flat vs monorepo, paths de server/client, CI existente).
2. Pergunta quais bugs estruturais o time já viu em produção — cada um vira
   regra em `harness.rules.mjs`.
3. Pergunta se instala a base de conhecimento verificável (`AGENTS.md` + `docs/`).
4. Pergunta o modo: aplicar direto ou entregar patch em `.harness-proposed/`.
5. Aplica **e roda os sensores** — instalação limpa tem que passar nela mesma.

## Sensores

| Sensor | Pega |
|---|---|
| `check.mjs` | SQL com `${var}` em raw; fetch externo sem timeout; `any` em handler HTTP; `console.log` no server; loop de CI runaway; arquivo acima do limite de linhas; JSONB merge com spread (quando as colunas são declaradas); + as regras do seu projeto |
| `docs-check.mjs` | Entrypoint que virou enciclopédia; link relativo quebrado; caminho de código citado que não existe mais; front-matter ausente; doc parada além do limite; doc órfã do índice |

Modos: `--staged` (pre-commit), `--changed <base>` (CI), lista de arquivos, ou
repositório inteiro. Saída `--json` para consumo por outra ferramenta.

A saída é escrita para ser lida por **agente**, não só por humano: cada violação
traz o que está errado, **como consertar** e onde ler mais. Mensagem de erro é
instrução de correção injetada no contexto de quem for arrumar.

## Estrutura dos templates

```
templates/
├── harness.config.json            ← único ponto de adaptação por projeto
├── harness.rules.mjs              ← regras nascidas de bugs do projeto
├── scripts/harness/
│   ├── check.mjs                  ← sensores estruturais
│   ├── docs-check.mjs             ← sensores da base de conhecimento
│   ├── rules-base.mjs             ← regras universais
│   ├── config.mjs                 ← carga de config + glob matching
│   ├── git.mjs                    ← seleção de arquivos (staged/changed)
│   └── report.mjs                 ← saída legível por agente
├── AGENTS.md                      ← índice do repositório (limite verificado)
├── CLAUDE.md                      ← ponteiro para AGENTS.md
├── HARNESS.md                     ← política, padrões seguros, steerage loop
├── docs/
│   ├── index.md                   ← índice da base de conhecimento
│   ├── TECH_DEBT.md               ← dívida + bypasses de hook em aberto
│   ├── QUALITY.md                 ← nota de qualidade por área
│   ├── plans/                     ← planos de execução versionados
│   └── specs/TEMPLATE.md          ← spec-anchored leve
├── lefthook.yml                   ← pre-commit + pre-push
├── biome.json                     ← lint-only; format opt-in
├── root-package.json
└── .github/workflows/ci-harness.yml
```

## Customização pós-instalação

- **Regra nova**: entrada em `harness.rules.mjs`, com comentário do incidente.
- **Baixar severidade**: `rules.severity` no `harness.config.json`.
- **Desligar regra**: `rules.disable`.
- **Falso positivo pontual**: comentário `harness-allow: <rule-id>` na linha (ou
  na linha acima).
- **Emergência**: `LEFTHOOK=0 git commit` / `git push --no-verify`. Cada bypass
  é dívida: registre em `docs/TECH_DEBT.md`.

## Roadmap

- **`arch-check` declarativo**: direção de dependência entre camadas por domínio
  (`Types → Config → Repo → Service → Runtime → UI`), cross-cutting só via
  interface explícita. Motor genérico, camadas declaradas no config.
- **Anti-entropia**: job agendado que audita o repositório inteiro, atualiza o
  `QUALITY.md` e abre uma issue com o delta. Drift é inevitável quando o padrão
  existente é replicado; limpeza manual não escala.
- **Receitas de legibilidade de runtime** (opt-in, nunca default): app bootável
  por worktree, DOM/screenshot no loop do agente, observabilidade efêmera. Não
  generaliza sem investimento equivalente por projeto — por isso é receita,
  não template.
- **Python/Go**: Ruff + pre-commit; golangci-lint + Lefthook.

Não estão incluídos hoje. O roadmap existe para deixar isso explícito.

## Referências

- Martin Fowler — [Harness Engineering](https://martinfowler.com/articles/harness-engineering.html)
- OpenAI — [Leveraging Codex in an agent-centric world](https://openai.com/index/harness-engineering/)
- Birgitta Böckeler — [Spec-Driven Development, parte 3](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)

## Licença

MIT — ver [LICENSE](LICENSE).
