"use client";

import { useState } from "react";
import {
  TIPOS_CATEGORIA,
  TIPO_CATEGORIA_LABEL,
} from "@/lib/categories";

export interface CategoriaFormValues {
  nome: string;
  tipo: string;
  cor: string;
}

interface Props {
  inicial?: Partial<CategoriaFormValues>;
  onSalvar: (valores: CategoriaFormValues) => Promise<string | null>;
  onCancelar: () => void;
  rotuloSalvar?: string;
}

/** Paleta sugerida — cobre as cores das categorias padrão do seed. */
const CORES_SUGERIDAS = [
  "#f97316",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#6b7280",
  "#16a34a",
  "#22c55e",
  "#dc2626",
  "#eab308",
];

export default function CategoriaForm({
  inicial,
  onSalvar,
  onCancelar,
  rotuloSalvar = "Salvar",
}: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [tipo, setTipo] = useState(inicial?.tipo ?? TIPOS_CATEGORIA[0]);
  const [cor, setCor] = useState(inicial?.cor ?? CORES_SUGERIDAS[0]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const mensagem = await onSalvar({ nome, tipo, cor });

    if (mensagem) {
      setErro(mensagem);
      setSalvando(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="cat-nome"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Nome
          </label>
          <input
            id="cat-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={60}
            placeholder="Ex: Alimentação"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="cat-tipo"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Tipo
          </label>
          <select
            id="cat-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className={inputClass}
          >
            {TIPOS_CATEGORIA.map((t) => (
              <option key={t} value={t}>
                {TIPO_CATEGORIA_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="cat-cor"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Cor
        </label>
        <div className="flex items-center gap-3">
          <input
            id="cat-cor"
            type="color"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
          />
          <input
            aria-label="Código hexadecimal da cor"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className={`${inputClass} max-w-[140px] font-mono`}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {CORES_SUGERIDAS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCor(c)}
              aria-label={`Usar cor ${c}`}
              className={`h-7 w-7 rounded-full ring-offset-2 transition ${
                cor.toLowerCase() === c.toLowerCase()
                  ? "ring-2 ring-slate-400"
                  : "hover:scale-110"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
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
