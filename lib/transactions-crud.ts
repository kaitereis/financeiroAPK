import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { addMonths, toCompetencia } from "@/lib/competencia";

/**
 * Data layer e schemas para CRUD de transações (fatia 5).
 * Regras de produto confirmadas em 2026-09-16:
 * - Nesta fatia, apenas DESPESAS.
 * - Parcelada: usuário informa o VALOR TOTAL; o sistema divide pelas parcelas.
 * - Competência no formulário: automática (mês da data), mas editável.
 * - Editar parcelada: escolha entre "esta parcela" ou "todas".
 * - Excluir parcelada: perguntar ao usuário (esta parcela ou grupo).
 * - Encerrar recorrência: botão dedicado que limpa base + remove futuras.
 */

export const TIPOS_TRANSACAO = ["DESPESA"] as const;

const valorPositivo = z.coerce
  .number({ invalid_type_error: "Valor inválido" })
  .positive("Valor deve ser maior que zero")
  .finite();

const dataSchema = z.coerce.date({ message: "Data inválida" });

const competenciaSchema = z.coerce.date({ message: "Competência inválida" });

/** Schema base para criação/edição de uma despesa comum. */
export const transacaoBaseSchema = z.object({
  descricao: z.string().trim().min(1, "Informe a descrição").max(120),
  valor: valorPositivo,
  data: dataSchema,
  mesReferencia: competenciaSchema.optional(),
  accountId: z.string().trim().min(1, "Selecione a conta"),
  categoryId: z.string().trim().min(1, "Selecione a categoria"),
});

/** Schema para criação — inclui opções de parcelamento e recorrência. */
export const transacaoCreateSchema = transacaoBaseSchema.extend({
  parcelada: z.boolean().default(false),
  parcelas: z.coerce
    .number({ invalid_type_error: "Número de parcelas inválido" })
    .int("Número de parcelas deve ser inteiro")
    .min(2, "Mínimo 2 parcelas")
    .max(99, "Máximo 99 parcelas")
    .optional(),
  recorrente: z.boolean().default(false),
});

/** Schema para edição de uma transação individual. */
export const transacaoUpdateSchema = transacaoBaseSchema.partial();

export type TransacaoCreateInput = z.infer<typeof transacaoCreateSchema>;
export type TransacaoUpdateInput = z.infer<typeof transacaoUpdateSchema>;

/** Normaliza a competência para o primeiro dia do mês (UTC). */
function normalizarCompetencia(data: Date): Date {
  return toCompetencia(data);
}

/** Arredonda um valor para 2 casas decimais. */
function arredondar2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Calcula valores das parcelas a partir do total, evitando diferença de centavos. */
function calcularValoresParcelas(total: number, qtd: number): number[] {
  const base = arredondar2(total / qtd);
  const valores = Array.from({ length: qtd }, () => base);
  const soma = arredondar2(base * qtd);
  const diferenca = arredondar2(total - soma);
  if (diferenca !== 0) {
    valores[0] = arredondar2(valores[0] + diferenca);
  }
  return valores;
}

export interface TransacaoParaFormulario {
  id: string;
  descricao: string | null;
  valor: number;
  data: Date;
  mesReferencia: Date;
  recorrente: boolean;
  recorrenteGrupoId: string | null;
  ocorrenciaPulada: boolean;
  parcelaGrupoId: string | null;
  parcelaNum: number | null;
  parcelaTotal: number | null;
  accountId: string;
  categoryId: string;
}

/** Busca uma transação pelo ID. */
export async function buscarTransacao(
  id: string,
): Promise<TransacaoParaFormulario | null> {
  const t = await prisma.transaction.findUnique({ where: { id } });
  if (!t) return null;
  return {
    id: t.id,
    descricao: t.descricao,
    valor: Number(t.valor),
    data: t.data,
    mesReferencia: t.mesReferencia,
    recorrente: t.recorrente,
    recorrenteGrupoId: t.recorrenteGrupoId,
    ocorrenciaPulada: t.ocorrenciaPulada,
    parcelaGrupoId: t.parcelaGrupoId,
    parcelaNum: t.parcelaNum,
    parcelaTotal: t.parcelaTotal,
    accountId: t.accountId,
    categoryId: t.categoryId,
  };
}

export type ResultadoCriacao =
  | { ok: true; ids: string[] }
  | { ok: false; motivo: "conta_invalida" }
  | { ok: false; motivo: "categoria_invalida" }
  | { ok: false; motivo: "parcelas_invalidas" };

/**
 * Cria uma ou mais transações.
 * - Comum: 1 transação.
 * - Parcelada: N transações com competências consecutivas.
 * - Recorrente: 1 transação-base com recorrente=true.
 * Não é permitido parcelada + recorrente ao mesmo tempo.
 */
export async function criarTransacao(
  input: TransacaoCreateInput,
  userId: string,
): Promise<ResultadoCriacao> {
  const conta = await prisma.account.findUnique({
    where: { id: input.accountId },
    select: { id: true },
  });
  if (!conta) return { ok: false, motivo: "conta_invalida" };

  const categoria = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!categoria) {
    return { ok: false, motivo: "categoria_invalida" };
  }

  const competenciaBase = input.mesReferencia
    ? normalizarCompetencia(input.mesReferencia)
    : normalizarCompetencia(input.data);

  // Recorrente: cria a base.
  if (input.recorrente) {
    const base = await prisma.transaction.create({
      data: {
        descricao: input.descricao,
        valor: input.valor,
        data: input.data,
        mesReferencia: competenciaBase,
        recorrente: true,
        accountId: input.accountId,
        categoryId: input.categoryId,
        userId,
      },
    });
    await prisma.transaction.update({
      where: { id: base.id },
      data: { recorrenteGrupoId: base.id },
    });
    return { ok: true, ids: [base.id] };
  }

  // Parcelada: cria N transações.
  if (input.parcelada) {
    const qtd = input.parcelas ?? 0;
    if (!qtd || qtd < 2) {
      return { ok: false, motivo: "parcelas_invalidas" };
    }

    const valores = calcularValoresParcelas(input.valor, qtd);
    const grupoId = crypto.randomUUID();

    const ids: string[] = [];
    for (let i = 0; i < qtd; i++) {
      const competencia = addMonths(competenciaBase, i);
      const criada = await prisma.transaction.create({
        data: {
          descricao: `${input.descricao} (${i + 1}/${qtd})`,
          valor: valores[i],
          data: input.data,
          mesReferencia: competencia,
          recorrente: false,
          parcelaGrupoId: grupoId,
          parcelaNum: i + 1,
          parcelaTotal: qtd,
          accountId: input.accountId,
          categoryId: input.categoryId,
          userId,
        },
      });
      ids.push(criada.id);
    }
    return { ok: true, ids };
  }

  // Comum.
  const criada = await prisma.transaction.create({
    data: {
      descricao: input.descricao,
      valor: input.valor,
      data: input.data,
      mesReferencia: competenciaBase,
      recorrente: false,
      accountId: input.accountId,
      categoryId: input.categoryId,
      userId,
    },
  });
  return { ok: true, ids: [criada.id] };
}

export type ResultadoAtualizacao =
  | { ok: true }
  | { ok: false; motivo: "nao_encontrada" }
  | { ok: false; motivo: "conta_invalida" }
  | { ok: false; motivo: "categoria_invalida" };

/**
 * Atualiza UMA transação individual.
 * Usado quando o usuário escolhe "editar esta parcela" ou para transações comuns.
 */
export async function atualizarTransacao(
  id: string,
  input: TransacaoUpdateInput,
): Promise<ResultadoAtualizacao> {
  const atual = await prisma.transaction.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!atual) return { ok: false, motivo: "nao_encontrada" };

  if (input.accountId) {
    const conta = await prisma.account.findUnique({
      where: { id: input.accountId },
      select: { id: true },
    });
    if (!conta) return { ok: false, motivo: "conta_invalida" };
  }

  if (input.categoryId) {
    const categoria = await prisma.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    if (!categoria) {
      return { ok: false, motivo: "categoria_invalida" };
    }
  }

  await prisma.transaction.update({
    where: { id },
    data: {
      ...(input.descricao !== undefined && { descricao: input.descricao }),
      ...(input.valor !== undefined && { valor: input.valor }),
      ...(input.data !== undefined && { data: input.data }),
      ...(input.mesReferencia !== undefined && {
        mesReferencia: normalizarCompetencia(input.mesReferencia),
      }),
      ...(input.accountId !== undefined && { accountId: input.accountId }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
    },
  });

  return { ok: true };
}

/**
 * Atualiza TODAS as transações de um grupo de parcelas.
 * Regras:
 * - Não altera parcelaNum/parcelaTotal nem competências relativas.
 * - Atualiza descrição (mantendo sufixo "(X/N)"), valor (redistribui total),
 *   data, conta e categoria.
 */
export async function atualizarGrupoParcelas(
  parcelaGrupoId: string,
  input: TransacaoUpdateInput,
): Promise<ResultadoAtualizacao> {
  const grupo = await prisma.transaction.findMany({
    where: { parcelaGrupoId },
    orderBy: { parcelaNum: "asc" },
  });
  if (grupo.length === 0) return { ok: false, motivo: "nao_encontrada" };

  if (input.accountId) {
    const conta = await prisma.account.findUnique({
      where: { id: input.accountId },
      select: { id: true },
    });
    if (!conta) return { ok: false, motivo: "conta_invalida" };
  }

  if (input.categoryId) {
    const categoria = await prisma.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    if (!categoria) {
      return { ok: false, motivo: "categoria_invalida" };
    }
  }

  const total = input.valor ?? Number(grupo[0].valor) * grupo.length;
  const valores = calcularValoresParcelas(total, grupo.length);

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < grupo.length; i++) {
      const t = grupo[i];
      const descricaoBase = input.descricao ?? t.descricao ?? "";
      const descricao = `${descricaoBase.replace(/\s*\(\d+\/\d+\)$/, "")} (${i + 1}/${grupo.length})`;
      await tx.transaction.update({
        where: { id: t.id },
        data: {
          descricao,
          valor: valores[i],
          ...(input.data !== undefined && { data: input.data }),
          ...(input.accountId !== undefined && { accountId: input.accountId }),
          ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        },
      });
    }
  });

  return { ok: true };
}

export type ResultadoExclusao =
  | { ok: true }
  | { ok: false; motivo: "nao_encontrada" };

/** Exclui uma transação individual. */
export async function excluirTransacao(
  id: string,
): Promise<ResultadoExclusao> {
  const atual = await prisma.transaction.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!atual) return { ok: false, motivo: "nao_encontrada" };

  await prisma.transaction.delete({ where: { id } });
  return { ok: true };
}

/** Exclui todas as transações de um grupo de parcelas. */
export async function excluirGrupoParcelas(
  parcelaGrupoId: string,
): Promise<ResultadoExclusao> {
  const qtd = await prisma.transaction.count({ where: { parcelaGrupoId } });
  if (qtd === 0) return { ok: false, motivo: "nao_encontrada" };

  await prisma.transaction.deleteMany({ where: { parcelaGrupoId } });
  return { ok: true };
}

export type ResultadoEncerrarRecorrencia =
  | { ok: true; removidas: number }
  | { ok: false; motivo: "nao_encontrada" };

/**
 * Encerra uma recorrência a partir de uma competência (inclusiva):
 * - Remove todas as ocorrências com `mesReferencia >= mesAFrente`.
 * - Mantém as ocorrências anteriores (histórico) e as DESVINCULA do grupo
 *   (`recorrente = false`, `recorrenteGrupoId = null`) para que a série não
 *   volte a ser materializada nos meses seguintes.
 */
export async function encerrarRecorrencia(
  recorrenteGrupoId: string,
  mesAFrente: Date,
): Promise<ResultadoEncerrarRecorrencia> {
  const existe = await prisma.transaction.count({
    where: { recorrenteGrupoId },
  });
  if (existe === 0) return { ok: false, motivo: "nao_encontrada" };

  const corte = toCompetencia(mesAFrente);

  const removidas = await prisma.$transaction(async (tx) => {
    const futuras = await tx.transaction.deleteMany({
      where: {
        recorrenteGrupoId,
        mesReferencia: { gte: corte },
      },
    });
    // Desvincula o histórico mantido — sem membros no grupo, a materialização
    // não recomeça a série ao reabrir os meses.
    await tx.transaction.updateMany({
      where: { recorrenteGrupoId },
      data: { recorrente: false, recorrenteGrupoId: null },
    });
    return futuras.count;
  });

  return { ok: true, removidas };
}

/**
 * "Pula" a ocorrência de uma recorrência apenas no mês dela.
 * A linha NÃO é apagada: é marcada como `ocorrenciaPulada`, ficando oculta das
 * listas e totais, mas mantendo-se como âncora da série — assim os meses
 * seguintes continuam sendo gerados e o mês pulado não "revive" ao ser reaberto.
 */
export async function pularOcorrenciaRecorrente(
  id: string,
): Promise<ResultadoExclusao> {
  const t = await prisma.transaction.findUnique({
    where: { id },
    select: { id: true, recorrenteGrupoId: true },
  });
  if (!t || !t.recorrenteGrupoId) {
    return { ok: false, motivo: "nao_encontrada" };
  }

  await prisma.transaction.update({
    where: { id },
    data: { ocorrenciaPulada: true },
  });
  return { ok: true };
}

/** Lista contas e categorias para popular o formulário. */
export async function listarOpcoesParaFormulario() {
  const [contas, categorias] = await Promise.all([
    prisma.account.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.category.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, cor: true },
    }),
  ]);
  return { contas, categorias };
}
