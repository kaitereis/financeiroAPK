/*
  Correção: ocorrências de despesas recorrentes eram materializadas sem descrição.

  A função `materializarRecorrentes` (lib/transactions.ts) criava as ocorrências
  mensais copiando valor, data, conta, categoria e usuário — mas NÃO a `descricao`.
  Resultado: nos meses posteriores a despesa recorrente aparecia como "Sem descrição".

  O código já foi corrigido para propagar a descrição da recorrência-base. Esta
  migração faz o backfill dos registros já materializados antes da correção:
  toda ocorrência (recorrente = false) com descricao NULL herda a descrição
  da sua recorrência-base (mesmo recorrenteGrupoId).

  É idempotente: só toca em linhas com descricao NULL.
*/

UPDATE "Transaction" AS occ
SET "descricao" = base."descricao"
FROM "Transaction" AS base
WHERE occ."recorrenteGrupoId" = base."id"
  AND base."recorrente" = true
  AND occ."descricao" IS NULL;
