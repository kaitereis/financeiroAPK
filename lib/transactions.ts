import { prisma } from "@/lib/prisma";
import { addMonths, toCompetencia } from "@/lib/competencia";

export interface DespesaDoMes {
  id: string;
  descricao: string | null;
  valor: number;
  data: Date;
  categoria: { id: string; nome: string; cor: string };
  userId: string;
  quemLancou: string;
  parcela: { num: number; total: number } | null;
  recorrente: boolean;
  recorrenteGrupoId: string | null;
}

/** Despesas de um usuário numa competência, com o total (para as colunas por pessoa). */
export interface DespesasDoUsuario {
  userId: string;
  nome: string;
  total: number;
  despesas: DespesaDoMes[];
}

/** Monta o filtro `where` de despesas de uma competência, opcionalmente por categorias. */
function filtroDespesas(competencia: Date, categoriaIds?: string[]) {
  return {
    mesReferencia: competencia,
    // Competências "puladas" de recorrências ficam ocultas das listas e totais.
    ocorrenciaPulada: false,
    ...(categoriaIds && categoriaIds.length > 0
      ? { categoryId: { in: categoriaIds } }
      : {}),
  };
}

/**
 * Garante que as recorrências ativas tenham uma ocorrência materializada no mês informado.
 * Regra da SPEC 4.2 — geração sob demanda ("lazy"), disparada ao abrir um mês.
 *
 * A recorrência é identificada pelo `recorrenteGrupoId`. A "âncora" da série é a
 * transação com `recorrente = true` (a base); se ela tiver sido apagada, qualquer
 * ocorrência restante do grupo assume o papel de âncora (auto-reparo) — assim a
 * série volta a ser materializada em vez de morrer silenciosamente.
 *
 * Não materializa competências anteriores à âncora nem recria meses já pulados
 * (`ocorrenciaPulada`), evitando que uma ocorrência excluída "reviva" ao reabrir o mês.
 */
export async function materializarRecorrentes(competencia: Date): Promise<void> {
  const doGrupo = await prisma.transaction.findMany({
    where: { recorrenteGrupoId: { not: null } },
    orderBy: [{ recorrente: "desc" }, { mesReferencia: "asc" }],
  });

  // Dados legados: bases marcadas como recorrentes ainda sem grupo preenchido.
  const basesSemGrupo = await prisma.transaction.findMany({
    where: { recorrente: true, recorrenteGrupoId: null },
  });

  const grupos = new Map<string, typeof doGrupo>();
  for (const t of doGrupo) {
    const gid = t.recorrenteGrupoId as string;
    const lista = grupos.get(gid) ?? [];
    lista.push(t);
    grupos.set(gid, lista);
  }
  for (const base of basesSemGrupo) {
    const gid = base.id;
    await prisma.transaction.update({
      where: { id: base.id },
      data: { recorrenteGrupoId: gid },
    });
    base.recorrenteGrupoId = gid;
    grupos.set(gid, [base]);
  }

  for (const [grupoId, membros] of grupos) {
    // Âncora = base (recorrente = true); na ausência dela, a ocorrência mais antiga.
    const ancora = membros.find((m) => m.recorrente) ?? membros[0];
    if (!ancora) continue;

    if (competencia.getTime() < toCompetencia(ancora.mesReferencia).getTime()) {
      continue;
    }

    const jaExiste = membros.some(
      (m) => m.mesReferencia.getTime() === competencia.getTime(),
    );
    if (jaExiste) continue;

    await prisma.transaction.create({
      data: {
        descricao: ancora.descricao,
        valor: ancora.valor,
        // Mantém o mesmo dia do mês da base, dentro da nova competência.
        data: new Date(
          Date.UTC(
            competencia.getUTCFullYear(),
            competencia.getUTCMonth(),
            ancora.data.getUTCDate(),
          ),
        ),
        mesReferencia: competencia,
        recorrente: false,
        recorrenteGrupoId: grupoId,
        accountId: ancora.accountId,
        categoryId: ancora.categoryId,
        userId: ancora.userId,
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
    userId: t.userId,
    quemLancou: t.user.nome,
    parcela:
      t.parcelaNum != null && t.parcelaTotal != null
        ? { num: t.parcelaNum, total: t.parcelaTotal }
        : null,
    recorrente: t.recorrente,
    recorrenteGrupoId: t.recorrenteGrupoId,
  }));
}

/**
 * Agrupa as despesas do mês por usuário que lançou (colunas "Káite" / "Ana Paula").
 * A ordem segue a ordem dos usuários cadastrados (createdAt), garantindo colunas estáveis.
 * Respeita o filtro de categorias, pois parte da mesma lista já filtrada.
 */
export async function despesasPorUsuario(
  competencia: Date,
  categoriaIds?: string[],
): Promise<DespesasDoUsuario[]> {
  const [usuarios, despesas] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, nome: true },
    }),
    listarDespesasDoMes(competencia, categoriaIds),
  ]);

  return usuarios.map((u) => {
    const doUsuario = despesas.filter((d) => d.userId === u.id);
    return {
      userId: u.id,
      nome: u.nome,
      total: doUsuario.reduce((s, d) => s + d.valor, 0),
      despesas: doUsuario,
    };
  });
}

/** Total gasto por categoria numa competência (para o resumo lateral). */
export async function totalPorCategoria(competencia: Date) {
  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { mesReferencia: competencia, ocorrenciaPulada: false },
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

/** Saldo total de todas as contas (saldo_inicial − despesas pela data real). */
export async function saldoTotalContas(): Promise<number> {
  const contas = await prisma.account.findMany({
    include: {
      transactions: { where: { ocorrenciaPulada: false }, select: { valor: true } },
    },
  });

  return contas.reduce((acc, conta) => {
    const inicial = Number(conta.saldoInicial);
    // Sistema apenas de despesas: toda transação reduz o saldo.
    const mov = conta.transactions.reduce((s, t) => s - Number(t.valor), 0);
    return acc + inicial + mov;
  }, 0);
}

export { addMonths };