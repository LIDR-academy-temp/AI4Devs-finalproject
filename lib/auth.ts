import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Necesario en local/Docker, donde el host de la petición no es el de
  // despliegue conocido por NextAuth (p. ej. producción en Vercel).
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const business = await prisma.business.findUnique({ where: { email } });
        if (!business) return null;

        const validPassword = await bcrypt.compare(password, business.passwordHash);
        if (!validPassword) return null;

        return { id: business.id, email: business.email, name: business.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.businessId = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.businessId = token.businessId as string;
      return session;
    },
  },
});
