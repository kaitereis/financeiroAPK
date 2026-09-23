import { withAuth } from "next-auth/middleware";

/**
 * Proteção de rotas (Next 16: a convenção `middleware` foi renomeada para `proxy`).
 * Tudo que casar com o matcher abaixo exige sessão válida; sem sessão, o NextAuth
 * redireciona para /login (configurado em lib/auth.ts → pages.signIn).
 */
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protege as páginas, exceto: login, rotas do NextAuth, assets estáticos e imagens.
  // `/api` fica de fora de propósito: as rotas de API validam a sessão sozinhas
  // (lib/session.ts → exigirSessao) e respondem 401 em JSON, em vez de redirecionar
  // para o HTML do /login — o que quebraria chamadas fetch().
  matcher: [
    "/((?!login|api|_next/static|_next/image|favicon.ico).*)",
  ],
};
