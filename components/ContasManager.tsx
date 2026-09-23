"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ContaForm, { type ContaFormValues } from "@/components/ContaForm";
import { TIPO_CONTA_LABEL, type ContaComSaldo } from "@/lib/accounts";
import { formatBRL } from "@/lib/competencia";

interface Props {
  contasIniciais: ContaComSaldo[];
  usuarios: { id: string; nome: string }[];
}

type Modo = { tipo: "lista" } | { tipo: "criar" } | { tipo: "editar"; conta: ContaComSaldo };

export default function ContasManager({ contasIniciais, usuarios }: Props) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>({ tipo: "lista" });
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  async function enviar(
    url: string,
    method: "POST" | "PATCH",
    valores: ContaFormValues,
  ): Promise<string | null> {
    const resposta = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: valores.nome,
        tipo: valores.tipo,
        saldoInicial: valores.saldoInicial,
        userId: valores.userId,
      }),
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      return dados?.erro ?? "Não foi possível salvar a conta.";
    }

    setModo({ tipo: "lista" });
    router.refresh();
    return null;
  }

  async function excluir(conta: ContaComSaldo) {
    setErroGeral(null);

    const confirmado = window.confirm(
      `Excluir a conta "${conta.nome}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmado) return;

    const resposta = await fetch(`/api/accounts/${conta.id}`, {
      method: "DELETE",
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      setErroGeral(dados?.erro ?? "Não foi possível excluir a conta.");
      return;
    }

    router.refresh();
  }

  if (modo.tipo === "criar") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          Nova conta
        </h2>
        <ContaForm
          usuarios={usuarios}
          onSalvar={(valores) => enviar("/api/accounts", "POST", valores)}
          onCancelar={() => setModo({ tipo: "lista" })}
          rotuloSalvar="Criar conta"
        />
      </div>
    );
  }

  if (modo.tipo === "editar") {
    const { conta } = modo;
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          Editar conta
        </h2>
        <ContaForm
          usuarios={usuarios}
          inicial={{
            nome: conta.nome,
            tipo: conta.tipo,
            saldoInicial: String(conta.saldoInicial),
            userId: conta.dono.id,
          }}
          onSalvar={(valores) =>
            enviar(`/api/accounts/${conta.id}`, "PATCH", valores)
          }
          onCancelar={() => setModo({ tipo: "lista" })}
          rotuloSalvar="Salvar alterações"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">
          Contas e carteiras
        </h2>
        <button
          type="button"
          onClick={() => setModo({ tipo: "criar" })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          + Nova conta
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

      {contasIniciais.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
          <p className="text-sm text-slate-500">
            Nenhuma conta cadastrada ainda.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {contasIniciais.map((conta) => (
            <li
              key={conta.id}
              className="flex flex-wrap items-center gap-4 px-4 py-3 transition hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">
                  {conta.nome}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {TIPO_CONTA_LABEL[conta.tipo as keyof typeof TIPO_CONTA_LABEL] ??
                    conta.tipo}{" "}
                  · {conta.dono.nome} · {conta.qtdTransacoes}{" "}
                  {conta.qtdTransacoes === 1 ? "lançamento" : "lançamentos"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-400">Saldo atual</p>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    conta.saldoAtual < 0 ? "text-expense" : "text-slate-700"
                  }`}
                >
                  {formatBRL(conta.saldoAtual)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModo({ tipo: "editar", conta })}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand hover:text-brand"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => excluir(conta)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-expense hover:text-expense"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
