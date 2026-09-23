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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
