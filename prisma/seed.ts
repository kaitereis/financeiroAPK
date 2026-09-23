import { PrismaClient, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Normaliza uma data para o primeiro dia do mês (competência). */
function competencia(year: number, month: number): Date {
  // month: 1-12
  return new Date(Date.UTC(year, month - 1, 1));
}

/** Soma meses a uma competência, mantendo o dia 1. */
function addMonths(base: Date, months: number): Date {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, 1));
}

async function main() {
  const seedPassword = process.env.SEED_PASSWORD ?? "trocar-esta-senha";
  const senhaHash = await bcrypt.hash(seedPassword, 10);

  console.log("🌱 Iniciando seed...");

  // ---------------------------------------------------------------------------
  // 1. Usuários fixos (2)
  // ---------------------------------------------------------------------------
  // O `update` reaplica nome e senhaHash: assim, trocar SEED_PASSWORD no .env e
  // rodar o seed novamente atualiza a senha dos usuários já existentes.
  // (Não há tela de troca de senha na v1 — este é o caminho oficial de troca.)
  const kaite = await prisma.user.upsert({
    where: { email: "kaite@financeiro.local" },
    update: { nome: "Kaíte", senhaHash },
    create: { nome: "Kaíte", email: "kaite@financeiro.local", senhaHash },
  });

  const ana = await prisma.user.upsert({
    where: { email: "ana@financeiro.local" },
    update: { nome: "Ana Paula", senhaHash },
    create: { nome: "Ana Paula", email: "ana@financeiro.local", senhaHash },
  });

  console.log(`👤 Usuários: ${kaite.nome}, ${ana.nome} (senha sincronizada com SEED_PASSWORD)`);

  // ---------------------------------------------------------------------------
  // 2. Categorias padrão
  // ---------------------------------------------------------------------------
  const categoriasDespesa = [
    { nome: "Alimentação", cor: "#f97316" },
    { nome: "Transporte", cor: "#3b82f6" },
    { nome: "Moradia", cor: "#8b5cf6" },
    { nome: "Lazer", cor: "#ec4899" },
    { nome: "Saúde", cor: "#14b8a6" },
    { nome: "Outros", cor: "#6b7280" },
  ];

  const categoriasReceita = [
    { nome: "Salário", cor: "#16a34a" },
    { nome: "Outras Receitas", cor: "#22c55e" },
  ];

  const catMap = new Map<string, string>();

  for (const c of categoriasDespesa) {
    const cat = await prisma.category.upsert({
      where: { id: `cat-despesa-${c.nome.toLowerCase()}` },
      update: { cor: c.cor },
      create: {
        id: `cat-despesa-${c.nome.toLowerCase()}`,
        nome: c.nome,
        tipo: TransactionType.DESPESA,
        cor: c.cor,
      },
    });
    catMap.set(c.nome, cat.id);
  }

  for (const c of categoriasReceita) {
    const cat = await prisma.category.upsert({
      where: { id: `cat-receita-${c.nome.toLowerCase().replace(/\s+/g, "-")}` },
      update: { cor: c.cor },
      create: {
        id: `cat-receita-${c.nome.toLowerCase().replace(/\s+/g, "-")}`,
        nome: c.nome,
        tipo: TransactionType.RECEITA,
        cor: c.cor,
      },
    });
    catMap.set(c.nome, cat.id);
  }

  console.log(`🏷️  Categorias: ${catMap.size}`);

  // ---------------------------------------------------------------------------
  // 3. Contas
  // ---------------------------------------------------------------------------
  const contaKaite = await prisma.account.upsert({
    where: { id: "acc-kaite-corrente" },
    update: {},
    create: {
      id: "acc-kaite-corrente",
      nome: "Conta Kaíte",
      tipo: "corrente",
      saldoInicial: 2500,
      userId: kaite.id,
    },
  });

  const contaAna = await prisma.account.upsert({
    where: { id: "acc-ana-corrente" },
    update: {},
    create: {
      id: "acc-ana-corrente",
      nome: "Conta Ana Paula",
      tipo: "corrente",
      saldoInicial: 1800,
      userId: ana.id,
    },
  });

  const contaConjunta = await prisma.account.upsert({
    where: { id: "acc-conjunta" },
    update: {},
    create: {
      id: "acc-conjunta",
      nome: "Conta Conjunta",
      tipo: "corrente",
      saldoInicial: 5000,
      userId: kaite.id,
    },
  });

  console.log(`🏦 Contas: ${contaKaite.nome}, ${contaAna.nome}, ${contaConjunta.nome}`);

  // ---------------------------------------------------------------------------
  // 4. Transações de exemplo — 3 meses (ago, set, out/2026)
  // ---------------------------------------------------------------------------
  // Limpa transações de exemplo anteriores para o seed ser idempotente.
  await prisma.transaction.deleteMany({
    where: { id: { startsWith: "seed-" } },
  });

  const hoje = new Date();
  const anoAtual = hoje.getUTCFullYear();
  const mesAtual = hoje.getUTCMonth() + 1; // 1-12

  const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
  const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;
  const mesSeguinte = mesAtual === 12 ? 1 : mesAtual + 1;
  const anoMesSeguinte = mesAtual === 12 ? anoAtual + 1 : anoAtual;

  const compAtual = competencia(anoAtual, mesAtual);
  const compAnterior = competencia(anoMesAnterior, mesAnterior);
  const compSeguinte = competencia(anoMesSeguinte, mesSeguinte);

  let seq = 0;
  const nextId = () => `seed-tx-${String(++seq).padStart(3, "0")}`;

  // --- Mês anterior ---
  await prisma.transaction.createMany({
    data: [
      {
        id: nextId(),
        valor: 4200,
        tipo: TransactionType.RECEITA,
        descricao: "Salário Kaíte",
        data: new Date(Date.UTC(anoMesAnterior, mesAnterior - 1, 5)),
        mesReferencia: compAnterior,
        accountId: contaKaite.id,
        categoryId: catMap.get("Salário")!,
        userId: kaite.id,
      },
      {
        id: nextId(),
        valor: 3800,
        tipo: TransactionType.RECEITA,
        descricao: "Salário Ana Paula",
        data: new Date(Date.UTC(anoMesAnterior, mesAnterior - 1, 5)),
        mesReferencia: compAnterior,
        accountId: contaAna.id,
        categoryId: catMap.get("Salário")!,
        userId: ana.id,
      },
      {
        id: nextId(),
        valor: 1500,
        tipo: TransactionType.DESPESA,
        descricao: "Aluguel",
        data: new Date(Date.UTC(anoMesAnterior, mesAnterior - 1, 10)),
        mesReferencia: compAnterior,
        accountId: contaConjunta.id,
        categoryId: catMap.get("Moradia")!,
        userId: kaite.id,
      },
      {
        id: nextId(),
        valor: 680.5,
        tipo: TransactionType.DESPESA,
        descricao: "Supermercado do mês",
        data: new Date(Date.UTC(anoMesAnterior, mesAnterior - 1, 12)),
        mesReferencia: compAnterior,
        accountId: contaConjunta.id,
        categoryId: catMap.get("Alimentação")!,
        userId: ana.id,
      },
    ],
  });

  // --- Mês atual ---
  await prisma.transaction.createMany({
    data: [
      {
        id: nextId(),
        valor: 4200,
        tipo: TransactionType.RECEITA,
        descricao: "Salário Kaíte",
        data: new Date(Date.UTC(anoAtual, mesAtual - 1, 5)),
        mesReferencia: compAtual,
        accountId: contaKaite.id,
        categoryId: catMap.get("Salário")!,
        userId: kaite.id,
      },
      {
        id: nextId(),
        valor: 3800,
        tipo: TransactionType.RECEITA,
        descricao: "Salário Ana Paula",
        data: new Date(Date.UTC(anoAtual, mesAtual - 1, 5)),
        mesReferencia: compAtual,
        accountId: contaAna.id,
        categoryId: catMap.get("Salário")!,
        userId: ana.id,
      },
      {
        id: nextId(),
        valor: 512.9,
        tipo: TransactionType.DESPESA,
        descricao: "Supermercado",
        data: new Date(Date.UTC(anoAtual, mesAtual - 1, 8)),
        mesReferencia: compAtual,
        accountId: contaConjunta.id,
        categoryId: catMap.get("Alimentação")!,
        userId: ana.id,
      },
      {
        id: nextId(),
        valor: 189.9,
        tipo: TransactionType.DESPESA,
        descricao: "Combustível",
        data: new Date(Date.UTC(anoAtual, mesAtual - 1, 9)),
        mesReferencia: compAtual,
        accountId: contaKaite.id,
        categoryId: catMap.get("Transporte")!,
        userId: kaite.id,
      },
      {
        id: nextId(),
        valor: 89.9,
        tipo: TransactionType.DESPESA,
        descricao: "Streaming + internet",
        data: new Date(Date.UTC(anoAtual, mesAtual - 1, 3)),
        mesReferencia: compAtual,
        accountId: contaConjunta.id,
        categoryId: catMap.get("Lazer")!,
        userId: ana.id,
      },
    ],
  });

  // --- Despesa recorrente (base) — Aluguel, marcada como recorrente ---
  const recorrenteBase = await prisma.transaction.create({
    data: {
      id: nextId(),
      valor: 1500,
      tipo: TransactionType.DESPESA,
      descricao: "Aluguel (recorrente)",
      data: new Date(Date.UTC(anoAtual, mesAtual - 1, 10)),
      mesReferencia: compAtual,
      recorrente: true,
      accountId: contaConjunta.id,
      categoryId: catMap.get("Moradia")!,
      userId: kaite.id,
    },
  });
  await prisma.transaction.update({
    where: { id: recorrenteBase.id },
    data: { recorrenteGrupoId: recorrenteBase.id },
  });

  // --- Compra parcelada: Notebook em 10x, começando no mês atual ---
  const parcelaGrupoId = "seed-grupo-notebook";
  const valorParcela = 349.9;
  const totalParcelas = 10;
  for (let i = 0; i < totalParcelas; i++) {
    const comp = addMonths(compAtual, i);
    await prisma.transaction.create({
      data: {
        id: nextId(),
        valor: valorParcela,
        tipo: TransactionType.DESPESA,
        descricao: "Notebook (parcelado)",
        data: new Date(Date.UTC(anoAtual, mesAtual - 1, 15)),
        mesReferencia: comp,
        parcelaGrupoId,
        parcelaNum: i + 1,
        parcelaTotal: totalParcelas,
        accountId: contaKaite.id,
        categoryId: catMap.get("Outros")!,
        userId: kaite.id,
      },
    });
  }

  // --- Mês seguinte: uma despesa futura avulsa ---
  await prisma.transaction.create({
    data: {
      id: nextId(),
      valor: 250,
      tipo: TransactionType.DESPESA,
      descricao: "IPVA (parcela futura)",
      data: new Date(Date.UTC(anoMesSeguinte, mesSeguinte - 1, 20)),
      mesReferencia: compSeguinte,
      accountId: contaKaite.id,
      categoryId: catMap.get("Transporte")!,
      userId: kaite.id,
    },
  });

  const total = await prisma.transaction.count();
  console.log(`💸 Transações no banco: ${total}`);
  console.log("✅ Seed concluído.");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });