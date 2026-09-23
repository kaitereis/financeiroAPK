import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/session";
import {
  atualizarConta,
  contaUpdateSchema,
  excluirConta,
} from "@/lib/accounts";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** PATCH /api/accounts/[id] — atualiza uma conta. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await exigirSessao();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const parsed = contaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados inválidos", detalhes: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const conta = await atualizarConta(id, parsed.data);
  if (!conta) {
    return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ conta });
}

/** DELETE /api/accounts/[id] — exclui uma conta (bloqueia se tiver lançamentos). */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await exigirSessao();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const resultado = await excluirConta(id);

  if (!resultado.ok) {
    if (resultado.motivo === "nao_encontrada") {
      return NextResponse.json(
        { erro: "Conta não encontrada" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        erro: `Esta conta tem ${resultado.qtd} lançamento(s) e não pode ser excluída. Exclua os lançamentos antes.`,
        qtdTransacoes: resultado.qtd,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
