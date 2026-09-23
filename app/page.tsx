import { getServerSession } from "next-auth";
import MonthNav from "@/components/MonthNav";
import CategoryFilter from "@/components/CategoryFilter";
import UserMenu from "@/components/UserMenu";
import NavTabs from "@/components/NavTabs";
import TransactionsManager from "@/components/TransactionsManager";
import { authOptions } from "@/lib/auth";
import {
  materializarRecorrentes,
  totalDespesas,
  listarDespesasDoMes,
  totalPorCategoria,
  saldoTotalContas,
} from "@/lib/transactions";
import { listarOpcoesParaFormulario } from "@/lib/transactions-crud";
import {
  competenciaToParam,
  formatBRL,
  parseCompetenciaParam,
  toCompetencia,
} from "@/lib/competencia";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ mes?: string; cat?: string }>;
}

/** Lê o parâmetro `cat` (ids separados por vírgula) da URL. */
function parseCategoriasParam(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function MesPage({ searchParams }: PageProps) {
  const { mes, cat } = await searchParams;
  const competencia = parseCompetenciaParam(mes);
  const categoriasSelecionadas = parseCategoriasParam(cat);

  const session = await getServerSession(authOptions);

  // SPEC 4.2 — materializa recorrências ao abrir o mês.
  await materializarRecorrentes(competencia);

  const [totalMes, totalMesSemFiltro, despesas, porCategoria, saldo, opcoes] =
    await Promise.all([
      totalDespesas(competencia, categoriasSelecionadas),
      totalDespesas(competencia),
      listarDespesasDoMes(competencia, categoriasSelecionadas),
      totalPorCategoria(competencia),
      saldoTotalContas(),
      listarOpcoesParaFormulario(),
    ]);

  const ehMesAtual =
    competenciaToParam(competencia) === competenciaToParam(toCompetencia(new Date()));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Controle Financeiro
          </p>
          <p className="text-sm text-slate-500">Despesas do mês</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-slate-400">Saldo total das contas</p>
            <p className="text-sm font-semibold tabular-nums text-slate-700">
              {formatBRL(saldo)}
            </p>
          </div>
          <UserMenu nome={session?.user?.name ?? "Usuário"} />
        </div>
      </header>

      <div className="mb-6">
        <NavTabs ativa="mes" />
      </div>

      <div className="mb-8">
        <MonthNav
          competencia={competencia}
          ehMesAtual={ehMesAtual}
          cat={cat}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <TransactionsManager
          despesas={despesas}
          totalMes={totalMes}
          opcoes={opcoes}
          competenciaParam={competenciaToParam(competencia)}
        />

        <aside className="space-y-4">
          <CategoryFilter
            categorias={porCategoria}
            selecionadas={categoriasSelecionadas}
            totalMes={totalMesSemFiltro}
            competenciaParam={competenciaToParam(competencia)}
          />
        </aside>
      </div>
    </main>
  );
}