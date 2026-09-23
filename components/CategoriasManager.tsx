"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CategoriaForm, {
  type CategoriaFormValues,
} from "@/components/CategoriaForm";
import {
  TIPO_CATEGORIA_LABEL,
  type CategoriaComUso,
} from "@/lib/categories";
import { formatBRL } from "@/lib/competencia";

interface Props {
  categoriasIniciais: CategoriaComUso[];
}

type Modo =
  | { tipo: "lista" }
  | { tipo: "criar" }
  | { tipo: "editar"; categoria: CategoriaComUso };

export default function CategoriasManager({ categoriasIniciais }: Props) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>({ tipo: "lista" });
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const despesas = categoriasIniciais.filter((c) => c.tipo === "DESPESA");
  const receitas = categoriasIniciais.filter((c) => c.tipo === "RECEITA");

  async function enviar(
    url: string,
    method: "POST" | "PATCH",
    valores: CategoriaFormValues,
  ): Promise<string | null> {
    const resposta = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      return dados?.erro ?? "Não foi possível salvar a categoria.";
    }

    setModo({ tipo: "lista" });
    router.refresh();
    return null;
  }

  async function excluir(categoria: CategoriaComUso) {
    setErroGeral(null);
    setSucesso(null);

    const aviso =
      categoria.qtdTransacoes > 0
        ? `A categoria "${categoria.nome}" tem ${categoria.qtdTransacoes} lançamento(s), que serão movidos para "${categoria.tipo === "DESPESA" ? "Outros" : "Outras Receitas"}". Continuar?`
        : `Excluir a categoria "${categoria.nome}"?`;

    if (!window.confirm(aviso)) return;

    const resposta = await fetch(`/api/categories/${categoria.id}`, {
      method: "DELETE",
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      setErroGeral(dados?.erro ?? "Não foi possível excluir a categoria.");
      return;
    }

    const dados = await resposta.json().catch(() => null);
    if (dados?.reatribuidas > 0) {
      setSucesso(
        `${dados.reatribuidas} lançamento(s) foram movidos para a categoria de reserva.`,
      );
    }

    router.refresh();
  }

  function renderLista(itens: CategoriaComUso[]) {
    return (
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {itens.map((categoria) => (
          <li
            key={categoria.id}
            className="flex flex-wrap items-center gap-4 px-4 py-3 transition hover:bg-slate-50"
          >
            <span
              className="h-9 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: categoria.cor }}
              aria-hidden
            />

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-800">
                {categoria.nome}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {categoria.qtdTransacoes}{" "}
                {categoria.qtdTransacoes === 1 ? "lançamento" : "lançamentos"}
                {categoria.qtdTransacoes > 0 &&
                  ` · total ${formatBRL(categoria.totalLancado)}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModo({ tipo: "editar", categoria })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand hover:text-brand"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => excluir(categoria)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-expense hover:text-expense"
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (modo.tipo === "criar") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          Nova categoria
        </h2>
        <CategoriaForm
          onSalvar={(valores) => enviar("/api/categories", "POST", valores)}
          onCancelar={() => setModo({ tipo: "lista" })}
          rotuloSalvar="Criar categoria"
        />
      </div>
    );
  }

  if (modo.tipo === "editar") {
    const { categoria } = modo;
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          Editar categoria
        </h2>
        <CategoriaForm
          inicial={{
            nome: categoria.nome,
            tipo: categoria.tipo,
            cor: categoria.cor,
          }}
          onSalvar={(valores) =>
            enviar(`/api/categories/${categoria.id}`, "PATCH", valores)
          }
          onCancelar={() => setModo({ tipo: "lista" })}
          rotuloSalvar="Salvar alterações"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Categorias</h2>
        <button
          type="button"
          onClick={() => setModo({ tipo: "criar" })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          + Nova categoria
        </button>
      </div>

      {erroGeral && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {erroGeral}
        </p>
      )}

      {sucesso && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {sucesso}
        </p>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Despesas
        </h3>
        {despesas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm text-slate-500">
            Nenhuma categoria de despesa.
          </p>
        ) : (
          renderLista(despesas)
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Receitas
        </h3>
        {receitas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm text-slate-500">
            Nenhuma categoria de receita.
          </p>
        ) : (
          renderLista(receitas)
        )}
      </section>
    </div>
  );
}
