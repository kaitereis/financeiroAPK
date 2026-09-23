import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/session";
import {
  atualizarCategoria,
  categoriaUpdateSchema,
  excluirCategoria,
} from "@/lib/categories";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** PATCH /api/categories/[id] — atualiza uma categoria. */
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

  const parsed = categoriaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados inválidos", detalhes: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const resultado = await atualizarCategoria(id, parsed.data);

  if (!resultado.ok) {
    if (resultado.motivo === "nao_encontrada") {
      return NextResponse.json(
        { erro: "Categoria não encontrada" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { erro: "Já existe uma categoria com esse nome para este tipo." },
      { status: 409 },
    );
  }

  return NextResponse.json({ id: resultado.id });
}

/**
 * DELETE /api/categories/[id] — exclui uma categoria.
 * Lançamentos vinculados são reatribuídos para a categoria de reserva ("Outros").
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await exigirSessao();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const resultado = await excluirCategoria(id);

  if (!resultado.ok) {
    if (resultado.motivo === "nao_encontrada") {
      return NextResponse.json(
        { erro: "Categoria não encontrada" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        erro: "Esta é a categoria de reserva e tem lançamentos vinculados. Mova os lançamentos antes de excluí-la.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    reatribuidas: resultado.reatribuidas,
  });
}
