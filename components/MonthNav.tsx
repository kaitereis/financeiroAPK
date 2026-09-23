import Link from "next/link";
import {
  addMonths,
  competenciaToParam,
  labelCompetencia,
  makeCompetencia,
} from "@/lib/competencia";

interface Props {
  competencia: Date;
  ehMesAtual: boolean;
  /** Filtro de categorias ativo (ids separados por vírgula), preservado na navegação. */
  cat?: string;
}

export default function MonthNav({ competencia, ehMesAtual, cat }: Props) {
  const anterior = addMonths(competencia, -1);
  const proximo = addMonths(competencia, 1);
  const agora = new Date();
  const compAtual = makeCompetencia(agora.getUTCFullYear(), agora.getUTCMonth() + 1);

  const sufixo = cat ? `&cat=${encodeURIComponent(cat)}` : "";

  const linkClass =
    "flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-brand hover:text-brand";

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/?mes=${competenciaToParam(anterior)}${sufixo}`}
          className={linkClass}
          aria-label="Mês anterior"
        >
          ‹
        </Link>
        <h1 className="min-w-[190px] text-center text-xl font-semibold text-slate-900">
          {labelCompetencia(competencia)}
        </h1>
        <Link
          href={`/?mes=${competenciaToParam(proximo)}${sufixo}`}
          className={linkClass}
          aria-label="Próximo mês"
        >
          ›
        </Link>
      </div>

      {!ehMesAtual && (
        <Link
          href={`/${cat ? `?cat=${encodeURIComponent(cat)}` : ""}`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-brand hover:text-brand"
        >
          Voltar ao mês atual
        </Link>
      )}
    </div>
  );
}