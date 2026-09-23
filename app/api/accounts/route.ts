import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/session";
import { contaSchema, criarConta, listarContas } from "@/lib/accounts";

export const dynamic = "force-dynamic";

/** GET /api/accounts — lista as contas com saldo atual. */
export async function GET() {
  const session = await exigirSessao();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const contas = await listarContas();
  return NextResponse.json({ contas });
}

/** POST /api/accounts — cria uma conta. */
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

  const parsed = contaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados inválidos", detalhes: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const conta = await criarConta(parsed.data);
  return NextResponse.json({ conta }, { status: 201 });
}
