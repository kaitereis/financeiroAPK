"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateInput } from "@/lib/date-input";
import type { TransacaoParaFormulario } from "@/lib/transactions-crud";

export interface TransactionFormValues {
  descricao: string;
  valor: string;
  data: string;
  mesReferencia: string; // YYYY-MM
  accountId: string;
  categoryId: string;
  modo: "comum" | "parcelada" | "recorrente";
  parcelas: string;
}

interface Props {
  transacao?: TransacaoParaFormulario | null;
  contas: { id: string; nome: string }[];
  categorias: { id: string; nome: string; cor: string }[];
  onSalvar: (valores: TransactionFormValues) => Promise<string | null>;
  onCancelar: () => void;
  rotuloSalvar?: string;
  modoBloqueado?: boolean;
}

function dataParaInputMes(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function TransactionForm({
  transacao,
  contas,
  categorias,
  onSalvar,
  onCancelar,
  rotuloSalvar = "Salvar",
  modoBloqueado = false,
}: Props) {
  const ehEdicao = Boolean(transacao);

  const [descricao, setDescricao] = useState(transacao?.descricao ?? "");
  const [valor, setValor] = useState(
    transacao ? String(transacao.valor) : "",
  );
  const [data, setData] = useState(
    transacao ? formatDateInput(transacao.data) : formatDateInput(new Date()),
  );
  const [mesReferencia, setMesReferencia] = useState(
    transacao
      ? dataParaInputMes(transacao.mesReferencia)
      : dataParaInputMes(new Date()),
  );
  const [accountId, setAccountId] = useState(transacao?.accountId ?? "");
  const [categoryId, setCategoryId] = useState(transacao?.categoryId ?? "");
  const [modo, setModo] = useState<TransactionFormValues["modo"]>("comum");
  const [parcelas, setParcelas] = useState("2");

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (transacao?.parcelaGrupoId) setModo("parcelada");
    else if (transacao?.recorrente || transacao?.recorrenteGrupoId) {
      setModo("recorrente");
    }
  }, [transacao]);

  // Atualiza competência automaticamente quando a data muda (mas mantém editável).
  useEffect(() => {
    if (!data) return;
    const d = new Date(data + "T00:00:00Z");
    if (!isNaN(d.getTime())) {
      setMesReferencia(dataParaInputMes(d));
    }
  }, [data]);

  const resumoParcela = useMemo(() => {
    const total = parseFloat(valor.replace(",", ".")) || 0;
    const qtd = parseInt(parcelas, 10) || 0;
    if (modo !== "parcelada" || total <= 0 || qtd < 2) return null;
    const cada = total / qtd;
    return `Cada parcela: R$ ${cada.toFixed(2).replace(".", ",")}`;
  }, [modo, valor, parcelas]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const mensagem = await onSalvar({
      descricao,
      valor,
      data,
      mesReferencia,
      accountId,
      categoryId,
      modo,
      parcelas,
    });

    if (mensagem) {
      setErro(mensagem);
      setSalvando(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="tx-descricao"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Descrição
        </label>
        <input
          id="tx-descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
          maxLength={120}
          placeholder="Ex: Supermercado"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="tx-data"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Data da compra
          </label>
          <input
            id="tx-data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="tx-competencia"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Competência (mês de referência)
          </label>
          <input
            id="tx-competencia"
            type="month"
            value={mesReferencia}
            onChange={(e) => setMesReferencia(e.target.value)}
            required
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-400">
            Preenche automaticamente pelo mês da data.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="tx-conta"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Conta
          </label>
          <select
            id="tx-conta"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
            className={inputClass}
          >
            <option value="">Selecione...</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="tx-categoria"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Categoria
          </label>
          <select
            id="tx-categoria"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className={inputClass}
          >
            <option value="">Selecione...</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="tx-valor"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          {modo === "parcelada" ? "Valor total da compra (R$)" : "Valor (R$)"}
        </label>
        <input
          id="tx-valor"
          type="number"
          step="0.01"
          min="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
          placeholder="0,00"
          className={inputClass}
        />
        {resumoParcela && (
          <p className="mt-1 text-xs text-slate-500">{resumoParcela}</p>
        )}
      </div>

      {!ehEdicao && (
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Tipo de despesa
          </span>
          <div className="flex flex-wrap gap-3">
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
                modo === "comum"
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="modo"
                value="comum"
                checked={modo === "comum"}
                onChange={() => setModo("comum")}
                className="sr-only"
              />
              Comum
            </label>
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
                modo === "parcelada"
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="modo"
                value="parcelada"
                checked={modo === "parcelada"}
                onChange={() => setModo("parcelada")}
                className="sr-only"
              />
              Parcelada
            </label>
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
                modo === "recorrente"
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="modo"
                value="recorrente"
                checked={modo === "recorrente"}
                onChange={() => setModo("recorrente")}
                className="sr-only"
              />
              Recorrente mensal
            </label>
          </div>
        </div>
      )}

      {ehEdicao && modoBloqueado && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          O tipo de lançamento não pode ser alterado na edição. Para mudar de
          comum para parcelada/recorrente (ou vice-versa), exclua e crie
          novamente.
        </p>
      )}

      {modo === "parcelada" && !ehEdicao && (
        <div>
          <label
            htmlFor="tx-parcelas"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Quantidade de parcelas
          </label>
          <input
            id="tx-parcelas"
            type="number"
            min={2}
            max={99}
            step={1}
            value={parcelas}
            onChange={(e) => setParcelas(e.target.value)}
            required
            className={inputClass}
          />
        </div>
      )}

      {erro && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {erro}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {salvando ? "Salvando..." : rotuloSalvar}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
