"use client";

import { useState } from "react";
import { TIPOS_CONTA, TIPO_CONTA_LABEL } from "@/lib/accounts";

export interface ContaFormValues {
  nome: string;
  tipo: string;
  saldoInicial: string;
  userId: string;
}

interface Props {
  usuarios: { id: string; nome: string }[];
  inicial?: Partial<ContaFormValues>;
  onSalvar: (valores: ContaFormValues) => Promise<string | null>;
  onCancelar: () => void;
  rotuloSalvar?: string;
}

export default function ContaForm({
  usuarios,
  inicial,
  onSalvar,
  onCancelar,
  rotuloSalvar = "Salvar",
}: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [tipo, setTipo] = useState(inicial?.tipo ?? TIPOS_CONTA[0]);
  const [saldoInicial, setSaldoInicial] = useState(
    inicial?.saldoInicial ?? "0",
  );
  const [userId, setUserId] = useState(inicial?.userId ?? usuarios[0]?.id ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const mensagem = await onSalvar({ nome, tipo, saldoInicial, userId });

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
          htmlFor="conta-nome"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Nome da conta
        </label>
        <input
          id="conta-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          maxLength={80}
          placeholder="Ex: Conta conjunta"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="conta-tipo"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Tipo
          </label>
          <select
            id="conta-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className={inputClass}
          >
            {TIPOS_CONTA.map((t) => (
              <option key={t} value={t}>
                {TIPO_CONTA_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="conta-dono"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Dono da conta
          </label>
          <select
            id="conta-dono"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            className={inputClass}
          >
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="conta-saldo"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Saldo inicial (R$)
        </label>
        <input
          id="conta-saldo"
          type="number"
          step="0.01"
          value={saldoInicial}
          onChange={(e) => setSaldoInicial(e.target.value)}
          required
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-400">
          O saldo atual é calculado a partir deste valor + os lançamentos.
        </p>
      </div>

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
