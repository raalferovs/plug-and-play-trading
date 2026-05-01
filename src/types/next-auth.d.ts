import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      avatarUrl: string;
      subscriptionStatus: string;
      currentPeriodEnd: string | null;
      addonStatus: string;
      addonPeriodEnd: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
