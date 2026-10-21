# Instruções para a IA — Sistema de Controle Financeiro

Leia `SPEC.md` antes de qualquer tarefa. Ele é a fonte de verdade do escopo. Não implemente nada que esteja na seção "Fora do escopo da v1" sem confirmação explícita.

## Stack
- Next.js (App Router), TypeScript
- PostgreSQL 16 (local: Docker **ou** instalação nativa — ver abaixo) — em produção, Postgres no próprio VPS
- Prisma como ORM (`/prisma/schema.prisma`)
- NextAuth (Credentials) para autenticação — 2 usuários fixos, sem cadastro público
- Tailwind para estilo (a menos que instruído diferente)

## Banco de dados local
O Prisma depende apenas da `DATABASE_URL`, então os dois caminhos são equivalentes
para migrations, seed e queries. **Nunca rode os dois ao mesmo tempo** (conflito na porta 5432).

Credenciais padrão (batem com `.env.example`):
`postgresql://financeiro:financeiro123@localhost:5432/financeiro?schema=public`

- **Via Docker (opcional):** `docker compose up -d` sobe o Postgres 16 já configurado.
  Requer virtualização (VT-x) habilitada na BIOS e WSL2 com distro instalada.
- **Postgres nativo no Windows (sem Docker):** instale o PostgreSQL 16 e crie o banco
  `financeiro` com o usuário `financeiro` / senha `financeiro123`. NÃO requer virtualização
  — usar este caminho quando Docker/WSL não sobe. Reflete melhor o ambiente de produção (VPS).

## Como rodar localmente
1. Suba o Postgres (Docker **ou** serviço nativo do Windows — ver seção acima)
2. `npx prisma migrate dev` → aplica o schema no banco
3. `npm run db:seed` → popula usuários, categorias e dados de exemplo
4. `npm run dev` → sobe o Next.js

### Detalhes que já causaram bloqueio (não repetir)
- **Arquivo de env:** o **Prisma CLI lê apenas `.env`** (não `.env.local`). Mantenha a
  `DATABASE_URL` em `.env` para o CLI funcionar; o Next.js lê ambos.
- **Permissão do usuário:** o Prisma Migrate precisa criar o *shadow database*, então o
  usuário do banco precisa de `CREATEDB`:
  `ALTER ROLE financeiro CREATEDB;` (uma vez, como superusuário).
- **Porta 5432:** Docker e Postgres nativo não podem coexistir — suba apenas um.

## Convenções de código
- Componentes em PT-BR nos textos de UI, nomes de variáveis/funções em inglês
- Nomes de arquivos de componente em PascalCase, o resto em kebab-case
- Toda rota de API valida entrada antes de tocar no banco (ex: com Zod)
- Sem `any` no TypeScript salvo necessidade justificada em comentário

## Regras de trabalho (workflow)
- Trabalhe em **fatias verticais**: uma funcionalidade completa (banco → API → tela) por vez, nunca "todo o backend" ou "todas as telas" de uma vez.
- Antes de implementar algo que não está claro na spec, pare e pergunte em vez de assumir.
- Após cada fatia: rodar local, confirmar que funciona, só então seguir para a próxima.
- Commits pequenos, um por funcionalidade concluída, com mensagem descrevendo o que foi feito.
- Nunca commitar `.env` ou `.env.local`.
- Senhas sempre com hash (bcrypt) — nunca texto puro, nem em seed/teste.

## Ordem sugerida de implementação da v1
1. Schema do banco (Prisma) + seed com os 2 usuários e categorias padrão
2. Autenticação (login/logout)
3. CRUD de contas
4. CRUD de categorias
5. CRUD de transações
6. Dashboard (saldo, resumo do mês, últimos lançamentos)
7. Filtros (período, categoria)

## Correções pós-v1 (após as 7 fatias concluídas)
Registre aqui cada ajuste pedido depois da v1, com data e arquivos tocados.

### 2026-09-23 — Colunas por pessoa + reordenação das abas
- **Pedido:** na tela principal, duas colunas separadas (Káite / Ana Paula) entre a navegação
  de mês e o card "Total de despesas do mês"; e a aba "Despesas do mês" passa a ser a primeira
  do menu, trocando de lugar com "Visão geral".
- **Decisões do usuário:** cada coluna mostra **total + lista** dos lançamentos da pessoa;
  as colunas **respeitam o filtro de categoria** ativo.
- **Arquivos:**
  - `lib/transactions.ts` — `DespesaDoMes` ganhou `userId`; nova interface `DespesasDoUsuario`
    e função `despesasPorUsuario(competencia, categoriaIds?)` (ordena por `createdAt` do usuário).
  - `components/DespesasPorPessoa.tsx` — **novo** componente (client, somente leitura).
  - `app/page.tsx` — busca `despesasPorUsuario` no `Promise.all` e renderiza entre `MonthNav`
    e `TransactionsManager`.
  - `components/NavTabs.tsx` — ordem das abas alterada.
- **Validado:** `npx tsc --noEmit` exit 0; `npm run build` OK; consulta direta ao banco
  confirmou os totais por usuário (Káíte 157,00 / 2 lançamentos; Ana Paula 0,00 / 0).
- **GOTCHA:** `npm run build` falha com `EPERM ... rmdir .next\build\chunks` se o `next dev`
  estiver rodando. Parar o dev server (matar o PID da porta 3000) e remover `.next` antes.

### 2026-10-01 — Remoção completa do conceito de Receita
- **Pedido:** o sistema é apenas para lançar despesas; remover tudo relacionado a Receita.
- **Decisão do usuário:** remover inclusive do banco (migração destrutiva dos dados de receita).
- **Arquivos:**
  - `prisma/schema.prisma` — removido o enum `TransactionType` e o campo `tipo` de
    `Category` e `Transaction`; `Category.nome` agora é `@unique` (antes `@@unique([nome, tipo])`).
  - `prisma/migrations/20261001120000_remover_receitas/migration.sql` — **nova**: apaga
    lançamentos e categorias de receita, remove as colunas `tipo`, troca a unicidade para
    `nome` e remove o enum. **Irreversível para os dados de receita.**
  - `prisma/seed.ts` — removidas categorias de receita (Salário, Outras Receitas) e as
    transações de receita; removidos todos os `tipo`.
  - `lib/categories.ts` — removidos `TIPOS_CATEGORIA`/`TIPO_CATEGORIA_LABEL` e o campo `tipo`;
    reserva única "Outros".
  - `lib/dashboard.ts` — `ResumoMes` agora só tem `despesas` (sem `receitas`/`saldo`).
  - `lib/accounts.ts`, `lib/transactions.ts` — saldo = `saldo_inicial − despesas` (sem receita).
  - `lib/transactions-crud.ts` — removido `tipo` dos schemas/queries.
  - `app/api/categories/route.ts` — mensagem de duplicidade sem "despesa/receita".
  - `components/CategoriaForm.tsx` — removido o select de Tipo.
  - `components/CategoriasManager.tsx` — lista única (sem seções Despesas/Receitas).
  - `components/TransactionsManager.tsx` — removido `tipo: "DESPESA"` do payload.
  - `app/dashboard/page.tsx` — removidos card de Receitas e "Resultado do mês".
  - `tailwind.config.ts` — removida a cor `income`.
  - `SPEC.md`, `README.md` — textos atualizados (sistema só de despesas).
- **Validado:** `npx prisma generate` + `npx tsc --noEmit` exit 0.
- **GOTCHA:** editar vários arquivos em paralelo com `multi_replace` pode corromper trechos
  quando os `oldString` se sobrepõem — preferir edições sequenciais em arquivos grandes.

### 2026-10-07 — Correção: recorrência perdia a Descrição nos meses seguintes
- **Pedido:** despesas recorrentes apareciam "Sem descrição" nos meses posteriores (valor correto).
- **Causa:** `materializarRecorrentes` (`lib/transactions.ts`) criava as ocorrências copiando
  valor, data, conta, categoria e usuário, mas **não** copiava `descricao` da recorrência-base.
- **Arquivos:**
  - `lib/transactions.ts` — `materializarRecorrentes` agora passa `descricao: base.descricao`.
  - `prisma/migrations/20261007120000_corrigir_descricao_recorrentes/migration.sql` — **nova**:
    backfill idempotente (ocorrência com `descricao IS NULL` herda a descrição da base do mesmo
    `recorrenteGrupoId`). Aplicada com `npx prisma migrate deploy`.
- **Validado:** `npx tsc --noEmit` exit 0; consulta direta confirmou 11 ocorrências materializadas
  com a descrição correta ("Despesa recorrente teste").

### 2026-10-07 — Correção: recorrência não replicava + exclusão com escolha de escopo
- **Pedido:** (1) despesa recorrente não estava sendo replicada nos meses posteriores;
  (2) ao excluir, perguntar se exclui só o mês ou também os meses posteriores.
- **Causa (1):** a materialização só partia de uma linha-base com `recorrente = true`. No
  banco não havia nenhuma base (só ocorrências órfãs de grupo) → a série "morria" em silêncio.
- **Causa (2):** excluir uma ocorrência não tinha efeito duradouro — ao reabrir o mês, o
  `materializarRecorrentes` recriava a ocorrência (revivia).
- **Decisões do usuário:** excluir "só este mês" → some permanentemente e a série continua
  nos meses seguintes; manter o botão "Encerrar"; corrigir o código E reparar a base ausente.
- **Arquivos:**
  - `prisma/schema.prisma` + migration `20261007130000_recorrencia_pular_ocorrencia` —
    nova coluna `Transaction.ocorrenciaPulada Boolean @default(false)`.
  - `lib/transactions.ts` — `materializarRecorrentes` agora agrupa por `recorrenteGrupoId`
    e usa a base (ou a ocorrência mais antiga) como âncora → **auto-reparo** da série; pula
    meses já existentes (inclusive pulados). `filtroDespesas`/`totalPorCategoria`/
    `saldoTotalContas` ignoram `ocorrenciaPulada`. `DespesaDoMes` ganhou `recorrenteGrupoId`.
  - `lib/transactions-crud.ts` — `encerrarRecorrencia(grupoId, mesAFrente)`: remove >= corte
    e desvincula o histórico (`recorrenteGrupoId = null`); nova `pularOcorrenciaRecorrente(id)`.
  - `lib/dashboard.ts`, `lib/accounts.ts`, `lib/categories.ts` — ignoram `ocorrenciaPulada`.
  - `app/api/transactions/[id]/route.ts` — `DELETE ?escopo=pular`.
  - `app/api/transactions/[id]/encerrar/route.ts` — aceita `{ mesReferencia: "YYYY-MM" }`.
  - `components/TransactionsManager.tsx` — `excluir` pergunta "este mês e posteriores" (OK)
    vs "apenas este mês" (Cancelar); "Encerrar" envia o mês exibido.
  - `components/ExpenseList.tsx` — badge/Encerrar baseados em `recorrenteGrupoId`.
  - `SPEC.md` (4.2) atualizado.
- **Validado:** script E2E (3 cenários: auto-reparo, pulo sem reviver, encerrar com corte) +
  navegador (Aluguel revivido em nov/26, excluir-pergunta, pulo some e série continua em dez);
  `npx tsc --noEmit` exit 0; `npm run build` OK.
- **GOTCHA:** `prisma generate` falha com `EPERM` se o `next dev` estiver rodando (DLL travado)
  — parar o PID da porta 3000 antes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
