import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Route handler do NextAuth (App Router) — cobre /api/auth/*.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
