---
status: ativo
verified: __TODAY__
---

# Dívida técnica

Dívida técnica é empréstimo de juro alto: é quase sempre melhor pagar em
parcelas pequenas e contínuas do que deixar acumular e lidar com ela em surtos
dolorosos. Este arquivo é a lista de parcelas em aberto.

**Por que versionado no repositório e não só em issues:** o agente que vai
trabalhar aqui amanhã lê o repositório, não o backlog. Débito invisível para
quem escreve o código é débito que cresce.

## Como registrar

Uma entrada por débito, mais nova em cima. Sem estimativa heroica — o campo
importante é **o que dói**, porque é ele que decide a prioridade.

```markdown
### <título curto>

- **Onde**: `caminho/do/arquivo.ts` (ou área do sistema)
- **O que dói**: consequência concreta hoje, não "está feio"
- **Origem**: PR/issue/incidente que criou o débito
- **Saída**: qual seria o fix
- **Registrado em**: YYYY-MM-DD
```

## Bypasses do harness em aberto

Todo `--no-verify` ou `LEFTHOOK=0` deixa rastro aqui. Bypass sem registro é o
começo do apodrecimento silencioso.

| Data | Quem | Arquivo/regra | Motivo | Prazo pra resolver |
|---|---|---|---|---|
| | | | | |

## Em aberto

<primeira entrada aqui>

## Pago

<mova para cá quando resolver, com a data — serve de histórico>
