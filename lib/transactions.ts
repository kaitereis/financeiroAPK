import { prisma } from "@/lib/prisma";
import { addMonths, toCompetencia } from "@/lib/competencia";
import { TransactionType } from "@prisma/client";

export interface DespesaDoMes {
  id: string;
  descricao: string | null;
  valor: number;
  data: Date;
  categoria: { id: string; nome: string; cor: string };
  quemLancou: string;
  parcela: { num: number; total: number } | null;
  recorrente: boolean;
}

/** Monta o filtro `where` de despesas de uma competência, opcionalmente por categorias. */
function filtroDespesas(competencia: Date, categoriaIds?: string[]) {
  return {
    tipo: TransactionType.DESPESA,
    mesReferencia: competencia,
    ...(categoriaIds && categoriaIds.length > 0
      ? { categoryId: { in: categoriaIds } }
      : {}),
  };
}

/**
 * Garante que as recorrências ativas tenham uma ocorrência materializada no mês informado.
 * Regra da SPEC 4.2 — geração sob demanda ("lazy"), disparada ao abrir um mês.
 * A recorrência-base é a transação com recorrente = true; as ocorrências herdam
 * seu recorrenteGrupoId. Não cria se já existir uma ocorrência daquele grupo no mês.
 */
export async function materializarRecorrentes(competencia: Date): Promise<void> {
  const bases = await prisma.transaction.findMany({
    where: { recorrente: true },
  });

  for (const base of bases) {
    const grupoId = base.recorrenteGrupoId ?? base.id;

    // Garante que a própria base tenha o grupo preenchido.
    if (!base.recorrenteGrupoId) {
      await prisma.transaction.update({
        where: { id: base.id },
        data: { recorrenteGrupoId: grupoId },
      });
    }

    // Não gera para competências anteriores à base nem re-gera o que já existe.
    if (competencia < toCompetencia(base.mesReferencia)) continue;

    const jaExiste = await prisma.transaction.findFirst({
      where: { recorrenteGrupoId: grupoId, mesReferencia: competencia },
      select: { id: true },
    });
    if (jaExiste) continue;

    await prisma.transaction.create({
      data: {
        valor: base.valor,
        tipo: base.tipo,
        descricao: base.descricao,
        // Mantém o mesmo dia do mês da base, dentro da nova competência.
        data: new Date(
          Date.UTC(
            competencia.getUTCFullYear(),
            competencia.getUTCMonth(),
            base.data.getUTCDate(),
          ),
        ),
        mesReferencia: competencia,
        recorrente: false,
        recorrenteGrupoId: grupoId,
        accountId: base.accountId,
        categoryId: base.categoryId,
        userId: base.userId,
      },
    });
  }
}

/** Total de despesas (soma) de uma competência, opcionalmente filtrado por categorias. */
export async function totalDespesas(
  competencia: Date,
  categoriaIds?: string[],
): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: filtroDespesas(competencia, categoriaIds),
    _sum: { valor: true },
  });
  return Number(result._sum.valor ?? 0);
}

/** Lista as despesas de uma competência, mais recentes primeiro. */
export async function listarDespesasDoMes(
  competencia: Date,
  categoriaIds?: string[],
): Promise<DespesaDoMes[]> {
  const rows = await prisma.transaction.findMany({
    where: filtroDespesas(competencia, categoriaIds),
    orderBy: [{ data: "desc" }, { createdAt: "desc" }],
    include: {
      category: { select: { id: true, nome: true, cor: true } },
      user: { select: { nome: true } },
    },
  });

  return rows.map((t) => ({
    id: t.id,
    descricao: t.descricao,
    valor: Number(t.valor),
    data: t.data,
    categoria: { id: t.category.id, nome: t.category.nome, cor: t.category.cor },
    quemLancou: t.user.nome,
    parcela:
      t.parcelaNum != null && t.parcelaTotal != null
        ? { num: t.parcelaNum, total: t.parcelaTotal }
        : null,
    recorrente: t.recorrente,
  }));
}

/** Total gasto por categoria numa competência (para o resumo lateral). */
export async function totalPorCategoria(competencia: Date) {
  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { tipo: TransactionType.DESPESA, mesReferencia: competencia },
    _sum: { valor: true },
  });

  const categorias = await prisma.category.findMany({
    where: { id: { in: rows.map((r) => r.categoryId) } },
    select: { id: true, nome: true, cor: true },
  });
  const porId = new Map(categorias.map((c) => [c.id, c]));

  return rows
    .map((r) => {
      const cat = porId.get(r.categoryId);
      return {
        id: r.categoryId,
        nome: cat?.nome ?? "Sem categoria",
        cor: cat?.cor ?? "#6b7280",
        total: Number(r._sum.valor ?? 0),
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** Saldo total de todas as contas (saldo_inicial + transações pela data real). */
export async function saldoTotalContas(): Promise<number> {
  const contas = await prisma.account.findMany({
    include: {
      transactions: { select: { valor: true, tipo: true } },
    },
  });

  return contas.reduce((acc, conta) => {
    const inicial = Number(conta.saldoInicial);
    const mov = conta.transactions.reduce((s, t) => {
      const v = Number(t.valor);
      return t.tipo === TransactionType.RECEITA ? s + v : s - v;
    }, 0);
    return acc + inicial + mov;
  }, 0);
}

export { addMonths };