import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";

/** Tipos de conta aceitos na v1 (SPEC 4 — "conta corrente / carteira / poupança"). */
export const TIPOS_CONTA = ["corrente", "carteira", "poupanca"] as const;

export const TIPO_CONTA_LABEL: Record<(typeof TIPOS_CONTA)[number], string> = {
  corrente: "Conta corrente",
  carteira: "Carteira",
  poupanca: "Poupança",
};

/**
 * Validação de entrada das rotas de conta (AGENTS.md: validar antes de tocar no banco).
 * `saldoInicial` aceita número ou string numérica (formulários enviam string).
 */
export const contaSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da conta").max(80),
  tipo: z.enum(TIPOS_CONTA),
  saldoInicial: z.coerce
    .number({ invalid_type_error: "Saldo inicial inválido" })
    .finite("Saldo inicial inválido"),
  userId: z.string().trim().min(1, "Selecione o dono da conta"),
});

export const contaUpdateSchema = contaSchema.partial();

export type ContaInput = z.infer<typeof contaSchema>;

export interface ContaComSaldo {
  id: string;
  nome: string;
  tipo: string;
  saldoInicial: number;
  saldoAtual: number;
  dono: { id: string; nome: string };
  qtdTransacoes: number;
}

/**
 * Lista as contas com o saldo atual calculado.
 * SPEC 4: saldo atual = saldo_inicial + soma das transações, usando a DATA REAL.
 */
export async function listarContas(): Promise<ContaComSaldo[]> {
  const contas = await prisma.account.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, nome: true } },
      transactions: { select: { valor: true, tipo: true } },
    },
  });

  return contas.map((conta) => {
    const movimentacao = conta.transactions.reduce((soma, t) => {
      const valor = Number(t.valor);
      return t.tipo === TransactionType.RECEITA ? soma + valor : soma - valor;
    }, 0);

    return {
      id: conta.id,
      nome: conta.nome,
      tipo: conta.tipo,
      saldoInicial: Number(conta.saldoInicial),
      saldoAtual: Number(conta.saldoInicial) + movimentacao,
      dono: conta.user,
      qtdTransacoes: conta.transactions.length,
    };
  });
}

/** Cria uma conta. */
export async function criarConta(input: ContaInput) {
  return prisma.account.create({
    data: {
      nome: input.nome,
      tipo: input.tipo,
      saldoInicial: input.saldoInicial,
      userId: input.userId,
    },
  });
}

/** Atualiza uma conta existente. Retorna null se não existir. */
export async function atualizarConta(
  id: string,
  input: Partial<ContaInput>,
) {
  const existe = await prisma.account.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existe) return null;

  return prisma.account.update({
    where: { id },
    data: {
      ...(input.nome !== undefined && { nome: input.nome }),
      ...(input.tipo !== undefined && { tipo: input.tipo }),
      ...(input.saldoInicial !== undefined && {
        saldoInicial: input.saldoInicial,
      }),
      ...(input.userId !== undefined && { userId: input.userId }),
    },
  });
}

export type ResultadoExclusao =
  | { ok: true }
  | { ok: false; motivo: "nao_encontrada" }
  | { ok: false; motivo: "tem_transacoes"; qtd: number };

/**
 * Exclui uma conta. Decisão de produto (2026-09-16): BLOQUEIA a exclusão se a
 * conta tiver lançamentos, para não apagar histórico financeiro em cascata.
 */
export async function excluirConta(id: string): Promise<ResultadoExclusao> {
  const conta = await prisma.account.findUnique({
    where: { id },
    select: { id: true, _count: { select: { transactions: true } } },
  });

  if (!conta) return { ok: false, motivo: "nao_encontrada" };

  const qtd = conta._count.transactions;
  if (qtd > 0) return { ok: false, motivo: "tem_transacoes", qtd };

  await prisma.account.delete({ where: { id } });
  return { ok: true };
}

/** Lista os usuários disponíveis como donos de conta (para o formulário). */
export async function listarUsuarios() {
  return prisma.user.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
}
