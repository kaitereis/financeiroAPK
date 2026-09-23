"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TransactionForm, {
  type TransactionFormValues,
} from "@/components/TransactionForm";
import type { DespesaDoMes } from "@/lib/transactions";
import type { TransacaoParaFormulario } from "@/lib/transactions-crud";
import { formatBRL } from "@/lib/competencia";
import ExpenseList from "@/components/ExpenseList";

interface Opcoes {
  contas: { id: string; nome: string }[];
  categorias: { id: string; nome: string; cor: string }[];
}

interface Props {
  despesas: DespesaDoMes[];
  totalMes: number;
  opcoes: Opcoes;
  competenciaParam: string;
}

type ModoModal =
  | { tipo: "fechado" }
  | { tipo: "criar" }
  | { tipo: "editar"; transacao: TransacaoParaFormulario };

export default function TransactionsManager({
  despesas,
  totalMes,
  opcoes,
  competenciaParam,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modal, setModal] = useState<ModoModal>({ tipo: "fechado" });
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  async function buscarTransacao(
    id: string,
  ): Promise<TransacaoParaFormulario | null> {
    const resposta = await fetch(`/api/transactions/${id}`, {
      method: "GET",
    });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    return {
      ...dados,
      data: new Date(dados.data),
      mesReferencia: new Date(dados.mesReferencia),
    };
  }

  async function criar(valores: TransactionFormValues): Promise<string | null> {
    const body: Record<string, unknown> = {
      descricao: valores.descricao,
      valor: parseFloat(valores.valor.replace(",", ".")),
      data: `${valores.data}T00:00:00Z`,
      mesReferencia: `${valores.mesReferencia}-01T00:00:00Z`,
      accountId: valores.accountId,
      categoryId: valores.categoryId,
      tipo: "DESPESA",
      parcelada: valores.modo === "parcelada",
      parcelas: valores.modo === "parcelada" ? parseInt(valores.parcelas, 10) : undefined,
      recorrente: valores.modo === "recorrente",
    };

    const resposta = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      return dados?.erro ?? "Não foi possível salvar a despesa.";
    }

    setModal({ tipo: "fechado" });
    router.refresh();
    return null;
  }

  async function editar(
    id: string,
    valores: TransactionFormValues,
    escopo: "esta" | "todas",
  ): Promise<string | null> {
    const body: Record<string, unknown> = {
      descricao: valores.descricao,
      valor: parseFloat(valores.valor.replace(",", ".")),
      data: `${valores.data}T00:00:00Z`,
      mesReferencia: `${valores.mesReferencia}-01T00:00:00Z`,
      accountId: valores.accountId,
      categoryId: valores.categoryId,
    };

    const url =
      escopo === "todas" ? `/api/transactions/${id}/grupo` : `/api/transactions/${id}`;
    const method = escopo === "todas" ? "POST" : "PATCH";
    const payload = escopo === "todas" ? { ...body, acao: "editar" } : body;

    const resposta = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      return dados?.erro ?? "Não foi possível salvar as alterações.";
    }

    setModal({ tipo: "fechado" });
    router.refresh();
    return null;
  }

  async function excluir(id: string, transacao: TransacaoParaFormulario) {
    setErroGeral(null);

    let escopo: "esta" | "todas" = "esta";
    if (transacao.parcelaGrupoId) {
      const escolha = window.confirm(
        "Esta despesa faz parte de um parcelamento.\n\nOK = excluir TODAS as parcelas\nCancelar = excluir apenas esta parcela",
      );
      escopo = escolha ? "todas" : "esta";
    }

    const url =
      escopo === "todas" && transacao.parcelaGrupoId
        ? `/api/transactions/${id}/grupo`
        : `/api/transactions/${id}`;
    const body =
      escopo === "todas" && transacao.parcelaGrupoId
        ? JSON.stringify({ acao: "excluir" })
        : undefined;

    const resposta = await fetch(url, {
      method: "DELETE",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      setErroGeral(dados?.erro ?? "Não foi possível excluir a despesa.");
      return;
    }

    router.refresh();
  }

  async function encerrarRecorrencia(transacao: TransacaoParaFormulario) {
    setErroGeral(null);
    if (!transacao.recorrenteGrupoId) return;

    const confirmado = window.confirm(
      "Encerrar esta recorrência? As despesas dos meses anteriores serão mantidas, mas a base e as ocorrências futuras serão removidas.",
    );
    if (!confirmado) return;

    const resposta = await fetch(`/api/transactions/${transacao.id}/encerrar`, {
      method: "POST",
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      setErroGeral(dados?.erro ?? "Não foi possível encerrar a recorrência.");
      return;
    }

    router.refresh();
  }

  function handleEditarClick(id: string) {
    setErroGeral(null);
    buscarTransacao(id).then((t) => {
      if (t) setModal({ tipo: "editar", transacao: t });
      else setErroGeral("Não foi possível carregar a despesa.");
    });
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-6 text-white shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-red-100">
              Total de despesas do mês
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {formatBRL(totalMes)}
            </p>
            <p className="mt-2 text-xs text-red-100">
              {despesas.length}{" "}
              {despesas.length === 1 ? "lançamento" : "lançamentos"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ tipo: "criar" })}
            className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
          >
            + Nova despesa
          </button>
        </div>
      </div>

      {erroGeral && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {erroGeral}
        </p>
      )}

      <ExpenseList
        despesas={despesas}
        onEditar={handleEditarClick}
        onExcluir={(id) => {
          const t = despesas.find((d) => d.id === id);
          // ExpenseList não tem os metadados completos; buscamos do servidor.
          buscarTransacao(id).then((tx) => {
            if (tx) excluir(id, tx);
            else setErroGeral("Não foi possível carregar a despesa.");
          });
        }}
        onEncerrarRecorrencia={(id) => {
          buscarTransacao(id).then((tx) => {
            if (tx) encerrarRecorrencia(tx);
            else setErroGeral("Não foi possível carregar a despesa.");
          });
        }}
      />

      {modal.tipo !== "fechado" && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="my-auto w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-slate-800">
              {modal.tipo === "criar" ? "Nova despesa" : "Editar despesa"}
            </h2>
            <TransactionForm
              transacao={modal.tipo === "editar" ? modal.transacao : undefined}
              contas={opcoes.contas}
              categorias={opcoes.categorias}
              modoBloqueado={modal.tipo === "editar"}
              onSalvar={
                modal.tipo === "criar"
                  ? criar
                  : (v) =>
                      editar(
                        (modal as { tipo: "editar"; transacao: TransacaoParaFormulario })
                          .transacao.id,
                        v,
                        (modal as { tipo: "editar"; transacao: TransacaoParaFormulario })
                          .transacao.parcelaGrupoId
                          ? window.confirm(
                              "Esta parcela faz parte de um grupo.\n\nOK = aplicar a TODAS as parcelas\nCancelar = alterar apenas esta parcela",
                            )
                            ? "todas"
                            : "esta"
                          : "esta",
                      )
              }
              onCancelar={() => setModal({ tipo: "fechado" })}
              rotuloSalvar={
                modal.tipo === "criar" ? "Criar despesa" : "Salvar alterações"
              }
            />
          </div>
        </div>
      )}
    </section>
  );
}
