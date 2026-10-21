"use client";

import type { DespesasDoUsuario } from "@/lib/transactions";
import { formatBRL, formatDate } from "@/lib/competencia";

interface Props {
  porUsuario: DespesasDoUsuario[];
}

/**
 * Colunas de despesas do mês separadas por pessoa (quem lançou).
 * Ficam entre a navegação de mês e o card "Total de despesas do mês".
 * São um resumo somente-leitura: as ações de editar/excluir ficam na lista completa abaixo.
 */
export default function DespesasPorPessoa({ porUsuario }: Props) {
  if (porUsuario.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {porUsuario.map((u) => (
        <section
          key={u.userId}
          className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          <header className="flex items-baseline justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <h2 className="truncate text-sm font-semibold text-slate-800">
              {u.nome}
            </h2>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-expense">
              {formatBRL(u.total)}
            </p>
          </header>

          {u.despesas.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-slate-400">
              Nenhuma despesa neste mês.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {u.despesas.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    className="h-6 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: d.categoria.cor }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700">
                      {d.descricao ?? "Sem descrição"}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {d.categoria.nome} · {formatDate(d.data)}
                      {d.parcela ? ` · ${d.parcela.num}/${d.parcela.total}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-slate-600">
                    {formatBRL(d.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <footer className="mt-auto border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
            {u.despesas.length}{" "}
            {u.despesas.length === 1 ? "lançamento" : "lançamentos"}
          </footer>
        </section>
      ))}
    </div>
  );
}