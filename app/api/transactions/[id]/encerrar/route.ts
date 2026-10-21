import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/session";
import {
  buscarTransacao,
  encerrarRecorrencia,
  transacaoUpdateSchema,
} from "@/lib/transactions-crud";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/transactions/[id]/encerrar
 * Encerra uma recorrência a partir de uma competência (inclusiva): remove as
 * ocorrências daquele mês em diante e mantém o histórico anterior.
 * Body opcional: { mesReferencia: "YYYY-MM" } — default = mês do próprio lançamento.
 */
export async function POST(request: Request, { params }: RouteContext) {
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

  let mesReferencia = transacao.mesReferencia;
  try {
    const body = await request.json();
    if (body && typeof body.mesReferencia === "string") {
      const parsed = transacaoUpdateSchema
        .pick({ mesReferencia: true })
        .safeParse({ mesReferencia: `${body.mesReferencia}-01T00:00:00Z` });
      if (parsed.success && parsed.data.mesReferencia) {
        mesReferencia = parsed.data.mesReferencia;
      }
    }
  } catch {
    // Sem body → usa o mês do próprio lançamento.
  }

  const resultado = await encerrarRecorrencia(
    transacao.recorrenteGrupoId,
    mesReferencia,
  );
  if (!resultado.ok) {
    return NextResponse.json(
      { erro: "Recorrência não encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, removidas: resultado.removidas });
}
