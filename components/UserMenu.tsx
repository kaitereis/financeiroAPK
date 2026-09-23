"use client";

import { signOut } from "next-auth/react";

interface Props {
  nome: string;
}

export default function UserMenu({ nome }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-slate-500 sm:inline">
        Olá, <span className="font-medium text-slate-700">{nome}</span>
      </span>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-expense hover:text-expense"
      >
        Sair
      </button>
    </div>
  );
}
