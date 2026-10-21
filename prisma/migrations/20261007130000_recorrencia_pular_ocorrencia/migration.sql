/*
  Recorrências — suporte a "pular um mês" sem matar a série (decisão 2026-10-07).

  Quando o usuário exclui uma despesa recorrente apenas do mês corrente, a linha
  daquele mês NÃO é apagada: ela é marcada com `ocorrenciaPulada = true`, ficando
  oculta das listas/totais. Manter a linha é essencial porque:
  1. serve de âncora para a série continuar sendo materializada nos meses seguintes;
  2. impede que a ocorrência "reviva" ao reabrir o mês (ver materializarRecorrentes).

  Coluna aditiva com default → não afeta dados existentes.
*/

ALTER TABLE "Transaction"
  ADD COLUMN "ocorrenciaPulada" BOOLEAN NOT NULL DEFAULT false;
