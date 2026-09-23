import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/session";
import { buscarTransacao, encerrarRecorrencia } from "@/lib/transactions-crud";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/transactions/[id]/encerrar
 * Encerra uma recorrência: remove a base e as ocorrências futuras,
 * mantendo o histórico de meses anteriores.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const session = await exigirSessao();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const transacao = await buscarTransacao(id);
  if (!transacao) {
    return NextResponse.json(
      { erro: "Transação não encontrada." },
      { status: 404 },
    );
  }

  if (!transacao.recorrenteGrupoId) {
    return NextResponse.json(
      { erro: "Esta transação não é recorrente." },
      { status: 400 },
    );
  }

  const resultado = await encerrarRecorrencia(transacao.recorrenteGrupoId);
  if (!resultado.ok) {
    return NextResponse.json(
      { erro: "Recorrência não encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, removidas: resultado.removidas });
}
