import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/session";
import {
  atualizarGrupoParcelas,
  buscarTransacao,
  excluirGrupoParcelas,
  transacaoUpdateSchema,
} from "@/lib/transactions-crud";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/transactions/[id]/grupo
 * Ações em grupo sobre parcelamentos: editar todas as parcelas ou excluir todas.
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

  if (!transacao.parcelaGrupoId) {
    return NextResponse.json(
      { erro: "Esta transação não faz parte de um grupo de parcelas." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("acao" in body)) {
    return NextResponse.json(
      { erro: "Informe a ação (editar|excluir)." },
      { status: 400 },
    );
  }

  const { acao } = body as { acao: unknown };

  if (acao === "excluir") {
    const resultado = await excluirGrupoParcelas(transacao.parcelaGrupoId);
    if (!resultado.ok) {
      return NextResponse.json(
        { erro: "Grupo de parcelas não encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (acao === "editar") {
    const parsed = transacaoUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          erro: "Dados inválidos",
          detalhes: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const resultado = await atualizarGrupoParcelas(
      transacao.parcelaGrupoId,
      parsed.data,
    );
    if (!resultado.ok) {
      const status = resultado.motivo === "nao_encontrada" ? 404 : 400;
      const mensagens: Record<typeof resultado.motivo, string> = {
        nao_encontrada: "Grupo de parcelas não encontrado.",
        conta_invalida: "Conta selecionada inválida.",
        categoria_invalida: "Categoria selecionada inválida.",
      };
      return NextResponse.json(
        { erro: mensagens[resultado.motivo] },
        { status },
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { erro: "Ação inválida. Use 'editar' ou 'excluir'." },
    { status: 400 },
  );
}
