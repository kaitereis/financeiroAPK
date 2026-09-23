import { getServerSession } from "next-auth";
import CategoriasManager from "@/components/CategoriasManager";
import UserMenu from "@/components/UserMenu";
import NavTabs from "@/components/NavTabs";
import { authOptions } from "@/lib/auth";
import { listarCategorias } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const session = await getServerSession(authOptions);
  const categorias = await listarCategorias();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Controle Financeiro
          </p>
          <p className="text-sm text-slate-500">Categorias</p>
        </div>
        <UserMenu nome={session?.user?.name ?? "Usuário"} />
      </header>

      <div className="mb-8">
        <NavTabs ativa="categorias" />
      </div>

      <CategoriasManager categoriasIniciais={categorias} />
    </main>
  );
}
