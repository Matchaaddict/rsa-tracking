import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const agency = await prisma.agency.findUnique({
          where: { username: credentials.username as string },
          include: { committee: true },
        });
        if (!agency) return null;
        const isValid = await compare(credentials.password as string, agency.password);
        if (!isValid) return null;
        return {
          id: String(agency.id),
          name: agency.name,
          committeeId: agency.committeeId ? String(agency.committeeId) : null,
          isAdmin: agency.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.committeeId = (user as { committeeId: string | null }).committeeId;
        token.isAdmin = (user as { isAdmin: boolean }).isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        (session.user as { committeeId: string | null }).committeeId = token.committeeId as string | null;
        (session.user as { isAdmin: boolean }).isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.AUTH_SECRET,
});
