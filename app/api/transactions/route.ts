import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/session";
import {
  criarTransacao,
  listarOpcoesParaFormulario,
  transacaoCreateSchema,
} from "@/lib/transactions-crud";

export const dynamic = "force-dynamic";

/** GET /api/transactions/opcoes — contas e categorias de despesa para o formulário. */
export async function GET(request: Request) {
  const session = await exigirSessao();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get("tipo") !== "opcoes") {
    return NextResponse.json({ erro: "Use ?tipo=opcoes" }, { status: 400 });
  }

  const opcoes = await listarOpcoesParaFormulario();
  return NextResponse.json(opcoes);
}

/** POST /api/transactions — cria uma despesa (comum, parcelada ou recorrente). */
export async function POST(request: Request) {
  const session = await exigirSessao();
  if (!session?.user?.id) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const parsed = transacaoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados inválidos", detalhes: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const resultado = await criarTransacao(parsed.data, session.user.id);

  if (!resultado.ok) {
    const mensagens: Record<typeof resultado.motivo, string> = {
      conta_invalida: "Conta selecionada inválida.",
      categoria_invalida: "Categoria selecionada inválida.",
      parcelas_invalidas: "Informe de 2 a 99 parcelas.",
    };
    return NextResponse.json(
      { erro: mensagens[resultado.motivo] },
      { status: 400 },
    );
  }

  return NextResponse.json({ ids: resultado.ids }, { status: 201 });
}
