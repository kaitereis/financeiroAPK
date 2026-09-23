import type { DefaultSession } from "next-auth";

// Adiciona o id do usuário à sessão (preenchido em lib/auth.ts).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
