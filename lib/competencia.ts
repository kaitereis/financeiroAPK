/**
 * Utilidades de competência (mês de referência) e formatação.
 * Regra da SPEC 4: competência é sempre normalizada para o primeiro dia do mês (UTC).
 */

/** Cria uma competência a partir de ano (ex: 2026) e mês (1-12). */
export function makeCompetencia(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

/** Normaliza uma data qualquer para a competência (primeiro dia do mês, UTC). */
export function toCompetencia(date: Date): Date {
  return makeCompetencia(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

/** Soma (ou subtrai) meses a uma competência, mantendo o dia 1. */
export function addMonths(base: Date, months: number): Date {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, 1));
}

/** Lê a competência da URL no formato "YYYY-MM". Cai no mês atual se inválido. */
export function parseCompetenciaParam(
  value: string | undefined,
  now: Date = new Date(),
): Date {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    if (m >= 1 && m <= 12) return makeCompetencia(y, m);
  }
  return toCompetencia(now);
}

/** Formata a competência como "YYYY-MM" (para usar em links). */
export function competenciaToParam(comp: Date): string {
  const y = comp.getUTCFullYear();
  const m = String(comp.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Rótulo em português: "Setembro de 2026". */
export function labelCompetencia(comp: Date): string {
  return `${MESES_PT[comp.getUTCMonth()]} de ${comp.getUTCFullYear()}`;
}

/** Formata valor em BRL. */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Formata uma data (dd/mm/aaaa) em UTC. */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}