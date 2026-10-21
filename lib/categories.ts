import { z } from "zod";
import { prisma } from "@/lib/prisma";

/** Cor hexadecimal no formato #rrggbb. */
const corSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato #rrggbb");

/**
 * Validação de entrada das rotas de categoria (AGENTS.md: validar antes do banco).
 * O nome é único (constraint @@unique no schema).
 */
export const categoriaSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da categoria").max(60),
  cor: corSchema.default("#6b7280"),
});

export const categoriaUpdateSchema = categoriaSchema.partial();

export type CategoriaInput = z.infer<typeof categoriaSchema>;

export interface CategoriaComUso {
  id: string;
  nome: string;
  cor: string;
  qtdTransacoes: number;
  /** Total lançado nessa categoria (soma dos valores), para contexto na tela. */
  totalLancado: number;
}

/** Lista as categorias com a quantidade de lançamentos vinculados. */
export async function listarCategorias(): Promise<CategoriaComUso[]> {
  const categorias = await prisma.category.findMany({
    orderBy: { nome: "asc" },
    include: {
      // Competências puladas de recorrências não contam como lançamentos.
      transactions: { where: { ocorrenciaPulada: false }, select: { valor: true } },
    },
  });

  return categorias.map((c) => ({
    id: c.id,
    nome: c.nome,
    cor: c.cor,
    qtdTransacoes: c.transactions.length,
    totalLancado: c.transactions.reduce((s, t) => s + Number(t.valor), 0),
  }));
}

export type ResultadoCategoria =
  | { ok: true; id: string }
  | { ok: false; motivo: "nome_duplicado" }
  | { ok: false; motivo: "nao_encontrada" };

/**
 * Erro do Prisma para violação de constraint única (P2002).
 * Usado para devolver 409 em vez de 500 quando o nome já existe.
 */
function ehViolacaoUnica(erro: unknown): boolean {
  return (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    (erro as { code?: string }).code === "P2002"
  );
}

/** Cria uma categoria. */
export async function criarCategoria(
  input: CategoriaInput,
): Promise<ResultadoCategoria> {
  try {
    const criada = await prisma.category.create({
      data: { nome: input.nome, cor: input.cor },
    });
    return { ok: true, id: criada.id };
  } catch (erro) {
    if (ehViolacaoUnica(erro)) return { ok: false, motivo: "nome_duplicado" };
    throw erro;
  }
}

/** Atualiza uma categoria. */
export async function atualizarCategoria(
  id: string,
  input: Partial<CategoriaInput>,
): Promise<ResultadoCategoria> {
  const existe = await prisma.category.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existe) return { ok: false, motivo: "nao_encontrada" };

  try {
    await prisma.category.update({
      where: { id },
      data: {
        ...(input.nome !== undefined && { nome: input.nome }),
        ...(input.cor !== undefined && { cor: input.cor }),
      },
    });
    return { ok: true, id };
  } catch (erro) {
    if (ehViolacaoUnica(erro)) return { ok: false, motivo: "nome_duplicado" };
    throw erro;
  }
}

/** Nome da categoria "de reserva" — destino dos lançamentos ao excluir uma categoria. */
const CATEGORIA_RESERVA = "Outros";

export type ResultadoExclusaoCategoria =
  | { ok: true; reatribuidas: number }
  | { ok: false; motivo: "nao_encontrada" }
  | { ok: false; motivo: "sem_categoria_reserva" };

/**
 * Exclui uma categoria.
 *
 * Decisão de produto (2026-09-16): se houver lançamentos vinculados, eles são
 * REATRIBUÍDOS para a categoria de reserva ("Outros") antes de excluir — assim o
 * histórico é preservado. Se a categoria de reserva não existir (ex: a própria
 * reserva está sendo excluída), a operação é recusada para não deixar lançamentos órfãos.
 */
export async function excluirCategoria(
  id: string,
): Promise<ResultadoExclusaoCategoria> {
  const categoria = await prisma.category.findUnique({
    where: { id },
    select: { id: true, nome: true },
  });
  if (!categoria) return { ok: false, motivo: "nao_encontrada" };

  // A própria categoria de reserva não pode ser excluída se tiver lançamentos,
  // pois não haveria destino válido para reatribuição.
  const reserva = await prisma.category.findFirst({
    where: {
      nome: CATEGORIA_RESERVA,
      id: { not: id },
    },
    select: { id: true },
  });

  if (!reserva) {
    const qtdVinculada = await prisma.transaction.count({
      where: { categoryId: id },
    });
    if (qtdVinculada > 0) {
      return { ok: false, motivo: "sem_categoria_reserva" };
    }
  }

  const reatribuidas = await prisma.$transaction(async (tx) => {
    let movidas = 0;
    if (reserva) {
      const resultado = await tx.transaction.updateMany({
        where: { categoryId: id },
        data: { categoryId: reserva.id },
      });
      movidas = resultado.count;
    }
    await tx.category.delete({ where: { id } });
    return movidas;
  });

  return { ok: true, reatribuidas };
}
