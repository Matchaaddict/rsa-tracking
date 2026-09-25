import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    isSuperAdmin?: boolean;
    permissions?: string;
    subCommitteeId?: string | null;
  }
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      isSuperAdmin?: boolean;
      permissions?: string;
    subCommitteeId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
    isSuperAdmin?: boolean;
    permissions?: string;
    subCommitteeId?: string | null;
  }
}
