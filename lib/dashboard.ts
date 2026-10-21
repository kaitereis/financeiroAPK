import { prisma } from "@/lib/prisma";
import { toCompetencia } from "@/lib/competencia";

/**
 * Data layer do Dashboard (fatia 6).
 * Reúne: saldo atual total, resumo do mês (despesas) e últimos lançamentos.
 */

export interface ResumoMes {
  competencia: Date;
  despesas: number;
}

export interface UltimoLancamento {
  id: string;
  descricao: string | null;
  valor: number;
  data: Date;
  categoria: { nome: string; cor: string };
  quemLancou: string;
}

/** Resumo de despesas de uma competência. */
export async function resumoDoMes(competencia: Date): Promise<ResumoMes> {
  const resultado = await prisma.transaction.aggregate({
    where: { mesReferencia: competencia, ocorrenciaPulada: false },
    _sum: { valor: true },
  });

  return {
    competencia,
    despesas: Number(resultado._sum.valor ?? 0),
  };
}

/** Últimos lançamentos (despesas), mais recentes primeiro. */
export async function ultimosLancamentos(
  limite = 8,
): Promise<UltimoLancamento[]> {
  const rows = await prisma.transaction.findMany({
    where: { ocorrenciaPulada: false },
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
    data: t.data,
    categoria: { nome: t.category.nome, cor: t.category.cor },
    quemLancou: t.user.nome,
  }));
}

/** Resumo do mês corrente (competência atual). */
export async function resumoMesAtual(): Promise<ResumoMes> {
  return resumoDoMes(toCompetencia(new Date()));
}
