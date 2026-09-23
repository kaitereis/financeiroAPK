# Controle Financeiro

Sistema de controle financeiro para o casal. Especificação completa em [`SPEC.md`](./SPEC.md).

## Requisitos

- Node.js 20+
- PostgreSQL 16 — **uma** das opções:
  - **Docker** (recomendado, se o ambiente suportar): [instalar](https://www.docker.com/products/docker-desktop/) — requer virtualização (VT-x) na BIOS e WSL2 com distro
  - **Postgres nativo no Windows**: instalar o PostgreSQL 16 — não requer virtualização e reflete o ambiente de produção (VPS)

> A connection string é a mesma nos dois casos; só não rode os dois ao mesmo tempo (conflito na porta 5432).

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
copy .env.example .env.local     # (Linux/macOS: cp .env.example .env.local)
#    O Prisma CLI lê apenas `.env` — copie também para lá (ou use só `.env`):
copy .env.example .env

# 3. Subir o Postgres — escolha UMA opção:

#    3a. Via Docker
docker compose up -d

#    3b. Via Postgres nativo (Windows): crie o banco/usuário uma única vez
#        psql -U postgres -c "CREATE USER financeiro PASSWORD 'financeiro123' CREATEDB;"
#        psql -U postgres -c "CREATE DATABASE financeiro OWNER financeiro;"
#        (CREATEDB é necessário para o shadow database do Prisma Migrate)

# 4. Criar o schema no banco
npx prisma migrate dev

# 5. Popular com dados iniciais (2 usuários, categorias e exemplos)
npm run db:seed

# 6. Subir o Next.js
npm run dev
```

Acesse http://localhost:3000

## Estrutura

```
/app                 → rotas e páginas (App Router)
/app/page.tsx        → TELA PRINCIPAL: despesas do mês (competência)
/app/dashboard       → visão geral (saldo, resumo do mês, últimos lançamentos)
/app/contas          → CRUD de contas e carteiras
/app/categorias      → CRUD de categorias
/app/login           → tela de login
/app/api/auth        → route handler do NextAuth
/app/api/accounts    → API de contas (GET, POST, PATCH, DELETE)
/app/api/categories  → API de categorias (GET, POST, PATCH, DELETE)
/app/api/transactions → API de transações (criar, editar, excluir, grupo, encerrar recorrência)
/components          → componentes de UI reutilizáveis
/lib                 → helpers (prisma, auth, contas, categorias, transações, dashboard, competência/formatação)
/prisma              → schema.prisma, migrations e seed.ts
/proxy.ts            → proteção de rotas (Next 16: substitui o antigo middleware.ts)
/docker-compose.yml  → Postgres local via Docker (opcional)
```

## Estado da implementação (fatias)

- [x] Schema Prisma (competência, parcelamento, recorrência)
- [x] Seed (2 usuários, categorias padrão, dados de exemplo)
- [x] Tela principal — despesas do mês com navegação ‹ Mês/Ano ›
- [x] Autenticação (NextAuth Credentials) — login, logout e proteção de rotas
- [x] CRUD de contas/carteiras (criar, editar, excluir, listar com saldo atual)
- [x] CRUD de categorias (criar, editar, excluir com reatribuição)
- [x] CRUD de transações (comum, parcelada e recorrente)
- [x] Dashboard (saldo total, resumo do mês receitas × despesas, últimos lançamentos)
- [x] Filtro de despesas por categoria (multi-seleção) na tela do mês
- [ ] Tela de receitas

## Usuários do seed

| Nome | E-mail | Senha |
|---|---|---|
| Kaíte | kaite@financeiro.local | valor de `SEED_PASSWORD` |
| Ana Paula | ana@financeiro.local | valor de `SEED_PASSWORD` |

> Troque a senha em `.env.local` antes de rodar o seed em produção.

### Trocar a senha dos usuários

Não há tela de troca de senha na v1. O caminho oficial é:

1. Edite `SEED_PASSWORD` no `.env` (o seed lê apenas `.env`) e também no `.env.local`.
2. Rode `npm run db:seed`.

O seed reaplica o `senhaHash` nos usuários existentes, então a nova senha passa a valer
imediatamente e a antiga deixa de funcionar.

## Autenticação

- Login por e-mail/senha (NextAuth Credentials), sem cadastro público.
- Sessão via JWT (30 dias). Senhas com hash bcrypt.
- Todas as rotas são protegidas por `proxy.ts`, exceto `/login` e `/api/auth/*`.
- Sem sessão válida, o usuário é redirecionado para `/login?callbackUrl=...`.
- Requer `NEXTAUTH_SECRET` definido em `.env` / `.env.local`.

## Contas

- Cada conta pertence a um dos dois usuários (dono), mas **ambos podem editar/excluir** qualquer conta (finanças compartilhadas).
- Tipos aceitos: conta corrente, carteira, poupança.
- **Saldo atual** = `saldo_inicial` + soma das transações da conta, usando a **data real** (`data`) — não a competência.
- **Exclusão bloqueada:** uma conta com lançamentos não pode ser excluída (evita apagar histórico). A API responde `409` com a quantidade de lançamentos.
- Rotas de API: `GET/POST /api/accounts`, `PATCH/DELETE /api/accounts/[id]`. Todas exigem sessão e respondem `401` em JSON quando não autenticadas.

## Categorias

- Tipos: **despesa** e **receita**. Cada categoria tem nome, tipo e cor (`#rrggbb`).
- **Nome único por tipo** (constraint `@@unique([nome, tipo])`): não pode haver duas "Alimentação" de despesa, mas pode existir uma de despesa e uma de receita.
- **Exclusão com reatribuição:** ao excluir uma categoria com lançamentos, eles são movidos para a categoria de reserva do mesmo tipo — **"Outros"** (despesa) ou **"Outras Receitas"** (receita) — preservando o histórico.
- A própria categoria de reserva não pode ser excluída enquanto tiver lançamentos (`409`).
- Rotas de API: `GET/POST /api/categories`, `PATCH/DELETE /api/categories/[id]`.

## Transações

- Nesta versão o CRUD cobre **despesas** (receitas ficam para uma fatia futura).
- **Comum:** um único lançamento.
- **Parcelada:** o usuário informa o **valor total** da compra e o número de parcelas; o sistema divide o total (ajustando centavos na 1ª parcela) e cria N transações com competências consecutivas, unidas por `parcelaGrupoId`.
- **Recorrente mensal:** cria uma transação-base (`recorrente = true`); as ocorrências dos meses seguintes são materializadas sob demanda ao abrir o mês (SPEC 4.2).
- **Competência:** preenchida automaticamente pelo mês da data, mas editável no formulário.
- **Editar parcelada:** a tela pergunta se a alteração vale para **esta parcela** ou para **todas**.
- **Excluir parcelada:** a tela pergunta se exclui **esta parcela** ou **o grupo inteiro**.
- **Encerrar recorrência:** botão dedicado que remove a base e as ocorrências futuras, preservando o histórico de meses anteriores.
- Rotas de API: `GET/POST /api/transactions`, `GET/PATCH/DELETE /api/transactions/[id]`, `POST /api/transactions/[id]/grupo` (editar/excluir grupo) e `POST /api/transactions/[id]/encerrar`.

## Dashboard

- **Saldo total das contas:** soma de `saldo_inicial` + movimentações de todas as contas (pela data real).
- **Resumo do mês:** receitas × despesas da competência atual e o resultado (receitas − despesas).
- **Últimos lançamentos:** os 8 lançamentos mais recentes (receitas e despesas), com categoria, data e quem lançou.
- Acessível pela aba **Visão geral** (`/dashboard`).

## Filtro por categoria (tela do mês)

- Na tela principal, o painel **Por categoria** funciona como filtro: clique em uma ou mais categorias para restringir a lista e o total do mês.
- **Multi-seleção:** várias categorias podem ficar ativas ao mesmo tempo (soma dos lançamentos delas).
- O filtro é refletido na URL (`?mes=YYYY-MM&cat=id1,id2`), então é compartilhável e preservado ao navegar entre meses.
- O botão **Limpar filtro** remove a seleção. O painel sempre mostra os totais do mês **sem filtro**, para servir de referência.