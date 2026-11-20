import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { checkRateLimit, clientIp } from "./security/rateLimit";

// Hash válido pero de una contraseña que nadie usa: cuando el email no existe,
// comparamos igual contra esto para que el tiempo de respuesta no delate si la
// cuenta existe (sin esto, bcrypt.compare se saltaba por completo y el login
// con un email inexistente respondía notablemente más rápido).
const DUMMY_HASH = bcrypt.hashSync("agendaya-timing-safe-dummy", 10);

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
      async authorize(credentials, request) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        // Limita por IP+email para frenar fuerza bruta sin bloquear a todo el
        // mundo si alguien más comparte IP (NAT/oficina) e intenta loguearse.
        const rateLimit = checkRateLimit(
          `login:${clientIp(request)}:${email.toLowerCase()}`,
          5,
          5 * 60_000
        );
        if (!rateLimit.allowed) return null;

        const business = await prisma.business.findUnique({ where: { email } });
        const validPassword = await bcrypt.compare(password, business?.passwordHash ?? DUMMY_HASH);
        if (!business || !validPassword) return null;

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
