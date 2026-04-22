import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "admin",
      name: "Admin",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const admin = await prisma.admin.findUnique({
          where: { username: credentials.username as string },
        });
        if (!admin) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          admin.password
        );
        if (!valid) return null;
        return { id: admin.id, name: admin.username, role: "admin" };
      },
    }),
    Credentials({
      id: "agency",
      name: "Agency",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const agency = await prisma.agency.findUnique({
          where: { username: credentials.username as string },
        });
        if (!agency) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          agency.password
        );
        if (!valid) return null;
        return { id: agency.id, name: agency.name, role: "agency" };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role as string;
      session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
