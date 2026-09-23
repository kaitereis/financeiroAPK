import { getServerSession } from "next-auth";
import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import NavTabs from "@/components/NavTabs";
import { authOptions } from "@/lib/auth";
import { saldoTotalContas } from "@/lib/transactions";
import {
  resumoMesAtual,
  ultimosLancamentos,
  type UltimoLancamento,
} from "@/lib/dashboard";
import { formatBRL, formatDate, labelCompetencia } from "@/lib/competencia";

export const dynamic = "force-dynamic";

function LancamentoItem({ l }: { l: UltimoLancamento }) {
  const ehReceita = l.tipo === "RECEITA";
  return (
    <li className="flex items-center gap-4 px-4 py-3 transition hover:bg-slate-50">
      <span
        className="h-9 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: l.categoria.cor }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-800">
          {l.descricao ?? "Sem descrição"}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {l.categoria.nome} · {formatDate(l.data)} · por {l.quemLancou}
        </p>
      </div>
      <span
        className={`shrink-0 font-semibold tabular-nums ${
          ehReceita ? "text-income" : "text-expense"
        }`}
      >
        {ehReceita ? "+" : "−"} {formatBRL(l.valor)}
      </span>
    </li>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const [saldo, resumo, lancamentos] = await Promise.all([
    saldoTotalContas(),
    resumoMesAtual(),
    ultimosLancamentos(8),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Controle Financeiro
          </p>
          <p className="text-sm text-slate-500">Visão geral</p>
        </div>
        <UserMenu nome={session?.user?.name ?? "Usuário"} />
      </header>

      <div className="mb-8">
        <NavTabs ativa="dashboard" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white shadow-sm">
          <p className="text-sm font-medium text-blue-100">Saldo total das contas</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {formatBRL(saldo)}
          </p>
          <p className="mt-2 text-xs text-blue-100">
            Soma de todas as contas e carteiras
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">
            Receitas de {labelCompetencia(resumo.competencia)}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-income">
            {formatBRL(resumo.receitas)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">
            Despesas de {labelCompetencia(resumo.competencia)}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-expense">
            {formatBRL(resumo.despesas)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Resultado do mês (receitas − despesas)
            </p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                resumo.saldo >= 0 ? "text-income" : "text-expense"
              }`}
            >
              {formatBRL(resumo.saldo)}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-brand hover:text-brand"
          >
            Ver despesas do mês
          </Link>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          Últimos lançamentos
        </h2>
        {lancamentos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            <p className="text-sm text-slate-500">
              Nenhum lançamento registrado ainda.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {lancamentos.map((l) => (
              <LancamentoItem key={l.id} l={l} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
