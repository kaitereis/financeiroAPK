import { getServerSession } from "next-auth";
import ContasManager from "@/components/ContasManager";
import UserMenu from "@/components/UserMenu";
import NavTabs from "@/components/NavTabs";
import { authOptions } from "@/lib/auth";
import { listarContas, listarUsuarios } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function ContasPage() {
  const session = await getServerSession(authOptions);

  const [contas, usuarios] = await Promise.all([
    listarContas(),
    listarUsuarios(),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Controle Financeiro
          </p>
          <p className="text-sm text-slate-500">Contas e carteiras</p>
        </div>
        <UserMenu nome={session?.user?.name ?? "Usuário"} />
      </header>

      <div className="mb-8">
        <NavTabs ativa="contas" />
      </div>
      <ContasManager contasIniciais={contas} usuarios={usuarios} />
    </main>
  );
}
