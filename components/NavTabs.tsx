import Link from "next/link";

interface Props {
  ativa: "dashboard" | "mes" | "contas" | "categorias";
}

const ABAS = [
  { chave: "dashboard", href: "/dashboard", rotulo: "Visão geral" },
  { chave: "mes", href: "/", rotulo: "Despesas do mês" },
  { chave: "contas", href: "/contas", rotulo: "Contas" },
  { chave: "categorias", href: "/categorias", rotulo: "Categorias" },
] as const;

export default function NavTabs({ ativa }: Props) {
  return (
    <nav className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {ABAS.map((aba) => {
        const selecionada = aba.chave === ativa;
        return (
          <Link
            key={aba.chave}
            href={aba.href}
            aria-current={selecionada ? "page" : undefined}
            className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium transition ${
              selecionada
                ? "bg-brand text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
