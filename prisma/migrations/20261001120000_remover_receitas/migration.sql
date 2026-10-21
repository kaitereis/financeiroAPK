/*
  Remoção do conceito de Receita (decisão 2026-10-01).

  O sistema passa a ser exclusivamente de despesas. Esta migração:
  1. Apaga os lançamentos de receita existentes.
  2. Apaga as categorias de receita existentes.
  3. Remove a coluna `tipo` de Transaction e Category.
  4. Troca a unicidade de categoria de (nome, tipo) para (nome).
  5. Remove o enum TransactionType.

  ATENÇÃO: a exclusão dos dados de receita é irreversível.
*/

-- 1. Apaga lançamentos de receita
DELETE FROM "Transaction" WHERE "tipo" = 'RECEITA';

-- 2. Apaga categorias de receita
DELETE FROM "Category" WHERE "tipo" = 'RECEITA';

-- 3. Remove a constraint única antiga (nome, tipo)
DROP INDEX IF EXISTS "Category_nome_tipo_key";

-- 4. Remove a coluna tipo das transações e categorias
ALTER TABLE "Transaction" DROP COLUMN "tipo";
ALTER TABLE "Category" DROP COLUMN "tipo";

-- 5. Nova unicidade: nome de categoria único
CREATE UNIQUE INDEX "Category_nome_key" ON "Category"("nome");

-- 6. Remove o enum
DROP TYPE "TransactionType";
