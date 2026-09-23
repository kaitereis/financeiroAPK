import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { callbackUrl } = await searchParams;

  // Já autenticado? Vai direto para o destino.
  const session = await getServerSession(authOptions);
  if (session) redirect(callbackUrl ?? "/");

  // Evita open redirect: só aceita caminhos internos.
  const destino =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Controle Financeiro
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Entrar
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Acesse com sua conta para ver as despesas do mês.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm callbackUrl={destino} />
        </div>
      </div>
    </main>
  );
}
