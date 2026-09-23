"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { formatBRL } from "@/lib/competencia";

interface CategoriaTotal {
  id: string;
  nome: string;
  cor: string;
  total: number;
}

interface Props {
  categorias: CategoriaTotal[];
  selecionadas: string[];
  totalMes: number;
  competenciaParam: string;
}

export default function CategoryFilter({
  categorias,
  selecionadas,
  totalMes,
  competenciaParam,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function aplicar(novas: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", competenciaParam);
    if (novas.length > 0) {
      params.set("cat", novas.join(","));
    } else {
      params.delete("cat");
    }
    router.push(`/?${params.toString()}`);
  }

  function alternar(id: string) {
    const novas = selecionadas.includes(id)
      ? selecionadas.filter((c) => c !== id)
      : [...selecionadas, id];
    aplicar(novas);
  }

  if (categorias.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">
          Por categoria
        </h2>
        <p className="text-sm text-slate-400">Sem despesas neste mês.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Por categoria</h2>
        {selecionadas.length > 0 && (
          <button
            type="button"
            onClick={() => aplicar([])}
            className="text-xs font-medium text-brand transition hover:text-brand-dark"
          >
            Limpar filtro
          </button>
        )}
      </div>

      <p className="mb-3 text-xs text-slate-400">
        Clique para filtrar os lançamentos do mês.
      </p>

      <div className="space-y-3">
        {categorias.map((c) => {
          const ativa = selecionadas.includes(c.id);
          const pct = totalMes > 0 ? (c.total / totalMes) * 100 : 0;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => alternar(c.id)}
              aria-pressed={ativa}
              className={`w-full rounded-lg px-2 py-1.5 text-left transition ${
                ativa ? "bg-brand/5 ring-1 ring-brand/30" : "hover:bg-slate-50"
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: c.cor }}
                    aria-hidden
                  />
                  {c.nome}
                </span>
                <span className="tabular-nums text-slate-700">
                  {formatBRL(c.total)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: c.cor }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
