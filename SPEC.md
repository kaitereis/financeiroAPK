# Spec — Sistema de Controle Financeiro (v1)

## 1. Objetivo
Sistema para Kaíte e sua esposa registrarem e acompanharem juntos as receitas e despesas do casal, com visão de saldo e histórico. A **visualização principal é a tela de despesas do mês corrente** (ver seção 5.1), com navegação para meses anteriores e futuros, incluindo o lançamento de despesas parceladas e recorrentes. Rodando local no início e disponível online depois via VPS próprio.

## 2. Usuários
- 2 usuários fixos (Kaíte e Ana Paula), sem cadastro público — contas criadas manualmente no banco na primeira configuração.
- Ambos enxergam os mesmos dados (finanças compartilhadas), mas cada lançamento registra quem o fez.

## 3. Stack técnica
- **Frontend + Backend:** Next.js (App Router), self-hosted em VPS (Node.js + PM2 + Nginx)
- **Banco de dados:** PostgreSQL 16 — no VPS (produção) e localmente via Docker **ou** instalação nativa (ver 3.1)
- **ORM:** Prisma
- **Autenticação:** NextAuth (Credentials — e-mail/senha), sem provedor externo
- **Deploy local:** Postgres (Docker **ou** serviço nativo) + `npm run dev` (Next.js)

### 3.1 Banco local (Docker vs. nativo)
O Prisma acessa o banco apenas pela `DATABASE_URL`, então os dois caminhos são
intercambiáveis para migration, seed e queries. Nunca rode os dois simultaneamente
(conflito na porta 5432).

| Caminho | Exige virtualização (VT-x)? | Quando usar |
|---|---|---|
| Docker (`docker compose up -d`) | Sim (BIOS + WSL2) | Padrão, se o ambiente suportar |
| Postgres 16 nativo no Windows | Não | Quando Docker/WSL não sobe; **igual à produção (VPS)** |

Conexão padrão em ambos: `postgresql://financeiro:financeiro123@localhost:5432/financeiro?schema=public`

## 4. Modelo de dados (entidades)

| Entidade | Campos principais |
|---|---|
| **User** | id, nome, email, senha_hash |
| **Account** | id, user_id (dono da conta — cada conta pertence a uma pessoa), nome, tipo (conta corrente / carteira / poupança), saldo_inicial |
| **Category** | id, nome, tipo (receita / despesa), cor |
| **Transaction** | id, account_id, category_id, user_id (quem lançou), valor, tipo (receita/despesa), descrição, **data** (data real da compra/lançamento), **mes_referencia** (mês de competência — a qual mês a transação "pertence" na tela principal), **recorrente** (bool), **parcela_grupo_id** / **parcela_num** / **parcela_total** (para parcelamentos), criado_em |

- Contas são individuais (cada uma pertence a um dos dois usuários) — se quiserem uma "conta conjunta" no futuro, basta cadastrar uma conta do tipo apropriado sem que isso exija mudança de modelo.
- `saldo_inicial` é definido na criação da conta. O **saldo atual da conta** é calculado como `saldo_inicial + soma das transações daquela conta`, usando a **data real (`data`)** das transações — não a competência.
- **Competência (`mes_referencia`):** cada transação pertence a um mês de competência, que pode ser diferente da data da compra (ex: compra no cartão dia 28/09 com fatura em outubro → competência = outubro). A tela principal do mês agrupa as transações por `mes_referencia`, enquanto o saldo real da conta segue a `data`.
- Assumindo moeda única (BRL) e sem transferência entre contas na v1 — ver seção 6.

### 4.1 Parcelamentos
- Ao lançar uma despesa parcelada em N parcelas, o sistema **gera automaticamente N transações** (uma por parcela) ao salvar.
- Cada parcela cai em um **mês de competência consecutivo** (out, nov, dez...), a partir da competência informada.
- As N transações compartilham o mesmo `parcela_grupo_id` e trazem `parcela_num` (1..N) e `parcela_total` (N), permitindo exibir "3/10" e editar/excluir o grupo inteiro.

### 4.2 Despesas recorrentes
- Uma despesa pode ser marcada como **recorrente mensal** (`recorrente = true`).
- **Geração sob demanda (lazy):** o lançamento de um mês só é materializado quando aquele mês é **aberto na tela principal**. Ao abrir um mês, o sistema verifica se cada despesa recorrente ativa já possui uma transação naquela competência; se não houver, ela é criada naquele momento (com a mesma descrição, categoria, conta e valor da recorrência-base).
- Não há agendador automático em background na v1 — a criação sempre acontece a partir da navegação do usuário.
- Como cada mês materializado gera uma `Transaction` normal, ela pode ser **editada ou excluída individualmente** sem afetar os demais meses (ex: ajustar o valor da conta de luz de um mês específico).
- **Encadeamento:** para vincular as ocorrências à origem, cada transação recorrente materializada referencia a recorrência-base via `recorrenteGrupoId` (a transação-base tem `recorrente = true`; as ocorrências herdam o mesmo `recorrenteGrupoId`).

## 5. Funcionalidades da v1
- [ ] Login (e-mail/senha, 2 usuários fixos)
- [ ] **Tela principal — Despesas do mês (ver 5.1)** ← visualização primária do sistema
- [ ] CRUD de transações (criar, editar, excluir, listar), incluindo parceladas e recorrentes
- [ ] CRUD de categorias (com um conjunto padrão pré-cadastrado: Alimentação, Transporte, Moradia, Lazer, Salário, Outros)
- [ ] Cadastro de contas/carteiras (ex: "Conta conjunta", "Carteira Kaíte")
- [ ] Dashboard com: saldo atual total, resumo do mês (receitas x despesas), últimos lançamentos
- [ ] Filtro de transações por período e por categoria
- [ ] Indicação de quem lançou cada transação

### 5.1 Tela principal — Despesas do mês (visualização primária)
Esta é a tela de abertura do sistema e a mais usada no dia a dia.

- **Conteúdo central:** o **total de despesas do mês** (competência) em destaque, acompanhado da **lista de lançamentos de despesa daquele mês**.
- **Navegação entre meses:** controle no formato `‹  Mês/Ano  ›` — setas para avançar (meses futuros, ex: parcelas a vencer) e voltar (histórico). Ao abrir, exibe o mês corrente.
- **Base de agrupamento:** as despesas são agrupadas pelo `mes_referencia` (competência), não pela data da compra.
- **Cada item da lista mostra:** descrição, categoria (com cor), valor, data, quem lançou e, quando aplicável, o indicador de parcela (ex: `3/10`).
- **Receitas NÃO aparecem nesta tela** — o foco é 100% despesas. Receitas ficam em aba/tela separada.
- **Ações rápidas:** botão para adicionar nova despesa e acesso a editar/excluir cada lançamento (para parceladas, opção de editar/excluir o grupo todo).

## 6. Fora do escopo da v1
Explicitamente adiado para versões futuras — não implementar agora:
- App mobile nativo
- Relatórios avançados / exportação (PDF, Excel)
- Transferências entre contas
- Metas e orçamento mensal por categoria
- Notificações (e-mail, push)
- Status "pago / a pagar" (previsto vs. realizado) — na v1 toda transação lançada já é considerada efetivada
- Agendador automático em background para gerar despesas recorrentes (na v1 a recorrência é assistida/manual — ver 4.2)

## 7. Requisitos não-funcionais
- Senhas armazenadas com hash (bcrypt), nunca em texto puro
- HTTPS obrigatório em produção (Nginx + Let's Encrypt)
- Backup do banco: dump manual periódico do Postgres (script simples, agendado depois)
- Variáveis de ambiente (senhas de banco, secrets do NextAuth) fora do Git, via `.env.local` (local) e `.env` no VPS (produção)
- App deve funcionar bem em desktop e celular (responsivo) — é usado no dia a dia

## 8. Estrutura de pastas proposta
```
/app                → rotas e páginas (App Router)
/app/api            → rotas de API (transações, categorias, auth)
/components          → componentes de UI reutilizáveis
/lib                → funções auxiliares (auth, formatação, cálculos)
/prisma             → schema.prisma e migrations
/docker-compose.yml  → sobe o Postgres local
/AGENTS.md          → instruções persistentes para a IA (harness)
/SPEC.md            → este documento
```
