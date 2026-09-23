import type { DespesaDoMes } from "@/lib/transactions";
import { formatBRL, formatDate } from "@/lib/competencia";

interface Props {
  despesas: DespesaDoMes[];
  onEditar?: (id: string) => void;
  onExcluir?: (id: string) => void;
  onEncerrarRecorrencia?: (id: string) => void;
}

export default function ExpenseList({
  despesas,
  onEditar,
  onExcluir,
  onEncerrarRecorrencia,
}: Props) {
  if (despesas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
        <p className="text-sm text-slate-500">
          Nenhuma despesa lançada neste mês.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {despesas.map((d) => (
        <li
          key={d.id}
          className="flex items-center gap-4 px-4 py-3 transition hover:bg-slate-50"
        >
          <span
            className="h-9 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: d.categoria.cor }}
            aria-hidden
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-slate-800">
                {d.descricao ?? "Sem descrição"}
              </p>
              {d.parcela && (
                <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                  {d.parcela.num}/{d.parcela.total}
                </span>
              )}
              {d.recorrente && (
                <span className="shrink-0 rounded-md bg-indigo-100 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                  recorrente
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {d.categoria.nome} · {formatDate(d.data)} · por {d.quemLancou}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="font-semibold tabular-nums text-expense">
              − {formatBRL(d.valor)}
            </span>

            {(onEditar || onExcluir || onEncerrarRecorrencia) && (
              <div className="flex items-center gap-1">
                {onEditar && (
                  <button
                    type="button"
                    onClick={() => onEditar(d.id)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-brand"
                  >
                    Editar
                  </button>
                )}
                {onExcluir && (
                  <button
                    type="button"
                    onClick={() => onExcluir(d.id)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-expense"
                  >
                    Excluir
                  </button>
                )}
                {onEncerrarRecorrencia && d.recorrente && (
                  <button
                    type="button"
                    onClick={() => onEncerrarRecorrencia(d.id)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
                  >
                    Encerrar
                  </button>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}