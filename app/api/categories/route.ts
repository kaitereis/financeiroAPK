import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/session";
import {
  categoriaSchema,
  criarCategoria,
  listarCategorias,
} from "@/lib/categories";

export const dynamic = "force-dynamic";

/** GET /api/categories — lista as categorias com uso. */
export async function GET() {
  const session = await exigirSessao();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const categorias = await listarCategorias();
  return NextResponse.json({ categorias });
}

/** POST /api/categories — cria uma categoria. */
export async function POST(request: Request) {
  const session = await exigirSessao();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const parsed = categoriaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados inválidos", detalhes: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const resultado = await criarCategoria(parsed.data);
  if (!resultado.ok) {
    return NextResponse.json(
      {
        erro: `Já existe uma categoria de ${
          parsed.data.tipo === "DESPESA" ? "despesa" : "receita"
        } chamada "${parsed.data.nome}".`,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ id: resultado.id }, { status: 201 });
}
