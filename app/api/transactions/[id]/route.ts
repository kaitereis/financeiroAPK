import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/session";
import {
  atualizarTransacao,
  buscarTransacao,
  excluirTransacao,
  transacaoUpdateSchema,
} from "@/lib/transactions-crud";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/transactions/[id] — retorna uma transação para edição. */
export async function GET(_request: Request, { params }: RouteContext) {
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

  return NextResponse.json(transacao);
}

/** PATCH /api/transactions/[id] — edita uma transação individual. */
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

  const parsed = transacaoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados inválidos", detalhes: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const resultado = await atualizarTransacao(id, parsed.data);
  if (!resultado.ok) {
    const status = resultado.motivo === "nao_encontrada" ? 404 : 400;
    const mensagens: Record<typeof resultado.motivo, string> = {
      nao_encontrada: "Transação não encontrada.",
      conta_invalida: "Conta selecionada inválida.",
      categoria_invalida: "Categoria selecionada inválida.",
    };
    return NextResponse.json({ erro: mensagens[resultado.motivo] }, { status });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/transactions/[id] — exclui uma transação individual. */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await exigirSessao();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const resultado = await excluirTransacao(id);

  if (!resultado.ok) {
    return NextResponse.json(
      { erro: "Transação não encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
