import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Garante que a requisição tem sessão válida.
 * As rotas de API não passam pelo proxy.ts de forma confiável para todos os casos,
 * então cada handler valida a sessão explicitamente (defesa em profundidade).
 */
export async function exigirSessao() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session;
}
