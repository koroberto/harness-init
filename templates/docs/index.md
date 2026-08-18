---
status: ativo
verified: __TODAY__
---

# Base de conhecimento

Índice de toda a documentação do projeto. **Todo documento em `docs/` precisa
ser alcançável a partir daqui** — o sensor `docs-check` reporta órfãos.

A coluna "quando ler" é o que faz o índice funcionar: sem ela vira uma lista de
arquivos e quem chega tem que abrir tudo para descobrir o que serve.

## Operação

| Documento | Quando ler |
|---|---|
| [TECH_DEBT.md](TECH_DEBT.md) | Antes de propor refactor, ou ao registrar débito novo |
| [QUALITY.md](QUALITY.md) | Ao decidir onde investir esforço de qualidade |

## Planos

| Documento | Quando ler |
|---|---|
| [plans/README.md](plans/README.md) | Como planos são registrados neste repositório |
| [plans/active/](plans/active/) | O que está em andamento agora |
| [plans/completed/](plans/completed/) | Arqueologia: por que algo foi feito assim |

## Specs

| Documento | Quando ler |
|---|---|
| [specs/TEMPLATE.md](specs/TEMPLATE.md) | Ao iniciar feature que toca ≥3 arquivos |

## Decisões e referências

<Adicione aqui documentos de arquitetura, decisões (ADR), referências externas
salvas localmente (`*-llms.txt`) e qualquer conhecimento que hoje vive em chat,
ticket ou na cabeça de alguém.>

---

**Convenção de front-matter** (validada pelo `docs-check` quando configurada):

```yaml
---
status: ativo | rascunho | obsoleto
verified: YYYY-MM-DD    # data em que alguém conferiu isto contra o código
owner: <pessoa ou time>
---
```
