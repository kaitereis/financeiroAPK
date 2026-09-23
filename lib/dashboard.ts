import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { toCompetencia } from "@/lib/competencia";

/**
 * Data layer do Dashboard (fatia 6).
 * Reúne: saldo atual total, resumo do mês (receitas x despesas) e últimos lançamentos.
 */

export interface ResumoMes {
  competencia: Date;
  receitas: number;
  despesas: number;
  saldo: number;
}

export interface UltimoLancamento {
  id: string;
  descricao: string | null;
  valor: number;
  tipo: TransactionType;
  data: Date;
  categoria: { nome: string; cor: string };
  quemLancou: string;
}

/** Resumo de receitas x despesas de uma competência. */
export async function resumoDoMes(competencia: Date): Promise<ResumoMes> {
  const rows = await prisma.transaction.groupBy({
    by: ["tipo"],
    where: { mesReferencia: competencia },
    _sum: { valor: true },
  });

  const receitas = Number(
    rows.find((r) => r.tipo === TransactionType.RECEITA)?._sum.valor ?? 0,
  );
  const despesas = Number(
    rows.find((r) => r.tipo === TransactionType.DESPESA)?._sum.valor ?? 0,
  );

  return {
    competencia,
    receitas,
    despesas,
    saldo: receitas - despesas,
  };
}

/** Últimos lançamentos (receitas e despesas), mais recentes primeiro. */
export async function ultimosLancamentos(
  limite = 8,
): Promise<UltimoLancamento[]> {
  const rows = await prisma.transaction.findMany({
    orderBy: [{ data: "desc" }, { createdAt: "desc" }],
    take: limite,
    include: {
      category: { select: { nome: true, cor: true } },
      user: { select: { nome: true } },
    },
  });

  return rows.map((t) => ({
    id: t.id,
    descricao: t.descricao,
    valor: Number(t.valor),
    tipo: t.tipo,
    data: t.data,
    categoria: { nome: t.category.nome, cor: t.category.cor },
    quemLancou: t.user.nome,
  }));
}

/** Resumo do mês corrente (competência atual). */
export async function resumoMesAtual(): Promise<ResumoMes> {
  return resumoDoMes(toCompetencia(new Date()));
}
